'use client';

/**
 * 아이콘 레일 (IconRail)
 * DESIGN.md: 48px 고정 너비, 탭 전환 + 사이드바 토글
 */

import type { SideTab } from '@/components/editor/EditorLayout';

interface Props {
  activeTab: SideTab;
  onTabChange: (tab: SideTab) => void;
  sidebarOpen: boolean;
  onToggle: () => void;
}

const TABS: { id: SideTab; icon: string; label: string }[] = [
  { id: 'chat', icon: '💬', label: 'AI 채팅' },
  { id: 'template', icon: '📄', label: '템플릿' },
  { id: 'settings', icon: '⚙', label: '설정' },
];

export default function IconRail({ activeTab, onTabChange, sidebarOpen, onToggle }: Props) {
  return (
    <nav className="w-12 flex-shrink-0 flex flex-col items-center bg-[var(--color-bg-panel)] border-r border-[var(--color-bg-border)] py-2 gap-1">
      {/* 사이드바 토글 버튼 */}
      <button
        id="icon-rail-toggle"
        onClick={onToggle}
        title={sidebarOpen ? '사이드바 닫기' : '사이드바 열기'}
        className="w-9 h-9 flex items-center justify-center rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-surface)] hover:text-[var(--color-text-primary)] transition-colors mb-2"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <line x1="2" y1="4" x2="14" y2="4" />
          <line x1="2" y1="8" x2="14" y2="8" />
          <line x1="2" y1="12" x2="14" y2="12" />
        </svg>
      </button>

      {/* 구분선 */}
      <div className="w-6 h-px bg-[var(--color-bg-border)] mb-2" />

      {/* 탭 버튼 목록 */}
      {TABS.map((tab) => {
        const isActive = sidebarOpen && activeTab === tab.id;
        return (
          <button
            key={tab.id}
            id={`icon-rail-${tab.id}`}
            onClick={() => onTabChange(tab.id)}
            title={tab.label}
            className={`w-9 h-9 flex items-center justify-center rounded-lg text-lg transition-all ${
              isActive
                ? 'bg-[var(--color-brand)]/20 text-[var(--color-brand)]'
                : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-surface)] hover:text-[var(--color-text-secondary)]'
            }`}
          >
            <span className="leading-none">{tab.icon}</span>
          </button>
        );
      })}
    </nav>
  );
}
