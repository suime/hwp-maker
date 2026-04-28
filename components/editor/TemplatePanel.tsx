'use client';

/**
 * 템플릿 패널
 * DESIGN.md: 기본 내장 템플릿(업무계획(방침), 1P보고서) + 내 템플릿
 */

import { useState, useRef } from 'react';

interface Template {
  id: string;
  name: string;
  description: string;
  builtIn: boolean;
  filePath?: string; // public/templates/ 경로 (내장 템플릿)
  data?: string;     // base64 (사용자 업로드 템플릿)
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
  } catch {
    return [];
  }
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
    // TODO: rhwp WASM 연동 후 메인 패널에 템플릿 로드
    console.log('[template] 선택:', template.name, template.filePath);
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
    <div className="flex flex-col h-full bg-[var(--color-bg-panel)]">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-bg-border)] flex-shrink-0">
        <div>
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">템플릿</h2>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">양식을 선택하세요</p>
        </div>
        <button
          id="template-upload-btn"
          onClick={() => fileInputRef.current?.click()}
          className="w-7 h-7 flex items-center justify-center rounded-md bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-border)] text-[var(--color-text-secondary)] text-sm transition-colors"
          title="hwp/hwpx 파일을 템플릿으로 추가"
        >
          +
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".hwp,.hwpx"
          className="hidden"
          onChange={handleUpload}
        />
      </div>

      {/* 템플릿 목록 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* 기본 템플릿 */}
        <section>
          <p className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-2 px-1">
            기본 템플릿
          </p>
          <ul className="space-y-1">
            {BUILT_IN_TEMPLATES.map((t) => (
              <TemplateItem
                key={t.id}
                template={t}
                isActive={activeId === t.id}
                onSelect={() => handleSelect(t)}
              />
            ))}
          </ul>
        </section>

        {/* 내 템플릿 */}
        <section>
          <p className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-2 px-1">
            내 템플릿
          </p>
          {myTemplates.length === 0 ? (
            <p className="text-xs text-[var(--color-text-muted)] px-2 py-3 text-center">
              + 버튼으로 hwpx 파일을 추가하세요
            </p>
          ) : (
            <ul className="space-y-1">
              {myTemplates.map((t) => (
                <TemplateItem
                  key={t.id}
                  template={t}
                  isActive={activeId === t.id}
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
  template,
  isActive,
  onSelect,
  onDelete,
}: {
  template: Template;
  isActive: boolean;
  onSelect: () => void;
  onDelete?: () => void;
}) {
  return (
    <li
      className={`group flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-colors ${
        isActive
          ? 'bg-[var(--color-brand)]/15 border border-[var(--color-brand)]/30'
          : 'hover:bg-[var(--color-bg-surface)] border border-transparent'
      }`}
      onClick={onSelect}
    >
      <span className="text-base flex-shrink-0">📝</span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm truncate ${isActive ? 'text-[var(--color-brand)]' : 'text-[var(--color-text-primary)]'}`}>
          {template.name}
        </p>
        <p className="text-xs text-[var(--color-text-muted)] truncate">{template.description}</p>
      </div>
      {onDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="w-5 h-5 flex-shrink-0 flex items-center justify-center rounded text-[var(--color-text-muted)] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all text-xs"
          title="삭제"
        >
          ×
        </button>
      )}
    </li>
  );
}
