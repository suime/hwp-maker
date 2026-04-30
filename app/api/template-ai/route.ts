import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from '../../../node_modules/@ai-sdk/react/node_modules/ai/dist/index.mjs';
import { stripThinkTags } from '@/lib/ai/rhwpCommands';

export const maxDuration = 30;

type AiConfig = {
  provider?: string;
  baseUrl?: string;
  apiKey?: string;
  model?: string;
};

type TemplateAiRequestBody = {
  config?: AiConfig;
  prompt?: string;
  systemPrompt?: string;
  values?: Record<string, string>;
  variableName?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as TemplateAiRequestBody;
    const baseURL =
      body.config?.baseUrl ||
      process.env.OPENAI_API_BASE_URL ||
      'https://api.openai.com/v1';
    const apiKey = body.config?.apiKey || process.env.OPENAI_API_KEY || 'dummy';
    const model = body.config?.model || 'gpt-4o';
    const openai = createOpenAI({ baseURL, apiKey });

    const result = await generateText({
      model: openai(model),
      system: [
        'HWP 문서 변수 값을 생성합니다.',
        body.systemPrompt || '',
        '출력은 문서에 바로 치환될 순수 텍스트만 작성하세요.',
        '마크다운 코드블록, JSON, 설명문, 따옴표 포장은 쓰지 마세요.',
        '응답에 <think>, </think>, reasoning, 사고 과정, 내부 추론을 절대 포함하지 마세요.',
      ].filter(Boolean).join('\n'),
      prompt: [
        body.variableName ? `변수명: ${body.variableName}` : '',
        '[현재까지 확정된 변수]',
        JSON.stringify(body.values || {}, null, 2),
        '',
        '[생성 지시문]',
        body.prompt || '',
      ]
        .filter(Boolean)
        .join('\n'),
    });

    return Response.json({ text: stripThinkTags(result.text) });
  } catch (error) {
    console.error('Template AI API Error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unknown template AI error' },
      { status: 500 }
    );
  }
}
