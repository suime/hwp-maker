'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import { 
  type AdvancedTemplateVariable, 
  type AdvancedTemplateVariableType 
} from '@/lib/templates/advanced';

interface VariableEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (variable: AdvancedTemplateVariable) => void;
  folders: string[];
  initialVariable?: Partial<AdvancedTemplateVariable>;
  title?: string;
}

const DEFAULT_VARIABLE_FOLDER = '기본';

export default function VariableEditModal({
  isOpen,
  onClose,
  onSave,
  folders,
  initialVariable,
  title = '변수 추가',
}: VariableEditModalProps) {
  const [variable, setVariable] = useState<AdvancedTemplateVariable>({
    name: '',
    label: '',
    type: 'text',
    folder: folders[0] || DEFAULT_VARIABLE_FOLDER,
    defaultValue: '',
    options: [],
    optionRules: [],
    description: '',
    prompt: '',
    script: '',
    ...initialVariable,
  });

  useEffect(() => {
    if (isOpen) {
      setVariable({
        name: '',
        label: '',
        type: 'text',
        folder: folders[0] || DEFAULT_VARIABLE_FOLDER,
        defaultValue: '',
        options: [],
        optionRules: [],
        description: '',
        prompt: '',
        script: '',
        ...initialVariable,
      });
    }
  }, [isOpen, initialVariable, folders]);

  const handleSave = () => {
    if (!variable.name.trim()) return;
    onSave(variable);
    onClose();
  };

  const updateField = <K extends keyof AdvancedTemplateVariable>(
    field: K,
    value: AdvancedTemplateVariable[K]
  ) => {
    setVariable((prev) => ({ ...prev, [field]: value }));
  };

  const footer = (
    <>
      <button
        onClick={onClose}
        className="px-4 py-2 text-sm rounded-lg bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-border)] text-[var(--color-text-secondary)] transition-colors"
      >
        취소
      </button>
      <button
        onClick={handleSave}
        disabled={!variable.name.trim()}
        className="px-4 py-2 text-sm rounded-lg bg-[var(--color-brand)] hover:bg-[var(--color-brand-dark)] text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        저장
      </button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={footer}
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1">
            <span className="text-xs font-medium text-[var(--color-text-secondary)]">변수명 (ID)</span>
            <input
              autoFocus
              value={variable.name}
              onChange={(e) => updateField('name', e.target.value.replace(/\s+/g, '_'))}
              placeholder="variable_name"
              className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-bg-border)] text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-brand)]"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-[var(--color-text-secondary)]">타입</span>
            <select
              value={variable.type}
              onChange={(e) => updateField('type', e.target.value as AdvancedTemplateVariableType)}
              className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-bg-border)] text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-brand)]"
            >
              <option value="text">텍스트</option>
              <option value="select">선택</option>
              <option value="script">스크립트</option>
              <option value="ai">AI</option>
            </select>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1">
            <span className="text-xs font-medium text-[var(--color-text-secondary)]">라벨 (표시 이름)</span>
            <input
              value={variable.label}
              onChange={(e) => updateField('label', e.target.value)}
              placeholder="변수 이름"
              className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-bg-border)] text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-brand)]"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-[var(--color-text-secondary)]">폴더</span>
            <select
              value={variable.folder}
              onChange={(e) => updateField('folder', e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-bg-border)] text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-brand)]"
            >
              {folders.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
              {!folders.includes(DEFAULT_VARIABLE_FOLDER) && (
                <option value={DEFAULT_VARIABLE_FOLDER}>{DEFAULT_VARIABLE_FOLDER}</option>
              )}
            </select>
          </label>
        </div>

        <label className="block space-y-1">
          <span className="text-xs font-medium text-[var(--color-text-secondary)]">설명</span>
          <input
            value={variable.description}
            onChange={(e) => updateField('description', e.target.value)}
            placeholder="이 변수에 대한 간단한 설명"
            className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-bg-border)] text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-brand)]"
          />
        </label>

        {variable.type === 'select' ? (
          <label className="block space-y-1">
            <span className="text-xs font-medium text-[var(--color-text-secondary)]">선택지 (줄바꿈으로 구분)</span>
            <textarea
              value={variable.options.join('\n')}
              onChange={(e) => updateField('options', e.target.value.split('\n').map(s => s.trim()).filter(Boolean))}
              rows={3}
              placeholder="선택지 1&#10;선택지 2"
              className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-bg-border)] text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-brand)] resize-none"
            />
          </label>
        ) : variable.type === 'script' ? (
          <label className="block space-y-1">
            <span className="text-xs font-medium text-[var(--color-text-secondary)]">스크립트</span>
            <textarea
              value={variable.script}
              onChange={(e) => updateField('script', e.target.value)}
              rows={3}
              placeholder="date('yyyy-MM-dd')"
              className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-bg-border)] text-sm font-mono text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-brand)] resize-none"
            />
          </label>
        ) : variable.type === 'ai' ? (
          <label className="block space-y-1">
            <span className="text-xs font-medium text-[var(--color-text-secondary)]">AI 프롬프트</span>
            <textarea
              value={variable.prompt}
              onChange={(e) => updateField('prompt', e.target.value)}
              rows={3}
              placeholder="AI에게 지시할 내용을 입력하세요"
              className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-bg-border)] text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-brand)] resize-none"
            />
          </label>
        ) : (
          <label className="block space-y-1">
            <span className="text-xs font-medium text-[var(--color-text-secondary)]">기본값</span>
            <input
              value={variable.defaultValue}
              onChange={(e) => updateField('defaultValue', e.target.value)}
              placeholder="기본값"
              className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-bg-border)] text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-brand)]"
            />
          </label>
        )}
      </div>
    </Modal>
  );
}
