'use client';

import { useState, useRef, useEffect } from 'react';
import { BUILTIN_PROFILES, getActiveProfile, setActiveProfile, AiProfile } from '@/lib/ai/profiles';
import { generateContent, parseAiResponse } from '@/lib/ai/service';
import { rhwpActions } from '@/lib/rhwp/loader';
import { AiMessage } from '@/lib/ai/client';

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
  const [activeProfile, setActiveProfileState] = useState<AiProfile>(BUILTIN_PROFILES[0]);
  const bottomRef = useRef<HTMLDivElement>(null);

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

  async function handleSend() {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsgId = crypto.randomUUID();
    const assistantMsgId = crypto.randomUUID();

    setMessages((prev) => [...prev, { id: userMsgId, role: 'user', content: text }]);
    setInput('');
    setIsLoading(true);

    // 채팅 이력 구성 (최근 5개만)
    const history: AiMessage[] = messages
      .slice(-5)
      .map(m => ({ role: m.role, content: m.content }));

    let fullResponse = '';
    
    try {
      // 어시스턴트 메시지 자리 만들기
      setMessages((prev) => [...prev, { id: assistantMsgId, role: 'assistant', content: '' }]);

      await generateContent(text, history, (chunk) => {
        fullResponse += chunk;
        setMessages((prev) => 
          prev.map(m => m.id === assistantMsgId ? { ...m, content: fullResponse } : m)
        );
      });

      // 에디터에 반영
      const cleanText = parseAiResponse(fullResponse);
      rhwpActions.insertText(cleanText);

    } catch (err: any) {
      console.error('AI 응답 생성 실패:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `오류가 발생했습니다: ${err.message || '알 수 없는 에러'}`,
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

  return (
    <div
      className="flex flex-col h-full"
      style={{ background: 'var(--color-bg-panel)' }}
    >
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
