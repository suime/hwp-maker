'use client';

import { ChangeEvent, ReactNode, useEffect, useRef, useState } from 'react';
import { loadAiConfig } from '@/lib/ai/config';
import { stripThinkTags } from '@/lib/ai/rhwpCommands';
import { rhwpActions, subscribeEditor } from '@/lib/rhwp/loader';
import {
  evaluateTemplateVariable,
  interpolateTemplateString,
  normalizeTemplateVariableValues,
  parseAdvancedTemplateYaml,
  resolveTemplateVariableOptions,
  serializeAdvancedTemplateYaml,
  type AdvancedTemplateVariable,
  type AdvancedTemplateVariableType,
} from '@/lib/templates/advanced';
import {
  createDocumentVariablesState,
  deleteDocumentVariableProfile,
  getDocumentVariableProfiles,
  loadDocumentVariables,
  saveDocumentVariables,
  saveDocumentVariableProfile,
  subscribeDocumentVariableProfiles,
  subscribeDocumentVariables,
  type ActiveDocumentVariables,
  type DocumentVariableProfile,
} from '@/lib/templates/documentVariables';

interface BuiltInPreset {
  id: string;
  name: string;
  filePath: string;
}

const AI_CONFIG_ERROR_MESSAGE = 'AI 설정이 되어 있지 않거나 올바르지 않습니다. 설정에서 AI 프로바이더, API 키, 모델, Base URL을 확인해주세요.';
const DEFAULT_VARIABLE_FOLDER = '기본';

class UserFacingAiError extends Error {}

export default function DocumentVariablesPanel() {
  const [documentVariables, setDocumentVariables] = useState<ActiveDocumentVariables | null>(null);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isDocumentInfoCollapsed, setIsDocumentInfoCollapsed] = useState(true);
  const [generatingVariableName, setGeneratingVariableName] = useState<string | null>(null);
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(() => new Set());
  const [builtInPresets, setBuiltInPresets] = useState<BuiltInPreset[]>([]);
  const [variableProfiles, setVariableProfiles] = useState<DocumentVariableProfile[]>([]);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const refresh = () => setDocumentVariables(loadDocumentVariables());
    const refreshProfiles = () => setVariableProfiles(getDocumentVariableProfiles());
    refresh();
    refreshProfiles();
    fetch('/api/presets')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setBuiltInPresets(data);
        }
      })
      .catch((error) => console.error('기본 프리셋 로드 실패:', error));

    const unsubscribeVariables = subscribeDocumentVariables(refresh);
    const unsubscribeProfiles = subscribeDocumentVariableProfiles(refreshProfiles);
    const unsubscribeEditor = subscribeEditor((instance) => {
      setIsEditorReady(!!instance);
    });

    return () => {
      unsubscribeVariables();
      unsubscribeProfiles();
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

  function updateDocumentVariables(next: ActiveDocumentVariables) {
    setDocumentVariables(next);
    saveDocumentVariables(next);
  }

  function createEmptyDocumentVariables() {
    const next = createDocumentVariablesState('custom:variables', '사용자 문서 변수', {
      author: '',
      description: '',
      systemPrompt: '',
      folders: [],
      variables: [],
    });
    updateDocumentVariables(next);
  }

  function getDefaultFolder() {
    return documentVariables?.definition.folders?.[0] || '';
  }

  function handleAddFolder() {
    const name = window.prompt('추가할 폴더 이름을 입력하세요.');
    const folderName = name?.trim();
    if (!folderName) return;

    if (!documentVariables) {
      updateDocumentVariables(createDocumentVariablesState('custom:variables', '사용자 문서 변수', {
        author: '',
        description: '',
        systemPrompt: '',
        folders: [folderName],
        variables: [],
      }));
      return;
    }

    const currentFolders = documentVariables.definition.folders || [];
    if (currentFolders.includes(folderName)) {
      alert('이미 같은 이름의 폴더가 있습니다.');
      return;
    }

    updateDocumentVariables({
      ...documentVariables,
      definition: {
        ...documentVariables.definition,
        folders: [...currentFolders, folderName],
      },
    });
    setCollapsedFolders((current) => {
      const next = new Set(current);
      next.delete(folderName);
      return next;
    });
  }

  function createVariableName() {
    const existing = new Set(documentVariables?.definition.variables.map((variable) => variable.name));
    let index = (existing?.size ?? 0) + 1;
    let name = `variable${index}`;
    while (existing?.has(name)) {
      index += 1;
      name = `variable${index}`;
    }
    return name;
  }

  function handleAddVariable() {
    if (!documentVariables) {
      const name = 'variable1';
      const variable: AdvancedTemplateVariable = {
        name,
        label: '새 변수',
        type: 'text',
        folder: DEFAULT_VARIABLE_FOLDER,
        defaultValue: '',
        options: [],
        optionRules: [],
        description: '',
      };
      updateDocumentVariables(createDocumentVariablesState('custom:variables', '사용자 문서 변수', {
        author: '',
        description: '',
        systemPrompt: '',
        folders: [DEFAULT_VARIABLE_FOLDER],
        variables: [variable],
      }));
      return;
    }

    const name = createVariableName();
    const variable: AdvancedTemplateVariable = {
      name,
      label: '새 변수',
      type: 'text',
      folder: getDefaultFolder(),
      defaultValue: '',
      options: [],
      optionRules: [],
      description: '',
    };
    updateDocumentVariables({
      ...documentVariables,
      definition: {
        ...documentVariables.definition,
        variables: [...documentVariables.definition.variables, variable],
      },
      values: {
        ...documentVariables.values,
        [name]: evaluateTemplateVariable(variable, documentVariables.values),
      },
    });
  }

  function handleUpdateVariable(index: number, nextVariable: AdvancedTemplateVariable) {
    if (!documentVariables) return false;

    const current = documentVariables.definition.variables[index];
    if (!current) return false;

    const name = normalizeVariableName(nextVariable.name) || current.name;
    const duplicate = documentVariables.definition.variables.some((variable, variableIndex) =>
      variableIndex !== index && variable.name === name
    );
    if (duplicate) {
      alert('이미 같은 이름의 변수가 있습니다.');
      return false;
    }

    const variable = normalizeVariableForType({ ...nextVariable, name });
    const variables = documentVariables.definition.variables.map((item, variableIndex) =>
      variableIndex === index ? variable : item
    );
    const values = { ...documentVariables.values };
    if (current.name !== variable.name) {
      values[variable.name] = values[current.name] ?? evaluateTemplateVariable(variable, values);
      delete values[current.name];
    }
    if (variable.type === 'script' || variable.type === 'ai') {
      values[variable.name] = evaluateTemplateVariable(variable, values);
    } else if (!(variable.name in values)) {
      values[variable.name] = evaluateTemplateVariable(variable, values);
    }

    updateDocumentVariables({
      ...documentVariables,
      definition: {
        ...documentVariables.definition,
        variables,
      },
      values,
    });
    return true;
  }

  function handleDeleteVariable(index: number) {
    if (!documentVariables) return;
    const variable = documentVariables.definition.variables[index];
    if (!variable) return;
    if (!confirm(`"${variable.label || variable.name}" 변수를 삭제할까요?`)) return;

    const values = { ...documentVariables.values };
    delete values[variable.name];
    updateDocumentVariables({
      ...documentVariables,
      definition: {
        ...documentVariables.definition,
        variables: documentVariables.definition.variables.filter((_, variableIndex) => variableIndex !== index),
      },
      values,
    });
  }

  function handleExportYaml() {
    if (!documentVariables) return;
    const yaml = serializeAdvancedTemplateYaml(documentVariables.definition);
    const blob = new Blob([yaml], { type: 'text/yaml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${documentVariables.sourceName || 'document-variables'}.yaml`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleSaveProfile() {
    if (!documentVariables) return;
    const name = window.prompt('문서 변수 프리셋 이름을 입력하세요.', documentVariables.sourceName || '문서 변수 프리셋');
    if (!name?.trim()) return;
    const profile = saveDocumentVariableProfile(documentVariables, name.trim());
    updateDocumentVariables(profile.state);
  }

  function handleSelectProfile(profileId: string) {
    const profile = variableProfiles.find((item) => item.id === profileId);
    if (!profile) return;
    updateDocumentVariables(profile.state);
  }

  async function handleSelectBuiltInPreset(presetId: string) {
    const preset = builtInPresets.find((item) => item.id === presetId);
    if (!preset) return;

    try {
      const res = await fetch(preset.filePath);
      if (!res.ok) throw new Error(`프리셋 파일을 불러올 수 없습니다. (${res.status})`);

      const definition = parseAdvancedTemplateYaml(await res.text());
      updateDocumentVariables(createDocumentVariablesState(preset.id, preset.name, definition));
    } catch (error) {
      console.error('[document-variables] 기본 프리셋 로드 실패:', error);
      alert('기본 프리셋을 불러오지 못했습니다.');
    }
  }

  function handleSelectPreset(presetId: string) {
    if (!presetId) return;
    if (presetId.startsWith('builtin-preset-')) {
      void handleSelectBuiltInPreset(presetId);
      return;
    }
    handleSelectProfile(presetId);
  }

  function handleDeleteProfile() {
    if (!documentVariables) return;
    const profile = variableProfiles.find((item) => item.id === documentVariables.sourceId);
    if (!profile) return;
    if (!confirm(`"${profile.name}" 문서 변수 프리셋을 삭제할까요?`)) return;
    deleteDocumentVariableProfile(profile.id);
  }

  async function handleImportYaml(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const definition = parseAdvancedTemplateYaml(await file.text());
      updateDocumentVariables(createDocumentVariablesState(`import:${file.name}`, file.name, definition));
    } catch (error) {
      console.error('[document-variables] YAML 가져오기 실패:', error);
      alert('문서 변수 YAML을 가져오지 못했습니다.');
    }
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

        await throwIfTemplateAiFailed(res);

        const data = await res.json() as { text?: string };
        replacementValues[variable.name] = stripThinkTags(data.text || '');
      }

      const finalValues = createTemplateContext(replacementValues);
      for (const [name, value] of Object.entries(finalValues)) {
        await rhwpActions.replaceAll(`{{${name}}}`, value);
      }
    } catch (error) {
      console.error('[document-variables] 변수 적용 실패:', error);
      alert(error instanceof UserFacingAiError
        ? error.message
        : '문서 변수를 적용하는 중 오류가 발생했습니다.');
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

    await throwIfTemplateAiFailed(res);

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
      alert(error instanceof UserFacingAiError
        ? error.message
        : '문서 변수를 삽입하는 중 오류가 발생했습니다.');
    } finally {
      if (variable.type === 'ai') {
        setGeneratingVariableName(null);
      }
    }
  }

  const variables = documentVariables?.definition.variables ?? [];
  const aiCount = variables.filter((variable) => variable.type === 'ai').length;
  const variableFolders = createVariableFolders(documentVariables?.definition.folders || [], variables);
  const selectedPresetId = documentVariables && (
    builtInPresets.some((preset) => preset.id === documentVariables.sourceId)
    || variableProfiles.some((profile) => profile.id === documentVariables.sourceId)
  )
    ? documentVariables.sourceId
    : '';

  function toggleVariableFolder(folderName: string) {
    setCollapsedFolders((current) => {
      const next = new Set(current);
      if (next.has(folderName)) {
        next.delete(folderName);
      } else {
        next.add(folderName);
      }
      return next;
    });
  }

  return (
    <div className="flex h-full flex-col" style={{ background: 'var(--color-bg-panel)' }}>
      <div className="panel-header border-b border-[var(--color-bg-border)]">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold">프리셋</h2>
            <p className="text-[11px] text-[var(--color-text-muted)]">
              시스템 프롬프트와 문서 변수를 함께 관리하세요
            </p>
          </div>
          <div className="flex flex-shrink-0 items-center gap-1">
            <HeaderIconButton title="폴더 추가" onClick={handleAddFolder}>
              <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7l-2-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z" />
              <path d="M12 10v6" />
              <path d="M9 13h6" />
            </HeaderIconButton>
            <HeaderIconButton title="변수 추가" onClick={handleAddVariable}>
              <path d="M12 5v14M5 12h14" />
            </HeaderIconButton>
            <HeaderIconButton title="YAML 가져오기" onClick={() => importInputRef.current?.click()}>
              <path d="M12 3v12" />
              <path d="m7 8 5-5 5 5" />
              <path d="M5 21h14" />
            </HeaderIconButton>
            <HeaderIconButton title="YAML 내보내기" onClick={handleExportYaml} disabled={!documentVariables}>
              <path d="M12 21V9" />
              <path d="m7 16 5 5 5-5" />
              <path d="M5 3h14" />
            </HeaderIconButton>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          <select
            value={selectedPresetId}
            onChange={(event) => handleSelectPreset(event.target.value)}
            className="min-w-0 flex-1 rounded border border-[var(--color-bg-border)] bg-[var(--color-bg-surface)] px-2 py-1.5 text-xs text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand)]"
            title="AI 프리셋 선택"
          >
            <option value="" disabled>
              AI 프리셋 선택
            </option>
            {builtInPresets.length > 0 && (
              <optgroup label="기본 프리셋">
                {builtInPresets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name}
                  </option>
                ))}
              </optgroup>
            )}
            {variableProfiles.length > 0 && (
              <optgroup label="내 프리셋">
                {variableProfiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
          <HeaderIconButton
            title="현재 변수 세트를 AI 프리셋으로 저장"
            onClick={handleSaveProfile}
            disabled={!documentVariables}
          >
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <path d="M17 21v-8H7v8" />
            <path d="M7 3v5h8" />
          </HeaderIconButton>
          <HeaderIconButton
            title="현재 AI 프리셋 삭제"
            onClick={handleDeleteProfile}
            disabled={!selectedPresetId || selectedPresetId.startsWith('builtin-preset-')}
          >
            <path d="M3 6h18" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </HeaderIconButton>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {!documentVariables ? (
          <EmptyState
            builtInPresets={builtInPresets}
            profiles={variableProfiles}
            onCreate={createEmptyDocumentVariables}
            onImport={() => importInputRef.current?.click()}
            onSelectPreset={handleSelectPreset}
          />
        ) : (
          <div className="space-y-3">
            <PresetSection>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setIsDocumentInfoCollapsed((value) => !value)}
                  className="flex w-full items-center justify-between gap-2 text-left text-[11px] font-semibold"
                  style={{ color: 'var(--color-text-secondary)' }}
                  aria-expanded={!isDocumentInfoCollapsed}
                  title={isDocumentInfoCollapsed ? '문서 기본 정보 펼치기' : '문서 기본 정보 접기'}
                >
                  <PresetSectionTitle>문서 기본 정보</PresetSectionTitle>
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
            </PresetSection>

            {variables.length === 0 ? (
              <PresetSection title="문서 변수">
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  정의된 문서 변수가 없습니다.
                </p>
              </PresetSection>
            ) : (
              variableFolders.map((folder, folderIndex) => {
                const isCollapsed = collapsedFolders.has(folder.name);
                const accentColor = getVariableFolderAccent(folderIndex);
                const typeCounts = getVariableTypeCounts(folder.items);
                return (
                  <section
                    key={folder.name}
                    className="overflow-hidden rounded-lg border border-l-4 shadow-sm"
                    style={{
                      borderColor: 'var(--color-bg-border)',
                      borderLeftColor: accentColor,
                      background: 'var(--color-bg-base)',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => toggleVariableFolder(folder.name)}
                      className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left transition-colors hover:bg-[var(--color-bg-surface)]"
                      style={{
                        background: `linear-gradient(90deg, color-mix(in srgb, ${accentColor} 12%, transparent), transparent 72%)`,
                      }}
                      aria-expanded={!isCollapsed}
                      title={isCollapsed ? `${folder.name} 폴더 펼치기` : `${folder.name} 폴더 접기`}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md" style={{ color: accentColor, background: `color-mix(in srgb, ${accentColor} 13%, transparent)` }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7l-2-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z" />
                          </svg>
                        </span>
                        <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }} aria-hidden="true">
                          {isCollapsed ? '▸' : '▾'}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-xs font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                            {folder.name}
                          </span>
                          <span className="mt-0.5 flex flex-wrap gap-1">
                            {typeCounts.map((item) => (
                              <span
                                key={item.type}
                                className="rounded px-1 py-0.5 text-[9px] font-medium leading-none"
                                style={{
                                  color: item.color,
                                  background: `color-mix(in srgb, ${item.color} 10%, transparent)`,
                                }}
                              >
                                {item.label} {item.count}
                              </span>
                            ))}
                          </span>
                        </span>
                      </span>
                      <span
                        className="flex h-5 min-w-5 flex-shrink-0 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold"
                        style={{
                          background: `color-mix(in srgb, ${accentColor} 16%, transparent)`,
                          color: accentColor,
                        }}
                      >
                        {folder.items.length}
                      </span>
                    </button>
                    {!isCollapsed && (
                      <div
                        className="space-y-2 border-t p-2.5"
                        style={{
                          borderColor: 'var(--color-bg-border)',
                          background: 'color-mix(in srgb, var(--color-bg-surface) 48%, transparent)',
                        }}
                      >
                        {folder.items.length === 0 ? (
                          <p className="rounded-md border border-dashed px-2 py-3 text-center text-[10px] italic" style={{ borderColor: 'var(--color-bg-border)', color: 'var(--color-text-muted)' }}>
                            이 폴더에는 아직 변수가 없습니다.
                          </p>
                        ) : (
                          folder.items.map(({ variable, index }) => (
                            <DocumentVariableInput
                              key={index}
                              index={index}
                              variable={variable}
                              value={documentVariables.values[variable.name] ?? ''}
                              options={resolveTemplateVariableOptions(variable, documentVariables.values)}
                              isGenerating={generatingVariableName === variable.name}
                              onInsert={() => handleInsertVariable(
                                variable,
                                stripThinkTags(documentVariables.values[variable.name] ?? '')
                              )}
                              onChange={(value) => handleVariableChange(variable.name, stripThinkTags(value))}
                              onUpdate={(nextVariable) => handleUpdateVariable(index, nextVariable)}
                              onDelete={() => handleDeleteVariable(index)}
                            />
                          ))
                        )}
                      </div>
                    )}
                  </section>
                );
              })
            )}
          </div>
        )}
      </div>

      <div className="border-t border-[var(--color-bg-border)] p-3">
        <input
          ref={importInputRef}
          type="file"
          accept=".yaml,.yml,text/yaml,text/plain"
          className="hidden"
          onChange={handleImportYaml}
        />
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

async function throwIfTemplateAiFailed(res: Response) {
  if (res.ok) return;

  const errorText = await res.text();
  if (isLikelyAiConfigError(res.status, errorText)) {
    throw new UserFacingAiError(AI_CONFIG_ERROR_MESSAGE);
  }

  throw new Error(`AI 변수 생성 실패 (${res.status}): ${errorText}`);
}

function isLikelyAiConfigError(status: number, errorText: string) {
  const normalized = errorText.toLowerCase();
  return status === 401
    || status === 403
    || normalized.includes('forbidden')
    || normalized.includes('unauthorized')
    || normalized.includes('invalid api key')
    || normalized.includes('api key')
    || normalized.includes('authentication')
    || normalized.includes('permission');
}

function normalizeVariableName(name: string) {
  return name.trim().replace(/\s+/g, '_');
}

function normalizeVariableForType(variable: AdvancedTemplateVariable): AdvancedTemplateVariable {
  if (variable.type === 'select') {
    return {
      ...variable,
      options: variable.options,
      prompt: '',
      script: '',
    };
  }
  if (variable.type === 'script') {
    return {
      ...variable,
      options: [],
      prompt: '',
      script: variable.script || variable.defaultValue,
    };
  }
  if (variable.type === 'ai') {
    return {
      ...variable,
      options: [],
      script: '',
      prompt: variable.prompt || variable.defaultValue,
    };
  }
  return {
    ...variable,
    options: [],
    script: '',
    prompt: '',
  };
}

function PresetSection({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section
      className="space-y-3 rounded-xl border p-3.5 shadow-sm"
      style={{
        background: 'linear-gradient(180deg, color-mix(in srgb, var(--color-brand) 5%, var(--color-bg-base)), var(--color-bg-base) 56px)',
        borderColor: 'color-mix(in srgb, var(--color-brand) 32%, var(--color-bg-border))',
      }}
    >
      {title && <PresetSectionTitle>{title}</PresetSectionTitle>}
      {children}
    </section>
  );
}

function PresetSectionTitle({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-4 w-1 rounded-full" style={{ background: 'var(--color-brand)' }} />
      <p className="text-xs font-semibold" style={{ color: 'var(--color-brand)' }}>
        {children}
      </p>
    </div>
  );
}

function getVariableFolderName(variable: AdvancedTemplateVariable) {
  return variable.folder?.trim() || DEFAULT_VARIABLE_FOLDER;
}

function createVariableFolders(folderNames: string[], variables: AdvancedTemplateVariable[]) {
  const folders = new Map<string, Array<{ variable: AdvancedTemplateVariable; index: number }>>();

  for (const folderName of folderNames) {
    const normalized = folderName.trim();
    if (normalized) folders.set(normalized, []);
  }

  variables.forEach((variable, index) => {
    const folderName = getVariableFolderName(variable);
    folders.set(folderName, [...(folders.get(folderName) || []), { variable, index }]);
  });

  return Array.from(folders.entries()).map(([name, items]) => ({ name, items }));
}

function getVariableFolderAccent(index: number) {
  const colors = [
    'var(--ctp-blue)',
    'var(--ctp-green)',
    'var(--ctp-mauve)',
    'var(--ctp-teal)',
    'var(--ctp-peach)',
    'var(--ctp-sapphire)',
  ];
  return colors[index % colors.length];
}

function getVariableTypeCounts(items: Array<{ variable: AdvancedTemplateVariable; index: number }>) {
  const counts = new Map<AdvancedTemplateVariableType, number>();
  for (const { variable } of items) {
    counts.set(variable.type, (counts.get(variable.type) || 0) + 1);
  }

  return Array.from(counts.entries()).map(([type, count]) => {
    const meta = getVariableTypeMeta(type);
    return { type, count, label: meta.label, color: meta.color };
  });
}

function HeaderIconButton({
  title,
  disabled,
  onClick,
  children,
}: {
  title: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-7 w-7 items-center justify-center rounded border border-[var(--color-bg-border)] bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-surface2)] hover:text-[var(--color-text-primary)] disabled:cursor-not-allowed disabled:opacity-40"
      title={title}
      aria-label={title}
    >
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {children}
      </svg>
    </button>
  );
}

function EmptyState({
  builtInPresets,
  profiles,
  onCreate,
  onImport,
  onSelectPreset,
}: {
  builtInPresets: BuiltInPreset[];
  profiles: DocumentVariableProfile[];
  onCreate: () => void;
  onImport: () => void;
  onSelectPreset: (presetId: string) => void;
}) {
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
        프리셋 변수가 없습니다
      </p>
      <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
        AI 프리셋을 선택하거나 변수 YAML을 가져와 시작하세요.
      </p>
      <div className="mt-4 flex w-full max-w-48 flex-col gap-2">
        {(builtInPresets.length > 0 || profiles.length > 0) && (
          <select
            defaultValue=""
            onChange={(event) => onSelectPreset(event.target.value)}
            className="input py-1.5 text-xs"
          >
            <option value="" disabled>
              AI 프리셋 선택
            </option>
            {builtInPresets.length > 0 && (
              <optgroup label="기본 프리셋">
                {builtInPresets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name}
                  </option>
                ))}
              </optgroup>
            )}
            {profiles.length > 0 && (
              <optgroup label="내 프리셋">
                {profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        )}
        <button type="button" onClick={onCreate} className="btn btn-primary py-1.5 text-xs">
          새 변수 세트 만들기
        </button>
        <button type="button" onClick={onImport} className="btn btn-secondary py-1.5 text-xs">
          YAML 가져오기
        </button>
      </div>
    </div>
  );
}

function DocumentVariableInput({
  index,
  variable,
  value,
  options,
  isGenerating,
  onInsert,
  onChange,
  onUpdate,
  onDelete,
}: {
  index: number;
  variable: AdvancedTemplateVariable;
  value: string;
  options: string[];
  isGenerating: boolean;
  onInsert: () => void;
  onChange: (value: string) => void;
  onUpdate: (variable: AdvancedTemplateVariable) => boolean;
  onDelete: () => void;
}) {
  const typeMeta = getVariableTypeMeta(variable.type);
  const [isEditing, setIsEditing] = useState(false);
  const [draftVariable, setDraftVariable] = useState(variable);

  function startEditing() {
    setDraftVariable(variable);
    setIsEditing(true);
  }

  function cancelEditing() {
    setDraftVariable(variable);
    setIsEditing(false);
  }

  function saveEditing() {
    const saved = onUpdate(draftVariable);
    if (saved) {
      setIsEditing(false);
    }
  }

  return (
    <div
      className="block space-y-1 rounded-lg border p-2.5 transition-colors hover:bg-[var(--color-bg-surface)]"
      style={{ borderColor: 'var(--color-bg-border)' }}
    >
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onInsert}
          disabled={isGenerating}
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left text-[11px] font-medium disabled:cursor-wait disabled:opacity-75"
          title={
            isGenerating
              ? 'AI 응답 생성 중입니다'
              : variable.type === 'ai'
                ? 'AI 응답을 생성해 현재 커서 위치에 삽입'
                : '현재 커서 위치에 변수 값 삽입'
          }
        >
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
        </button>
        <code className="flex-shrink-0 text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
          {'{{'}{variable.name}{'}}'}
        </code>
        {isEditing ? (
          <>
            <VariableIconButton title="편집 저장" onClick={saveEditing} tone="success">
              <path d="M20 6 9 17l-5-5" />
            </VariableIconButton>
            <VariableIconButton title="편집 취소" onClick={cancelEditing} danger>
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </VariableIconButton>
          </>
        ) : (
          <VariableIconButton title="변수 편집" onClick={startEditing}>
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
          </VariableIconButton>
        )}
        <VariableIconButton title="변수 삭제" onClick={onDelete} danger>
          <path d="M3 6h18" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </VariableIconButton>
      </div>

      {isEditing && (
        <VariableDefinitionEditor
          index={index}
          variable={draftVariable}
          onUpdate={setDraftVariable}
        />
      )}

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

function VariableIconButton({
  title,
  danger,
  tone,
  onClick,
  children,
}: {
  title: string;
  danger?: boolean;
  tone?: 'success';
  onClick: () => void;
  children: ReactNode;
}) {
  const className = danger
    ? 'text-red-500 hover:bg-red-500/10 hover:text-red-600'
    : tone === 'success'
      ? 'text-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-600'
      : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-surface2)] hover:text-[var(--color-text-primary)]';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded border border-[var(--color-bg-border)] bg-[var(--color-bg-surface)] transition-colors ${className}`}
      title={title}
      aria-label={title}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {children}
      </svg>
    </button>
  );
}

function VariableDefinitionEditor({
  index,
  variable,
  onUpdate,
}: {
  index: number;
  variable: AdvancedTemplateVariable;
  onUpdate: (variable: AdvancedTemplateVariable) => void;
}) {
  function updateField<K extends keyof AdvancedTemplateVariable>(field: K, value: AdvancedTemplateVariable[K]) {
    onUpdate({ ...variable, [field]: value });
  }

  function updateType(type: AdvancedTemplateVariableType) {
    onUpdate(normalizeVariableForType({
      ...variable,
      type,
      defaultValue: type === 'select' ? variable.defaultValue || variable.options[0] || '' : variable.defaultValue,
    }));
  }

  return (
    <div
      className="space-y-2 rounded-md border p-2"
      style={{
        borderColor: 'var(--color-bg-border)',
        background: 'var(--color-bg-surface)',
      }}
    >
      <div className="grid grid-cols-2 gap-2">
        <label className="block space-y-1">
          <span className="text-[10px] font-medium" style={{ color: 'var(--color-text-muted)' }}>
            변수명
          </span>
          <input
            value={variable.name}
            onChange={(event) => updateField('name', event.target.value)}
            className="input py-1.5"
            placeholder={`variable${index + 1}`}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-[10px] font-medium" style={{ color: 'var(--color-text-muted)' }}>
            타입
          </span>
          <select
            value={variable.type}
            onChange={(event) => updateType(event.target.value as AdvancedTemplateVariableType)}
            className="input py-1.5"
          >
            <option value="text">텍스트</option>
            <option value="select">선택</option>
            <option value="script">스크립트</option>
            <option value="ai">AI</option>
          </select>
        </label>
      </div>

      <label className="block space-y-1">
        <span className="text-[10px] font-medium" style={{ color: 'var(--color-text-muted)' }}>
          라벨
        </span>
        <input
          value={variable.label}
          onChange={(event) => updateField('label', event.target.value)}
          className="input py-1.5"
          placeholder="사이드바에 표시할 이름"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-[10px] font-medium" style={{ color: 'var(--color-text-muted)' }}>
          폴더
        </span>
        <input
          value={variable.folder || ''}
          onChange={(event) => updateField('folder', event.target.value)}
          className="input py-1.5"
          placeholder={DEFAULT_VARIABLE_FOLDER}
        />
      </label>

      <label className="block space-y-1">
        <span className="text-[10px] font-medium" style={{ color: 'var(--color-text-muted)' }}>
          설명
        </span>
        <textarea
          value={variable.description || ''}
          onChange={(event) => updateField('description', event.target.value)}
          className="input min-h-14 resize-y py-1.5"
          placeholder="변수 설명"
        />
      </label>

      {variable.type === 'select' ? (
        <>
          <label className="block space-y-1">
            <span className="text-[10px] font-medium" style={{ color: 'var(--color-text-muted)' }}>
              기본값
            </span>
            <input
              value={variable.defaultValue}
              onChange={(event) => updateField('defaultValue', event.target.value)}
              className="input py-1.5"
              placeholder="선택지 중 기본값"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-[10px] font-medium" style={{ color: 'var(--color-text-muted)' }}>
              선택지
            </span>
            <textarea
              value={variable.options.join('\n')}
              onChange={(event) => updateField(
                'options',
                event.target.value.split('\n').map((option) => option.trim()).filter(Boolean)
              )}
              className="input min-h-20 resize-y py-1.5"
              placeholder={'한 줄에 하나씩 입력\n예: 기획팀'}
            />
          </label>
        </>
      ) : variable.type === 'script' ? (
        <label className="block space-y-1">
          <span className="text-[10px] font-medium" style={{ color: 'var(--color-text-muted)' }}>
            스크립트
          </span>
          <textarea
            value={variable.script || ''}
            onChange={(event) => updateField('script', event.target.value)}
            className="input min-h-20 resize-y py-1.5 font-mono"
            placeholder={'date("yyyy-MM-dd")\nnumber(value("amount")) * 1.1'}
          />
        </label>
      ) : variable.type === 'ai' ? (
        <label className="block space-y-1">
          <span className="text-[10px] font-medium" style={{ color: 'var(--color-text-muted)' }}>
            AI 프롬프트
          </span>
          <textarea
            value={variable.prompt || variable.defaultValue}
            onChange={(event) => updateField('prompt', event.target.value)}
            className="input min-h-24 resize-y py-1.5"
            placeholder="AI에 전달할 프롬프트"
          />
        </label>
      ) : (
        <label className="block space-y-1">
          <span className="text-[10px] font-medium" style={{ color: 'var(--color-text-muted)' }}>
            기본값
          </span>
          <input
            value={variable.defaultValue}
            onChange={(event) => updateField('defaultValue', event.target.value)}
            className="input py-1.5"
            placeholder="기본 입력값"
          />
        </label>
      )}
    </div>
  );
}

function getVariableTypeMeta(type: AdvancedTemplateVariable['type']) {
  switch (type) {
    case 'select':
      return { label: '선택', color: 'var(--ctp-sapphire)' };
    case 'script':
      return { label: '스크립트', color: 'var(--ctp-peach)' };
    case 'ai':
      return { label: 'AI', color: 'var(--ctp-mauve)' };
    case 'text':
    default:
      return { label: '텍스트', color: 'var(--ctp-blue)' };
  }
}
