import { createOpenAI } from '@ai-sdk/openai';
// The root `ai` package in this workspace can be stale; use the AI SDK copy
// installed with @ai-sdk/react so the route speaks the same stream protocol as useChat.
import { convertToModelMessages, streamText } from '../../../node_modules/@ai-sdk/react/node_modules/ai/dist/index.mjs';
import type { Attachment } from '@/types/attachment';
import type { RhwpDocumentContext } from '@/lib/rhwp/loader';
import { buildRhwpDocumentPrompt } from '@/lib/ai/rhwpCommands';
import type { AiConfig } from '@/lib/ai/client';
import { resolveServerAiConfig } from '@/lib/ai/providers';

export const maxDuration = 30;

type ChatRequestBody = {
  messages?: unknown[];
  config?: Partial<AiConfig>;
  systemPrompt?: string;
  attachments?: Attachment[];
  documentContext?: RhwpDocumentContext | null;
};

type TextPart = { type: 'text'; text: string };
type FilePart = {
  type: 'file';
  mediaType: string;
  filename?: string;
  url: string;
};
type MessagePart = TextPart | FilePart;
type ChatMessage = {
  id: string;
  role: 'system' | 'user' | 'assistant';
  parts: MessagePart[];
};

function getTextFromParts(parts: MessagePart[]): string {
  return parts
    .map((part) => (part.type === 'text' ? part.text : ''))
    .filter(Boolean)
    .join('\n');
}

function textPart(text: string): TextPart {
  return { type: 'text', text };
}

function filePart(attachment: Attachment): FilePart {
  return {
    type: 'file',
    mediaType: attachment.mimeType,
    filename: attachment.name,
    url: attachment.content,
  };
}

function normalizePart(part: unknown): MessagePart[] {
  if (!part || typeof part !== 'object') return [];

  const candidate = part as {
    type?: string;
    text?: unknown;
    mediaType?: unknown;
    mimeType?: unknown;
    filename?: unknown;
    name?: unknown;
    url?: unknown;
    image_url?: unknown;
    image?: unknown;
  };

  if (candidate.type === 'text' && typeof candidate.text === 'string') {
    return [textPart(candidate.text)];
  }

  if (candidate.type === 'file' && typeof candidate.url === 'string') {
    return [
      {
        type: 'file',
        mediaType:
          typeof candidate.mediaType === 'string'
            ? candidate.mediaType
            : typeof candidate.mimeType === 'string'
              ? candidate.mimeType
              : 'application/octet-stream',
        filename:
          typeof candidate.filename === 'string'
            ? candidate.filename
            : typeof candidate.name === 'string'
              ? candidate.name
              : undefined,
        url: candidate.url,
      },
    ];
  }

  // Older OpenAI-style image parts occasionally appear in stored/client messages.
  if (candidate.type === 'image_url') {
    const imageUrl =
      typeof candidate.image_url === 'string'
        ? candidate.image_url
        : candidate.image_url &&
            typeof candidate.image_url === 'object' &&
            'url' in candidate.image_url &&
            typeof candidate.image_url.url === 'string'
          ? candidate.image_url.url
          : null;

    return imageUrl
      ? [{ type: 'file', mediaType: 'image/*', url: imageUrl }]
      : [];
  }

  if (candidate.type === 'image' && typeof candidate.image === 'string') {
    return [{ type: 'file', mediaType: 'image/*', url: candidate.image }];
  }

  // Drop UI-only/internal parts such as item_reference, step-start,
  // tool-* and source-* before converting to model messages.
  return [];
}

function normalizeMessage(message: unknown): ChatMessage | null {
  if (!message || typeof message !== 'object') return null;

  const candidate = message as {
    id?: string;
    role?: string;
    parts?: unknown[];
    content?: unknown;
  };

  if (
    candidate.role !== 'system' &&
    candidate.role !== 'user' &&
    candidate.role !== 'assistant'
  ) {
    return null;
  }

  if (Array.isArray(candidate.parts)) {
    const parts = candidate.parts.flatMap(normalizePart);
    if (parts.length === 0) return null;

    return {
      id: candidate.id || crypto.randomUUID(),
      role: candidate.role,
      parts,
    };
  }

  if (typeof candidate.content === 'string') {
    return {
      id: candidate.id || crypto.randomUUID(),
      role: candidate.role,
      parts: [textPart(candidate.content)],
    };
  }

  return null;
}

function withAttachments(messages: ChatMessage[], attachments: Attachment[] = []) {
  if (messages.length === 0 || attachments.length === 0) return messages;

  const lastMessage = messages[messages.length - 1];
  if (lastMessage.role !== 'user') return messages;

  const textAttachments = attachments.filter((item) => item.fileType !== 'image');
  const imageAttachments = attachments.filter((item) => item.fileType === 'image');
  const currentText = getTextFromParts(lastMessage.parts);
  const contextText = textAttachments
    .map((item) => `[첨부 파일: ${item.name}]\n---\n${item.content}\n---`)
    .join('\n\n');

  const parts: MessagePart[] = [];
  if (contextText) {
    parts.push(textPart(`${contextText}\n\n위 파일을 참고하여:\n${currentText}`));
  } else if (currentText) {
    parts.push(textPart(currentText));
  }

  parts.push(...imageAttachments.map(filePart));

  return [
    ...messages.slice(0, -1),
    {
      ...lastMessage,
      parts,
    },
  ];
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ChatRequestBody;
    const clientMessages = (body.messages || [])
      .map(normalizeMessage)
      .filter((message): message is ChatMessage => message !== null);

    const messages = withAttachments(clientMessages, body.attachments);
    const config = resolveServerAiConfig(body.config, process.env);

    const openai = createOpenAI({ baseURL: config.baseUrl, apiKey: config.apiKey });
    const system = [
      '응답에 <think>, </think>, reasoning, 사고 과정, 내부 추론을 절대 포함하지 마세요. 사용자에게 보여줄 최종 답변만 작성하세요.',
      body.systemPrompt,
      buildRhwpDocumentPrompt(body.documentContext),
    ]
      .filter(Boolean)
      .join('\n\n');
    const result = streamText({
      model: openai(config.model),
      system,
      messages: await convertToModelMessages(messages),
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('Chat API Error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unknown chat error' },
      { status: 500 }
    );
  }
}
