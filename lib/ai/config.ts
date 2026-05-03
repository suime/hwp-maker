/**
 * AI 설정 관리
 * API 키, Base URL, 모델명을 localStorage에 저장/복원합니다.
 */

import type { AiConfig } from '@/lib/ai/client';
import { applyAiConfigDefaults } from '@/lib/ai/providers';

const STORAGE_KEY = 'hwp-maker:ai-config';

const DEFAULT_CONFIG: AiConfig = {
  provider: 'ollama',
  baseUrl: 'http://localhost:11434/v1',
  apiKey: '',
  model: 'llama3',
};

export function loadAiConfig(): AiConfig {
  if (typeof window === 'undefined') return DEFAULT_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    return applyAiConfigDefaults({ ...DEFAULT_CONFIG, ...JSON.parse(raw) });
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveAiConfig(config: AiConfig): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(applyAiConfigDefaults(config)));
  window.dispatchEvent(new Event('ai-config-changed'));
}

export function clearAiConfig(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}
