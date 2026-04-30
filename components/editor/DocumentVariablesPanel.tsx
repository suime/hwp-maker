'use client';

import { useEffect, useState } from 'react';
import { loadAiConfig } from '@/lib/ai/config';
import { stripThinkTags } from '@/lib/ai/rhwpCommands';
import { rhwpActions, subscribeEditor } from '@/lib/rhwp/loader';
import {
  interpolateTemplateString,
  type AdvancedTemplateVariable,
} from '@/lib/templates/advanced';
import {
  loadDocumentVariables,
  saveDocumentVariables,
  subscribeDocumentVariables,
  type ActiveDocumentVariables,
} from '@/lib/templates/documentVariables';

export default function DocumentVariablesPanel() {
  const [documentVariables, setDocumentVariables] = useState<ActiveDocumentVariables | null>(null);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [generatingVariableName, setGeneratingVariableName] = useState<string | null>(null);

  useEffect(() => {
    const refresh = () => setDocumentVariables(loadDocumentVariables());
    refresh();

    const unsubscribeVariables = subscribeDocumentVariables(refresh);
    const unsubscribeEditor = subscribeEditor((instance) => {
      setIsEditorReady(!!instance);
    });

    return () => {
      unsubscribeVariables();
      unsubscribeEditor();
    };
  }, []);

  function handleVariableChange(name: string, value: string) {
    if (!documentVariables) return;

    const next = {
      ...documentVariables,
      values: { ...documentVariables.values, [name]: value },
    };
    setDocumentVariables(next);
    saveDocumentVariables(next);
  }

  async function handleApply() {
    if (!documentVariables || isApplying) return;
    if (!isEditorReady) {
      alert('에디터가 아직 준비되지 않았습니다. 잠시만 기다려주세요.');
      return;
    }

    setIsApplying(true);
    try {
      const aiConfig = loadAiConfig();
      const resolvedValues = { ...documentVariables.values };
      const llmVariables = documentVariables.definition.variables.filter((variable) => variable.type === 'llm');

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
        resolvedValues[variable.name] = stripThinkTags(data.text || '');
      }

      const next = { ...documentVariables, values: resolvedValues };
      setDocumentVariables(next);
      saveDocumentVariables(next);

      for (const variable of documentVariables.definition.variables) {
        const value = resolvedValues[variable.name] ?? '';
        await rhwpActions.replaceAll(`{{${variable.name}}}`, value);
      }
    } catch (error) {
      console.error('[document-variables] 변수 적용 실패:', error);
      alert('문서 변수를 적용하는 중 오류가 발생했습니다.');
    } finally {
      setGeneratingVariableName(null);
      setIsApplying(false);
    }
  }

  const variables = documentVariables?.definition.variables ?? [];
  const llmCount = variables.filter((variable) => variable.type === 'llm').length;

  return (
    <div className="flex h-full flex-col" style={{ background: 'var(--color-bg-panel)' }}>
      <div className="panel-header border-b border-[var(--color-bg-border)]">
        <h2 className="text-sm font-semibold">문서 변수</h2>
        <p className="text-[11px] text-[var(--color-text-muted)]">
          문서의 변수 값을 입력하고 적용하세요
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {!documentVariables ? (
          <EmptyState />
        ) : (
          <div className="space-y-3">
            <section
              className="rounded-lg border p-3"
              style={{
                borderColor: 'var(--color-bg-border)',
                background: 'var(--color-bg-surface)',
              }}
            >
              <p className="text-xs font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                변수 정의
              </p>
              <p className="mt-0.5 truncate text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                {documentVariables.sourceName}
              </p>
              {llmCount > 0 && (
                <p className="mt-1 text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                  적용 시 LLM 변수 {llmCount}개를 먼저 생성합니다.
                </p>
              )}
            </section>

            {variables.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                정의된 문서 변수가 없습니다.
              </p>
            ) : (
              <div className="space-y-2">
                {variables.map((variable) => (
                  <DocumentVariableInput
                    key={variable.name}
                    variable={variable}
                    value={documentVariables.values[variable.name] ?? ''}
                    isGenerating={generatingVariableName === variable.name}
              onChange={(value) => handleVariableChange(variable.name, stripThinkTags(value))}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-[var(--color-bg-border)] p-3">
        <button
          type="button"
          onClick={handleApply}
          disabled={!documentVariables || variables.length === 0 || isApplying}
          className="btn btn-primary w-full"
        >
          {isApplying ? '적용 중...' : llmCount > 0 ? 'LLM 생성 후 변수 적용' : '변수 적용'}
        </button>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-4 text-center">
      <div
        className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg"
        style={{
          background: 'var(--color-bg-surface)',
          color: 'var(--color-text-muted)',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 7V5a2 2 0 0 1 2-2h2" />
          <path d="M16 3h2a2 2 0 0 1 2 2v2" />
          <path d="M20 17v2a2 2 0 0 1-2 2h-2" />
          <path d="M8 21H6a2 2 0 0 1-2-2v-2" />
          <path d="M8 12h8" />
          <path d="M12 8v8" />
        </svg>
      </div>
      <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
        문서 변수가 없습니다
      </p>
      <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
        변수 정의 YAML이 있는 템플릿을 선택하면 여기에 입력 항목이 표시됩니다.
      </p>
    </div>
  );
}

function DocumentVariableInput({
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
    <label className="block space-y-1 rounded-lg border p-2.5" style={{ borderColor: 'var(--color-bg-border)' }}>
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
          value={stripThinkTags(value)}
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
          value={stripThinkTags(value)}
          onChange={(e) => onChange(e.target.value)}
          className="input min-h-16 resize-y py-1.5"
          placeholder={isGenerating ? 'LLM 생성 중...' : 'LLM으로 자동 생성됩니다'}
          readOnly={isGenerating}
        />
      ) : (
        <input
          value={stripThinkTags(value)}
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
