'use client';

import { useState, useRef } from 'react';

interface Template {
  id: string;
  name: string;
  description: string;
  builtIn: boolean;
  filePath?: string;
  data?: string;
}

const BUILT_IN_TEMPLATES: Template[] = [
  {
    id: 'builtin-plan',
    name: '업무계획(방침)',
    description: '부서/팀 업무 계획 및 방침 작성용',
    builtIn: true,
    filePath: '/templates/업무계획_방침.hwpx',
  },
  {
    id: 'builtin-1p',
    name: '1P보고서',
    description: '핵심 내용을 1페이지로 요약하는 보고서',
    builtIn: true,
    filePath: '/templates/1P보고서.hwpx',
  },
];

const MY_TEMPLATES_KEY = 'hwp-maker:my-templates';

function loadMyTemplates(): Template[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(MY_TEMPLATES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function saveMyTemplates(templates: Template[]) {
  localStorage.setItem(MY_TEMPLATES_KEY, JSON.stringify(templates));
}

export default function TemplatePanel() {
  const [myTemplates, setMyTemplates] = useState<Template[]>(loadMyTemplates);
  const [activeId, setActiveId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleSelect(template: Template) {
    setActiveId(template.id);
    console.log('[template] 선택:', template.name);
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
        data: reader.result as string,
      };
      const updated = [...myTemplates, newTemplate];
      setMyTemplates(updated);
      saveMyTemplates(updated);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  function handleDelete(id: string) {
    const updated = myTemplates.filter((t) => t.id !== id);
    setMyTemplates(updated);
    saveMyTemplates(updated);
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
              <TemplateItem key={t.id} template={t} isActive={activeId === t.id} onSelect={() => handleSelect(t)} />
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
                  key={t.id} template={t} isActive={activeId === t.id}
                  onSelect={() => handleSelect(t)} onDelete={() => handleDelete(t.id)}
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
  template, isActive, onSelect, onDelete,
}: {
  template: Template; isActive: boolean; onSelect: () => void; onDelete?: () => void;
}) {
  return (
    <li
      className="group flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer transition-all border"
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
