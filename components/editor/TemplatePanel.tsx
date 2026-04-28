'use client';

import { useState, useRef, useEffect } from 'react';
import { rhwpActions } from '@/lib/rhwp/loader';

interface Template {
  id: string;
  name: string;
  description: string;
  builtIn: boolean;
  filePath?: string;
  data?: ArrayBuffer;
}

const BUILT_IN_TEMPLATES: Template[] = [
  {
    id: 'sample-biz-plan',
    name: '사업계획서',
    description: '기본적인 사업 계획서 양식 (hwp)',
    builtIn: true,
    filePath: '/rhwp-studio/samples/biz_plan.hwp',
  },
  {
    id: 'sample-book-review',
    name: '서평 블로그',
    description: '책 리뷰 작성을 위한 블로그 양식 (hwp)',
    builtIn: true,
    filePath: '/rhwp-studio/samples/BlogForm_BookReview.hwp',
  },
  {
    id: 'sample-form-002',
    name: '일반 서식',
    description: '깔끔한 일반 문서 서식 (hwpx)',
    builtIn: true,
    filePath: '/rhwp-studio/samples/form-002.hwpx',
  },
  {
    id: 'sample-kps-ai',
    name: 'AI 기술 보고서',
    description: '기술 분석 및 보고서 양식 (hwp)',
    builtIn: true,
    filePath: '/rhwp-studio/samples/kps-ai.hwp',
  },
];

const MY_TEMPLATES_KEY = 'hwp-maker:my-templates';

export default function TemplatePanel() {
  const [myTemplates, setMyTemplates] = useState<Template[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // 로컬 스토리지에서 사용자 템플릿 로드 (Base64로 저장된 것을 ArrayBuffer로 변환)
    const raw = localStorage.getItem(MY_TEMPLATES_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setMyTemplates(parsed);
      } catch (e) { console.error('템플릿 로드 실패', e); }
    }
  }, []);

  async function handleSelect(template: Template) {
    if (loadingId) return;
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
      console.log('[template] 로드 완료:', template.name);
    } catch (err) {
      console.error('[template] 로드 에러:', err);
      alert('템플릿을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoadingId(null);
    }
  }

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
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
            {BUILT_IN_TEMPLATES.map((t) => (
              <TemplateItem 
                key={t.id} 
                template={t} 
                isActive={activeId === t.id} 
                isLoading={loadingId === t.id}
                onSelect={() => handleSelect(t)} 
              />
            ))}
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
        <p
          className="text-sm truncate"
          style={{ color: isActive ? 'var(--color-brand)' : 'var(--color-text-primary)' }}
        >
          {template.name}
        </p>
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
