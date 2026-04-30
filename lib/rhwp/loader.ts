/**
 * rhwp 에디터 인스턴스 관리 및 제어 브릿지
 * 'use client' 환경에서 사용됩니다.
 */

export interface RhwpEditorInstance {
  /** 현재 문서의 본문/필드 정보를 AI 컨텍스트로 읽습니다. */
  readDocument: () => Promise<RhwpDocumentContext>;
  /** 현재 문서의 필드 목록을 반환합니다. */
  getFieldList: () => Promise<RhwpField[]>;
  /** 이름 기반 필드 값을 설정합니다. */
  setFieldValueByName: (name: string, value: string) => Promise<unknown>;
  /** 문서 전체에서 텍스트를 찾아 바꿉니다. */
  replaceAll: (query: string, text: string, caseSensitive?: boolean) => Promise<unknown>;
  /** 현재 캐럿 또는 지정 위치에 텍스트를 삽입합니다. */
  insertText: (text: string, position?: RhwpTextPosition) => Promise<unknown>;
  /** 현재 문서를 특정 포맷으로 내보냅니다. */
  export: (format: 'hwp' | 'hwpx') => Promise<Blob>;
  /** 문서를 에디터에 로드합니다. */
  load: (data: Blob | ArrayBuffer) => Promise<void>;
  /** 에디터 리소스를 해제합니다. */
  destroy: () => void;
}

export interface RhwpTextPosition {
  sectionIndex: number;
  paragraphIndex: number;
  charOffset: number;
}

export interface RhwpParagraphContext extends RhwpTextPosition {
  text: string;
}

export interface RhwpDocumentContext {
  text: string;
  paragraphs: RhwpParagraphContext[];
  fields: RhwpField[];
  pageCount: number;
  sectionCount: number;
  sourceFormat?: string;
}

export interface RhwpField {
  fieldId?: number;
  fieldType?: string;
  name?: string;
  guide?: string;
  command?: string;
  value?: string;
  location?: unknown;
}

let _editorInstance: RhwpEditorInstance | null = null;
const _listeners: Set<(instance: RhwpEditorInstance | null) => void> = new Set();

/**
 * 에디터 인스턴스를 등록합니다. (PreviewPanel에서 호출)
 */
export function setEditorInstance(instance: RhwpEditorInstance | null) {
  _editorInstance = instance;
  _listeners.forEach((listener) => listener(instance));
}

/**
 * 현재 등록된 에디터 인스턴스를 가져옵니다.
 */
export function getEditorInstance(): RhwpEditorInstance | null {
  return _editorInstance;
}

/**
 * 에디터 인스턴스 상태 변경을 감지합니다.
 */
export function subscribeEditor(listener: (instance: RhwpEditorInstance | null) => void) {
  _listeners.add(listener);
  listener(_editorInstance); // 즉시 현재 상태 전달
  return () => {
    _listeners.delete(listener);
  };
}

/**
 * AI 명령을 에디터가 이해할 수 있는 동작으로 변환하여 실행합니다.
 * TODO: 에디터 패키지의 실제 API 사양에 따라 구현 보완 필요
 */
export const rhwpActions = {
  /** 문서 컨텍스트 읽기 */
  readDocument: async () => {
    if (!_editorInstance) throw new Error('에디터가 초기화되지 않았습니다.');
    return await _editorInstance.readDocument();
  },
  /** 필드 목록 조회 */
  getFieldList: async () => {
    if (!_editorInstance) throw new Error('에디터가 초기화되지 않았습니다.');
    return await _editorInstance.getFieldList();
  },
  /** 필드 값 채우기 */
  fillField: async (name: string, value: string) => {
    if (!_editorInstance) throw new Error('에디터가 초기화되지 않았습니다.');
    return await _editorInstance.setFieldValueByName(name, value);
  },
  /** 여러 필드 값을 한 번에 채우기 */
  fillFields: async (values: Record<string, string>) => {
    if (!_editorInstance) throw new Error('에디터가 초기화되지 않았습니다.');
    const results: Record<string, unknown> = {};
    for (const [name, value] of Object.entries(values)) {
      results[name] = await _editorInstance.setFieldValueByName(name, value);
    }
    return results;
  },
  /** 텍스트 전체 치환 */
  replaceAll: async (query: string, text: string, caseSensitive = false) => {
    if (!_editorInstance) throw new Error('에디터가 초기화되지 않았습니다.');
    return await _editorInstance.replaceAll(query, text, caseSensitive);
  },
  /** 텍스트 삽입 */
  insertText: async (text: string, position?: RhwpTextPosition) => {
    if (!_editorInstance) throw new Error('에디터가 초기화되지 않았습니다.');
    return await _editorInstance.insertText(text, position);
  },
  /** 스타일 적용 (글자 모양 등) */
  applyCharShape: (shape: { size?: number; bold?: boolean; color?: string }) => {
    console.warn('[rhwp] applyCharShape is not supported by the current editor bridge.', shape);
  },
  /** 문서 전체 초기화 및 새 내용 설정 */
  resetAndInsert: async (text: string) => {
    if (!_editorInstance) throw new Error('에디터가 초기화되지 않았습니다.');
    return await _editorInstance.insertText(text);
  },
  /** 문서 로드 (ArrayBuffer/Blob) */
  load: async (data: Blob | ArrayBuffer) => {
    if (!_editorInstance) throw new Error('에디터가 초기화되지 않았습니다.');
    // PreviewPanel에서 래핑된 인스턴스의 load 메서드(loadFile 호출)를 실행
    await _editorInstance.load(data);
  },
  /** 문서 내보내기 */
  export: async (format: 'hwp' | 'hwpx') => {
    if (!_editorInstance) throw new Error('에디터가 초기화되지 않았습니다.');
    return await _editorInstance.export(format);
  }
};
