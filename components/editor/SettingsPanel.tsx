'use client';

import { useState, useEffect } from 'react';
import { loadAiConfig, saveAiConfig } from '@/lib/ai/config';
import { requestCompletion } from '@/lib/ai/client';
import type { AiConfig } from '@/lib/ai/client';

type TestStatus = 'idle' | 'loading' | 'success' | 'error';

interface SettingsPanelProps {
  sidebarPosition?: 'left' | 'right';
  onChangeSidebarPosition?: (pos: 'left' | 'right') => void;
}

export default function SettingsPanel({
  sidebarPosition = 'left',
  onChangeSidebarPosition,
}: SettingsPanelProps) {
  const [config, setConfig] = useState<AiConfig>({ baseUrl: '', apiKey: '', model: '' });
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [testMessage, setTestMessage] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => { setConfig(loadAiConfig()); }, []);

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
    <div className="flex flex-col h-full" style={{ background: 'var(--color-bg-panel)' }}>
      {/* 헤더 */}
      <div className="panel-header">
        <h2>설정</h2>
        <p>AI 및 편집기 설정</p>
      </div>

      {/* 스크롤 영역 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">

        {/* AI 설정 */}
        <section className="space-y-3">
          <p className="section-label">AI 설정</p>

          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>
              Base URL
            </label>
            <input
              id="settings-base-url"
              type="url"
              value={config.baseUrl}
              onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
              placeholder="http://localhost:11434/v1"
              className="input"
            />
          </div>

          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>
              API Key{' '}
              <span style={{ color: 'var(--color-text-muted)' }}>(Ollama는 비워도 됨)</span>
            </label>
            <input
              id="settings-api-key"
              type="password"
              value={config.apiKey ?? ''}
              onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
              placeholder="sk-..."
              className="input"
            />
          </div>

          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>
              모델명
            </label>
            <input
              id="settings-model"
              type="text"
              value={config.model}
              onChange={(e) => setConfig({ ...config, model: e.target.value })}
              placeholder="llama3 / gpt-4o / ..."
              className="input"
            />
          </div>

          {/* 연결 테스트 */}
          <button
            id="settings-test-btn"
            onClick={handleTest}
            disabled={testStatus === 'loading' || !config.baseUrl || !config.model}
            className="btn btn-ghost w-full"
          >
            {testStatus === 'loading' ? '테스트 중...' : '연결 테스트'}
          </button>

          {testMessage && (
            <p
              className="text-xs px-2.5 py-2 rounded-lg"
              style={{
                background: testStatus === 'success'
                  ? 'color-mix(in srgb, var(--color-success) 15%, transparent)'
                  : 'color-mix(in srgb, var(--color-error) 15%, transparent)',
                color: testStatus === 'success' ? 'var(--color-success)' : 'var(--color-error)',
              }}
            >
              {testMessage}
            </p>
          )}
        </section>

        {/* 편집기 설정 */}
        <section className="space-y-3">
          <p className="section-label">편집기 설정</p>
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>사이드바 위치</span>
            <div className="flex bg-surface rounded-lg p-1" style={{ background: 'var(--color-bg-surface)' }}>
              <button
                className={`px-3 py-1 text-xs rounded-md transition-colors ${sidebarPosition === 'left' ? 'shadow-sm' : ''}`}
                style={{
                  background: sidebarPosition === 'left' ? 'var(--color-bg-base)' : 'transparent',
                  color: sidebarPosition === 'left' ? 'var(--color-text-base)' : 'var(--color-text-muted)'
                }}
                onClick={() => onChangeSidebarPosition?.('left')}
              >
                왼쪽
              </button>
              <button
                className={`px-3 py-1 text-xs rounded-md transition-colors ${sidebarPosition === 'right' ? 'shadow-sm' : ''}`}
                style={{
                  background: sidebarPosition === 'right' ? 'var(--color-bg-base)' : 'transparent',
                  color: sidebarPosition === 'right' ? 'var(--color-text-base)' : 'var(--color-text-muted)'
                }}
                onClick={() => onChangeSidebarPosition?.('right')}
              >
                오른쪽
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>자동 저장</span>
            <button
              id="settings-autosave-toggle"
              className="w-9 h-5 rounded-full relative transition-colors flex-shrink-0"
              style={{ background: 'var(--color-bg-surface2)' }}
              title="자동 저장 (준비 중)"
            >
              <span
                className="absolute left-0.5 top-0.5 w-4 h-4 rounded-full transition-transform"
                style={{ background: 'var(--color-text-muted)' }}
              />
            </button>
          </div>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            추가 편집기 설정은 추후 제공 예정입니다.
          </p>
        </section>
      </div>

      {/* 저장 버튼 */}
      <div className="p-4 border-t" style={{ borderColor: 'var(--color-bg-border)' }}>
        <button
          id="settings-save-btn"
          onClick={handleSave}
          className="btn btn-primary w-full"
          style={saved ? { background: 'var(--color-success)' } : {}}
        >
          {saved ? '✓ 저장됨' : '저장'}
        </button>
      </div>
    </div>
  );
}
