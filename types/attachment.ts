/**
 * 채팅 첨부파일 타입 정의
 */

export type AttachmentFileType = 'image' | 'text' | 'pdf' | 'hwp';

export interface Attachment {
  /** 고유 ID */
  id: string;
  /** 원본 파일명 */
  name: string;
  /** 파일 타입 */
  fileType: AttachmentFileType;
  /** MIME 타입 */
  mimeType: string;
  /** 파일 크기 (bytes) */
  sizeBytes: number;
  /**
   * 처리된 콘텐츠
   * - image: base64 data URL (data:image/...;base64,...)
   * - text/pdf/hwp: 추출된 텍스트 문자열
   */
  content: string;
  /** 이미지 썸네일 또는 미리보기 URL (이미지 타입만) */
  previewUrl?: string;
}

/** 지원 MIME 타입 목록 */
export const SUPPORTED_MIME_TYPES: Record<AttachmentFileType, string[]> = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  text: ['text/plain', 'text/markdown'],
  pdf: ['application/pdf'],
  hwp: [
    'application/x-hwp',
    'application/haansofthwp',
    'application/vnd.hancom.hwp',
    'application/vnd.hancom.hwpx',
  ],
};

/** 지원 확장자 목록 (file input accept 속성용) */
export const ACCEPT_EXTENSIONS =
  '.jpg,.jpeg,.png,.gif,.webp,.txt,.md,.pdf,.hwp,.hwpx';

/** 파일 크기 제한 */
export const MAX_FILE_SIZE = {
  image: 10 * 1024 * 1024,   // 10MB
  text: 20 * 1024 * 1024,    // 20MB
  pdf: 20 * 1024 * 1024,     // 20MB
  hwp: 20 * 1024 * 1024,     // 20MB
} as const;

/** AI 컨텍스트로 포함할 텍스트 최대 길이 */
export const MAX_CONTEXT_TEXT_LENGTH = 8000;
