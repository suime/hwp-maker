import type { RhwpDocumentContext } from '@/lib/rhwp/loader';

export type RhwpAiAction =
  | {
      type: 'insert_text';
      text: string;
      position?: {
        sectionIndex: number;
        paragraphIndex: number;
        charOffset: number;
      };
    }
  | {
      type: 'replace_all';
      query: string;
      text: string;
      caseSensitive?: boolean;
    }
  | {
      type: 'delete_text';
      query: string;
      caseSensitive?: boolean;
    }
  | {
      type: 'fill_field';
      name: string;
      value: string;
    }
  | {
      type: 'fill_fields';
      values: Record<string, string>;
    };

export type ParsedRhwpAiResponse = {
  visibleText: string;
  actions: RhwpAiAction[];
};

const ACTION_BLOCK_RE = /```(?:hwp-maker-actions|rhwp-actions)\s*([\s\S]*?)```/i;
const MAX_DOCUMENT_TEXT = 12000;
const MAX_FIELDS = 80;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeAction(value: unknown): RhwpAiAction | null {
  if (!isRecord(value) || typeof value.type !== 'string') return null;

  if (value.type === 'insert_text' && typeof value.text === 'string') {
    const position = isRecord(value.position)
      ? {
          sectionIndex: Number(value.position.sectionIndex ?? 0),
          paragraphIndex: Number(value.position.paragraphIndex ?? 0),
          charOffset: Number(value.position.charOffset ?? 0),
        }
      : undefined;

    return { type: 'insert_text', text: value.text, position };
  }

  if (value.type === 'replace_all' && typeof value.query === 'string') {
    return {
      type: 'replace_all',
      query: value.query,
      text: typeof value.text === 'string' ? value.text : '',
      caseSensitive: Boolean(value.caseSensitive),
    };
  }

  if (value.type === 'delete_text' && typeof value.query === 'string') {
    return {
      type: 'delete_text',
      query: value.query,
      caseSensitive: Boolean(value.caseSensitive),
    };
  }

  if (
    value.type === 'fill_field' &&
    typeof value.name === 'string' &&
    typeof value.value === 'string'
  ) {
    return { type: 'fill_field', name: value.name, value: value.value };
  }

  if (value.type === 'fill_fields' && isRecord(value.values)) {
    const values = Object.fromEntries(
      Object.entries(value.values).filter((entry): entry is [string, string] => typeof entry[1] === 'string')
    );
    return { type: 'fill_fields', values };
  }

  return null;
}

function actionsFromJson(raw: string): RhwpAiAction[] {
  try {
    const parsed = JSON.parse(raw);
    const actionItems = Array.isArray(parsed)
      ? parsed
      : isRecord(parsed) && Array.isArray(parsed.actions)
        ? parsed.actions
        : [];

    return actionItems.flatMap((item) => {
      const action = normalizeAction(item);
      return action ? [action] : [];
    });
  } catch {
    return [];
  }
}

export function parseRhwpAiResponse(content = ''): ParsedRhwpAiResponse {
  const blockMatch = content.match(ACTION_BLOCK_RE);

  if (blockMatch) {
    const actions = actionsFromJson(blockMatch[1].trim());
    const visibleText = content.replace(blockMatch[0], '').trim();
    return {
      visibleText: visibleText || (actions.length > 0 ? '문서에 반영했습니다.' : ''),
      actions,
    };
  }

  const trimmed = content.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    const actions = actionsFromJson(trimmed);
    if (actions.length > 0) {
      return { visibleText: '문서에 반영했습니다.', actions };
    }
  }

  return { visibleText: trimmed, actions: [] };
}

export function replaceMessageText(message: unknown, text: string): unknown {
  if (!message || typeof message !== 'object') return message;
  const candidate = message as { parts?: unknown[]; content?: unknown };

  if (Array.isArray(candidate.parts)) {
    return {
      ...candidate,
      parts: candidate.parts.map((part, index) => {
        if (index !== 0) return part;
        if (!part || typeof part !== 'object') return { type: 'text', text };
        return { ...part, type: 'text', text };
      }),
    };
  }

  if (typeof candidate.content === 'string') {
    return { ...candidate, content: text };
  }

  return message;
}

export function buildRhwpDocumentPrompt(documentContext?: RhwpDocumentContext | null) {
  const baseInstruction = [
    '프로젝트의 SKILLS.md에 정의된 rhwp Editor Skill과 hwp-actions 프로토콜을 따르세요.',
    '현재 rhwp 에디터 문서를 읽고 수정할 수 있습니다.',
    '사용자가 문서 작성, 삽입, 수정, 치환, 필드 채우기, 템플릿 완성을 요청하면 반드시 도구 액션을 사용하세요.',
    '사용자가 특정 문장, 제목, 단락, 섹션, 요약, 목차, 문구를 "지워줘", "삭제해줘", "빼줘", "제거해줘"라고 요청하면 반드시 delete_text 또는 replace_all 액션을 사용하세요.',
    '삭제할 때는 현재 문서 본문에서 삭제 대상의 정확한 원문을 찾아 query에 넣으세요. 삭제 액션의 query는 요약하거나 다시 쓰지 말고 문서에 있는 문자열 그대로 사용하세요.',
    'replace_all로 삭제할 때는 text를 반드시 빈 문자열 ""로 작성하세요.',
    '도구 액션은 답변 말미에 아래 fenced JSON 블록으로 작성하세요. 이 블록은 사용자 화면에서 숨겨지고 실제 에디터에 적용됩니다.',
    '문서를 수정해야 하는 요청에 대해 설명만 하고 액션 블록을 생략하지 마세요.',
    '사용자에게 보일 설명은 블록 밖에 짧게 작성하세요.',
    '',
    '```hwp-maker-actions',
    '{"actions":[{"type":"insert_text","text":"삽입할 내용"}]}',
    '```',
    '',
    '지원 액션:',
    '- insert_text: { "type": "insert_text", "text": string, "position"?: { "sectionIndex": number, "paragraphIndex": number, "charOffset": number } }',
    '- replace_all: { "type": "replace_all", "query": string, "text": string, "caseSensitive"?: boolean }',
    '- delete_text: { "type": "delete_text", "query": string, "caseSensitive"?: boolean }',
    '- fill_field: { "type": "fill_field", "name": string, "value": string }',
    '- fill_fields: { "type": "fill_fields", "values": { [fieldName]: string } }',
    '',
    '삭제 예시:',
    '```hwp-maker-actions',
    '{"actions":[{"type":"delete_text","query":"문서에서 실제로 읽힌 삭제 대상 문자열"}]}',
    '```',
  ];

  if (!documentContext) {
    return baseInstruction.join('\n');
  }

  const fields = documentContext.fields
    .slice(0, MAX_FIELDS)
    .map((field) => ({
      name: field.name,
      value: field.value,
      guide: field.guide,
      fieldType: field.fieldType,
    }));

  const text = documentContext.text.slice(0, MAX_DOCUMENT_TEXT);
  const truncated = documentContext.text.length > MAX_DOCUMENT_TEXT;

  return [
    ...baseInstruction,
    '',
    '[현재 문서 정보]',
    `페이지 수: ${documentContext.pageCount}`,
    `구역 수: ${documentContext.sectionCount}`,
    documentContext.sourceFormat ? `원본 형식: ${documentContext.sourceFormat}` : '',
    '',
    '[필드 목록]',
    JSON.stringify(fields, null, 2),
    '',
    '[본문 텍스트]',
    text || '(본문 없음)',
    truncated ? '\n...(문서 본문 일부 생략)' : '',
  ]
    .filter(Boolean)
    .join('\n');
}
