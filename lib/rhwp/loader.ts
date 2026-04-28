/**
 * rhwp 에디터 인스턴스 관리 및 제어 브릿지
 * 'use client' 환경에서 사용됩니다.
 */

export interface RhwpEditorInstance {
  /** 에디터에 명령을 전달합니다. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  send: (command: string, data?: any) => void;
  /** 현재 문서를 특정 포맷으로 내보냅니다. */
  export: (format: 'hwp' | 'hwpx') => Promise<Blob>;
  /** 문서를 에디터에 로드합니다. */
  load: (data: Blob | ArrayBuffer) => Promise<void>;
  /** 에디터 리소스를 해제합니다. */
  destroy: () => void;
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
  return () => _listeners.delete(listener);
}

/**
 * AI 명령을 에디터가 이해할 수 있는 동작으로 변환하여 실행합니다.
 * TODO: 에디터 패키지의 실제 API 사양에 따라 구현 보완 필요
 */
export const rhwpActions = {
  /** 텍스트 삽입 */
  insertText: (text: string) => {
    _editorInstance?.send('edit:insert-text', { text });
  },
  /** 스타일 적용 (글자 모양 등) */
  applyCharShape: (shape: { size?: number; bold?: boolean; color?: string }) => {
    _editorInstance?.send('format:char-shape', shape);
  },
  /** 문서 전체 초기화 및 새 내용 설정 */
  resetAndInsert: (text: string) => {
    _editorInstance?.send('edit:select-all');
    _editorInstance?.send('edit:delete');
    _editorInstance?.send('edit:insert-text', { text });
  }
};
