'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useChat } from '@ai-sdk/react';
import type { UIMessage } from '@ai-sdk/react';
import { BUILTIN_PROFILES, getActiveProfile, setActiveProfile, AiProfile } from '@/lib/ai/profiles';
import { loadAiConfig } from '@/lib/ai/config';
import { parseAiResponse } from '@/lib/ai/service';
import { rhwpActions } from '@/lib/rhwp/loader';
import type { Attachment } from '@/types/attachment';
import { processFile } from '@/lib/attachment/reader';
import {
  createSession,
  loadSession,
  setActiveSessionId,
  updateSessionMessages,
  updateSessionTitle,
  generateSessionTitle,
  type SessionMessage,
} from '@/lib/chat/sessions';
import AttachButton from './AttachButton';
import AttachmentPreview from './AttachmentPreview';
import ChatSessionModal from './ChatSessionModal';

const WELCOME_ID = 'welcome';
const WELCOME_TEXT = '안녕하세요! hwp-maker AI 어시스턴트입니다.\n\n문서에 넣고 싶은 내용을 자연어로 입력하거나, 📎 버튼으로 참고 파일을 첨부해 보세요.\n예: "첨부한 보고서를 바탕으로 회의록을 작성해줘"';
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

  if (typeof maybeMessage.content === 'string') return maybeMessage.content;
  if (typeof maybeMessage.text === 'string') return maybeMessage.text;

  const parts = Array.isArray(maybeMessage.parts)
    ? maybeMessage.parts
    : Array.isArray(maybeMessage.content)
      ? maybeMessage.content
      : null;

  if (parts) {
    return parts
      .map((part) => {
        if (typeof part === 'string') return part;
        if (part && typeof part === 'object') {
          const maybePart = part as { type?: string; text?: string };
          if (maybePart.type === 'text') return maybePart.text || '';
        }
        return '';
      })
      .filter(Boolean)
      .join('\n');
  }

  return JSON.stringify(message);
}

function toSessionMessages(messages: UIMessage[]): SessionMessage[] {
  return messages
    .filter((message) => !String(message.id || '').startsWith(WELCOME_ID))
    .map((message) => ({
      id: message.id || crypto.randomUUID(),
      role: message.role as 'user' | 'assistant' | 'system',
      content: messageContentToText(message),
    }))
    .filter((message) => message.content.trim().length > 0);
}

function extractAssistantText(messageOrEvent: unknown): string {
  const event = messageOrEvent as { message?: unknown; content?: unknown; text?: string };
  return messageContentToText(
    event?.message ??
      event?.content ??
      event?.text ??
      ''
  );
}

export default function ChatPanel() {
  const [activeProfile, setActiveProfileState] = useState<AiProfile>(() => getActiveProfile());
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [processingFiles, setProcessingFiles] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showSessionModal, setShowSessionModal] = useState(false);

  const [input, setInput] = useState('');
  const [currentConfig, setCurrentConfig] = useState(() => loadAiConfig());
  const currentSessionIdRef = useRef<string | null>(null);
  const sessionAttachmentsRef = useRef<Attachment[]>([]);
  const didInitSessionRef = useRef(false);

  const setCurrentSession = useCallback((sessionId: string | null) => {
    currentSessionIdRef.current = sessionId;
    setCurrentSessionId(sessionId);
    setActiveSessionId(sessionId);
  }, []);

  useEffect(() => {
    const handleConfigChange = () => setCurrentConfig(loadAiConfig());
    window.addEventListener('ai-config-changed', handleConfigChange);
    return () => window.removeEventListener('ai-config-changed', handleConfigChange);
  }, []);

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
      // 에디터에 반영
      const cleanText = parseAiResponse(extractAssistantText(message));
      void rhwpActions.insertText(cleanText).catch((error) => {
        console.warn('AI 응답을 에디터에 반영하지 못했습니다:', error);
      });
    },
    onError: (error) => {
      console.error('AI 응답 에러:', error);
    }
  });

  /** 세션 전환 시 메시지 복원 */
  const handleSelectSession = useCallback((sessionId: string | null) => {
    if (sessionId) {
      const session = loadSession(sessionId);
      if (session) {
        setCurrentSession(sessionId);
        sessionAttachmentsRef.current = session.attachments || [];
        setMessages([createWelcomeMessage(), ...session.messages.map(createTextMessage)]);
        setAttachments([]);
        setInput('');
      }
    } else {
      // 저장되지 않은 새 초안 세션으로 시작합니다. 첫 전송 시 저장됩니다.
      setCurrentSession(null);
      sessionAttachmentsRef.current = [];
      setMessages([createWelcomeMessage()]);
      setAttachments([]);
      setInput('');
    }
  }, [setCurrentSession, setMessages]);

  const isLoading = status === 'submitted' || status === 'streaming';

  const bottomRef = useRef<HTMLDivElement>(null);
  const dragCounterRef = useRef(0);

  // 초기 세션 로드
  useEffect(() => {
    if (didInitSessionRef.current) return;
    didInitSessionRef.current = true;

    // 앱을 처음 열면 항상 저장되지 않은 새 세션에서 시작합니다.
    setCurrentSession(null);
    setMessages([createWelcomeMessage()]);
    setAttachments([]);
  }, [setCurrentSession, setMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (!currentSessionId) return;
    const sessionMessages = toSessionMessages(messages);
    if (sessionMessages.length === 0) return;

    updateSessionTitle(currentSessionId, generateSessionTitle(sessionMessages));
    updateSessionMessages(currentSessionId, sessionMessages, sessionAttachmentsRef.current);
  }, [messages, currentSessionId]);

  /** 사용자 메시지 전송 시 세션 저장 */
  const handleSendMessage = useCallback((message: { text: string }, opts?: Parameters<typeof sendMessage>[1]) => {
    let sessionId = currentSessionIdRef.current;
    if (!sessionId) {
      const newSession = createSession();
      sessionId = newSession.id;
      setCurrentSession(newSession.id);
    }

    sessionAttachmentsRef.current = attachments;
    sendMessage(message, opts);
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
          onClose={() => setShowSessionModal(false)}
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
            onClick={() => setShowSessionModal(true)}
            className="flex items-center gap-1.5 hover:text-[var(--color-brand)] transition-colors"
            title="세션 관리"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span className="text-sm font-bold">AI 어시스턴트</span>
          </button>
          <select
            value={activeProfile.id}
            onChange={(e) => handleProfileChange(e.target.value)}
            className="text-[11px] bg-[var(--color-bg-surface)] border border-[var(--color-bg-border)] rounded px-1.5 py-0.5 outline-none focus:border-[var(--color-brand)]"
          >
            {BUILTIN_PROFILES.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <p className="text-[11px] text-[var(--color-text-muted)] line-clamp-1">{activeProfile.description}</p>
      </div>

      {/* 메시지 목록 */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
        {messages.map((msg) => (
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
              <span>{messageContentToText(msg)}</span>
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
        onSubmit={(e) => {
          e.preventDefault();
          if (!canSend) return;
          handleSendMessage(
            { text: input.trim() || '첨부 파일을 참고해 주세요.' },
            {
              body: {
                config: currentConfig,
                systemPrompt: activeProfile.systemPrompt,
                attachments: attachments,
              },
            }
          );
          setInput('');
          setAttachments([]); // 전송 후 첨부파일 초기화
        }}
        className="p-3 border-t flex gap-2 items-end"
        style={{ borderColor: 'var(--color-bg-border)' }}
      >
        <AttachButton onFiles={handleFiles} disabled={isLoading} />
        <textarea
          id="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
          onPaste={handlePaste}
          placeholder="명령 입력 (Enter 전송, Shift+Enter 줄바꿈)"
          rows={2}
          className="flex-1 resize-none input"
        />
        <button
          id="chat-send"
          type="submit"
          disabled={!canSend}
          className="btn btn-primary flex-shrink-0"
        >
          전송
        </button>
      </form>
    </div>
  );
}
