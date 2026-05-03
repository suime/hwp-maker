'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { loadAiConfig, saveAiConfig } from '@/lib/ai/config';
import { requestCompletion } from '@/lib/ai/client';
import type { AiConfig } from '@/lib/ai/client';
import { switchAiProvider } from '@/lib/ai/providers';
import { clearAllSessions } from '@/lib/chat/sessions';
import { clearSession } from '@/lib/session';
import Dialog from '@/components/ui/Dialog';
import {
  applyTheme,
  getStoredTheme,
  getSystemTheme,
  getThemeForMode,
  getThemeMode,
  getThemePreset,
  THEME_CHANGE_EVENT,
  THEME_PRESETS,
  type Theme,
  type ThemeMode,
} from '@/lib/theme';

type TestStatus = 'idle' | 'loading' | 'success' | 'error';
type DataAction = 'chat' | 'templates' | 'app';

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
  const [theme, setTheme] = useState<Theme>(() => getStoredTheme() ?? getSystemTheme());

  // 다이얼로그 상태
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; action: DataAction | null }>({
    isOpen: false,
    action: null,
  });

  const currentThemePreset = getThemePreset(theme);

  useEffect(() => {
    const onThemeChange = (event: Event) => {
      setTheme((event as CustomEvent<Theme>).detail);
    };
    window.addEventListener(THEME_CHANGE_EVENT, onThemeChange);
    return () => window.removeEventListener(THEME_CHANGE_EVENT, onThemeChange);
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
    setConfirmDialog({ isOpen: true, action });
  }

  function executeDataAction(action: DataAction) {
    const messages: Record<DataAction, { confirm: string; done: string }> = {
      chat: {
        confirm: '모든 대화 기록을 삭제할까요? 이 작업은 되돌릴 수 없습니다.',
        done: '대화 기록을 모두 삭제했습니다.',
      },
      templates: {
        confirm: '사용자가 추가한 템플릿을 초기화할까요?',
        done: '템플릿을 초기화했습니다.',
      },
      app: {
        confirm: '앱의 모든 로컬 데이터를 초기화할까요? 설정, 대화, 템플릿, 프리셋, 편집 세션이 모두 삭제됩니다.',
        done: '앱 데이터를 모두 초기화했습니다. 화면을 새로고침합니다.',
      },
    };

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

    clearSession();
    resetAppStorage();
    showDataMessage(messages[action].done);
    window.setTimeout(() => window.location.reload(), 700);
  }

  function handleThemeChange(nextTheme: Theme) {
    applyTheme(nextTheme);
    setTheme(nextTheme);
  }

  function handleThemeModeChange(mode: ThemeMode) {
    handleThemeChange(getThemeForMode(theme, mode));
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
        <SettingsSection>
          <SettingsSectionTitle>AI 설정</SettingsSectionTitle>

          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>
              제공자 (Provider)
            </label>
            <select
              value={config.provider || 'ollama'}
              onChange={(e) => {
                const provider = e.target.value as AiConfig['provider'];
                setConfig((prev) => switchAiProvider(prev, provider));
              }}
              className="w-full text-sm bg-[var(--color-bg-surface)] border border-[var(--color-bg-border)] rounded-lg px-3 py-2 outline-none focus:border-[var(--color-brand)]"
            >
              <option value="ollama">Ollama (로컬)</option>
              <option value="openai">OpenAI</option>
              <option value="gemini">Gemini</option>
              <option value="custom">사용자 정의 (Custom)</option>
            </select>
          </div>

          {(config.provider === 'ollama' || config.provider === 'gemini' || config.provider === 'custom') && (
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                Base URL
              </label>
              <input
                id="settings-base-url"
                type="url"
                value={config.baseUrl}
                onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
                placeholder={config.provider === 'gemini'
                  ? 'https://generativelanguage.googleapis.com/v1beta/openai'
                  : 'http://localhost:11434/v1'}
                className="input"
              />
            </div>
          )}

          {(config.provider === 'openai' || config.provider === 'gemini' || config.provider === 'custom') && (
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                API Key
              </label>
              <input
                id="settings-api-key"
                type="password"
                value={config.apiKey ?? ''}
                onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                placeholder={config.provider === 'gemini' ? 'Gemini API key' : 'sk-...'}
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
              placeholder={config.provider === 'openai'
                ? 'gpt-4o'
                : config.provider === 'gemini'
                  ? 'gemini-2.5-flash'
                  : 'llama3'}
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
        </SettingsSection>

        {/* 편집기 설정 */}
        <SettingsSection>
          <SettingsSectionTitle>편집기 설정</SettingsSectionTitle>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="block text-xs" style={{ color: 'var(--color-text-secondary)' }}>현재 테마</span>
                <span className="block truncate text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  {currentThemePreset.label}
                </span>
              </div>
              <div className="flex rounded-lg p-1" style={{ background: 'var(--color-bg-surface)' }}>
                <button
                  type="button"
                  className={`px-3 py-1 text-xs rounded-md transition-colors ${getThemeMode(theme) === 'light' ? 'shadow-sm' : ''}`}
                  style={{
                    background: getThemeMode(theme) === 'light' ? 'var(--color-bg-base)' : 'transparent',
                    color: getThemeMode(theme) === 'light' ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                  }}
                  onClick={() => handleThemeModeChange('light')}
                >
                  라이트
                </button>
                <button
                  type="button"
                  className={`px-3 py-1 text-xs rounded-md transition-colors ${getThemeMode(theme) === 'dark' ? 'shadow-sm' : ''}`}
                  style={{
                    background: getThemeMode(theme) === 'dark' ? 'var(--color-bg-base)' : 'transparent',
                    color: getThemeMode(theme) === 'dark' ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                  }}
                  onClick={() => handleThemeModeChange('dark')}
                >
                  다크
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {THEME_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleThemeChange(preset.id)}
                  className="flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors hover:bg-[var(--color-bg-surface)]"
                  style={{
                    background: theme === preset.id
                      ? 'color-mix(in srgb, var(--color-brand) 10%, transparent)'
                      : 'transparent',
                    borderColor: theme === preset.id
                      ? 'color-mix(in srgb, var(--color-brand) 45%, var(--color-bg-border))'
                      : 'var(--color-bg-border)',
                  }}
                >
                  <span className="flex flex-shrink-0 overflow-hidden rounded border" style={{ borderColor: 'var(--color-bg-border)' }}>
                    {preset.swatches.map((color) => (
                      <span
                        key={color}
                        className="h-6 w-3"
                        style={{ background: color }}
                      />
                    ))}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className="block truncate text-xs font-medium"
                      style={{ color: theme === preset.id ? 'var(--color-brand)' : 'var(--color-text-primary)' }}
                    >
                      {preset.label}
                    </span>
                    <span className="block truncate text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                      {preset.description}
                    </span>
                  </span>
                  <span
                    className="rounded px-1.5 py-0.5 text-[10px]"
                    style={{
                      background: 'var(--color-bg-surface)',
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    {preset.mode === 'light' ? 'Light' : 'Dark'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="divider" />

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
        </SettingsSection>

        {/* 데이터 설정 */}
        <SettingsSection>
          <SettingsSectionTitle>데이터</SettingsSectionTitle>
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
        </SettingsSection>
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

      {/* 다이얼로그 */}
      <Dialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, action: null })}
        title={
          confirmDialog.action === 'app' ? '전체 초기화' :
          confirmDialog.action === 'chat' ? '대화 삭제' : '템플릿 초기화'
        }
        onConfirm={() => {
          if (confirmDialog.action) executeDataAction(confirmDialog.action);
          setConfirmDialog({ isOpen: false, action: null });
        }}
        confirmText="삭제/초기화"
        type={confirmDialog.action === 'app' ? 'error' : 'warning'}
      >
        {confirmDialog.action && (
          confirmDialog.action === 'chat' ? '모든 대화 기록을 삭제할까요? 이 작업은 되돌릴 수 없습니다.' :
          confirmDialog.action === 'templates' ? '사용자가 추가한 템플릿을 초기화할까요?' :
          '앱의 모든 로컬 데이터를 초기화할까요? 설정, 대화, 템플릿, 프리셋, 편집 세션이 모두 삭제됩니다.'
        )}
      </Dialog>
    </div>
  );
}

function SettingsSection({ children }: { children: ReactNode }) {
  return (
    <section
      className="space-y-3 rounded-xl border p-3.5 shadow-sm"
      style={{
        background: 'linear-gradient(180deg, color-mix(in srgb, var(--color-brand) 5%, var(--color-bg-base)), var(--color-bg-base) 56px)',
        borderColor: 'color-mix(in srgb, var(--color-brand) 32%, var(--color-bg-border))',
      }}
    >
      {children}
    </section>
  );
}

function SettingsSectionTitle({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="h-4 w-1 rounded-full"
        style={{ background: 'var(--color-brand)' }}
      />
      <p
        className="text-xs font-semibold"
        style={{ color: 'var(--color-brand)' }}
      >
        {children}
      </p>
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
