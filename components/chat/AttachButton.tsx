'use client';

/**
 * 채팅 첨부파일 버튼
 * 클릭 시 파일 선택 다이얼로그 열기
 */

import { useRef } from 'react';
import { ACCEPT_EXTENSIONS } from '@/types/attachment';

interface Props {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
}

export default function AttachButton({ onFiles, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) onFiles(files);
    // 같은 파일 재선택 가능하도록 초기화
    e.target.value = '';
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_EXTENSIONS}
        multiple
        className="hidden"
        onChange={handleChange}
        aria-label="파일 첨부"
      />
      <button
        type="button"
        id="chat-attach"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        title="파일 첨부 (이미지, PDF, 문서)"
        className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg transition-colors"
        style={{
          color: 'var(--color-text-muted)',
          background: 'transparent',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-bg-surface)';
          (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-primary)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
          (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-muted)';
        }}
      >
        {/* 클립 아이콘 */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
        </svg>
      </button>
    </>
  );
}
