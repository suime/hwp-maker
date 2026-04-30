import {
  evaluateTemplateVariable,
  type AdvancedTemplateDefinition,
} from '@/lib/templates/advanced';

export interface ActiveDocumentVariables {
  sourceId: string;
  sourceName: string;
  definition: AdvancedTemplateDefinition;
  values: Record<string, string>;
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
  return {
    sourceId,
    sourceName,
    definition,
    values: Object.fromEntries(
      definition.variables.map((variable) => [variable.name, evaluateTemplateVariable(variable)])
    ),
  };
}

export function loadDocumentVariables(): ActiveDocumentVariables | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) as ActiveDocumentVariables : null;
  } catch (error) {
    console.error('문서 변수 로드 실패:', error);
    return null;
  }
}

export function saveDocumentVariables(state: ActiveDocumentVariables): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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
