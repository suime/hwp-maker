'use client';

import { useState, useRef, useEffect, useCallback, useMemo, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import { useChat } from '@ai-sdk/react';
import type { UIMessage } from '@ai-sdk/react';
import { BUILTIN_PROFILES, getActiveProfile, setActiveProfile, AiProfile } from '@/lib/ai/profiles';
import { loadAiConfig } from '@/lib/ai/config';
import { rhwpActions } from '@/lib/rhwp/loader';
import { parseRhwpAiResponse, stripThinkTags, type RhwpAiAction } from '@/lib/ai/rhwpCommands';
import type { Attachment } from '@/types/attachment';
import { processFile } from '@/lib/attachment/reader';
import {
  createSession,
  deleteSession,
  getActiveSessionId,
  getSessionList,
  loadSession,
  renameSession,
  setActiveSessionId,
  updateSessionMessages,
  updateSessionTitle,
  generateSessionTitle,
  type SessionMessage,
  type SessionSummary,
} from '@/lib/chat/sessions';
import AttachButton from './AttachButton';
import AttachmentPreview from './AttachmentPreview';
import ChatSessionModal from './ChatSessionModal';

const WELCOME_ID = 'welcome';
const WELCOME_TEXT = '안녕하세요! hwp-maker AI 어시스턴트입니다.\n\n문서에 넣고 싶은 내용을 자연어로 입력하거나, 📎 버튼으로 참고 파일을 첨부해 보세요.\n예: "첨부한 보고서를 바탕으로 회의록을 작성해줘"';
const ACTION_BLOCK_RE = /```(hwp-maker-actions|rhwp-actions)\s*([\s\S]*?)```/gi;
const SESSION_BOOTSTRAP_KEY = 'hwp-maker:chat-session-choice-done';
const WELCOME: UIMessage = {
  id: WELCOME_ID,
  role: 'assistant' as const,
  parts: [{ type: 'text', text: WELCOME_TEXT }],
};

function createWelcomeMessage() {
  return { ...WELCOME, id: `${WELCOME_ID}-${Date.now()}` };
}

function createTextMessage(message: SessionMessage): UIMessage {
  return {
    id: message.id,
    role: message.role,
    parts: [{ type: 'text', text: message.content }],
  };
}

function messageContentToText(message: unknown): string {
  if (typeof message === 'string') return message;
  if (!message || typeof message !== 'object') return '';

  const maybeMessage = message as {
    content?: unknown;
    parts?: unknown[];
    text?: string;
  };

  if (typeof maybeMessage.content === 'string') return collapseRepeatedText(maybeMessage.content);
  if (typeof maybeMessage.text === 'string') return collapseRepeatedText(maybeMessage.text);

  const parts = Array.isArray(maybeMessage.parts)
    ? maybeMessage.parts
    : Array.isArray(maybeMessage.content)
      ? maybeMessage.content
      : null;

  if (parts) {
    return collapseRepeatedText(parts
      .map((part) => {
        if (typeof part === 'string') return part;
        if (part && typeof part === 'object') {
          const maybePart = part as { type?: string; text?: string };
          if (maybePart.type === 'text') return maybePart.text || '';
        }
        return '';
      })
      .filter(Boolean)
      .join('\n'));
  }

  return JSON.stringify(message);
}

function collapseRepeatedText(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return text;

  const half = Math.floor(trimmed.length / 2);
  const left = trimmed.slice(0, half).trim();
  const right = trimmed.slice(half).trim();
  if (left && left === right) return left;

  const lines = trimmed.split(/\n{2,}/);
  if (lines.length % 2 === 0) {
    const midpoint = lines.length / 2;
    const first = lines.slice(0, midpoint).join('\n\n').trim();
    const second = lines.slice(midpoint).join('\n\n').trim();
    if (first && first === second) return first;
  }

  return text;
}

function getMessageText(message: UIMessage) {
  return stripThinkTags(collapseRepeatedText(messageContentToText(message)));
}

function dedupeMessages(messages: UIMessage[]) {
  const seenIds = new Set<string>();
  const deduped: UIMessage[] = [];

  for (const message of messages) {
    const id = String(message.id || '');
    if (id && seenIds.has(id)) continue;
    if (id) seenIds.add(id);

    const text = getMessageText(message).trim();
    const previous = deduped[deduped.length - 1];
    if (previous && previous.role === message.role && getMessageText(previous).trim() === text) {
      continue;
    }

    deduped.push(message);
  }

  return deduped;
}

function toSessionMessages(messages: UIMessage[]): SessionMessage[] {
  return dedupeMessages(messages)
    .filter((message) => !String(message.id || '').startsWith(WELCOME_ID))
    .map((message) => ({
      id: message.id || crypto.randomUUID(),
      role: message.role as 'user' | 'assistant' | 'system',
      content: getMessageText(message),
    }))
    .filter((message) => message.content.trim().length > 0);
}

function extractAssistantText(messageOrEvent: unknown): string {
  const event = messageOrEvent as { message?: unknown; content?: unknown; text?: string };
  return stripThinkTags(messageContentToText(
    event?.message ??
      event?.content ??
      event?.text ??
      ''
  ));
}

function renderInlineMarkdown(text: string) {
  const segments = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);

  return segments.map((segment, index) => {
    if (segment.startsWith('**') && segment.endsWith('**')) {
      return <strong key={index}>{segment.slice(2, -2)}</strong>;
    }

    if (segment.startsWith('`') && segment.endsWith('`')) {
      return (
        <code
          key={index}
          className="rounded px-1 py-0.5 font-mono"
          style={{ background: 'color-mix(in srgb, currentColor 10%, transparent)' }}
        >
          {segment.slice(1, -1)}
        </code>
      );
    }

    return <span key={index}>{segment}</span>;
  });
}

function splitTableRow(line: string) {
  const trimmed = line.trim();
  const normalized = trimmed.startsWith('|') ? trimmed.slice(1) : trimmed;
  const withoutTrailingPipe = normalized.endsWith('|') ? normalized.slice(0, -1) : normalized;
  return withoutTrailingPipe.split('|').map((cell) => cell.trim());
}

function isTableSeparatorLine(line: string) {
  const cells = splitTableRow(line);
  return cells.length > 1 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function isTableStart(lines: string[], index: number) {
  return (
    index + 1 < lines.length &&
    lines[index].includes('|') &&
    isTableSeparatorLine(lines[index + 1])
  );
}

function MarkdownTable({ lines }: { lines: string[] }) {
  const headers = splitTableRow(lines[0]);
  const rows = lines.slice(2).map(splitTableRow);

  return (
    <div className="my-2 max-w-full overflow-x-auto whitespace-normal">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr>
            {headers.map((header, index) => (
              <th
                key={index}
                className="border px-2 py-1 font-semibold"
                style={{ borderColor: 'color-mix(in srgb, currentColor 18%, transparent)' }}
              >
                {renderInlineMarkdown(header)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {headers.map((_, cellIndex) => (
                <td
                  key={cellIndex}
                  className="border px-2 py-1 align-top"
                  style={{ borderColor: 'color-mix(in srgb, currentColor 18%, transparent)' }}
                >
                  {renderInlineMarkdown(row[cellIndex] || '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MarkdownBlock({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/).filter((block) => block.trim().length > 0);

  return (
    <>
      {blocks.map((block, blockIndex) => {
        const lines = block.split('\n');
        const isBulletList = lines.every((line) => /^\s*[-*]\s+/.test(line));
        const isNumberedList = lines.every((line) => /^\s*\d+[.)]\s+/.test(line));

        if (isTableStart(lines, 0)) {
          return <MarkdownTable key={blockIndex} lines={lines} />;
        }

        if (isBulletList) {
          return (
            <ul key={blockIndex} className="list-disc pl-5 my-1 space-y-1">
              {lines.map((line, lineIndex) => (
                <li key={lineIndex}>{renderInlineMarkdown(line.replace(/^\s*[-*]\s+/, ''))}</li>
              ))}
            </ul>
          );
        }

        if (isNumberedList) {
          return (
            <ol key={blockIndex} className="list-decimal pl-5 my-1 space-y-1">
              {lines.map((line, lineIndex) => (
                <li key={lineIndex}>{renderInlineMarkdown(line.replace(/^\s*\d+[.)]\s+/, ''))}</li>
              ))}
            </ol>
          );
        }

        return (
          <p key={blockIndex} className={blockIndex > 0 ? 'mt-2' : undefined}>
            {lines.map((line, lineIndex) => (
              <span key={lineIndex}>
                {renderInlineMarkdown(line.replace(/^#{1,6}\s+/, ''))}
                {lineIndex < lines.length - 1 ? <br /> : null}
              </span>
            ))}
          </p>
        );
      })}
    </>
  );
}

function MessageContent({ text }: { text: string }) {
  const sanitizedText = stripThinkTags(text);
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const actionBlockRe = new RegExp(ACTION_BLOCK_RE);

  while ((match = actionBlockRe.exec(sanitizedText)) !== null) {
    const before = sanitizedText.slice(lastIndex, match.index);
    if (before.trim()) {
      nodes.push(<MarkdownBlock key={`md-${match.index}`} text={before} />);
    }

    nodes.push(
      <details
        key={`action-${match.index}`}
        className="my-2 rounded border px-2 py-1"
        style={{ borderColor: 'color-mix(in srgb, currentColor 18%, transparent)' }}
      >
        <summary className="cursor-pointer select-none font-medium">hwp-actions</summary>
        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap font-mono">
          {match[2].trim()}
        </pre>
      </details>
    );

    lastIndex = match.index + match[0].length;
  }

  const rest = sanitizedText.slice(lastIndex);
  if (rest.trim()) {
    nodes.push(<MarkdownBlock key="md-rest" text={rest} />);
  }

  return nodes.length > 0 ? <>{nodes}</> : null;
}

export default function ChatPanel() {
  const [activeProfile, setActiveProfileState] = useState<AiProfile>(() => getActiveProfile());
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [processingFiles, setProcessingFiles] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessionSummaries, setSessionSummaries] = useState<SessionSummary[]>([]);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [requiresSessionChoice, setRequiresSessionChoice] = useState(false);
  const [isPreparingMessage, setIsPreparingMessage] = useState(false);

  const [input, setInput] = useState('');
  const [currentConfig, setCurrentConfig] = useState(() => loadAiConfig());
  const currentSessionIdRef = useRef<string | null>(null);
  const sessionAttachmentsRef = useRef<Attachment[]>([]);
  const inputHistoryRef = useRef<string[]>([]);
  const inputHistoryIndexRef = useRef<number | null>(null);
  const draftInputRef = useRef('');
  const didInitSessionRef = useRef(false);
  const requestSerialRef = useRef(0);
  const activeRequestSerialRef = useRef(0);
  const executedActionSignaturesRef = useRef<Set<string>>(new Set());

  const setCurrentSession = useCallback((sessionId: string | null) => {
    currentSessionIdRef.current = sessionId;
    setCurrentSessionId(sessionId);
    setActiveSessionId(sessionId);
  }, []);

  const refreshSessionSummaries = useCallback(() => {
    setSessionSummaries(getSessionList());
  }, []);

  useEffect(() => {
    const handleConfigChange = () => setCurrentConfig(loadAiConfig());
    window.addEventListener('ai-config-changed', handleConfigChange);
    return () => window.removeEventListener('ai-config-changed', handleConfigChange);
  }, []);

  const executeRhwpAction = useCallback(async (action: RhwpAiAction) => {
    switch (action.type) {
      case 'insert_text':
        return await rhwpActions.insertText(action.text, action.position);
      case 'replace_all':
        return await rhwpActions.replaceAll(action.query, action.text, action.caseSensitive);
      case 'delete_text':
        return await rhwpActions.replaceAll(action.query, '', action.caseSensitive);
      case 'fill_field':
        return await rhwpActions.fillField(action.name, action.value);
      case 'fill_fields':
        return await rhwpActions.fillFields(action.values);
    }
  }, []);

  const executeRhwpActions = useCallback(async (actions: RhwpAiAction[]) => {
    for (const action of actions) {
      await executeRhwpAction(action);
    }
  }, [executeRhwpAction]);

  const { messages, sendMessage, status, setMessages } = useChat({
    // @ts-expect-error - 기존 /api/chat 라우트는 현재 AI SDK 호환 옵션으로 호출합니다.
    api: '/api/chat',
    messages: [WELCOME],
    body: {
      config: currentConfig,
      systemPrompt: activeProfile.systemPrompt,
      attachments: attachments,
    },
    onFinish: (message) => {
      const rawText = extractAssistantText(message);
      const parsed = parseRhwpAiResponse(rawText);

      void (async () => {
        try {
          if (parsed.actions.length > 0) {
            const signature = `${activeRequestSerialRef.current}:${JSON.stringify(parsed.actions)}`;
            if (executedActionSignaturesRef.current.has(signature)) return;
            executedActionSignaturesRef.current.add(signature);
            await executeRhwpActions(parsed.actions);
          }
        } catch (error) {
          console.warn('AI 응답을 에디터에 반영하지 못했습니다:', error);
        }
      })();
    },
    onError: (error) => {
      console.error('AI 응답 에러:', error);
    }
  });

  const resetInputState = useCallback(() => {
    setInput('');
    setAttachments([]);
    inputHistoryIndexRef.current = null;
    draftInputRef.current = '';
  }, []);

  const restoreSession = useCallback((sessionId: string) => {
    const session = loadSession(sessionId);
    if (!session) return false;

    setCurrentSession(sessionId);
    sessionAttachmentsRef.current = session.attachments || [];
    setMessages([createWelcomeMessage(), ...session.messages.map(createTextMessage)]);
    resetInputState();
    refreshSessionSummaries();
    return true;
  }, [refreshSessionSummaries, resetInputState, setCurrentSession, setMessages]);

  const startNewSession = useCallback(() => {
    const session = createSession();
    setCurrentSession(session.id);
    sessionAttachmentsRef.current = [];
    setMessages([createWelcomeMessage()]);
    resetInputState();
    refreshSessionSummaries();
    return session.id;
  }, [refreshSessionSummaries, resetInputState, setCurrentSession, setMessages]);

  /** 세션 전환 시 메시지 복원 */
  const handleSelectSession = useCallback((sessionId: string | null) => {
    if (sessionId) {
      restoreSession(sessionId);
    } else {
      startNewSession();
    }
    sessionStorage.setItem(SESSION_BOOTSTRAP_KEY, '1');
    setRequiresSessionChoice(false);
    setShowSessionModal(false);
    refreshSessionSummaries();
  }, [refreshSessionSummaries, restoreSession, startNewSession]);

  const handleRenameCurrentSession = useCallback(() => {
    if (!currentSessionId) return;

    const currentSession = sessionSummaries.find((session) => session.id === currentSessionId);
    const nextTitle = window.prompt('세션 이름을 입력하세요.', currentSession?.title || '새 세션');
    if (nextTitle === null) return;

    renameSession(currentSessionId, nextTitle.trim() || '제목 없음');
    refreshSessionSummaries();
  }, [currentSessionId, refreshSessionSummaries, sessionSummaries]);

  const handleDeleteCurrentSession = useCallback(() => {
    if (!currentSessionId) return;

    const currentSession = sessionSummaries.find((session) => session.id === currentSessionId);
    const confirmed = window.confirm(`"${currentSession?.title || '현재 세션'}" 세션을 삭제할까요?`);
    if (!confirmed) return;

    deleteSession(currentSessionId);
    const remainingSessions = getSessionList();
    setSessionSummaries(remainingSessions);

    if (remainingSessions.length > 0) {
      restoreSession(remainingSessions[0].id);
    } else {
      startNewSession();
    }
  }, [currentSessionId, restoreSession, sessionSummaries, startNewSession]);

  const isLoading = status === 'submitted' || status === 'streaming' || isPreparingMessage;
  const displayedMessages = useMemo(() => dedupeMessages(messages), [messages]);

  const bottomRef = useRef<HTMLDivElement>(null);
  const dragCounterRef = useRef(0);

  // 초기 세션 로드
  useEffect(() => {
    if (didInitSessionRef.current) return;
    didInitSessionRef.current = true;

    const timeoutId = window.setTimeout(() => {
      const existingSessions = getSessionList();
      setSessionSummaries(existingSessions);
      const hasMadeChoiceInThisAppSession = sessionStorage.getItem(SESSION_BOOTSTRAP_KEY) === '1';

      if (existingSessions.length === 0) {
        startNewSession();
        sessionStorage.setItem(SESSION_BOOTSTRAP_KEY, '1');
        return;
      }

      if (!hasMadeChoiceInThisAppSession) {
        setRequiresSessionChoice(true);
        setShowSessionModal(true);
        setMessages([createWelcomeMessage()]);
        resetInputState();
        return;
      }

      const activeSessionId = getActiveSessionId();
      if (activeSessionId && restoreSession(activeSessionId)) return;

      startNewSession();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [resetInputState, restoreSession, setMessages, startNewSession]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (!currentSessionId) return;
    const sessionMessages = toSessionMessages(messages);
    if (sessionMessages.length === 0) return;

    updateSessionTitle(currentSessionId, generateSessionTitle(sessionMessages));
    updateSessionMessages(currentSessionId, sessionMessages, sessionAttachmentsRef.current);
    const timeoutId = window.setTimeout(refreshSessionSummaries, 0);
    return () => window.clearTimeout(timeoutId);
  }, [messages, currentSessionId, refreshSessionSummaries]);

  /** 사용자 메시지 전송 시 세션 저장 */
  const handleSendMessage = useCallback(async (message: { text: string }, opts?: Parameters<typeof sendMessage>[1]) => {
    let sessionId = currentSessionIdRef.current;
    if (!sessionId) {
      const newSession = createSession();
      sessionId = newSession.id;
      setCurrentSession(newSession.id);
    }

    sessionAttachmentsRef.current = attachments;
    activeRequestSerialRef.current = ++requestSerialRef.current;
    setIsPreparingMessage(true);

    try {
      let documentContext = null;
      try {
        documentContext = await rhwpActions.readDocument();
      } catch (error) {
        console.warn('현재 rhwp 문서 컨텍스트를 읽지 못했습니다:', error);
      }

      sendMessage(message, {
        ...opts,
        body: {
          ...opts?.body,
          documentContext,
        },
      });
    } finally {
      setIsPreparingMessage(false);
    }
  }, [attachments, sendMessage, setCurrentSession]);

  const handleProfileChange = (id: string) => {
    setActiveProfile(id);
    const profile = BUILTIN_PROFILES.find(p => p.id === id);
    if (profile) setActiveProfileState(profile);
  };

  /** 파일 목록을 처리하여 attachments에 추가 */
  const handleFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    setProcessingFiles(true);

    const results = await Promise.allSettled(files.map(processFile));
    const succeeded: Attachment[] = [];
    const errors: string[] = [];

    results.forEach((result, i) => {
      if (result.status === 'fulfilled') {
        succeeded.push(result.value);
      } else {
        errors.push(`${files[i].name}: ${(result.reason as Error).message}`);
      }
    });

    if (succeeded.length > 0) {
      setAttachments(prev => [...prev, ...succeeded]);
    }
    if (errors.length > 0) {
      // 오류 메시지를 어시스턴트 시스템 메시지로 추가
      setMessages(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'system' as const,
          parts: [{ type: 'text', text: `파일 처리 오류:\n${errors.join('\n')}` }],
        }
      ]);
    }

    setProcessingFiles(false);
  }, [setMessages]);

  /** Ctrl+V 이미지 붙여넣기 */
  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const imageFiles = Array.from(e.clipboardData.items)
      .filter(item => item.type.startsWith('image/'))
      .map(item => item.getAsFile())
      .filter((f): f is File => f !== null);

    if (imageFiles.length > 0) {
      e.preventDefault();
      await handleFiles(imageFiles);
    }
  }, [handleFiles]);

  /** 드래그 이벤트 */
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current++;
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current = 0;
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    await handleFiles(files);
  }, [handleFiles]);

  /** 첨부파일 제거 */
  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const canSend = ((input || '').trim().length > 0 || attachments.length > 0) && !isLoading;

  const rememberInput = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const history = inputHistoryRef.current;
    if (history[history.length - 1] !== trimmed) {
      inputHistoryRef.current = [...history, trimmed].slice(-50);
    }
    inputHistoryIndexRef.current = null;
    draftInputRef.current = '';
  }, []);

  const handleInputHistoryKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;

    const history = inputHistoryRef.current;
    if (history.length === 0) return;

    const textarea = e.currentTarget;
    const isSingleLine = !input.includes('\n');
    const atStart = textarea.selectionStart === 0 && textarea.selectionEnd === 0;
    const atEnd = textarea.selectionStart === input.length && textarea.selectionEnd === input.length;

    if (e.key === 'ArrowUp') {
      if (!isSingleLine && !atStart) return;
      e.preventDefault();

      if (inputHistoryIndexRef.current === null) {
        draftInputRef.current = input;
        inputHistoryIndexRef.current = history.length - 1;
      } else {
        inputHistoryIndexRef.current = Math.max(0, inputHistoryIndexRef.current - 1);
      }

      setInput(history[inputHistoryIndexRef.current] || '');
      return;
    }

    if (!isSingleLine && !atEnd) return;
    e.preventDefault();

    if (inputHistoryIndexRef.current === null) return;

    const nextIndex = inputHistoryIndexRef.current + 1;
    if (nextIndex >= history.length) {
      inputHistoryIndexRef.current = null;
      setInput(draftInputRef.current);
      draftInputRef.current = '';
    } else {
      inputHistoryIndexRef.current = nextIndex;
      setInput(history[nextIndex] || '');
    }
  }, [input]);

  const handleSubmit = useCallback((e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSend) return;

    const text = input.trim() || '첨부 파일을 참고해 주세요.';
    rememberInput(text);
    void handleSendMessage(
      { text },
      {
        body: {
          config: currentConfig,
          systemPrompt: activeProfile.systemPrompt,
          attachments: attachments,
        },
      }
    );
    setInput('');
    setAttachments([]);
  }, [activeProfile.systemPrompt, attachments, canSend, currentConfig, handleSendMessage, input, rememberInput]);

  return (
    <div
      className="flex flex-col h-full relative"
      style={{ background: 'var(--color-bg-panel)' }}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* 세션 모달 */}
      {showSessionModal && (
        <ChatSessionModal
          activeSessionId={currentSessionId}
          onSelectSession={handleSelectSession}
          onClose={() => {
            if (requiresSessionChoice) return;
            refreshSessionSummaries();
            setShowSessionModal(false);
          }}
          requireChoice={requiresSessionChoice}
        />
      )}

      {/* 드래그 오버레이 */}
      {isDragging && (
        <div
          className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 pointer-events-none rounded-lg"
          style={{
            background: `color-mix(in srgb, var(--color-brand) 10%, transparent)`,
            border: '2px dashed var(--color-brand)',
          }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--color-brand)' }}>
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
          </svg>
          <p className="text-sm font-medium" style={{ color: 'var(--color-brand)' }}>
            여기에 파일을 놓으세요
          </p>
        </div>
      )}

      {/* 헤더 */}
      <div className="panel-header border-b border-[var(--color-bg-border)]">
        <div className="flex justify-between items-center mb-1">
          <button
            onClick={() => {
              refreshSessionSummaries();
              setShowSessionModal(true);
            }}
            className="flex items-center gap-1.5 hover:text-[var(--color-brand)] transition-colors"
            title="세션 관리"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span className="text-sm font-bold">AI 어시스턴트</span>
          </button>
          <div
            className="flex items-center gap-1.5 text-[var(--color-text-secondary)]"
            title="AI 에이전트 선택"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 8V4H8" />
              <rect width="16" height="12" x="4" y="8" rx="2" />
              <path d="M2 14h2" />
              <path d="M20 14h2" />
              <path d="M15 13v2" />
              <path d="M9 13v2" />
            </svg>
            <select
              value={activeProfile.id}
              onChange={(e) => handleProfileChange(e.target.value)}
              className="text-[11px] bg-[var(--color-bg-surface)] border border-[var(--color-bg-border)] rounded px-1.5 py-0.5 text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand)]"
              aria-label="AI 에이전트 선택"
            >
              {BUILTIN_PROFILES.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          <select
            value={currentSessionId ?? ''}
            onChange={(e) => {
              if (e.target.value) {
                handleSelectSession(e.target.value);
              }
            }}
            className="min-w-0 flex-1 rounded border border-[var(--color-bg-border)] bg-[var(--color-bg-surface)] px-2 py-1.5 text-xs text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand)]"
            title="채팅 세션 선택"
          >
            <option value="" disabled>
              세션 선택
            </option>
            {sessionSummaries.map((session) => (
              <option key={session.id} value={session.id}>
                {session.title} ({session.messageCount})
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => handleSelectSession(null)}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded border border-[var(--color-bg-border)] bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-surface2)] hover:text-[var(--color-text-primary)]"
            title="새 세션"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
          <button
            type="button"
            onClick={handleRenameCurrentSession}
            disabled={!currentSessionId}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded border border-[var(--color-bg-border)] bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-surface2)] hover:text-[var(--color-text-primary)] disabled:cursor-not-allowed disabled:opacity-40"
            title="세션 이름 변경"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={handleDeleteCurrentSession}
            disabled={!currentSessionId}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded border border-[var(--color-bg-border)] bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)] hover:bg-red-500/10 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40"
            title="현재 세션 삭제"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => {
              refreshSessionSummaries();
              setShowSessionModal(true);
            }}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded border border-[var(--color-bg-border)] bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-surface2)] hover:text-[var(--color-text-primary)]"
            title="세션 관리"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
        <p className="text-[11px] text-[var(--color-text-muted)] line-clamp-1">{activeProfile.description}</p>
      </div>

      {/* 메시지 목록 */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
        {displayedMessages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className="max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap leading-relaxed"
              style={
                msg.role === 'user'
                  ? {
                      background: 'var(--color-brand)',
                      color: 'var(--color-doc-paper)',
                      borderBottomRightRadius: '4px',
                    }
                  : {
                      background: 'var(--color-bg-surface)',
                      color: 'var(--color-text-primary)',
                      borderBottomLeftRadius: '4px',
                    }
              }
            >
              <MessageContent text={getMessageText(msg)} />
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div
              className="rounded-2xl rounded-bl-sm px-4 py-3"
              style={{ background: 'var(--color-bg-surface)' }}
            >
              <span className="flex gap-1.5 items-center">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full animate-bounce"
                    style={{ background: 'var(--color-text-muted)', animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* 첨부파일 미리보기 (전송 전) */}
      <AttachmentPreview attachments={attachments} onRemove={removeAttachment} />

      {/* 파일 처리 중 표시 */}
      {processingFiles && (
        <div
          className="px-3 py-1.5 text-xs flex items-center gap-1.5"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <span className="animate-spin inline-block w-3 h-3 border border-current border-t-transparent rounded-full" />
          파일 처리 중...
        </div>
      )}

      {/* 입력창 */}
      <form
        onSubmit={handleSubmit}
        className="p-3 border-t flex gap-2 items-end"
        style={{ borderColor: 'var(--color-bg-border)' }}
      >
        <textarea
          id="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
              return;
            }
            handleInputHistoryKeyDown(e);
          }}
          onPaste={handlePaste}
          placeholder="명령 입력 (Enter 전송, Shift+Enter 줄바꿈)"
          rows={2}
          className="flex-1 resize-none input"
        />
        <div className="flex flex-shrink-0 flex-col items-stretch gap-1">
          <AttachButton onFiles={handleFiles} disabled={isLoading} />
          <button
            id="chat-send"
            type="submit"
            disabled={!canSend}
            className="btn btn-primary min-h-8 flex-shrink-0 px-3"
          >
            전송
          </button>
        </div>
      </form>
    </div>
  );
}
