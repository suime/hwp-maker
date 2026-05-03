'use client';

import { useEffect, useRef, useState } from 'react';
import { setEditorInstance, RhwpEditorInstance } from '@/lib/rhwp/loader';

type LoadState = 'idle' | 'loading' | 'ready' | 'error';

const STUDIO_URL = '/rhwp-studio/index.html';

/**
 * @rhwp/editor RhwpEditor 인스턴스 — 타입 정의에 없는 내부 메서드 포함.
 * 번들은 rhwp-request 프로토콜을 완전히 구현하므로 _request()로 모든 커맨드를 전달합니다.
 */
type RhwpEditorInternal = {
  element: HTMLIFrameElement;
  loadFile: (data: ArrayBuffer | Uint8Array, fileName?: string) => Promise<{ pageCount: number }>;
  destroy: () => void;
  /** 패키지 내부 postMessage 송수신 헬퍼 (공개 타입에는 없음) */
  _request: <T>(method: string, params?: Record<string, unknown>) => Promise<T>;
};

type ExportFileResult = {
  format: 'hwp' | 'hwpx';
  mimeType: string;
  data: number[];
};

function toRhwpSafeFileName(fileName?: string) {
  const normalized = fileName?.toLowerCase() || '';
  return normalized.endsWith('.hwpx') ? 'document.hwpx' : 'document.hwp';
}

export default function PreviewPanel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, setLoadState] = useState<LoadState>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  // Strict Mode 이중 실행 방지 및 인스턴스 참조 보관
  const initGuard = useRef(false);
  const editorRef = useRef<RhwpEditorInternal | null>(null);

  useEffect(() => {
    if (initGuard.current) return;
    initGuard.current = true;

    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = '';
    setLoadState('loading');

    let alive = true;

    import('@rhwp/editor')
      .then(({ createEditor }) =>
        createEditor(container, {
          studioUrl: STUDIO_URL,
          width: '100%',
          height: '100%',
        })
      )
      .then((editor) => {
        if (!alive) {
          editor.destroy();
          return;
        }

        const e = editor as unknown as RhwpEditorInternal;
        editorRef.current = e;

        /**
         * rhwp-studio 번들이 구현한 메시지 프로토콜 전체를 연결합니다.
         * 패키지 내부의 _request()가 { type:'rhwp-request', id, method, params }를
         * iframe으로 보내고 { type:'rhwp-response', id, result/error }를 수신합니다.
         *
         * 번들 switch 케이스 (index-BLKwf-s7.js 기준):
         *   loadFile, pageCount, getPageSvg, ready, getDocumentText,
         *   getFieldList, getDocumentInfo, setFieldValue, setFieldValueByName,
         *   replaceAll, replaceText, insertText, pasteHtml, exportHwp, exportFile
         */
        const wrappedInstance: RhwpEditorInstance = {
          // 문서 컨텍스트 전체 읽기
          readDocument: () => e._request('getDocumentText'),

          // 필드 목록 조회
          getFieldList: () => e._request('getFieldList'),

          // 이름 기반 필드 값 설정
          setFieldValueByName: (name, value) =>
            e._request('setFieldValueByName', { name, value }),

          // 문서 전체 텍스트 치환
          replaceAll: (query, text, caseSensitive = false) =>
            e._request('replaceAll', { query, text, caseSensitive }),

          // 텍스트 삽입 (position 없으면 캐럿 위치에 삽입)
          insertText: (text, position) =>
            e._request('insertText', {
              text,
              ...(position
                ? {
                    sectionIndex: position.sectionIndex,
                    paragraphIndex: position.paragraphIndex,
                    charOffset: position.charOffset,
                  }
                : { atCursor: true }),
            }),

          // 파일 내보내기 (hwp / hwpx)
          export: async (format) => {
            const result = await e._request<ExportFileResult>('exportFile', { format });
            return new Blob([new Uint8Array(result.data)], { type: result.mimeType });
          },

          // 파일 로드 — 패키지의 loadFile() 직접 사용
          load: async (data, fileName) => {
            const buffer = data instanceof Blob ? await data.arrayBuffer() : data;
            await e.loadFile(buffer, toRhwpSafeFileName(fileName));
          },

          // 에디터 리소스 해제
          destroy: () => editor.destroy(),
        };

        setEditorInstance(wrappedInstance);
        setLoadState('ready');
      })
      .catch((err: unknown) => {
        if (!alive) return;
        console.error('[rhwp] 에디터 초기화 실패:', err);
        setErrorMsg(err instanceof Error ? err.message : String(err));
        setLoadState('error');
      });

    return () => {
      alive = false;
      // React Strict Mode double-invoke 대응: cleanup 시 initGuard 리셋
      initGuard.current = false;
      if (editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
      setEditorInstance(null);
    };
  }, []);

  return (
    <div className="relative flex flex-col h-full" style={{ background: 'var(--color-bg-base)' }}>
      {/* 에디터 컨테이너 */}
      <div
        ref={containerRef}
        className="flex-1 w-full overflow-hidden"
        style={{ opacity: state === 'ready' ? 1 : 0, transition: 'opacity 0.3s ease' }}
      />

      {/* 로딩 / 에러 오버레이 */}
      {state !== 'ready' && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-4"
          style={{ background: 'var(--color-bg-base)' }}
        >
          {state !== 'error' ? (
            <>
              <LoadingSpinner />
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                에디터 로딩 중&hellip;
              </p>
            </>
          ) : (
            <div className="text-center px-6">
              <p className="text-base font-medium mb-2" style={{ color: 'var(--ctp-red)' }}>
                에디터를 불러오지 못했습니다
              </p>
              <p
                className="text-xs font-mono px-3 py-2 rounded-lg"
                style={{ color: 'var(--color-text-muted)', background: 'var(--color-bg-surface)' }}
              >
                {errorMsg || '알 수 없는 오류'}
              </p>
              <p className="text-xs mt-3" style={{ color: 'var(--color-text-muted)' }}>
                <code>/rhwp-studio/index.html</code> 파일이 있는지 확인하세요
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LoadingSpinner() {
  return (
    <svg className="animate-spin" width="32" height="32" viewBox="0 0 24 24" fill="none"
      style={{ color: 'var(--color-brand)' }}>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeOpacity="0.2" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
