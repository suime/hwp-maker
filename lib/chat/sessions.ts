/**
 * 채팅 세션 관리 모듈
 * 세션을 localStorage에 저장하고 복원합니다.
 */

import type { Attachment } from '@/types/attachment';

/** 세션 메시지 타입 (간단한 형태) */
export interface SessionMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt?: string;
}

/** 채팅 세션 */
export interface ChatSession {
  id: string;
  title: string;
  manualTitle?: boolean;
  messages: SessionMessage[];
  attachments: Attachment[];
  createdAt: string;
  updatedAt: string;
}

/** 세션 목록 정보를 간략히保存 (메시지 없이) */
export interface SessionSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

const SESSIONS_KEY = 'hwp-maker:chat-sessions';
const ACTIVE_SESSION_KEY = 'hwp-maker:active-session-id';

/** 모든 세션 로드 */
export function loadAllSessions(): ChatSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ChatSession[];
  } catch {
    return [];
  }
}

/** 세션 저장 */
function saveAllSessions(sessions: ChatSession[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

/** 활성 세션 ID 가져오기 */
export function getActiveSessionId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACTIVE_SESSION_KEY);
}

/** 활성 세션 ID 설정 */
export function setActiveSessionId(id: string | null): void {
  if (typeof window === 'undefined') return;
  if (id) {
    localStorage.setItem(ACTIVE_SESSION_KEY, id);
  } else {
    localStorage.removeItem(ACTIVE_SESSION_KEY);
  }
}

/** 모든 채팅 세션 삭제 */
export function clearAllSessions(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SESSIONS_KEY);
  localStorage.removeItem(ACTIVE_SESSION_KEY);
}

/** 새 세션 생성 */
export function createSession(): ChatSession {
  const now = new Date().toISOString();
  const session: ChatSession = {
    id: crypto.randomUUID(),
    title: '새 세션',
    messages: [],
    attachments: [],
    createdAt: now,
    updatedAt: now,
  };

  const sessions = loadAllSessions();
  sessions.unshift(session);
  saveAllSessions(sessions);
  setActiveSessionId(session.id);

  return session;
}

/** 세션 삭제 */
export function deleteSession(id: string): void {
  const sessions = loadAllSessions();
  const filtered = sessions.filter(s => s.id !== id);
  saveAllSessions(filtered);

  // 삭제된 세션이 활성 세션이었다면 null로
  if (getActiveSessionId() === id) {
    setActiveSessionId(null);
  }
}

/** 세션 제목만 업데이트 */
export function updateSessionTitle(id: string, title: string): void {
  const sessions = loadAllSessions();
  const session = sessions.find(s => s.id === id);
  if (session) {
    if (session.manualTitle) return;
    session.title = title;
    session.updatedAt = new Date().toISOString();
    saveAllSessions(sessions);
  }
}

/** 사용자가 지정한 세션 제목 저장 */
export function renameSession(id: string, title: string): void {
  const sessions = loadAllSessions();
  const session = sessions.find(s => s.id === id);
  if (session) {
    session.title = title;
    session.manualTitle = true;
    session.updatedAt = new Date().toISOString();
    saveAllSessions(sessions);
  }
}

/** 세션 메시지 업데이트 */
export function updateSessionMessages(
  id: string,
  messages: SessionMessage[],
  attachments?: Attachment[]
): void {
  const sessions = loadAllSessions();
  const session = sessions.find(s => s.id === id);
  if (session) {
    session.messages = messages;
    if (attachments !== undefined) {
      session.attachments = attachments;
    }
    session.updatedAt = new Date().toISOString();
    saveAllSessions(sessions);
  }
}

/** 특정 세션 로드 */
export function loadSession(id: string): ChatSession | null {
  const sessions = loadAllSessions();
  return sessions.find(s => s.id === id) || null;
}

/** 세션 요약 목록取得 (메시지 없이) */
export function getSessionList(): SessionSummary[] {
  const sessions = loadAllSessions();
  return sessions.map(s => ({
    id: s.id,
    title: s.title,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    messageCount: s.messages.length,
  }));
}

/** 세션의 첫 사용자 메시지로 제목 자동 생성 */
export function generateSessionTitle(messages: SessionMessage[]): string {
  const firstUserMsg = messages.find(m => m.role === 'user');
  if (!firstUserMsg) return '새 세션';

  // 첫 메시지 앞 30자만 사용
  const title = firstUserMsg.content.slice(0, 30).replace(/\n/g, ' ');
  return title.length < firstUserMsg.content.length ? `${title}...` : title;
}
