export type AiProviderType = 'openai' | 'ollama' | 'gemini' | 'custom';

export interface AiConfig {
  provider: AiProviderType;
  baseUrl: string;
  apiKey?: string;
  model: string;
}

const AI_PROVIDER_VALUES = new Set<string>(['openai', 'ollama', 'gemini', 'custom']);

export const AI_PROVIDER_DEFAULTS: Record<AiProviderType, Pick<AiConfig, 'baseUrl' | 'model'>> = {
  ollama: {
    baseUrl: 'http://localhost:11434/v1',
    model: 'llama3',
  },
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o',
  },
  gemini: {
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    model: 'gemini-2.5-flash',
  },
  custom: {
    baseUrl: 'http://localhost:11434/v1',
    model: 'llama3',
  },
};

export function normalizeAiBaseUrl(baseUrl: string) {
  return baseUrl.trim().replace(/\/+$/, '');
}

function normalizeAiProvider(provider?: string): AiProviderType {
  return provider && AI_PROVIDER_VALUES.has(provider)
    ? provider as AiProviderType
    : 'ollama';
}

export function getAiProviderDefaults(provider: AiProviderType) {
  return AI_PROVIDER_DEFAULTS[provider] || AI_PROVIDER_DEFAULTS.ollama;
}

export function applyAiConfigDefaults(config: Partial<AiConfig> = {}): AiConfig {
  const provider = normalizeAiProvider(config.provider);
  const defaults = getAiProviderDefaults(provider);

  return {
    provider,
    baseUrl: normalizeAiBaseUrl(config.baseUrl || defaults.baseUrl),
    apiKey: config.apiKey ?? '',
    model: config.model || defaults.model,
  };
}

export function switchAiProvider(config: AiConfig, provider: AiProviderType): AiConfig {
  if (provider === 'custom') {
    return { ...config, provider };
  }

  const defaults = getAiProviderDefaults(provider);
  return {
    ...config,
    provider,
    baseUrl: normalizeAiBaseUrl(defaults.baseUrl),
    model: defaults.model,
  };
}

export function chatCompletionsUrl(baseUrl: string) {
  return `${normalizeAiBaseUrl(baseUrl)}/chat/completions`;
}

export function resolveServerAiConfig(
  config: Partial<AiConfig> | undefined,
  env: Record<string, string | undefined>
) {
  const input = { ...config };

  if (input.provider === 'gemini') {
    input.baseUrl ||= env.GEMINI_API_BASE_URL;
  } else if (input.provider === 'openai' || input.provider === 'custom') {
    input.baseUrl ||= env.OPENAI_API_BASE_URL;
  }

  const resolved = applyAiConfigDefaults(input);

  if (resolved.provider === 'gemini') {
    return {
      ...resolved,
      apiKey: resolved.apiKey || env.GEMINI_API_KEY || env.GOOGLE_API_KEY || 'dummy',
    };
  }

  if (resolved.provider === 'ollama') {
    return {
      ...resolved,
      apiKey: resolved.apiKey || 'dummy',
    };
  }

  return {
    ...resolved,
    apiKey: resolved.apiKey || env.OPENAI_API_KEY || 'dummy',
  };
}
