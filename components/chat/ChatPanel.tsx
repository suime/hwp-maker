'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { BUILTIN_PROFILES, getActiveProfile, setActiveProfile, AiProfile } from '@/lib/ai/profiles';
import { generateContent, parseAiResponse } from '@/lib/ai/service';
import { rhwpActions } from '@/lib/rhwp/loader';
import { AiMessage } from '@/lib/ai/client';
import type { Attachment } from '@/types/attachment';
import { processFile } from '@/lib/attachment/reader';
import AttachButton from './AttachButton';
import AttachmentPreview from './AttachmentPreview';
import MessageAttachment from './MessageAttachment';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  attachments?: Attachment[];
}

const WELCOME: Message = {
  id: 'welcome',
  role: 'assistant',
  content: '안녕하세요! hwp-maker AI 어시스턴트입니다.\n\n문서에 넣고 싶은 내용을 자연어로 입력하거나, 📎 버튼으로 참고 파일을 첨부해 보세요.\n예: "첨부한 보고서를 바탕으로 회의록을 작성해줘"',
};

export default function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeProfile, setActiveProfileState] = useState<AiProfile>(BUILTIN_PROFILES[0]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [processingFiles, setProcessingFiles] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const dragCounterRef = useRef(0);

  useEffect(() => {
    setActiveProfileState(getActiveProfile());
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

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
      // 오류 메시지를 어시스턴트 메시지로 표시
      setMessages(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `파일 처리 오류:\n${errors.join('\n')}`,
        },
      ]);
    }

    setProcessingFiles(false);
  }, []);

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

  async function handleSend() {
    const text = input.trim();
    if ((!text && attachments.length === 0) || isLoading) return;

    const userMsgId = crypto.randomUUID();
    const assistantMsgId = crypto.randomUUID();
    const currentAttachments = [...attachments];

    setMessages(prev => [
      ...prev,
      { id: userMsgId, role: 'user', content: text, attachments: currentAttachments },
    ]);
    setInput('');
    setAttachments([]);
    setIsLoading(true);

    // 채팅 이력 구성 (최근 5개만, 텍스트만)
    const history: AiMessage[] = messages
      .slice(-5)
      .map(m => ({ role: m.role, content: m.content }));

    let fullResponse = '';

    try {
      setMessages(prev => [...prev, { id: assistantMsgId, role: 'assistant', content: '' }]);

      await generateContent(text, history, currentAttachments, (chunk) => {
        fullResponse += chunk;
        setMessages(prev =>
          prev.map(m => m.id === assistantMsgId ? { ...m, content: fullResponse } : m)
        );
      });

      // 에디터에 반영
      const cleanText = parseAiResponse(fullResponse);
      rhwpActions.insertText(cleanText);

    } catch (err: unknown) {
      console.error('AI 응답 생성 실패:', err);
      setMessages(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `오류가 발생했습니다: ${err instanceof Error ? err.message : '알 수 없는 에러'}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const canSend = (input.trim().length > 0 || attachments.length > 0) && !isLoading;

  return (
    <div
      className="flex flex-col h-full relative"
      style={{ background: 'var(--color-bg-panel)' }}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
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
          <h2 className="text-sm font-bold">AI 어시스턴트</h2>
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
              {/* 첨부파일 표시 */}
              {msg.attachments && msg.attachments.length > 0 && (
                <MessageAttachment attachments={msg.attachments} />
              )}
              {msg.content && <span>{msg.content}</span>}
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
      <div
        className="p-3 border-t flex gap-2 items-end"
        style={{ borderColor: 'var(--color-bg-border)' }}
      >
        <AttachButton onFiles={handleFiles} disabled={isLoading} />
        <textarea
          id="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder="명령 입력 (Enter 전송, Shift+Enter 줄바꿈)"
          rows={2}
          className="flex-1 resize-none input"
        />
        <button
          id="chat-send"
          onClick={handleSend}
          disabled={!canSend}
          className="btn btn-primary flex-shrink-0"
        >
          전송
        </button>
      </div>
    </div>
  );
}
