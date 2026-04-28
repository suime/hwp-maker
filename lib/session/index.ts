/**
 * Session Storage 유틸리티
 * 편집 중인 문서 상태를 세션 단위로 유지합니다.
 */

import type { EditorSession } from '@/types/hwp';

const SESSION_KEY = 'hwp-maker:editor-session';

/** 현재 세션 상태를 저장합니다 */
export function saveSession(session: EditorSession): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch (e) {
    console.error('[session] 저장 실패:', e);
  }
}

/** 저장된 세션 상태를 불러옵니다 */
export function loadSession(): EditorSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as EditorSession;
  } catch (e) {
    console.error('[session] 로드 실패:', e);
    return null;
  }
}

/** 세션 상태를 초기화합니다 */
export function clearSession(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(SESSION_KEY);
}
