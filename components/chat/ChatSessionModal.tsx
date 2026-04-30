'use client';

/**
 * 채팅 세션 관리 모달
 * 세션 목록 표시, 생성, 삭제, 전환 기능 제공
 */

import { useState } from 'react';
import {
  getSessionList,
  deleteSession,
  renameSession,
  type SessionSummary,
} from '@/lib/chat/sessions';

interface Props {
  activeSessionId: string | null;
  onSelectSession: (sessionId: string | null) => void;
  onClose: () => void;
  requireChoice?: boolean;
}

export default function ChatSessionModal({ activeSessionId, onSelectSession, onClose, requireChoice = false }: Props) {
  const [sessions, setSessions] = useState<SessionSummary[]>(() => getSessionList());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  function handleCreate() {
    onSelectSession(null);
    onClose();
  }

  function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    deleteSession(id);
    const nextSessions = getSessionList();
    setSessions(nextSessions);

    if (nextSessions.length === 0) {
      onSelectSession(null);
      onClose();
      return;
    }

    if (activeSessionId === id) {
      onSelectSession(null);
    }
  }

  function handleStartEdit(id: string, title: string, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingId(id);
    setEditingTitle(title);
  }

  function handleSaveEdit(id: string) {
    renameSession(id, editingTitle.trim() || '제목 없음');
    setEditingId(null);
    setSessions(getSessionList());
  }

  function handleSelect(id: string) {
    onSelectSession(id);
    onClose();
  }

  function formatDate(isoString: string): string {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '방금 전';
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays < 7) return `${diffDays}일 전`;

    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[var(--color-bg-panel)] border border-[var(--color-bg-border)] rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-bg-border)]">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
            {requireChoice ? '채팅 시작' : '채팅 세션'}
          </h2>
          {!requireChoice && (
            <button
              id="session-modal-close"
              onClick={onClose}
              className="p-1 rounded hover:bg-[var(--color-bg-surface)] text-[var(--color-text-muted)]"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* 새 세션 시작 */}
        <div className="px-5 py-3 border-b border-[var(--color-bg-border)]">
          {requireChoice && (
            <p className="mb-3 text-sm text-[var(--color-text-muted)]">
              새 대화를 시작하거나 저장된 이전 세션을 불러오세요.
            </p>
          )}
          <button
            id="session-new-btn"
            onClick={handleCreate}
            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--color-brand)] hover:bg-[var(--color-brand-dark)] text-white text-sm font-medium transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            새 세션에서 시작
          </button>
        </div>

        {/* 세션 목록 */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
          {sessions.length === 0 ? (
            <div className="py-8 text-center text-sm text-[var(--color-text-muted)]">
              저장된 세션이 없습니다
            </div>
          ) : (
            sessions.map(session => (
              <div
                key={session.id}
                onClick={() => session.id !== editingId && handleSelect(session.id)}
                className={`group flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-colors ${
                  session.id === activeSessionId
                    ? 'bg-[var(--color-brand)]/10 border border-[var(--color-brand)]/30'
                    : 'hover:bg-[var(--color-bg-surface)]'
                }`}
              >
                {/* 세션 아이콘 */}
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--color-bg-surface)] flex items-center justify-center text-[var(--color-text-muted)]">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>

                {/* 세션 정보 */}
                <div className="flex-1 min-w-0">
                  {editingId === session.id ? (
                    <input
                      type="text"
                      value={editingTitle}
                      onChange={e => setEditingTitle(e.target.value)}
                      onBlur={() => handleSaveEdit(session.id)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleSaveEdit(session.id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      onClick={e => e.stopPropagation()}
                      autoFocus
                      className="w-full px-2 py-1 text-sm bg-[var(--color-bg-panel)] border border-[var(--color-brand)] rounded outline-none text-[var(--color-text-primary)]"
                    />
                  ) : (
                    <>
                      <div className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                        {session.title}
                      </div>
                      <div className="text-xs text-[var(--color-text-muted)]">
                        {formatDate(session.updatedAt)} · {session.messageCount}개 메시지
                      </div>
                    </>
                  )}
                </div>

                {/* 액션 버튼들 */}
                {editingId !== session.id && (
                  <div className="flex-shrink-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={e => handleStartEdit(session.id, session.title, e)}
                      className="p-1.5 rounded hover:bg-[var(--color-bg-border)] text-[var(--color-text-muted)]"
                      title="이름 변경"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button
                      onClick={e => handleDelete(session.id, e)}
                      className="p-1.5 rounded hover:bg-red-500/20 text-[var(--color-text-muted)] hover:text-red-500"
                      title="삭제"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
