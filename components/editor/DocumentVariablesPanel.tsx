'use client';

import { useEffect, useState } from 'react';
import { loadAiConfig } from '@/lib/ai/config';
import { stripThinkTags } from '@/lib/ai/rhwpCommands';
import { rhwpActions, subscribeEditor } from '@/lib/rhwp/loader';
import {
  interpolateTemplateString,
  normalizeTemplateVariableValues,
  resolveTemplateVariableOptions,
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
  const [isDocumentInfoCollapsed, setIsDocumentInfoCollapsed] = useState(true);
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

    const values = normalizeTemplateVariableValues(
      documentVariables.definition,
      { ...documentVariables.values, [name]: value }
    );
    const next = {
      ...documentVariables,
      values,
    };
    setDocumentVariables(next);
    saveDocumentVariables(next);
  }

  function handleDefinitionFieldChange(
    field: 'author' | 'description' | 'systemPrompt',
    value: string
  ) {
    if (!documentVariables) return;

    const next = {
      ...documentVariables,
      definition: {
        ...documentVariables.definition,
        [field]: value,
      },
    };
    setDocumentVariables(next);
    saveDocumentVariables(next);
  }

  function createTemplateContext(values: Record<string, string>) {
    if (!documentVariables) return values;

    return {
      author: documentVariables.definition.author || '',
      documentAuthor: documentVariables.definition.author || '',
      'document.author': documentVariables.definition.author || '',
      description: documentVariables.definition.description || '',
      documentDescription: documentVariables.definition.description || '',
      'document.description': documentVariables.definition.description || '',
      systemPrompt: documentVariables.definition.systemPrompt || '',
      'document.systemPrompt': documentVariables.definition.systemPrompt || '',
      ...values,
    };
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
      const promptValues = { ...documentVariables.values };
      const replacementValues = { ...documentVariables.values };
      const aiVariables = documentVariables.definition.variables.filter((variable) => variable.type === 'ai');

      for (const variable of aiVariables) {
        setGeneratingVariableName(variable.name);
        const promptSource = promptValues[variable.name] ?? variable.prompt ?? variable.defaultValue ?? '';
        const prompt = interpolateTemplateString(promptSource, createTemplateContext(replacementValues));
        const res = await fetch('/api/template-ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            config: aiConfig,
            variableName: variable.name,
            prompt,
            values: createTemplateContext(replacementValues),
            systemPrompt: documentVariables.definition.systemPrompt,
          }),
        });

        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`AI 변수 생성 실패 (${res.status}): ${errorText}`);
        }

        const data = await res.json() as { text?: string };
        replacementValues[variable.name] = stripThinkTags(data.text || '');
      }

      const finalValues = createTemplateContext(replacementValues);
      for (const [name, value] of Object.entries(finalValues)) {
        await rhwpActions.replaceAll(`{{${name}}}`, value);
      }
    } catch (error) {
      console.error('[document-variables] 변수 적용 실패:', error);
      alert('문서 변수를 적용하는 중 오류가 발생했습니다.');
    } finally {
      setGeneratingVariableName(null);
      setIsApplying(false);
    }
  }

  async function generateAiVariableText(
    variable: AdvancedTemplateVariable,
    values: Record<string, string>
  ) {
    const aiConfig = loadAiConfig();
    const promptSource = values[variable.name] ?? variable.prompt ?? variable.defaultValue ?? '';
    const prompt = interpolateTemplateString(promptSource, createTemplateContext(values));
    const res = await fetch('/api/template-ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        config: aiConfig,
        variableName: variable.name,
        prompt,
        values: createTemplateContext(values),
        systemPrompt: documentVariables?.definition.systemPrompt,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`AI 변수 생성 실패 (${res.status}): ${errorText}`);
    }

    const data = await res.json() as { text?: string };
    return stripThinkTags(data.text || '');
  }

  async function handleInsertVariable(variable: AdvancedTemplateVariable, value: string) {
    if (!isEditorReady) {
      alert('에디터가 아직 준비되지 않았습니다. 잠시만 기다려주세요.');
      return;
    }
    if (generatingVariableName) return;

    try {
      if (variable.type === 'ai') {
        setGeneratingVariableName(variable.name);
        const text = await generateAiVariableText(variable, { ...(documentVariables?.values ?? {}) });
        await rhwpActions.insertText(text);
        return;
      }

      await rhwpActions.insertText(value);
    } catch (error) {
      console.error('[document-variables] 변수 삽입 실패:', error);
      alert('문서 변수를 삽입하는 중 오류가 발생했습니다.');
    } finally {
      if (variable.type === 'ai') {
        setGeneratingVariableName(null);
      }
    }
  }

  const variables = documentVariables?.definition.variables ?? [];
  const aiCount = variables.filter((variable) => variable.type === 'ai').length;

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
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setIsDocumentInfoCollapsed((value) => !value)}
                  className="flex w-full items-center justify-between gap-2 text-left text-[11px] font-semibold"
                  style={{ color: 'var(--color-text-secondary)' }}
                  aria-expanded={!isDocumentInfoCollapsed}
                  title={isDocumentInfoCollapsed ? '문서 기본 정보 펼치기' : '문서 기본 정보 접기'}
                >
                  <span>문서 기본 정보</span>
                  <span
                    className="text-[10px]"
                    style={{ color: 'var(--color-text-muted)' }}
                    aria-hidden="true"
                  >
                    {isDocumentInfoCollapsed ? '▸' : '▾'}
                  </span>
                </button>
                {!isDocumentInfoCollapsed && (
                  <>
                    <label className="block space-y-1">
                      <span className="text-[10px] font-medium" style={{ color: 'var(--color-text-muted)' }}>
                        작성자
                      </span>
                      <input
                        value={documentVariables.definition.author || ''}
                        onChange={(event) => handleDefinitionFieldChange('author', event.target.value)}
                        className="input py-1.5"
                        placeholder="문서 작성자"
                      />
                    </label>
                    <label className="block space-y-1">
                      <span className="text-[10px] font-medium" style={{ color: 'var(--color-text-muted)' }}>
                        문서 기본 설명
                      </span>
                      <textarea
                        value={documentVariables.definition.description || ''}
                        onChange={(event) => handleDefinitionFieldChange('description', event.target.value)}
                        className="input min-h-16 resize-y py-1.5"
                        placeholder="문서 목적, 양식 사용 범위, 작성 기준"
                      />
                    </label>
                    <label className="block space-y-1">
                      <span className="text-[10px] font-medium" style={{ color: 'var(--color-text-muted)' }}>
                        시스템 프롬프트
                      </span>
                      <textarea
                        value={documentVariables.definition.systemPrompt || ''}
                        onChange={(event) => handleDefinitionFieldChange('systemPrompt', event.target.value)}
                        className="input min-h-24 resize-y py-1.5"
                        placeholder="이 문서 변수 세트에서 AI 변수를 생성하거나 채팅할 때 적용할 작성 규칙"
                      />
                    </label>
                  </>
                )}
              </div>
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
                    options={resolveTemplateVariableOptions(variable, documentVariables.values)}
                    isGenerating={generatingVariableName === variable.name}
                    onInsert={() => handleInsertVariable(
                      variable,
                      stripThinkTags(documentVariables.values[variable.name] ?? '')
                    )}
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
          {isApplying ? '적용 중...' : aiCount > 0 ? 'AI 생성 후 변수 적용' : '변수 적용'}
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
  options,
  isGenerating,
  onInsert,
  onChange,
}: {
  variable: AdvancedTemplateVariable;
  value: string;
  options: string[];
  isGenerating: boolean;
  onInsert: () => void;
  onChange: (value: string) => void;
}) {
  const typeMeta = getVariableTypeMeta(variable.type);

  return (
    <div
      className="block space-y-1 rounded-lg border p-2.5 transition-colors hover:bg-[var(--color-bg-surface)]"
      style={{ borderColor: 'var(--color-bg-border)' }}
    >
      <button
        type="button"
        onClick={onInsert}
        disabled={isGenerating}
        className="flex w-full items-center justify-between gap-2 text-left text-[11px] font-medium disabled:cursor-wait disabled:opacity-75"
        title={
          isGenerating
            ? 'AI 응답 생성 중입니다'
            : variable.type === 'ai'
              ? 'AI 응답을 생성해 현재 커서 위치에 삽입'
              : '현재 커서 위치에 변수 값 삽입'
        }
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <span
            className="rounded-full border px-1.5 py-0.5 text-[9px] font-semibold leading-none"
            style={{
              borderColor: typeMeta.color,
              background: `color-mix(in srgb, ${typeMeta.color} 16%, transparent)`,
              color: typeMeta.color,
            }}
          >
            {typeMeta.label}
          </span>
          <span className="truncate" style={{ color: 'var(--color-text-secondary)' }}>
            {variable.label || variable.name}
          </span>
        </span>
        <code className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
          {'{{'}{variable.name}{'}}'}
        </code>
      </button>

      {variable.type === 'select' ? (
        <select
          value={stripThinkTags(value)}
          onChange={(e) => onChange(e.target.value)}
          className="input py-1.5"
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : variable.type === 'ai' ? (
        <div className="space-y-1.5">
          <textarea
            value={stripThinkTags(value)}
            onChange={(e) => onChange(e.target.value)}
            className="input min-h-16 resize-y py-1.5"
            placeholder={isGenerating ? 'AI 생성 중...' : 'AI에 전달할 프롬프트를 입력하세요'}
            readOnly={isGenerating}
          />
          {isGenerating && (
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2 text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                <span>AI 응답 생성 중...</span>
                <span>완료되면 커서 위치에 삽입됩니다</span>
              </div>
              <div
                className="h-1 overflow-hidden rounded-full"
                style={{ background: 'var(--color-bg-surface2)' }}
                aria-hidden="true"
              >
                <div
                  className="h-full w-1/2 animate-pulse rounded-full"
                  style={{ background: 'var(--ctp-mauve)' }}
                />
              </div>
            </div>
          )}
        </div>
      ) : (
        <input
          value={stripThinkTags(value)}
          onChange={(e) => onChange(e.target.value)}
          className="input py-1.5"
          readOnly={variable.type === 'script'}
        />
      )}

      {variable.description && (
        <span className="block whitespace-pre-wrap text-[10px] leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
          {variable.description}
        </span>
      )}
    </div>
  );
}

function getVariableTypeMeta(type: AdvancedTemplateVariable['type']) {
  switch (type) {
    case 'select':
      return { label: '선택', color: 'var(--ctp-sapphire)' };
    case 'date':
      return { label: '날짜', color: 'var(--ctp-green)' };
    case 'script':
      return { label: '자동', color: 'var(--ctp-peach)' };
    case 'ai':
      return { label: 'AI', color: 'var(--ctp-mauve)' };
    case 'text':
    default:
      return { label: '텍스트', color: 'var(--ctp-blue)' };
  }
}
