'use client';

/**
 * 설정 패널
 * DESIGN.md: AI 설정 + 편집기 설정
 */

import { useState, useEffect } from 'react';
import { loadAiConfig, saveAiConfig } from '@/lib/ai/config';
import { requestCompletion } from '@/lib/ai/client';
import type { AiConfig } from '@/lib/ai/client';

type TestStatus = 'idle' | 'loading' | 'success' | 'error';

export default function SettingsPanel() {
  const [config, setConfig] = useState<AiConfig>({ baseUrl: '', apiKey: '', model: '' });
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [testMessage, setTestMessage] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setConfig(loadAiConfig());
  }, []);

  function handleSave() {
    saveAiConfig(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleTest() {
    setTestStatus('loading');
    setTestMessage('');
    try {
      const result = await requestCompletion({
        config,
        messages: [{ role: 'user', content: 'ping' }],
        maxTokens: 5,
      });
      setTestStatus('success');
      setTestMessage(`연결 성공: "${result.content.slice(0, 40)}"`);
    } catch (e) {
      setTestStatus('error');
      setTestMessage(e instanceof Error ? e.message : '알 수 없는 오류');
    }
  }

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg-panel)]">
      {/* 헤더 */}
      <div className="px-4 py-3 border-b border-[var(--color-bg-border)] flex-shrink-0">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">설정</h2>
        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">AI 및 편집기 설정</p>
      </div>

      {/* 스크롤 영역 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">

        {/* AI 설정 섹션 */}
        <section>
          <h3 className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-3">
            AI 설정
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-[var(--color-text-secondary)] mb-1">
                Base URL
              </label>
              <input
                id="settings-base-url"
                type="url"
                value={config.baseUrl}
                onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
                placeholder="http://localhost:11434/v1"
                className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-bg-border)] text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-brand)] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs text-[var(--color-text-secondary)] mb-1">
                API Key{' '}
                <span className="text-[var(--color-text-muted)]">(Ollama는 비워도 됨)</span>
              </label>
              <input
                id="settings-api-key"
                type="password"
                value={config.apiKey ?? ''}
                onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                placeholder="sk-..."
                className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-bg-border)] text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-brand)] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs text-[var(--color-text-secondary)] mb-1">
                모델명
              </label>
              <input
                id="settings-model"
                type="text"
                value={config.model}
                onChange={(e) => setConfig({ ...config, model: e.target.value })}
                placeholder="llama3 / gpt-4o / ..."
                className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-bg-border)] text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-brand)] transition-colors"
              />
            </div>

            {/* 연결 테스트 */}
            <button
              id="settings-test-btn"
              onClick={handleTest}
              disabled={testStatus === 'loading' || !config.baseUrl || !config.model}
              className="w-full py-2 text-xs rounded-lg bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-border)] disabled:opacity-40 disabled:cursor-not-allowed text-[var(--color-text-secondary)] border border-[var(--color-bg-border)] transition-colors"
            >
              {testStatus === 'loading' ? '테스트 중...' : '연결 테스트'}
            </button>

            {testMessage && (
              <p className={`text-xs px-2 py-1.5 rounded-lg ${
                testStatus === 'success'
                  ? 'bg-green-900/30 text-green-400'
                  : 'bg-red-900/30 text-red-400'
              }`}>
                {testMessage}
              </p>
            )}
          </div>
        </section>

        {/* 편집기 설정 섹션 */}
        <section>
          <h3 className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-3">
            편집기 설정
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--color-text-secondary)]">자동 저장</span>
              <button
                id="settings-autosave-toggle"
                className="w-10 h-5 rounded-full bg-[var(--color-bg-border)] relative transition-colors"
                title="자동 저장 (준비 중)"
              >
                <span className="absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-[var(--color-text-muted)] transition-transform" />
              </button>
            </div>
            <p className="text-xs text-[var(--color-text-muted)]">
              추가 편집기 설정은 추후 제공 예정입니다.
            </p>
          </div>
        </section>
      </div>

      {/* 저장 버튼 (하단 고정) */}
      <div className="p-4 border-t border-[var(--color-bg-border)] flex-shrink-0">
        <button
          id="settings-save-btn"
          onClick={handleSave}
          className={`w-full py-2 text-xs rounded-lg transition-colors ${
            saved
              ? 'bg-green-700 text-white'
              : 'bg-[var(--color-brand)] hover:bg-[var(--color-brand-dark)] text-white'
          }`}
        >
          {saved ? '✓ 저장됨' : '저장'}
        </button>
      </div>
    </div>
  );
}
