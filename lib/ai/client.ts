/**
 * AI API 클라이언트
 * OpenAI Compatible API 및 Ollama endpoint를 추상화합니다.
 * 직접 fetch를 쓰지 말고 이 모듈을 통해 호출하세요.
 */

export interface AiConfig {
  baseUrl: string;
  apiKey?: string;
  model: string;
}

export interface AiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AiCompletionOptions {
  config: AiConfig;
  messages: AiMessage[];
  temperature?: number;
  maxTokens?: number;
  /** 스트리밍 콜백. 제공 시 stream mode 로 동작합니다. */
  onChunk?: (chunk: string) => void;
}

export interface AiCompletionResult {
  content: string;
}

/** AI Chat Completion 요청 */
export async function requestCompletion(
  options: AiCompletionOptions
): Promise<AiCompletionResult> {
  const { config, messages, temperature = 0.7, maxTokens, onChunk } = options;
  const stream = !!onChunk;

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature,
      ...(maxTokens ? { max_tokens: maxTokens } : {}),
      stream,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI API 오류 (${response.status}): ${errorText}`);
  }

  if (!stream) {
    const data = await response.json();
    const content: string = data.choices?.[0]?.message?.content ?? '';
    return { content };
  }

  // Streaming mode
  const reader = response.body?.getReader();
  if (!reader) throw new Error('스트림을 읽을 수 없습니다.');

  const decoder = new TextDecoder();
  let fullContent = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const lines = decoder.decode(value, { stream: true }).split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const jsonStr = trimmed.slice(5).trim();
      if (jsonStr === '[DONE]') break;
      try {
        const parsed = JSON.parse(jsonStr);
        const chunk: string = parsed.choices?.[0]?.delta?.content ?? '';
        if (chunk) {
          fullContent += chunk;
          onChunk(chunk);
        }
      } catch {
        // 파싱 오류는 무시
      }
    }
  }

  return { content: fullContent };
}
