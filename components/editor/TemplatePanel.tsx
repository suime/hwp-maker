'use client';

import { useState, useRef, useEffect, type ChangeEvent } from 'react';
import { rhwpActions, subscribeEditor } from '@/lib/rhwp/loader';
import { loadAiConfig } from '@/lib/ai/config';
import {
  evaluateTemplateVariable,
  interpolateTemplateString,
  parseAdvancedTemplateYaml,
  type AdvancedTemplateDefinition,
  type AdvancedTemplateVariable,
} from '@/lib/templates/advanced';

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

interface LoadedAdvancedTemplate {
  template: Template;
  definition: AdvancedTemplateDefinition;
  values: Record<string, string>;
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
  const [advancedTemplate, setAdvancedTemplate] = useState<LoadedAdvancedTemplate | null>(null);
  const [generatingVariableName, setGeneratingVariableName] = useState<string | null>(null);
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
        const values = Object.fromEntries(
          definition.variables.map((variable) => [variable.name, evaluateTemplateVariable(variable)])
        );
        setAdvancedTemplate({ template, definition, values });
      } else {
        setAdvancedTemplate(null);
      }
      console.log('[template] 로드 완료:', template.name);
    } catch (err) {
      console.error('[template] 로드 에러:', err);
      alert('템플릿을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoadingId(null);
    }
  }

  async function handleApplyAdvancedTemplate() {
    if (!advancedTemplate) return;

    setLoadingId(advancedTemplate.template.id);
    try {
      const aiConfig = loadAiConfig();
      const resolvedValues = { ...advancedTemplate.values };
      const llmVariables = advancedTemplate.definition.variables.filter((variable) => variable.type === 'llm');

      for (const variable of llmVariables) {
        setGeneratingVariableName(variable.name);
        const prompt = interpolateTemplateString(variable.prompt || variable.defaultValue || '', resolvedValues);
        const res = await fetch('/api/template-llm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            config: aiConfig,
            variableName: variable.name,
            prompt,
            values: resolvedValues,
          }),
        });

        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`LLM 변수 생성 실패 (${res.status}): ${errorText}`);
        }

        const data = await res.json() as { text?: string };
        resolvedValues[variable.name] = data.text || '';
      }

      setAdvancedTemplate((current) => current
        ? { ...current, values: resolvedValues }
        : current);

      for (const variable of advancedTemplate.definition.variables) {
        const value = resolvedValues[variable.name] ?? '';
        await rhwpActions.replaceAll(`{{${variable.name}}}`, value);
      }
      console.log('[template] 고급 템플릿 변수 적용 완료:', advancedTemplate.template.name);
    } catch (err) {
      console.error('[template] 변수 적용 에러:', err);
      alert('템플릿 변수를 적용하는 중 오류가 발생했습니다.');
    } finally {
      setGeneratingVariableName(null);
      setLoadingId(null);
    }
  }

  function handleVariableChange(name: string, value: string) {
    setAdvancedTemplate((current) => current
      ? { ...current, values: { ...current.values, [name]: value } }
      : current);
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
    if (advancedTemplate?.template.id === id) setAdvancedTemplate(null);
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
        {advancedTemplate && (
          <AdvancedTemplateForm
            template={advancedTemplate.template}
            variables={advancedTemplate.definition.variables}
            values={advancedTemplate.values}
            isApplying={loadingId === advancedTemplate.template.id}
            generatingVariableName={generatingVariableName}
            onChange={handleVariableChange}
            onApply={handleApplyAdvancedTemplate}
          />
        )}

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
              YAML
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

function AdvancedTemplateForm({
  template,
  variables,
  values,
  isApplying,
  generatingVariableName,
  onChange,
  onApply,
}: {
  template: Template;
  variables: AdvancedTemplateVariable[];
  values: Record<string, string>;
  isApplying: boolean;
  generatingVariableName: string | null;
  onChange: (name: string, value: string) => void;
  onApply: () => void;
}) {
  const llmCount = variables.filter((variable) => variable.type === 'llm').length;

  return (
    <section
      className="rounded-lg border p-3 space-y-3"
      style={{
        borderColor: 'color-mix(in srgb, var(--color-brand) 28%, transparent)',
        background: 'color-mix(in srgb, var(--color-brand) 7%, transparent)',
      }}
    >
      <div>
        <p className="text-xs font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          고급 템플릿 변수
        </p>
        <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--color-text-muted)' }}>
          {template.name}
        </p>
        {llmCount > 0 && (
          <p className="text-[10px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
            선택/입력 값을 먼저 확정한 뒤 LLM 변수 {llmCount}개를 생성합니다.
          </p>
        )}
      </div>

      {variables.length === 0 ? (
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          YAML에 정의된 변수가 없습니다.
        </p>
      ) : (
        <div className="space-y-2">
          {variables.map((variable) => (
            <TemplateVariableInput
              key={variable.name}
              variable={variable}
              value={values[variable.name] ?? ''}
              isGenerating={generatingVariableName === variable.name}
              onChange={(value) => onChange(variable.name, value)}
            />
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={onApply}
        disabled={isApplying || variables.length === 0}
        className="btn btn-primary w-full"
      >
        {isApplying ? '적용 중...' : llmCount > 0 ? 'LLM 생성 후 변수 적용' : '변수 적용'}
      </button>
    </section>
  );
}

function TemplateVariableInput({
  variable,
  value,
  isGenerating,
  onChange,
}: {
  variable: AdvancedTemplateVariable;
  value: string;
  isGenerating: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block space-y-1">
      <span className="flex items-center justify-between gap-2 text-[11px] font-medium">
        <span className="truncate" style={{ color: 'var(--color-text-secondary)' }}>
          {variable.label || variable.name}
        </span>
        <code className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
          {'{{'}{variable.name}{'}}'}
        </code>
      </span>

      {variable.type === 'select' ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="input py-1.5"
        >
          {variable.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : variable.type === 'llm' ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="input min-h-16 resize-y py-1.5"
          placeholder={isGenerating ? 'LLM 생성 중...' : 'LLM으로 자동 생성됩니다'}
          readOnly={isGenerating}
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="input py-1.5"
          readOnly={variable.type === 'script'}
        />
      )}

      {variable.type === 'llm' && (variable.prompt || variable.defaultValue) && (
        <span className="block whitespace-pre-wrap text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
          지시문: {variable.prompt || variable.defaultValue}
        </span>
      )}

      {variable.description && (
        <span className="block text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
          {variable.description}
        </span>
      )}
    </label>
  );
}
