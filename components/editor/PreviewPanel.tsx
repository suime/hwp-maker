'use client';

import { useEffect, useRef, useState } from 'react';
import { setEditorInstance, RhwpEditorInstance } from '@/lib/rhwp/loader';

type LoadState = 'idle' | 'loading' | 'ready' | 'error';

const STUDIO_URL = '/rhwp-studio/index.html';

export default function PreviewPanel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, setLoadState] = useState<LoadState>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  
  // Strict Mode 이중 실행 방지 및 인스턴스 참조 보관
  const initGuard = useRef(false);
  const editorRef = useRef<any>(null);

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

        editorRef.current = editor;

        // RhwpEditorInstance 인터페이스에 맞게 래핑하여 등록
        const wrappedInstance: RhwpEditorInstance = {
          send: (command, data) => editor.send(command, data),
          export: async (format) => {
            // 에디터의 export API가 있다고 가정 (실제 사양에 맞춰 조정 필요)
            return await editor.export({ format });
          },
          load: async (data) => {
            await editor.load(data);
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
