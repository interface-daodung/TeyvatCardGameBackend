import { useState, useRef, useEffect, useCallback, useMemo, FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleNotch, faArrowUp, faRobot } from '@fortawesome/free-solid-svg-icons';
import { AssistantMessageMarkdown } from '../ai/AssistantMessageMarkdown';
import { scaleInModal, fadeInOverlay } from '../animations/motionPresets';
import { aiService, type ChatMessage } from '../../services/aiService';

interface UiMessage extends ChatMessage {
  id: string;
}

function createId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

const BUBBLE_SESSION_KEY = 'aiChatBubble_sessionId';

function getOrCreateBubbleSessionId(): string {
  try {
    const existing = sessionStorage.getItem(BUBBLE_SESSION_KEY);
    if (existing?.trim()) return existing.trim();
  } catch {
    // ignore
  }
  const sid =
    typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : createId();
  try {
    sessionStorage.setItem(BUBBLE_SESSION_KEY, sid);
  } catch {
    // ignore
  }
  return sid;
}

export function AIChatBubble() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastReadCount, setLastReadCount] = useState(0);
  const listRef = useRef<HTMLDivElement | null>(null);

  const bubbleSessionId = useMemo(() => getOrCreateBubbleSessionId(), []);

  const scrollToBottom = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (open) {
      setLastReadCount(messages.length);
    }
  }, [open, messages.length]);

  const handleToggleOpen = () => {
    setOpen((prev) => !prev);
  };

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
      const assistant = await aiService.chat(historyForApi, { sessionId: bubbleSessionId });
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

  const hasMessages = messages.length > 0;

  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex items-end justify-end p-4 md:p-6">
      <div className="pointer-events-auto flex flex-col items-end gap-3">
        <AnimatePresence>
          {open && (
            <>
              <motion.div
                className="fixed inset-0 bg-slate-900/10 backdrop-blur-[1px]"
                variants={fadeInOverlay}
                initial="hidden"
                animate="visible"
                exit="exit"
                onClick={() => setOpen(false)}
              />
              <motion.div
                className="relative z-50 w-[min(26rem,100vw-2rem)] md:w-[24rem] rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden"
                variants={scaleInModal}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-indigo-500 via-sky-500 to-blue-500 text-white">
                  <div>
                    <p className="text-sm font-semibold">AI trợ lý</p>
                    <p className="text-[11px] text-indigo-100/90">
                      Hỏi nhanh về dữ liệu đang xem.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="ml-3 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                    aria-label="Đóng chat AI"
                  >
                    <span className="text-sm leading-none">✕</span>
                  </button>
                </div>

                <div className="flex flex-col h-[55vh] min-h-[320px] max-h-[520px]">
                  <div
                    ref={listRef}
                    className="flex-1 min-h-0 overflow-y-auto px-3 py-2 space-y-2 bg-slate-50/80"
                  >
                    {!hasMessages ? (
                      <div className="h-full flex items-center justify-center text-[11px] text-slate-400 text-center px-4">
                        Hỏi AI về màn hình hiện tại, dữ liệu cần phân tích hoặc cách sử dụng admin.
                      </div>
                    ) : (
                      messages.map((m) => (
                        <div
                          key={m.id}
                          className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-2xl px-3 py-1.5 text-xs shadow-sm ${
                              m.role === 'user'
                                ? 'bg-blue-600 text-white rounded-br-sm'
                                : 'bg-white text-slate-800 rounded-bl-sm border border-slate-200'
                            }`}
                          >
                            {m.role === 'assistant' && (
                              <div className="text-[9px] uppercase tracking-wide text-slate-400 mb-0.5">
                                AI
                              </div>
                            )}
                            {m.role === 'assistant' ? (
                              <AssistantMessageMarkdown content={m.content} variant="compact" />
                            ) : (
                              <div className="whitespace-pre-wrap break-words">{m.content}</div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {error && (
                    <div className="px-3 pt-1 pb-1.5 text-[10px] text-red-600 bg-red-50 border-t border-red-100">
                      {error}
                    </div>
                  )}

                  <form
                    onSubmit={handleSubmit}
                    className="px-3 py-2 border-t border-slate-200 bg-white flex flex-col gap-1.5"
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
                              : 'Hỏi nhanh AI (Enter để gửi, Shift+Enter xuống dòng)…'
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              void handleSubmit(e as unknown as FormEvent);
                            }
                          }}
                          className="w-full rounded-2xl border border-slate-300 px-3 py-1.5 pr-10 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400 placeholder:text-slate-400 bg-slate-50"
                        />
                        <button
                          type="submit"
                          disabled={loading || !input.trim()}
                          className="absolute right-1.5 bottom-1.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                          aria-label="Gửi câu hỏi"
                        >
                          <FontAwesomeIcon
                            icon={loading ? faCircleNotch : faArrowUp}
                            className={loading ? 'w-3.5 h-3.5 animate-spin' : 'w-3.5 h-3.5'}
                          />
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <button
          type="button"
          onClick={handleToggleOpen}
          className="relative inline-flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 via-sky-500 to-blue-500 text-white shadow-lg shadow-indigo-500/40 hover:shadow-xl hover:shadow-indigo-500/50 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-400"
          aria-label={open ? 'Ẩn chat AI' : 'Mở chat AI'}
        >
          <FontAwesomeIcon icon={faRobot} className="w-5 h-5" />
          {!open && messages.length > lastReadCount && (
            <span className="absolute -top-1 -right-1 inline-flex h-4 w-4 animate-ping rounded-full bg-emerald-400 opacity-75" />
          )}
        </button>
      </div>
    </div>
  );
}

