import { useState, useRef, useEffect, useCallback, FormEvent } from 'react';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleNotch, faArrowUp } from '@fortawesome/free-solid-svg-icons';
import { PageHeader } from '../components/PageHeader';
import { Card, CardContent } from '../components/ui/card';
import { fadeSlideCard } from '../components/animations/motionPresets';
import { aiService, type ChatMessage } from '../services/aiService';

interface UiMessage extends ChatMessage {
  id: string;
}

function createId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function AIManage() {
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    setError(null);

    const userMessage: UiMessage = {
      id: createId(),
      role: 'user',
      content: trimmed,
    };

    const historyForApi: ChatMessage[] = [...messages, userMessage].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const assistant = await aiService.chat(historyForApi);
      const assistantMessage: UiMessage = {
        id: createId(),
        role: assistant.role ?? 'assistant',
        content: assistant.content,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: unknown) {
      // eslint-disable-next-line no-console
      console.error('AI chat error', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Không gọi được AI. Kiểm tra server backend và Ollama (localhost:11434).'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeader
          title="AI Manage"
          description="Chat với AI để hỗ trợ phân tích và quản lý dữ liệu nội bộ."
        />
      </div>

      <motion.div variants={fadeSlideCard} initial="hidden" animate="visible">
        <Card className="border-0 shadow-lg overflow-hidden">
          <CardContent className="flex flex-col p-0">
            <div
              ref={listRef}
              className="flex-1 min-h-[260px] max-h-[70vh] overflow-y-auto p-4 space-y-3 bg-slate-50/60"
            >
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-slate-400">
                  Bắt đầu chat với AI bằng cách nhập câu hỏi bên dưới.
                </div>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                        m.role === 'user'
                          ? 'bg-blue-600 text-white rounded-br-sm'
                          : 'bg-white text-slate-800 rounded-bl-sm border border-slate-200'
                      }`}
                    >
                      {m.role === 'assistant' && (
                        <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-0.5">
                          AI
                        </div>
                      )}
                      <div className="whitespace-pre-wrap break-words">{m.content}</div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {error && (
              <div className="px-4 pt-2 text-xs text-red-600 bg-red-50 border-t border-red-100">
                {error}
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              className="p-4 border-t border-slate-200 bg-white flex flex-col gap-2"
            >
              <div className="flex items-end gap-2">
                <div className="flex-1 relative">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    rows={2}
                    placeholder={
                      loading
                        ? 'Đang chờ AI trả lời...'
                        : 'Nhập câu hỏi cho AI (Shift+Enter xuống dòng, Enter để gửi)…'
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        void handleSubmit(e as unknown as FormEvent);
                      }
                    }}
                    className="w-full rounded-2xl border border-slate-300 px-3 py-2 pr-12 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400 placeholder:text-slate-400 bg-slate-50"
                  />
                  <button
                    type="submit"
                    disabled={loading || !input.trim()}
                    className="absolute right-2 bottom-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                    aria-label="Gửi câu hỏi"
                  >
                    <FontAwesomeIcon
                      icon={loading ? faCircleNotch : faArrowUp}
                      className={loading ? 'w-4 h-4 animate-spin' : 'w-4 h-4'}
                    />
                  </button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

