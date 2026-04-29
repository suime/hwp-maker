'use client';

/**
 * 메시지 내 첨부파일 표시 (전송 후)
 */

import { useState } from 'react';
import type { Attachment } from '@/types/attachment';
import { formatFileSize } from '@/lib/attachment/reader';

interface Props {
  attachments: Attachment[];
}

export default function MessageAttachment({ attachments }: Props) {
  if (!attachments || attachments.length === 0) return null;

  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {attachments.map((att) => (
        <AttachmentItem key={att.id} attachment={att} />
      ))}
    </div>
  );
}

function AttachmentItem({ attachment }: { attachment: Attachment }) {
  const [expanded, setExpanded] = useState(false);

  if (attachment.fileType === 'image' && attachment.previewUrl) {
    return (
      <ImageAttachment attachment={attachment} />
    );
  }

  return (
    <div
      className="rounded-lg overflow-hidden text-xs max-w-full"
      style={{ background: 'var(--color-bg-base)', border: '1px solid var(--color-bg-border)' }}
    >
      {/* 파일 헤더 */}
      <div
        className="flex items-center gap-2 px-2.5 py-1.5 cursor-pointer select-none"
        onClick={() => setExpanded((v) => !v)}
      >
        <FileTypeBadge type={attachment.fileType} />
        <span
          className="font-medium truncate max-w-[120px]"
          style={{ color: 'var(--color-text-primary)' }}
          title={attachment.name}
        >
          {attachment.name}
        </span>
        <span style={{ color: 'var(--color-text-muted)' }} className="ml-auto flex-shrink-0">
          {formatFileSize(attachment.sizeBytes)}
        </span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          style={{
            color: 'var(--color-text-muted)',
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s ease',
          }}
        >
          <polyline points="2,3 5,7 8,3" />
        </svg>
      </div>

      {/* 확장 시 텍스트 미리보기 */}
      {expanded && attachment.content && (
        <div
          className="px-2.5 pb-2 border-t text-[10px] font-mono max-h-32 overflow-y-auto whitespace-pre-wrap"
          style={{
            borderColor: 'var(--color-bg-border)',
            color: 'var(--color-text-muted)',
          }}
        >
          {attachment.content.slice(0, 300)}
          {attachment.content.length > 300 && (
            <span style={{ color: 'var(--color-text-muted)' }}> …(이하 생략)</span>
          )}
        </div>
      )}
    </div>
  );
}

function ImageAttachment({ attachment }: { attachment: Attachment }) {
  const [lightbox, setLightbox] = useState(false);

  return (
    <>
      <img
        src={attachment.previewUrl}
        alt={attachment.name}
        className="max-w-full max-h-40 rounded-lg cursor-pointer object-contain"
        style={{ border: '1px solid var(--color-bg-border)' }}
        onClick={() => setLightbox(true)}
        title={`${attachment.name} — 클릭하여 확대`}
      />
      {/* 라이트박스 */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.8)' }}
          onClick={() => setLightbox(false)}
        >
          <img
            src={attachment.previewUrl}
            alt={attachment.name}
            className="max-w-full max-h-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}
            onClick={() => setLightbox(false)}
            aria-label="닫기"
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}

function FileTypeBadge({ type }: { type: Attachment['fileType'] }) {
  const map: Record<Attachment['fileType'], { label: string; color: string }> = {
    pdf: { label: 'PDF', color: 'var(--ctp-red)' },
    hwp: { label: 'HWP', color: 'var(--color-brand)' },
    text: { label: 'TXT', color: 'var(--ctp-green)' },
    image: { label: 'IMG', color: 'var(--ctp-mauve)' },
  };
  const { label, color } = map[type];
  return (
    <span
      className="text-[9px] font-bold px-1 py-0.5 rounded"
      style={{ background: `color-mix(in srgb, ${color} 15%, transparent)`, color }}
    >
      {label}
    </span>
  );
}
