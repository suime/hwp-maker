'use client';

import { useEffect, useRef, useState } from 'react';

type LoadState = 'idle' | 'loading' | 'ready' | 'error';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RhwpEditor = any;

const STUDIO_URL = '/rhwp-studio/';

export default function PreviewPanel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<RhwpEditor | null>(null);
  // Strict Mode 이중 실행 방지
  const initGuard = useRef(false);
  const [state, setLoadState] = useState<LoadState>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    // Strict Mode 두 번째 실행 방지
    if (initGuard.current) return;
    initGuard.current = true;

    const container = containerRef.current;
    if (!container) return;

    // 혹시 남아있는 iframe 제거
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
        if (!alive) { editor.destroy(); return; }
        editorRef.current = editor;
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
      // initGuard는 reset하지 않음 — Strict Mode 재실행 막기 위해
      editorRef.current?.destroy();
      editorRef.current = null;
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
