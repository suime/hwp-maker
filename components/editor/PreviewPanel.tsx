'use client';

/**
 * hwp 문서 미리보기/편집 패널 (MainPanel 내부)
 * DESIGN.md: 편집 / 미리보기 2가지 뷰 모드 (분할보기 없음)
 */

type ViewMode = 'edit' | 'preview';

export default function PreviewPanel() {
  return (
    <div className="flex flex-col h-full bg-[var(--color-bg-base)]">
      <ViewModeBar />
      <DocumentArea />
    </div>
  );
}

function ViewModeBar() {
  return (
    <div className="flex items-center justify-between px-4 h-10 bg-[var(--color-bg-panel)] border-b border-[var(--color-bg-border)] flex-shrink-0">
      {/* 뷰 모드 토글 */}
      <div className="flex items-center gap-1 bg-[var(--color-bg-surface)] rounded-lg p-0.5">
        <ViewModeButton id="view-edit" label="편집" active />
        <ViewModeButton id="view-preview" label="미리보기" active={false} />
      </div>

      {/* 우측: 상태 표시 */}
      <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
        <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 inline-block" />
        <span>rhwp WASM 연동 대기 중</span>
      </div>
    </div>
  );
}

function ViewModeButton({ id, label, active }: { id: string; label: string; active: boolean }) {
  return (
    <button
      id={id}
      className={`px-3 py-1 text-xs rounded-md transition-colors ${
        active
          ? 'bg-[var(--color-bg-panel)] text-[var(--color-text-primary)] shadow-sm'
          : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
      }`}
    >
      {label}
    </button>
  );
}

function DocumentArea() {
  return (
    <div className="flex-1 overflow-auto flex justify-center p-8 bg-[#141922]">
      {/* A4 문서 용지 */}
      <div
        className="bg-white text-gray-800 rounded shadow-2xl relative flex-shrink-0"
        style={{
          width: '210mm',
          minHeight: '297mm',
          padding: '25mm 20mm',
        }}
      >
        {/* WASM 연동 전 플레이스홀더 */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center select-none">
            <div className="text-5xl mb-4 opacity-10">📄</div>
            <p className="text-sm text-gray-300 opacity-30">
              rhwp WASM 연동 후<br />문서가 표시됩니다
            </p>
          </div>
        </div>

        {/* 스켈레톤 라인 */}
        <div className="space-y-3 opacity-[0.07]">
          <div className="h-7 bg-gray-400 rounded w-1/2 mx-auto mb-6" />
          {[1, 0.9, 0.75, 1, 0.85, 0.95, 0.7, 1, 0.8].map((w, i) => (
            <div
              key={i}
              className="h-3.5 bg-gray-400 rounded"
              style={{ width: `${w * 100}%` }}
            />
          ))}
          <div className="pt-4" />
          {[0.65, 0.9, 1, 0.8].map((w, i) => (
            <div
              key={`b-${i}`}
              className="h-3.5 bg-gray-400 rounded"
              style={{ width: `${w * 100}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
