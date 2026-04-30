'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import TopBar from '@/components/ui/TopBar';
import IconRail from '@/components/ui/IconRail';
import ChatPanel from '@/components/chat/ChatPanel';
import TemplatePanel from '@/components/editor/TemplatePanel';
import DocumentVariablesPanel from '@/components/editor/DocumentVariablesPanel';
import SettingsPanel from '@/components/editor/SettingsPanel';
import ProfilePanel from '@/components/editor/ProfilePanel';
import PreviewPanel from '@/components/editor/PreviewPanel';

export type SideTab = 'chat' | 'template' | 'variables' | 'profile' | 'settings';

const SIDEBAR_WIDTH_KEY = 'hwp-maker:sidebar-width';
const SIDEBAR_POS_KEY = 'hwp-maker:sidebar-position';
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 180;
const MAX_WIDTH = 520;

export default function EditorLayout() {
  const [activeTab, setActiveTab] = useState<SideTab>('chat');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_WIDTH);
  const [sidebarPosition, setSidebarPosition] = useState<'left' | 'right'>('left');

  const isResizing = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(DEFAULT_WIDTH);
  const mainRef = useRef<HTMLElement>(null);

  // localStorage에서 설정 복원
  useEffect(() => {
    const savedWidth = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    if (savedWidth) {
      const w = parseInt(savedWidth, 10);
      if (w >= MIN_WIDTH && w <= MAX_WIDTH) setSidebarWidth(w);
    }
    const savedPos = localStorage.getItem(SIDEBAR_POS_KEY);
    if (savedPos === 'left' || savedPos === 'right') {
      setSidebarPosition(savedPos);
    }
  }, []);

  const handleSidebarPositionChange = useCallback((pos: 'left' | 'right') => {
    setSidebarPosition(pos);
    localStorage.setItem(SIDEBAR_POS_KEY, pos);
  }, []);

  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    startX.current = e.clientX;
    startWidth.current = sidebarWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    if (mainRef.current) mainRef.current.style.pointerEvents = 'none';
  }, [sidebarWidth]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const delta = e.clientX - startX.current;
      const nextWidth = sidebarPosition === 'right'
        ? startWidth.current - delta
        : startWidth.current + delta;
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, nextWidth));
      setSidebarWidth(next);
    };
    const onMouseUp = () => {
      if (!isResizing.current) return;
      isResizing.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      if (mainRef.current) mainRef.current.style.pointerEvents = '';
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
  }, [sidebarPosition]);

  return (
    <div className="flex flex-col h-full">
      <TopBar />
      <div className={`flex flex-1 overflow-hidden ${sidebarPosition === 'right' ? 'flex-row-reverse' : ''}`}>
        {/* 아이콘 레일 */}
        <IconRail
          activeTab={activeTab}
          onTabChange={(tab) => {
            if (!sidebarOpen) setSidebarOpen(true);
            setActiveTab(tab);
          }}
          sidebarOpen={sidebarOpen}
          sidebarPosition={sidebarPosition}
          onToggle={() => setSidebarOpen((v) => !v)}
        />

        {/* 사이드바 패널 */}
        {sidebarOpen && (
          <>
            <aside
              className="flex flex-col flex-shrink-0 overflow-hidden"
              style={{ width: sidebarWidth }}
            >
              {activeTab === 'chat' && <ChatPanel />}
              {activeTab === 'template' && <TemplatePanel />}
              {activeTab === 'variables' && <DocumentVariablesPanel />}
              {activeTab === 'profile' && <ProfilePanel />}
              {activeTab === 'settings' && (
                <SettingsPanel
                  sidebarPosition={sidebarPosition}
                  onChangeSidebarPosition={handleSidebarPositionChange}
                />
              )}
            </aside>

            {/* 리사이즈 핸들 */}
            <div
              className="w-1 flex-shrink-0 cursor-col-resize group relative"
              style={{ background: 'var(--color-bg-border)' }}
              onMouseDown={handleResizeMouseDown}
            >
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: 'var(--color-brand)' }}
              />
            </div>
          </>
        )}

        {/* 메인 패널 */}
        <main ref={mainRef} className="flex-1 overflow-hidden">
          <PreviewPanel />
        </main>
      </div>
    </div>
  );
}
