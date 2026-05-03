'use client';

import { useState, useRef, useEffect, useCallback, useSyncExternalStore } from 'react';
import TopBar from '@/components/ui/TopBar';
import IconRail from '@/components/ui/IconRail';
import ChatPanel from '@/components/chat/ChatPanel';
import TemplatePanel from '@/components/editor/TemplatePanel';
import DocumentVariablesPanel from '@/components/editor/DocumentVariablesPanel';
import SettingsPanel from '@/components/editor/SettingsPanel';
import PreviewPanel from '@/components/editor/PreviewPanel';

export type SideTab = 'chat' | 'template' | 'variables' | 'settings';

const SIDEBAR_WIDTH_KEY = 'hwp-maker:sidebar-width';
const SIDEBAR_POS_KEY = 'hwp-maker:sidebar-position';
const SIDEBAR_SETTINGS_CHANGED_EVENT = 'hwp-maker:sidebar-settings-changed';
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 180;
const MAX_WIDTH = 520;

function loadSidebarWidth() {
  if (typeof window === 'undefined') return DEFAULT_WIDTH;
  const savedWidth = localStorage.getItem(SIDEBAR_WIDTH_KEY);
  if (!savedWidth) return DEFAULT_WIDTH;
  const width = parseInt(savedWidth, 10);
  return width >= MIN_WIDTH && width <= MAX_WIDTH ? width : DEFAULT_WIDTH;
}

function loadSidebarPosition(): 'left' | 'right' {
  if (typeof window === 'undefined') return 'left';
  const savedPos = localStorage.getItem(SIDEBAR_POS_KEY);
  return savedPos === 'left' || savedPos === 'right' ? savedPos : 'left';
}

function getSidebarSettingsSnapshot() {
  return `${loadSidebarPosition()}:${loadSidebarWidth()}`;
}

function getSidebarSettingsServerSnapshot() {
  return `left:${DEFAULT_WIDTH}`;
}

function subscribeSidebarSettings(listener: () => void) {
  window.addEventListener(SIDEBAR_SETTINGS_CHANGED_EVENT, listener);
  window.addEventListener('storage', listener);
  return () => {
    window.removeEventListener(SIDEBAR_SETTINGS_CHANGED_EVENT, listener);
    window.removeEventListener('storage', listener);
  };
}

function notifySidebarSettingsChanged() {
  window.dispatchEvent(new Event(SIDEBAR_SETTINGS_CHANGED_EVENT));
}

function saveSidebarWidth(width: number) {
  localStorage.setItem(SIDEBAR_WIDTH_KEY, String(width));
  notifySidebarSettingsChanged();
}

function saveSidebarPosition(position: 'left' | 'right') {
  localStorage.setItem(SIDEBAR_POS_KEY, position);
  notifySidebarSettingsChanged();
}

function parseSidebarSettingsSnapshot(snapshot: string) {
  const [position, width] = snapshot.split(':');
  return {
    sidebarPosition: position === 'right' ? 'right' as const : 'left' as const,
    sidebarWidth: Number(width) || DEFAULT_WIDTH,
  };
}

export default function EditorLayout() {
  const [activeTab, setActiveTab] = useState<SideTab>('chat');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const sidebarSettingsSnapshot = useSyncExternalStore(
    subscribeSidebarSettings,
    getSidebarSettingsSnapshot,
    getSidebarSettingsServerSnapshot
  );
  const savedSidebarSettings = parseSidebarSettingsSnapshot(sidebarSettingsSnapshot);
  const [dragWidth, setDragWidth] = useState<number | null>(null);
  const sidebarWidth = dragWidth ?? savedSidebarSettings.sidebarWidth;
  const sidebarPosition = savedSidebarSettings.sidebarPosition;

  const isResizing = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(DEFAULT_WIDTH);
  const latestWidth = useRef(DEFAULT_WIDTH);
  const mainRef = useRef<HTMLElement>(null);

  const handleSidebarPositionChange = useCallback((pos: 'left' | 'right') => {
    saveSidebarPosition(pos);
  }, []);

  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    startX.current = e.clientX;
    startWidth.current = sidebarWidth;
    latestWidth.current = sidebarWidth;
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
      latestWidth.current = next;
      setDragWidth(next);
    };
    const onMouseUp = () => {
      if (!isResizing.current) return;
      isResizing.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      if (mainRef.current) mainRef.current.style.pointerEvents = '';
      saveSidebarWidth(latestWidth.current);
      setDragWidth(null);
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
              <div className={activeTab === 'chat' ? 'h-full min-h-0' : 'hidden'} aria-hidden={activeTab !== 'chat'}>
                <ChatPanel />
              </div>
              <div className={activeTab === 'template' ? 'h-full min-h-0' : 'hidden'} aria-hidden={activeTab !== 'template'}>
                <TemplatePanel />
              </div>
              <div className={activeTab === 'variables' ? 'h-full min-h-0' : 'hidden'} aria-hidden={activeTab !== 'variables'}>
                <DocumentVariablesPanel />
              </div>
              <div className={activeTab === 'settings' ? 'h-full min-h-0' : 'hidden'} aria-hidden={activeTab !== 'settings'}>
                <SettingsPanel
                  sidebarPosition={sidebarPosition}
                  onChangeSidebarPosition={handleSidebarPositionChange}
                />
              </div>
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
