'use client';

import { useState, useEffect } from 'react';
import Modal from './Modal';

interface PromptDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  defaultValue?: string;
  placeholder?: string;
  onConfirm: (value: string) => void;
  confirmText?: string;
  cancelText?: string;
}

/**
 * 텍스트 입력을 받는 다이얼로그 (window.prompt 대체용)
 */
export default function PromptDialog({
  isOpen,
  onClose,
  title,
  message,
  defaultValue = '',
  placeholder = '',
  onConfirm,
  confirmText = '확인',
  cancelText = '취소',
}: PromptDialogProps) {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    if (isOpen) {
      setValue(defaultValue);
    }
  }, [isOpen, defaultValue]);

  const handleConfirm = () => {
    onConfirm(value);
    onClose();
  };

  const footer = (
    <>
      <button
        onClick={onClose}
        className="px-4 py-2 text-sm rounded-lg bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-border)] text-[var(--color-text-secondary)] transition-colors"
      >
        {cancelText}
      </button>
      <button
        onClick={handleConfirm}
        className="px-4 py-2 text-sm rounded-lg bg-[var(--color-brand)] hover:bg-[var(--color-brand-dark)] text-white transition-colors"
      >
        {confirmText}
      </button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={footer}
      maxWidth="max-w-sm"
    >
      <div className="space-y-4">
        <p className="text-sm text-[var(--color-text-secondary)]">
          {message}
        </p>
        <input
          autoFocus
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleConfirm();
          }}
          placeholder={placeholder}
          className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-bg-border)] text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-brand)]"
        />
      </div>
    </Modal>
  );
}
