export default function TopBar() {
  return (
    <header
      className="flex items-center justify-between px-4 h-12 flex-shrink-0 z-10 border-b"
      style={{
        background: 'var(--color-bg-panel)',
        borderColor: 'var(--color-bg-border)',
      }}
    >
      {/* 로고 */}
      <div className="flex items-center gap-2.5">
        <span
          className="font-bold text-base tracking-tight select-none"
          style={{ color: 'var(--color-brand)' }}
        >
          hwp-maker
        </span>
        <span
          className="hidden sm:block text-xs"
          style={{ color: 'var(--color-text-muted)' }}
        >
          AI 한글 문서 편집기
        </span>
      </div>

      {/* 현재 파일명 (중앙) */}
      <div className="absolute left-1/2 -translate-x-1/2">
        <button
          id="topbar-filename"
          className="text-sm transition-colors"
          style={{ color: 'var(--color-text-secondary)' }}
          title="클릭하여 파일명 변경"
        >
          새 문서.hwpx
        </button>
      </div>
      <div className="w-8" aria-hidden="true" />
    </header>
  );
}
