'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const WELCOME: Message = {
  id: 'welcome',
  role: 'assistant',
  content: '안녕하세요! hwp-maker AI 어시스턴트입니다.\n\n문서에 넣고 싶은 내용을 자연어로 입력해주세요.\n예: "회의록 제목과 참석자 목록을 추가해줘"',
};

export default function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  async function handleSend() {
    const text = input.trim();
    if (!text || isLoading) return;
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'user', content: text }]);
    setInput('');
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `"${text}"에 대한 내용을 문서에 반영하겠습니다.\n(AI 연동 준비 중입니다)`,
      },
    ]);
    setIsLoading(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div
      className="flex flex-col h-full"
      style={{ background: 'var(--color-bg-panel)' }}
    >
      {/* 헤더 */}
      <div className="panel-header">
        <h2>AI 어시스턴트</h2>
        <p>자연어로 문서를 작성·수정하세요</p>
      </div>

      {/* 메시지 목록 */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
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
              {msg.content}
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

      {/* 입력창 */}
      <div
        className="p-3 border-t flex gap-2 items-end"
        style={{ borderColor: 'var(--color-bg-border)' }}
      >
        <textarea
          id="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="명령 입력 (Enter 전송, Shift+Enter 줄바꿈)"
          rows={2}
          className="flex-1 resize-none input"
        />
        <button
          id="chat-send"
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
          className="btn btn-primary flex-shrink-0"
        >
          전송
        </button>
      </div>
    </div>
  );
}
