'use client';

import type { SideTab } from '@/components/editor/EditorLayout';

interface Props {
  activeTab: SideTab;
  onTabChange: (tab: SideTab) => void;
  sidebarOpen: boolean;
  onToggle: () => void;
}

const TABS: { id: SideTab; label: string; icon: React.ReactNode }[] = [
  {
    id: 'chat',
    label: 'AI 채팅',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    id: 'template',
    label: '템플릿',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
  {
    id: 'variables',
    label: '문서 변수',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 7V5a2 2 0 0 1 2-2h2" />
        <path d="M16 3h2a2 2 0 0 1 2 2v2" />
        <path d="M20 17v2a2 2 0 0 1-2 2h-2" />
        <path d="M8 21H6a2 2 0 0 1-2-2v-2" />
        <path d="M8 12h8" />
        <path d="M12 8v8" />
      </svg>
    ),
  },
  {
    id: 'profile',
    label: '프로필',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    id: 'settings',
    label: '설정',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

export default function IconRail({ activeTab, onTabChange, sidebarOpen, onToggle }: Props) {
  return (
    <nav
      className="w-12 flex-shrink-0 flex flex-col items-center py-2 gap-0.5 border-r"
      style={{
        background: 'var(--color-bg-panel)',
        borderColor: 'var(--color-bg-border)',
      }}
    >
      {/* 사이드바 토글 */}
      <button
        id="icon-rail-toggle"
        onClick={onToggle}
        title={sidebarOpen ? '사이드바 닫기' : '사이드바 열기'}
        className="w-9 h-9 flex items-center justify-center rounded-lg mb-1 transition-colors"
        style={{ color: 'var(--color-text-muted)' }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-surface)';
          (e.currentTarget as HTMLElement).style.color = 'var(--color-text-primary)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background = 'transparent';
          (e.currentTarget as HTMLElement).style.color = 'var(--color-text-muted)';
        }}
      >
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <line x1="2" y1="4" x2="14" y2="4" />
          <line x1="2" y1="8" x2="14" y2="8" />
          <line x1="2" y1="12" x2="14" y2="12" />
        </svg>
      </button>

      {/* 구분선 */}
      <div className="w-5 h-px mb-1" style={{ background: 'var(--color-bg-border)' }} />

      {/* 탭 버튼들 */}
      {TABS.map((tab) => {
        const isActive = sidebarOpen && activeTab === tab.id;
        return (
          <button
            key={tab.id}
            id={`icon-rail-${tab.id}`}
            onClick={() => onTabChange(tab.id)}
            title={tab.label}
            className="w-9 h-9 flex items-center justify-center rounded-lg transition-all"
            style={{
              background: isActive ? 'color-mix(in srgb, var(--color-brand) 15%, transparent)' : 'transparent',
              color: isActive ? 'var(--color-brand)' : 'var(--color-text-muted)',
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-surface)';
                (e.currentTarget as HTMLElement).style.color = 'var(--color-text-secondary)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                (e.currentTarget as HTMLElement).style.background = 'transparent';
                (e.currentTarget as HTMLElement).style.color = 'var(--color-text-muted)';
              }
            }}
          >
            {tab.icon}
          </button>
        );
      })}
    </nav>
  );
}
