'use client';

import { useState, useRef, useEffect, type ChangeEvent } from 'react';
import { rhwpActions, subscribeEditor } from '@/lib/rhwp/loader';
import { parseAdvancedTemplateYaml } from '@/lib/templates/advanced';
import {
  clearDocumentVariables,
  createDocumentVariablesState,
  saveDocumentVariables,
} from '@/lib/templates/documentVariables';

interface Template {
  id: string;
  name: string;
  description: string;
  builtIn: boolean;
  advanced?: boolean;
  filePath?: string;
  yamlPath?: string;
  data?: ArrayBuffer;
}

// 기존 하드코딩 목록 제거 (API에서 로드)
const MY_TEMPLATES_KEY = 'hwp-maker:my-templates';

function loadMyTemplates() {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(MY_TEMPLATES_KEY);
  if (!raw) return [];

  try {
    return JSON.parse(raw) as Template[];
  } catch (error) {
    console.error('사용자 템플릿 로드 실패', error);
    return [];
  }
}

export default function TemplatePanel() {
  const [builtinTemplates, setBuiltinTemplates] = useState<Template[]>([]);
  const [myTemplates, setMyTemplates] = useState<Template[]>(loadMyTemplates);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // 0. 에디터 준비 상태 구독
    const unsubscribe = subscribeEditor((instance) => {
      setIsEditorReady(!!instance);
    });

    // 1. 서버의 템플릿 목록 로드
    fetch('/api/templates')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setBuiltinTemplates(data);
        }
      })
      .catch(err => console.error('기본 템플릿 로드 실패:', err));

    return () => unsubscribe();
  }, []);

  async function handleSelect(template: Template) {
    if (loadingId) return;
    if (!isEditorReady) {
      alert('에디터가 아직 준비되지 않았습니다. 잠시만 기다려주세요.');
      return;
    }
    setLoadingId(template.id);
    setActiveId(template.id);

    try {
      let buffer: ArrayBuffer;
      if (template.builtIn && template.filePath) {
        const res = await fetch(template.filePath);
        if (!res.ok) throw new Error('파일을 불러올 수 없습니다.');
        buffer = await res.arrayBuffer();
      } else if (template.data) {
        // base64 등을 다시 buffer로 변환하는 로직 필요할 수 있음
        // 여기서는 일단 direct 로직만 간단히 구현
        buffer = template.data;
      } else {
        throw new Error('데이터가 없습니다.');
      }

      await rhwpActions.load(buffer);
      if (template.builtIn && template.yamlPath) {
        const res = await fetch(template.yamlPath);
        if (!res.ok) throw new Error('YAML 파일을 불러올 수 없습니다.');
        const definition = parseAdvancedTemplateYaml(await res.text());
        saveDocumentVariables(createDocumentVariablesState(template.id, template.name, definition));
      } else {
        clearDocumentVariables();
      }
      console.log('[template] 로드 완료:', template.name);
    } catch (err) {
      console.error('[template] 로드 에러:', err);
      alert('템플릿을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoadingId(null);
    }
  }

  function handleUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const newTemplate: Template = {
        id: `user-${Date.now()}`,
        name: file.name.replace(/\.(hwp|hwpx)$/i, ''),
        description: '사용자 업로드 템플릿',
        builtIn: false,
        data: reader.result as ArrayBuffer,
      };
      const updated = [...myTemplates, newTemplate];
      setMyTemplates(updated);
      // ArrayBuffer는 JSON.stringify가 안되므로 실제 앱에선 인덱스드DB 등을 고려해야 함
      // 여기선 세션 내에서만 유지되도록 처리 (스토리지는 메타만)
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  }

  function handleDelete(id: string) {
    const updated = myTemplates.filter((t) => t.id !== id);
    setMyTemplates(updated);
    if (activeId === id) setActiveId(null);
  }

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--color-bg-panel)' }}>
      {/* 헤더 */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
        style={{ borderColor: 'var(--color-bg-border)' }}
      >
        <div>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            템플릿
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            양식을 선택하세요
          </p>
        </div>
        <button
          id="template-upload-btn"
          onClick={() => fileInputRef.current?.click()}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-sm btn btn-ghost"
          title="hwp/hwpx 파일을 템플릿으로 추가"
        >
          +
        </button>
        <input ref={fileInputRef} type="file" accept=".hwp,.hwpx" className="hidden" onChange={handleUpload} />
      </div>

      {/* 목록 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        <section>
          <p className="section-label">기본 템플릿</p>
          <ul className="space-y-0.5">
            {builtinTemplates.length === 0 ? (
              <p className="text-[10px] px-2 py-2 text-[var(--color-text-muted)] italic">
                불러올 수 있는 기본 양식이 없습니다.
              </p>
            ) : (
              builtinTemplates.map((t) => (
                <TemplateItem 
                  key={t.id} 
                  template={t} 
                  isActive={activeId === t.id} 
                  isLoading={loadingId === t.id}
                  onSelect={() => handleSelect(t)} 
                />
              ))
            )}
          </ul>
        </section>

        <section>
          <p className="section-label">내 템플릿</p>
          {myTemplates.length === 0 ? (
            <p className="text-xs text-center py-4" style={{ color: 'var(--color-text-muted)' }}>
              + 버튼으로 hwpx 파일을 추가하세요
            </p>
          ) : (
            <ul className="space-y-0.5">
              {myTemplates.map((t) => (
                <TemplateItem
                  key={t.id} 
                  template={t} 
                  isActive={activeId === t.id}
                  isLoading={loadingId === t.id}
                  onSelect={() => handleSelect(t)} 
                  onDelete={() => handleDelete(t.id)}
                />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function TemplateItem({
  template, isActive, isLoading, onSelect, onDelete,
}: {
  template: Template; isActive: boolean; isLoading: boolean; onSelect: () => void; onDelete?: () => void;
}) {
  return (
    <li
      className={`group flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer transition-all border ${isLoading ? 'animate-pulse opacity-70' : ''}`}
      style={{
        background: isActive ? 'color-mix(in srgb, var(--color-brand) 12%, transparent)' : 'transparent',
        borderColor: isActive ? 'color-mix(in srgb, var(--color-brand) 30%, transparent)' : 'transparent',
      }}
      onClick={onSelect}
      onMouseEnter={(e) => {
        if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-surface)';
      }}
      onMouseLeave={(e) => {
        if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent';
      }}
    >
      {/* 문서 아이콘 */}
      <svg
        width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0"
        style={{ color: isActive ? 'var(--color-brand)' : 'var(--color-text-muted)' }}
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <p
            className="text-sm truncate"
            style={{ color: isActive ? 'var(--color-brand)' : 'var(--color-text-primary)' }}
          >
            {template.name}
          </p>
          {template.advanced && (
            <span
              className="flex-shrink-0 rounded px-1 py-0.5 text-[9px] font-semibold"
              style={{
                background: 'color-mix(in srgb, var(--color-brand) 16%, transparent)',
                color: 'var(--color-brand)',
              }}
            >
              변수
            </span>
          )}
        </div>
        <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
          {template.description}
        </p>
      </div>

      {onDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="w-5 h-5 flex-shrink-0 flex items-center justify-center rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: 'var(--ctp-red)' }}
          title="삭제"
        >
          ×
        </button>
      )}
    </li>
  );
}
