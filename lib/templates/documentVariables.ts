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

const STORAGE_KEY = 'hwp-maker:document-variables';
export const DOCUMENT_VARIABLES_CHANGED_EVENT = 'document-variables-changed';

function notifyDocumentVariablesChanged() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(DOCUMENT_VARIABLES_CHANGED_EVENT));
}

export function createDocumentVariablesState(
  sourceId: string,
  sourceName: string,
  definition: AdvancedTemplateDefinition
): ActiveDocumentVariables {
  const values = Object.fromEntries(
    definition.variables.map((variable) => [variable.name, evaluateTemplateVariable(variable)])
  );

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
      type: variable.type === ('llm' as AdvancedTemplateVariable['type']) ? 'ai' : variable.type,
    })),
  };
  const oldState = state as ActiveDocumentVariables & { llmPromptValuesVersion?: 1 };

  if (state.aiPromptValuesVersion !== 1 && oldState.llmPromptValuesVersion !== 1) {
    for (const variable of definition.variables) {
      if (variable.type === 'ai') {
        values[variable.name] = evaluateTemplateVariable(variable);
      }
    }
  }

  return {
    ...state,
    definition,
    values: normalizeTemplateVariableValues(definition, values),
    aiPromptValuesVersion: 1,
  };
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
