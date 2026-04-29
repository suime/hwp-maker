import { requestCompletion, AiMessage, AiCompletionOptions } from './client';
import { loadAiConfig } from './config';
import { getActiveProfile } from './profiles';
import type { Attachment } from '@/types/attachment';
import { MAX_CONTEXT_TEXT_LENGTH } from '@/types/attachment';

/**
 * Vision API용 멀티모달 메시지 콘텐츠 타입
 * OpenAI compatible format
 */
type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string; detail?: 'auto' | 'low' | 'high' } };

/**
 * 첨부파일 목록을 AI 메시지 컨텍스트로 변환합니다.
 * - 이미지: Vision API content 배열 형식
 * - 텍스트/문서: 사용자 메시지 앞에 텍스트 컨텍스트 주입
 */
function buildUserContent(
  userPrompt: string,
  attachments: Attachment[]
): string | ContentPart[] {
  if (!attachments || attachments.length === 0) {
    return userPrompt;
  }

  const imageAttachments = attachments.filter(a => a.fileType === 'image');
  const textAttachments = attachments.filter(a => a.fileType !== 'image');

  // 텍스트 문서 컨텍스트 구성
  let contextPrefix = '';
  if (textAttachments.length > 0) {
    const parts = textAttachments.map(att => {
      const truncated = att.content.slice(0, MAX_CONTEXT_TEXT_LENGTH);
      const isTruncated = att.content.length > MAX_CONTEXT_TEXT_LENGTH;
      return `[첨부 파일: ${att.name}]\n---\n${truncated}${isTruncated ? '\n...(이하 생략)' : ''}\n---`;
    });
    contextPrefix = parts.join('\n\n') + '\n\n위 파일을 참고하여 ';
  }

  const finalPrompt = contextPrefix + userPrompt;

  // 이미지가 없으면 텍스트만 반환
  if (imageAttachments.length === 0) {
    return finalPrompt;
  }

  // 이미지가 있으면 Vision API 형식 (content 배열)
  const contentParts: ContentPart[] = [
    { type: 'text', text: finalPrompt },
    ...imageAttachments.map(att => ({
      type: 'image_url' as const,
      image_url: { url: att.content, detail: 'auto' as const },
    })),
  ];

  return contentParts;
}

/**
 * 활성 프로필과 설정을 바탕으로 AI 채팅 응답을 요청합니다.
 * 첨부파일이 있으면 컨텍스트에 포함합니다.
 */
export async function generateContent(
  userPrompt: string,
  history: AiMessage[] = [],
  attachments: Attachment[] = [],
  onChunk?: (chunk: string) => void
) {
  const config = loadAiConfig();
  const profile = getActiveProfile();

  const finalConfig = {
    ...config,
    ...(profile.configOverride || {}),
  };

  // 사용자 메시지 콘텐츠 (첨부파일 포함)
  const userContent = buildUserContent(userPrompt, attachments);

  // OpenAI API는 content가 string 또는 ContentPart[]를 모두 허용
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userMessage: any = {
    role: 'user',
    content: userContent,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const messages: any[] = [
    { role: 'system', content: profile.systemPrompt },
    ...history,
    userMessage,
  ];

  const options: AiCompletionOptions = {
    config: finalConfig,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    messages: messages as any,
    onChunk,
  };

  return await requestCompletion(options);
}

/**
 * AI 응답에서 에디터 명령을 추출하거나 텍스트를 정제합니다.
 * (향후 AI가 JSON 구조로 응답할 경우를 대비)
 */
export function parseAiResponse(content: string) {
  return content.trim();
}
