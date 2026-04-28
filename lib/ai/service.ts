import { requestCompletion, AiMessage, AiCompletionOptions } from './client';
import { loadAiConfig } from './config';
import { getActiveProfile } from './profiles';

/**
 * 활성 프로필과 설정을 바탕으로 AI 채팅 응답을 요청합니다.
 */
export async function generateContent(
  userPrompt: string,
  history: AiMessage[] = [],
  onChunk?: (chunk: string) => void
) {
  const config = loadAiConfig();
  const profile = getActiveProfile();

  // 프로필 전용 설정이 있다면 덮어씀
  const finalConfig = {
    ...config,
    ...(profile.configOverride || {}),
  };

  const messages: AiMessage[] = [
    { role: 'system', content: profile.systemPrompt },
    ...history,
    { role: 'user', content: userPrompt },
  ];

  const options: AiCompletionOptions = {
    config: finalConfig,
    messages,
    onChunk,
  };

  return await requestCompletion(options);
}

/**
 * AI 응답에서 에디터 명령을 추출하거나 텍스트를 정제합니다.
 * (향후 AI가 JSON 구조로 응답할 경우를 대비)
 */
export function parseAiResponse(content: string) {
  // 현재는 단순 텍스트 반환
  return content.trim();
}
