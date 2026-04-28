'use client';

type ViewMode = 'edit' | 'preview';

export default function PreviewPanel() {
  return (
    <div
      className="flex flex-col h-full"
      style={{ background: 'var(--color-bg-base)' }}
    >
      <ViewModeBar />
      <DocumentCanvas />
    </div>
  );
}

function ViewModeBar() {
  return (
    <div
      className="flex items-center justify-between px-4 h-10 border-b flex-shrink-0"
      style={{
        background: 'var(--color-bg-panel)',
        borderColor: 'var(--color-bg-border)',
      }}
    >
      {/* 뷰 모드 탭 */}
      <div
        className="flex items-center gap-0.5 rounded-lg p-0.5"
        style={{ background: 'var(--color-bg-surface)' }}
      >
        <ViewTab id="view-edit" label="편집" active />
        <ViewTab id="view-preview" label="미리보기" active={false} />
      </div>

      {/* 상태 */}
      <span className="badge-warning text-xs">rhwp WASM 연동 대기</span>
    </div>
  );
}

function ViewTab({ id, label, active }: { id: string; label: string; active: boolean }) {
  return (
    <button
      id={id}
      className="px-3 py-1 text-xs rounded-md transition-all"
      style={
        active
          ? {
              background: 'var(--color-bg-panel)',
              color: 'var(--color-text-primary)',
              fontWeight: 500,
            }
          : {
              background: 'transparent',
              color: 'var(--color-text-muted)',
            }
      }
    >
      {label}
    </button>
  );
}

function DocumentCanvas() {
  return (
    <div
      className="flex-1 overflow-auto flex justify-center py-10 px-6"
      style={{ background: 'var(--color-doc-canvas)' }}
    >
      {/* A4 문서 용지 */}
      <div
        className="rounded-sm shadow-xl relative flex-shrink-0"
        style={{
          width: '210mm',
          minHeight: '297mm',
          padding: '25mm 20mm',
          background: 'var(--color-doc-paper)',
          color: '#333',
        }}
      >
        {/* 플레이스홀더 */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
          <div className="text-center opacity-[0.12]">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mx-auto mb-3 opacity-60">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <p className="text-sm font-medium text-gray-400">
              rhwp WASM 연동 후<br />문서가 표시됩니다
            </p>
          </div>
        </div>

        {/* 스켈레톤 */}
        <div className="space-y-3 opacity-[0.06]">
          <div className="h-7 bg-gray-500 rounded w-1/2 mx-auto mb-8" />
          {[1, 0.88, 0.74, 1, 0.83, 0.96, 0.68].map((w, i) => (
            <div key={i} className="h-3 bg-gray-500 rounded" style={{ width: `${w * 100}%` }} />
          ))}
          <div className="pt-5" />
          {[0.62, 0.91, 1, 0.78, 0.85].map((w, i) => (
            <div key={`b${i}`} className="h-3 bg-gray-500 rounded" style={{ width: `${w * 100}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}
