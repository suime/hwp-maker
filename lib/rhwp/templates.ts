/**
 * 사용자가 업로드한 템플릿(ArrayBuffer 포함)을 IndexedDB에 영구 저장하기 위한 유틸리티
 */

const DB_NAME = 'hwp-maker-db';
const STORE_NAME = 'user-templates';
const DB_VERSION = 1;

export interface UserTemplate {
  id: string;
  name: string;
  fileName?: string;
  description: string;
  folder?: string;
  builtIn: false;
  advanced?: boolean;
  data: ArrayBuffer;
  previewUrl?: string; // 로드 시 생성됨 (Blob URL)
  createdAt: number;
}

/**
 * DB 초기화
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * 모든 사용자 템플릿 로드
 */
export async function getAllUserTemplates(): Promise<UserTemplate[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[db] 로드 실패:', error);
    return [];
  }
}

/**
 * 템플릿 저장 (추가/수정)
 */
export async function saveUserTemplate(template: UserTemplate): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(template);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * 템플릿 삭제
 */
export async function deleteUserTemplate(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * 모든 사용자 템플릿 삭제 (초기화)
 */
export async function clearUserTemplates(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
