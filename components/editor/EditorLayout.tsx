'use client';

/**
 * 메인 에디터 레이아웃
 * DESIGN.md 기준:
 *   TopBar (전체 너비)
 *   └─ IconRail(48px) + SidePanel(가변, 드래그) + ResizeHandle(4px) + MainPanel(flex-1)
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import TopBar from '@/components/ui/TopBar';
import IconRail from '@/components/ui/IconRail';
import ChatPanel from '@/components/chat/ChatPanel';
import TemplatePanel from '@/components/editor/TemplatePanel';
import SettingsPanel from '@/components/editor/SettingsPanel';
import PreviewPanel from '@/components/editor/PreviewPanel';

export type SideTab = 'chat' | 'template' | 'settings';

const SIDEBAR_WIDTH_KEY = 'hwp-maker:sidebar-width';
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 180;
const MAX_WIDTH = 520;

export default function EditorLayout() {
  const [activeTab, setActiveTab] = useState<SideTab>('chat');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_WIDTH);

  const isResizing = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(DEFAULT_WIDTH);
  const containerRef = useRef<HTMLDivElement>(null);

  // localStorage에서 너비 복원
  useEffect(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    if (saved) {
      const w = parseInt(saved, 10);
      if (w >= MIN_WIDTH && w <= MAX_WIDTH) setSidebarWidth(w);
    }
  }, []);

  // 드래그 리사이즈 핸들러
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    startX.current = e.clientX;
    startWidth.current = sidebarWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [sidebarWidth]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const delta = e.clientX - startX.current;
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth.current + delta));
      setSidebarWidth(next);
    };

    const onMouseUp = () => {
      if (!isResizing.current) return;
      isResizing.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      setSidebarWidth((w) => {
        localStorage.setItem(SIDEBAR_WIDTH_KEY, String(w));
        return w;
      });
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  return (
    <div className="flex flex-col h-full" ref={containerRef}>
      <TopBar />

      <div className="flex flex-1 overflow-hidden">
        {/* 아이콘 레일 (48px 고정) */}
        <IconRail
          activeTab={activeTab}
          onTabChange={(tab) => {
            if (!sidebarOpen) setSidebarOpen(true);
            setActiveTab(tab);
          }}
          sidebarOpen={sidebarOpen}
          onToggle={() => setSidebarOpen((v) => !v)}
        />

        {/* 사이드바 패널 (가변 너비) */}
        {sidebarOpen && (
          <>
            <aside
              className="flex flex-col flex-shrink-0 overflow-hidden border-r border-[var(--color-bg-border)]"
              style={{ width: sidebarWidth }}
            >
              {activeTab === 'chat' && <ChatPanel />}
              {activeTab === 'template' && <TemplatePanel />}
              {activeTab === 'settings' && <SettingsPanel />}
            </aside>

            {/* 드래그 리사이즈 핸들 */}
            <div
              className="w-1 flex-shrink-0 cursor-col-resize relative group"
              onMouseDown={handleMouseDown}
            >
              <div className="absolute inset-0 group-hover:bg-[var(--color-brand)] transition-colors opacity-0 group-hover:opacity-60" />
            </div>
          </>
        )}

        {/* 메인 패널 */}
        <main className="flex-1 overflow-hidden">
          <PreviewPanel />
        </main>
      </div>
    </div>
  );
}
