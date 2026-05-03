'use client';

import { useEffect, useRef, useState } from 'react';
import { setEditorInstance, RhwpDocumentContext, RhwpEditorInstance, RhwpField } from '@/lib/rhwp/loader';

type LoadState = 'idle' | 'loading' | 'ready' | 'error';

const STUDIO_URL = '/rhwp-studio/index.html';
let rhwpRequestId = 0;

type RhwpEmbeddedEditor = {
  element: HTMLIFrameElement;
  loadFile: (data: ArrayBuffer | Uint8Array, fileName?: string) => Promise<{ pageCount: number }>;
  destroy: () => void;
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
  const editorRef = useRef<RhwpEmbeddedEditor | null>(null);

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

        editorRef.current = editor as RhwpEmbeddedEditor;

        const request = <T,>(method: string, params: Record<string, unknown> = {}) => {
          const iframe = (editor as RhwpEmbeddedEditor).element;
          const target = iframe.contentWindow;

          if (!target) {
            return Promise.reject(new Error('에디터 iframe이 준비되지 않았습니다.'));
          }

          return new Promise<T>((resolve, reject) => {
            const id = `hwp-maker:${++rhwpRequestId}`;
            const timeout = window.setTimeout(() => {
              window.removeEventListener('message', handleMessage);
              reject(new Error(`rhwp 요청 시간이 초과되었습니다: ${method}`));
            }, 10000);

            const handleMessage = (event: MessageEvent) => {
              if (event.source !== target) return;
              const data = event.data;
              if (!data || data.type !== 'rhwp-response' || data.id !== id) return;

              window.clearTimeout(timeout);
              window.removeEventListener('message', handleMessage);

              if (data.error) {
                reject(new Error(String(data.error)));
              } else {
                resolve(data.result as T);
              }
            };

            window.addEventListener('message', handleMessage);
            target.postMessage({ type: 'rhwp-request', id, method, params }, window.location.origin);
          });
        };

        // RhwpEditorInstance 인터페이스에 맞게 래핑하여 등록
        const wrappedInstance: RhwpEditorInstance = {
          readDocument: async () => request<RhwpDocumentContext>('getDocumentText'),
          getFieldList: async () => request<RhwpField[]>('getFieldList'),
          setFieldValueByName: async (name, value) =>
            request('setFieldValueByName', { name, value }),
          replaceAll: async (query, text, caseSensitive = false) =>
            request('replaceAll', { query, text, caseSensitive }),
          insertText: async (text, position) =>
            request('insertText', { text, ...(position ?? { atCursor: true }) }),
          export: async (format) => {
            const result = await request<ExportFileResult>('exportFile', { format });
            return new Blob([new Uint8Array(result.data)], { type: result.mimeType });
          },
          load: async (data, fileName) => {
            // @rhwp/editor 패키지 명세 확인 결과 메서드명이 loadFile 임
            const buffer = data instanceof Blob ? await data.arrayBuffer() : data;
            await (editor as RhwpEmbeddedEditor).loadFile(buffer, toRhwpSafeFileName(fileName));
          },
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
      // ✅ React Strict Mode double-invoke 대응: cleanup 시 initGuard 리셋
      // 이렇게 해야 remount 시 에디터를 다시 초기화할 수 있습니다.
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
                에디터 로딩 중…
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
