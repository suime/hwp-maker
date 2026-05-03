'use client';

import { ReactNode } from 'react';
import Modal from './Modal';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  onConfirm?: () => void;
  confirmText?: string;
  cancelText?: string;
  type?: 'info' | 'warning' | 'error' | 'success';
}

/**
 * 단순 메시지 박스 (Alert, Confirm)를 위한 다이얼로그 컴포넌트
 */
export default function Dialog({
  isOpen,
  onClose,
  title,
  children,
  onConfirm,
  confirmText = '확인',
  cancelText = '취소',
  type = 'info',
}: DialogProps) {
  const isConfirm = !!onConfirm;

  const typeStyles = {
    info: 'text-[var(--color-brand)]',
    warning: 'text-amber-500',
    error: 'text-red-500',
    success: 'text-emerald-500',
  };

  const footer = (
    <>
      {isConfirm && (
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm rounded-lg bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-border)] text-[var(--color-text-secondary)] transition-colors"
        >
          {cancelText}
        </button>
      )}
      <button
        onClick={() => {
          if (onConfirm) onConfirm();
          else onClose();
        }}
        className={`px-4 py-2 text-sm rounded-lg text-white transition-colors ${
          type === 'error' ? 'bg-red-500 hover:bg-red-600' : 'bg-[var(--color-brand)] hover:bg-[var(--color-brand-dark)]'
        }`}
      >
        {confirmText}
      </button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <DialogIcon type={type} className={typeStyles[type]} />
          <span>{title}</span>
        </div>
      }
      footer={footer}
      maxWidth="max-w-sm"
    >
      <div className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
        {children}
      </div>
    </Modal>
  );
}

function DialogIcon({ type, className }: { type: string; className: string }) {
  switch (type) {
    case 'warning':
      return (
        <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
          <line x1="12" y1="9" x2="12" y2="13"></line>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
      );
    case 'error':
      return (
        <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="15" y1="9" x2="9" y2="15"></line>
          <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>
      );
    case 'success':
      return (
        <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
      );
    default:
      return (
        <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="16" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
      );
  }
}
