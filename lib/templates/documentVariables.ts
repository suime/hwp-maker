import {
  evaluateTemplateVariable,
  normalizeTemplateVariableValues,
  type AdvancedTemplateDefinition,
  type AdvancedTemplateVariable,
} from '@/lib/templates/advanced';

export interface ActiveDocumentVariables {
  sourceId: string;
  sourceName: string;
  definition: AdvancedTemplateDefinition;
  values: Record<string, string>;
  aiPromptValuesVersion?: 1;
}

export interface DocumentVariableProfile {
  id: string;
  name: string;
  updatedAt: number;
  state: ActiveDocumentVariables;
}

const STORAGE_KEY = 'hwp-maker:document-variables';
const PROFILES_KEY = 'hwp-maker:document-variable-profiles';
export const DOCUMENT_VARIABLES_CHANGED_EVENT = 'document-variables-changed';
export const DOCUMENT_VARIABLE_PROFILES_CHANGED_EVENT = 'document-variable-profiles-changed';

function notifyDocumentVariablesChanged() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(DOCUMENT_VARIABLES_CHANGED_EVENT));
}

function notifyDocumentVariableProfilesChanged() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(DOCUMENT_VARIABLE_PROFILES_CHANGED_EVENT));
}

export function createDocumentVariablesState(
  sourceId: string,
  sourceName: string,
  definition: AdvancedTemplateDefinition
): ActiveDocumentVariables {
  const values: Record<string, string> = {};
  for (const variable of definition.variables) {
    values[variable.name] = evaluateTemplateVariable(variable, values);
  }

  return {
    sourceId,
    sourceName,
    definition,
    values: normalizeTemplateVariableValues(definition, values),
    aiPromptValuesVersion: 1,
  };
}

function normalizeDocumentVariablesState(state: ActiveDocumentVariables): ActiveDocumentVariables {
  const values = { ...state.values };
  const definition = {
    ...state.definition,
    variables: state.definition.variables.map((variable) => ({
      ...variable,
      type: variable.type === ('llm' as AdvancedTemplateVariable['type'])
        ? 'ai'
        : variable.type === ('date' as AdvancedTemplateVariable['type'])
          ? 'script'
          : variable.type,
    })),
  };
  const oldState = state as ActiveDocumentVariables & { llmPromptValuesVersion?: 1 };

  if (state.aiPromptValuesVersion !== 1 && oldState.llmPromptValuesVersion !== 1) {
    for (const variable of definition.variables) {
      if (variable.type === 'ai') {
        values[variable.name] = evaluateTemplateVariable(variable, values);
      }
    }
  }

  for (const variable of definition.variables) {
    if (variable.type === 'script') {
      values[variable.name] = evaluateTemplateVariable(variable, values);
    }
  }

  return {
    ...state,
    definition,
    values: normalizeTemplateVariableValues(definition, values),
    aiPromptValuesVersion: 1,
  };
}

function readProfiles(): DocumentVariableProfile[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = localStorage.getItem(PROFILES_KEY);
    if (!raw) return [];
    const profiles = JSON.parse(raw) as DocumentVariableProfile[];
    return profiles
      .map((profile) => ({
        ...profile,
        state: normalizeDocumentVariablesState(profile.state),
      }))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  } catch (error) {
    console.error('문서 변수 프리셋 로드 실패:', error);
    return [];
  }
}

function writeProfiles(profiles: DocumentVariableProfile[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
  notifyDocumentVariableProfilesChanged();
}

export function getDocumentVariableProfiles() {
  return readProfiles();
}

export function saveDocumentVariableProfile(
  state: ActiveDocumentVariables,
  name = state.sourceName || '문서 변수 프리셋'
) {
  const normalized = normalizeDocumentVariablesState({
    ...state,
    sourceName: name,
  });
  const currentProfiles = readProfiles();
  const isExistingProfile = currentProfiles.some((profile) => profile.id === normalized.sourceId);
  const id = isExistingProfile ? normalized.sourceId : `variable-profile-${Date.now()}`;
  const profileState = {
    ...normalized,
    sourceId: id,
    sourceName: name,
  };
  const profile: DocumentVariableProfile = {
    id,
    name,
    updatedAt: Date.now(),
    state: profileState,
  };
  const next = isExistingProfile
    ? currentProfiles.map((item) => item.id === id ? profile : item)
    : [profile, ...currentProfiles];

  writeProfiles(next);
  return profile;
}

export function deleteDocumentVariableProfile(id: string) {
  writeProfiles(readProfiles().filter((profile) => profile.id !== id));
}

export function loadDocumentVariables(): ActiveDocumentVariables | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeDocumentVariablesState(JSON.parse(raw) as ActiveDocumentVariables) : null;
  } catch (error) {
    console.error('문서 변수 로드 실패:', error);
    return null;
  }
}

export function saveDocumentVariables(state: ActiveDocumentVariables): void {
  if (typeof window === 'undefined') return;
  const normalized = normalizeDocumentVariablesState(state);
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...normalized,
    })
  );
  notifyDocumentVariablesChanged();
}

export function clearDocumentVariables(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
  notifyDocumentVariablesChanged();
}

export function subscribeDocumentVariables(listener: () => void) {
  if (typeof window === 'undefined') return () => {};

  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) listener();
  };

  window.addEventListener(DOCUMENT_VARIABLES_CHANGED_EVENT, listener);
  window.addEventListener('storage', handleStorage);

  return () => {
    window.removeEventListener(DOCUMENT_VARIABLES_CHANGED_EVENT, listener);
    window.removeEventListener('storage', handleStorage);
  };
}

export function subscribeDocumentVariableProfiles(listener: () => void) {
  if (typeof window === 'undefined') return () => {};

  const handleStorage = (event: StorageEvent) => {
    if (event.key === PROFILES_KEY) listener();
  };

  window.addEventListener(DOCUMENT_VARIABLE_PROFILES_CHANGED_EVENT, listener);
  window.addEventListener('storage', handleStorage);

  return () => {
    window.removeEventListener(DOCUMENT_VARIABLE_PROFILES_CHANGED_EVENT, listener);
    window.removeEventListener('storage', handleStorage);
  };
}
