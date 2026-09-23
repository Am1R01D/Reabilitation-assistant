'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { Brain, Send } from 'lucide-react';

type ChatMessage = {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  status?: 'sending' | 'failed';
};

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<ChatMessage>;
  return (
    typeof candidate.id === 'number' &&
    (candidate.role === 'user' || candidate.role === 'assistant') &&
    typeof candidate.content === 'string' &&
    typeof candidate.created_at === 'string'
  );
}

export function GeminiChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [historyReady, setHistoryReady] = useState(false);
  const [storageKey, setStorageKey] = useState('');
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadUserHistory() {
      try {
        const response = await fetch('/api/auth/me', { cache: 'no-store' });
        const data = await response.json();
        if (!response.ok || !data.user?.id) throw new Error('Unable to identify chat owner.');

        const userStorageKey = `rehab-gemini-chat:${data.user.id}`;
        const saved = JSON.parse(window.localStorage.getItem(userStorageKey) || '[]');
        if (!cancelled) {
          setStorageKey(userStorageKey);
          setMessages(Array.isArray(saved) ? saved.filter(isChatMessage).slice(-40) : []);
        }
      } catch {
        if (!cancelled) setError('Chat history is unavailable, but you can still send a message.');
      } finally {
        if (!cancelled) setHistoryReady(true);
      }
    }

    // Remove the old shared history so another account can never inherit it.
    try {
      window.localStorage.removeItem('rehab-gemini-chat');
    } catch {
      // Storage can be unavailable in private or restricted browser modes.
    }
    loadUserHistory();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!historyReady || !storageKey) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(messages.slice(-40)));
    } catch {
      // The chat remains usable for the current page even without persistence.
    }
  }, [historyReady, messages, storageKey]);

  useEffect(() => {
    const target = endRef.current;
    if (target && typeof target.scrollIntoView === 'function') {
      target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [messages, loading]);

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    const content = question.trim();
    if (!content || loading) return;

    setQuestion('');
    setError('');
    setLoading(true);
    const optimisticId = -Date.now();
    const optimisticMessage: ChatMessage = {
      id: optimisticId,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
      status: 'sending',
    };
    const requestHistory = messages.slice(-12);
    setMessages((current) => [...current, optimisticMessage]);

    try {
      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          history: requestHistory.map(({ role, content: previousContent }) => ({ role, content: previousContent })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to send message.');
      setMessages((current) => [
        ...current.map((item) => item.id === optimisticId ? data.userMessage : item),
        data.assistantMessage,
      ]);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to send message.');
      setMessages((current) => current.map((item) =>
        item.id === optimisticId ? { ...item, status: 'failed' } : item
      ));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card p-5 xl:flex xl:max-h-[calc(100vh-7rem)] xl:min-h-[34rem] xl:flex-col" aria-label="AI recovery chat">
      <div className="flex items-center gap-2">
        <Brain className="w-5 h-5 text-medical-600" />
        <div>
          <h2 className="font-semibold text-clinical-900">Ask Recovery Assistant</h2>
          <p className="text-xs text-clinical-500">One shared Gemini chat for your dashboard and progress.</p>
        </div>
      </div>

      <div className="mt-4 max-h-80 min-h-28 overflow-y-auto space-y-3 pr-1 xl:max-h-none xl:min-h-0 xl:flex-1">
        {messages.length === 0 && !loading && (
          <p className="text-sm text-clinical-500 py-4 text-center">Ask about the recovery data shown in this app.</p>
        )}
        {messages.map((message) => (
          <div key={message.id} className={`chat-message-enter flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
            <p className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap shadow-sm ${
              message.role === 'user' ? 'bg-medical-600 text-white' : 'bg-clinical-100 text-clinical-800'
            }`}>
              {message.content}
            </p>
            {message.status === 'sending' && <span className="mt-1 text-[10px] text-clinical-400">Sending…</span>}
            {message.status === 'failed' && <span className="mt-1 text-[10px] text-red-500">Not sent</span>}
          </div>
        ))}
        {loading && (
          <div className="chat-message-enter flex justify-start" aria-label="AI is typing">
            <div className="flex items-center gap-1 rounded-2xl bg-clinical-100 px-4 py-3">
              <span className="chat-typing-dot" />
              <span className="chat-typing-dot [animation-delay:150ms]" />
              <span className="chat-typing-dot [animation-delay:300ms]" />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <form onSubmit={sendMessage} className="mt-4 flex gap-2">
        <input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          maxLength={1000}
          placeholder="Ask about your check-ins or progress…"
          className="min-w-0 flex-1 rounded-lg border border-clinical-200 px-3 py-2 text-sm focus:border-medical-500 focus:outline-none"
        />
        <button type="submit" disabled={loading || !question.trim()} className="btn-primary px-3" aria-label="Send message">
          <Send className="w-4 h-4" />
        </button>
      </form>
      <p className="mt-2 text-xs text-clinical-400">For monitoring information only — not medical advice.</p>
    </section>
  );
}
