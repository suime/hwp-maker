'use client';

/**
 * TopBar (상단 헤더)
 * - 로고
 * - 현재 파일명
 * - 저장 / 내보내기 버튼
 * (AI 설정은 Settings 탭으로 이동)
 */

export default function TopBar() {
  return (
    <header className="flex items-center justify-between px-4 h-12 bg-[var(--color-bg-panel)] border-b border-[var(--color-bg-border)] flex-shrink-0 z-10">
      {/* 로고 */}
      <div className="flex items-center gap-2">
        <span className="text-[var(--color-brand)] font-bold text-base tracking-tight select-none">
          hwp-maker
        </span>
        <span className="hidden sm:block text-[var(--color-text-muted)] text-xs">
          AI 한글 문서 편집기
        </span>
      </div>

      {/* 현재 파일명 (중앙) */}
      <div className="absolute left-1/2 -translate-x-1/2">
        <span
          id="topbar-filename"
          className="text-sm text-[var(--color-text-secondary)] cursor-pointer hover:text-[var(--color-text-primary)] transition-colors"
          title="클릭하여 파일명 변경"
        >
          새 문서.hwpx
        </span>
      </div>

      {/* 액션 버튼 */}
      <div className="flex items-center gap-2">
        <button
          id="btn-save"
          className="px-3 py-1.5 text-xs rounded-md bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-border)] text-[var(--color-text-secondary)] transition-colors"
          title="현재 상태를 세션에 저장"
        >
          저장
        </button>
        <button
          id="btn-export"
          className="px-3 py-1.5 text-xs rounded-md bg-[var(--color-brand)] hover:bg-[var(--color-brand-dark)] text-white transition-colors"
          title="hwpx 파일로 내보내기"
        >
          ↓ 내보내기
        </button>
      </div>
    </header>
  );
}
