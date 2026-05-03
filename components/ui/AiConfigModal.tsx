'use client';

/**
 * AI 설정 모달
 * Base URL, API Key, 모델명을 localStorage에 저장합니다.
 */

import { useState } from 'react';
import { loadAiConfig, saveAiConfig } from '@/lib/ai/config';
import type { AiConfig } from '@/lib/ai/client';
import { switchAiProvider } from '@/lib/ai/providers';

interface Props {
  onClose: () => void;
}

export default function AiConfigModal({ onClose }: Props) {
  const [config, setConfig] = useState<AiConfig>(() => loadAiConfig());

  function handleSave() {
    saveAiConfig(config);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[var(--color-bg-panel)] border border-[var(--color-bg-border)] rounded-xl shadow-2xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold mb-4 text-[var(--color-text-primary)]">
          AI 설정
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
              제공자 (Provider)
            </label>
            <select
              value={config.provider || 'ollama'}
              onChange={(e) => setConfig((prev) => switchAiProvider(prev, e.target.value as AiConfig['provider']))}
              className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-bg-border)] text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-brand)]"
            >
              <option value="ollama">Ollama (로컬)</option>
              <option value="openai">OpenAI</option>
              <option value="gemini">Gemini</option>
              <option value="custom">사용자 정의 (Custom)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
              Base URL
            </label>
            <input
              id="ai-config-base-url"
              type="url"
              value={config.baseUrl}
              onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
              placeholder={config.provider === 'gemini'
                ? 'https://generativelanguage.googleapis.com/v1beta/openai'
                : 'http://localhost:11434/v1'}
              className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-bg-border)] text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-brand)]"
            />
          </div>

          <div>
            <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
              API Key <span className="text-[var(--color-text-muted)]">(Ollama는 비워도 됨)</span>
            </label>
            <input
              id="ai-config-api-key"
              type="password"
              value={config.apiKey ?? ''}
              onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
              placeholder={config.provider === 'gemini' ? 'Gemini API key' : 'sk-...'}
              className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-bg-border)] text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-brand)]"
            />
          </div>

          <div>
            <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
              모델명
            </label>
            <input
              id="ai-config-model"
              type="text"
              value={config.model}
              onChange={(e) => setConfig({ ...config, model: e.target.value })}
              placeholder="llama3 / gpt-4o / gemini-2.5-flash / ..."
              className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-bg-border)] text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-brand)]"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            id="ai-config-cancel"
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-border)] text-[var(--color-text-secondary)] transition-colors"
          >
            취소
          </button>
          <button
            id="ai-config-save"
            onClick={handleSave}
            className="px-4 py-2 text-sm rounded-lg bg-[var(--color-brand)] hover:bg-[var(--color-brand-dark)] text-white transition-colors"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
