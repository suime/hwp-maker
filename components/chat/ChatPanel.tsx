'use client';

/**
 * AI 채팅 패널 (좌측)
 * 사용자가 자연어로 문서 작성/수정 명령을 입력하는 영역
 */

import { useState, useRef, useEffect } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
}

export default function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        '안녕하세요! hwp-maker AI 어시스턴트입니다.\n문서에 넣고 싶은 내용을 자연어로 입력해주세요.\n예: "회의록 제목과 참석자 목록을 추가해줘"',
      createdAt: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      createdAt: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // TODO: lib/ai/client.ts 를 통해 실제 AI 호출로 교체
    await new Promise((r) => setTimeout(r, 800));
    const aiMsg: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: `"${text}"에 대한 내용을 문서에 반영하겠습니다. (AI 연동 준비 중)`,
      createdAt: new Date(),
    };
    setMessages((prev) => [...prev, aiMsg]);
    setIsLoading(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg-panel)]">
      {/* 패널 헤더 */}
      <div className="px-4 py-3 border-b border-[var(--color-bg-border)] flex-shrink-0">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
          AI 어시스턴트
        </h2>
        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
          자연어로 문서를 작성/수정하세요
        </p>
      </div>

      {/* 메시지 목록 */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[var(--color-brand)] text-white rounded-br-none'
                  : 'bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] rounded-bl-none'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-[var(--color-bg-surface)] rounded-xl rounded-bl-none px-3 py-2">
              <span className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-[var(--color-text-muted)] animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* 입력창 */}
      <div className="p-3 border-t border-[var(--color-bg-border)] flex-shrink-0">
        <div className="flex gap-2 items-end">
          <textarea
            id="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="명령을 입력하세요... (Enter로 전송, Shift+Enter 줄바꿈)"
            rows={2}
            className="flex-1 resize-none px-3 py-2 rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-bg-border)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-brand)] transition-colors"
          />
          <button
            id="chat-send"
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="px-3 py-2 rounded-lg bg-[var(--color-brand)] hover:bg-[var(--color-brand-dark)] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm transition-colors flex-shrink-0"
          >
            전송
          </button>
        </div>
      </div>
    </div>
  );
}
