'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { Brain, Loader2, Send } from 'lucide-react';

type ChatMessage = {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
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
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem('rehab-gemini-chat') || '[]');
      if (Array.isArray(saved)) setMessages(saved.filter(isChatMessage).slice(-40));
    } catch {
      try {
        window.localStorage.removeItem('rehab-gemini-chat');
      } catch {
        // Storage can be unavailable in private or restricted browser modes.
      }
    } finally {
      setHistoryReady(true);
    }
  }, []);

  useEffect(() => {
    if (!historyReady) return;
    try {
      window.localStorage.setItem('rehab-gemini-chat', JSON.stringify(messages.slice(-40)));
    } catch {
      // The chat remains usable for the current page even without persistence.
    }
  }, [historyReady, messages]);

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
    try {
      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          history: messages.slice(-12).map(({ role, content: previousContent }) => ({ role, content: previousContent })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to send message.');
      setMessages((current) => [...current, data.userMessage, data.assistantMessage]);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to send message.');
      setQuestion(content);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card p-5" aria-label="AI recovery chat">
      <div className="flex items-center gap-2">
        <Brain className="w-5 h-5 text-medical-600" />
        <div>
          <h2 className="font-semibold text-clinical-900">Ask Recovery Assistant</h2>
          <p className="text-xs text-clinical-500">One shared Gemini chat for your dashboard and progress.</p>
        </div>
      </div>

      <div className="mt-4 max-h-80 min-h-28 overflow-y-auto space-y-3 pr-1">
        {messages.length === 0 && !loading && (
          <p className="text-sm text-clinical-500 py-4 text-center">Ask about the recovery data shown in this app.</p>
        )}
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <p className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
              message.role === 'user' ? 'bg-medical-600 text-white' : 'bg-clinical-100 text-clinical-800'
            }`}>
              {message.content}
            </p>
          </div>
        ))}
        {loading && <Loader2 className="w-5 h-5 animate-spin text-medical-600" />}
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
