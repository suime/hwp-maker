import { createOpenAI } from '@ai-sdk/openai';
import { streamText, Message } from 'ai';

// 최대 허용 시간을 30초로 설정 (기본값)
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages, config, systemPrompt, attachments } = await req.json();

    const baseUrl = config?.baseUrl || process.env.OPENAI_API_BASE_URL || 'https://api.openai.com/v1';
    const apiKey = config?.apiKey || process.env.OPENAI_API_KEY || 'dummy';
    const model = config?.model || 'gpt-4o';

    // OpenAI 호환 공급자 생성 (Ollama 포함)
    const openai = createOpenAI({
      baseURL: baseUrl,
      apiKey: apiKey,
    });

    const coreMessages = [];
    if (systemPrompt) {
      coreMessages.push({ role: 'system', content: systemPrompt });
    }

    // 파일 첨부 처리가 필요할 경우
    // 마지막 메시지가 user일 때 attachments 주입
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role === 'user' && attachments && attachments.length > 0) {
        // ... 첨부파일 로직 (이미지는 imageUrl, 텍스트는 텍스트로)
        const imageAttachments = attachments.filter((a: any) => a.fileType === 'image');
        const textAttachments = attachments.filter((a: any) => a.fileType !== 'image');
        
        let contentStr = lastMsg.content;
        if (textAttachments.length > 0) {
           const context = textAttachments.map((a: any) => `[${a.name}]\n${a.content}`).join('\n\n');
           contentStr = `${context}\n\n위 파일을 참고하여:\n${contentStr}`;
        }
        
        if (imageAttachments.length > 0) {
           lastMsg.content = [
             { type: 'text', text: contentStr },
             ...imageAttachments.map((a: any) => ({
                type: 'image',
                image: a.content // base64 Data URL
             }))
           ];
        } else {
           lastMsg.content = contentStr;
        }
      }
    }

    coreMessages.push(...messages);

    const result = streamText({
      model: openai(model),
      messages: coreMessages,
    });

    return result.toDataStreamResponse();
  } catch (error: any) {
    console.error('Chat API Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
