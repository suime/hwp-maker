'use client';

import { useState } from 'react';
import { loadAiConfig, saveAiConfig } from '@/lib/ai/config';
import { requestCompletion } from '@/lib/ai/client';
import type { AiConfig } from '@/lib/ai/client';
import { clearAllSessions } from '@/lib/chat/sessions';
import { resetProfiles } from '@/lib/ai/profiles';
import { clearSession } from '@/lib/session';

type TestStatus = 'idle' | 'loading' | 'success' | 'error';
type DataAction = 'chat' | 'templates' | 'profiles' | 'app';

const MY_TEMPLATES_KEY = 'hwp-maker:my-templates';
const APP_STORAGE_PREFIX = 'hwp-maker:';

interface SettingsPanelProps {
  sidebarPosition?: 'left' | 'right';
  onChangeSidebarPosition?: (pos: 'left' | 'right') => void;
}

export default function SettingsPanel({
  sidebarPosition = 'left',
  onChangeSidebarPosition,
}: SettingsPanelProps) {
  const [config, setConfig] = useState<AiConfig>(() => loadAiConfig());
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [testMessage, setTestMessage] = useState('');
  const [saved, setSaved] = useState(false);
  const [dataMessage, setDataMessage] = useState('');

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

  function showDataMessage(message: string) {
    setDataMessage(message);
    window.setTimeout(() => setDataMessage(''), 2400);
  }

  function resetTemplates() {
    localStorage.removeItem(MY_TEMPLATES_KEY);
  }

  function resetAppStorage() {
    const localKeys = Object.keys(localStorage).filter((key) => key.startsWith(APP_STORAGE_PREFIX));
    const sessionKeys = Object.keys(sessionStorage).filter((key) => key.startsWith(APP_STORAGE_PREFIX));

    localKeys.forEach((key) => localStorage.removeItem(key));
    sessionKeys.forEach((key) => sessionStorage.removeItem(key));
  }

  function handleDataAction(action: DataAction) {
    const messages: Record<DataAction, { confirm: string; done: string }> = {
      chat: {
        confirm: '모든 대화 기록을 삭제할까요? 이 작업은 되돌릴 수 없습니다.',
        done: '대화 기록을 모두 삭제했습니다.',
      },
      templates: {
        confirm: '사용자가 추가한 템플릿을 초기화할까요?',
        done: '템플릿을 초기화했습니다.',
      },
      profiles: {
        confirm: '사용자 프로필과 현재 프로필 선택을 초기화할까요?',
        done: '프로필을 초기화했습니다.',
      },
      app: {
        confirm: '앱의 모든 로컬 데이터를 초기화할까요? 설정, 대화, 템플릿, 프로필, 편집 세션이 모두 삭제됩니다.',
        done: '앱 데이터를 모두 초기화했습니다. 화면을 새로고침합니다.',
      },
    };

    if (!window.confirm(messages[action].confirm)) return;

    if (action === 'chat') {
      clearAllSessions();
      sessionStorage.removeItem('hwp-maker:chat-session-choice-done');
      showDataMessage(messages[action].done);
      return;
    }

    if (action === 'templates') {
      resetTemplates();
      showDataMessage(messages[action].done);
      return;
    }

    if (action === 'profiles') {
      resetProfiles();
      window.dispatchEvent(new Event('profiles-reset'));
      showDataMessage(messages[action].done);
      return;
    }

    clearSession();
    resetAppStorage();
    showDataMessage(messages[action].done);
    window.setTimeout(() => window.location.reload(), 700);
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
              제공자 (Provider)
            </label>
            <select
              value={config.provider || 'ollama'}
              onChange={(e) => {
                const provider = e.target.value as AiConfig['provider'];
                setConfig(prev => {
                  const newConfig = { ...prev, provider };
                  if (provider === 'openai') {
                    newConfig.baseUrl = 'https://api.openai.com/v1';
                    if (!newConfig.model || newConfig.model.includes('llama')) newConfig.model = 'gpt-4o';
                  } else if (provider === 'ollama') {
                    newConfig.baseUrl = 'http://localhost:11434/v1';
                    if (!newConfig.model || newConfig.model.includes('gpt')) newConfig.model = 'llama3';
                  }
                  return newConfig;
                });
              }}
              className="w-full text-sm bg-[var(--color-bg-surface)] border border-[var(--color-bg-border)] rounded-lg px-3 py-2 outline-none focus:border-[var(--color-brand)]"
            >
              <option value="ollama">Ollama (로컬)</option>
              <option value="openai">OpenAI</option>
              <option value="custom">사용자 정의 (Custom)</option>
            </select>
          </div>

          {(config.provider === 'ollama' || config.provider === 'custom') && (
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
          )}

          {(config.provider === 'openai' || config.provider === 'custom') && (
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                API Key
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
          )}

          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>
              모델명
            </label>
            <input
              id="settings-model"
              type="text"
              value={config.model}
              onChange={(e) => setConfig({ ...config, model: e.target.value })}
              placeholder={config.provider === 'openai' ? 'gpt-4o' : 'llama3'}
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

        {/* 데이터 설정 */}
        <section className="space-y-3">
          <p className="section-label">데이터</p>
          <div className="space-y-2">
            <DataResetButton
              id="settings-clear-chat"
              title="대화 기록 전체 삭제"
              description="저장된 채팅 세션과 활성 세션 선택을 삭제합니다."
              onClick={() => handleDataAction('chat')}
            />
            <DataResetButton
              id="settings-reset-templates"
              title="템플릿 초기화"
              description="사용자가 추가한 내 템플릿 목록을 비웁니다."
              onClick={() => handleDataAction('templates')}
            />
            <DataResetButton
              id="settings-reset-profiles"
              title="프로필 초기화"
              description="사용자 프로필을 삭제하고 기본 프로필 선택으로 되돌립니다."
              onClick={() => handleDataAction('profiles')}
            />
            <DataResetButton
              id="settings-reset-app"
              title="앱 전체 초기화"
              description="이 브라우저에 저장된 hwp-maker 데이터를 모두 삭제합니다."
              danger
              onClick={() => handleDataAction('app')}
            />
          </div>
          {dataMessage && (
            <p
              className="text-xs px-2.5 py-2 rounded-lg"
              style={{
                background: 'color-mix(in srgb, var(--color-success) 15%, transparent)',
                color: 'var(--color-success)',
              }}
            >
              {dataMessage}
            </p>
          )}
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

function DataResetButton({
  id,
  title,
  description,
  danger = false,
  onClick,
}: {
  id: string;
  title: string;
  description: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      id={id}
      type="button"
      onClick={onClick}
      className="w-full rounded-lg border px-3 py-2 text-left transition-colors hover:bg-[var(--color-bg-surface)]"
      style={{
        borderColor: danger
          ? 'color-mix(in srgb, var(--color-error) 35%, var(--color-bg-border))'
          : 'var(--color-bg-border)',
      }}
    >
      <span
        className="block text-sm font-medium"
        style={{ color: danger ? 'var(--color-error)' : 'var(--color-text-primary)' }}
      >
        {title}
      </span>
      <span className="mt-0.5 block text-xs" style={{ color: 'var(--color-text-muted)' }}>
        {description}
      </span>
    </button>
  );
}
