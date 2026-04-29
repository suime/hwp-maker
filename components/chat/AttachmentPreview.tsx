'use client';

/**
 * 전송 전 첨부파일 미리보기 목록
 * 각 항목에서 제거 가능
 */

import type { Attachment } from '@/types/attachment';
import { formatFileSize } from '@/lib/attachment/reader';

interface Props {
  attachments: Attachment[];
  onRemove: (id: string) => void;
}

export default function AttachmentPreview({ attachments, onRemove }: Props) {
  if (attachments.length === 0) return null;

  return (
    <div
      className="px-3 pt-2 pb-1 flex flex-wrap gap-2 border-t"
      style={{ borderColor: 'var(--color-bg-border)' }}
    >
      {attachments.map((att) => (
        <div
          key={att.id}
          className="relative flex items-center gap-1.5 rounded-lg px-2 py-1.5 max-w-[180px]"
          style={{ background: 'var(--color-bg-surface)' }}
        >
          {/* 타입 아이콘 or 이미지 썸네일 */}
          {att.fileType === 'image' && att.previewUrl ? (
            <img
              src={att.previewUrl}
              alt={att.name}
              className="w-8 h-8 rounded object-cover flex-shrink-0"
            />
          ) : (
            <FileTypeIcon type={att.fileType} />
          )}

          {/* 파일명 & 크기 */}
          <div className="min-w-0 flex-1">
            <p
              className="text-xs font-medium truncate"
              style={{ color: 'var(--color-text-primary)' }}
              title={att.name}
            >
              {att.name}
            </p>
            <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
              {formatFileSize(att.sizeBytes)}
            </p>
          </div>

          {/* 제거 버튼 */}
          <button
            type="button"
            onClick={() => onRemove(att.id)}
            className="flex-shrink-0 w-4 h-4 flex items-center justify-center rounded-full transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--ctp-red)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-muted)';
            }}
            title="첨부 제거"
            aria-label={`${att.name} 첨부 제거`}
          >
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="1" y1="1" x2="11" y2="11" />
              <line x1="11" y1="1" x2="1" y2="11" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}

function FileTypeIcon({ type }: { type: Attachment['fileType'] }) {
  const icons: Record<Attachment['fileType'], { label: string; color: string }> = {
    pdf: { label: 'PDF', color: 'var(--ctp-red)' },
    hwp: { label: 'HWP', color: 'var(--color-brand)' },
    text: { label: 'TXT', color: 'var(--ctp-green)' },
    image: { label: 'IMG', color: 'var(--ctp-mauve)' },
  };

  const { label, color } = icons[type];

  return (
    <div
      className="w-8 h-8 rounded flex items-center justify-center text-[9px] font-bold flex-shrink-0"
      style={{ background: `color-mix(in srgb, ${color} 15%, transparent)`, color }}
    >
      {label}
    </div>
  );
}
