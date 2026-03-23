import { useState, useRef, useEffect, useCallback, FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowUp,
  faClockRotateLeft,
  faCircleNotch,
  faPlus,
} from '@fortawesome/free-solid-svg-icons';
import { format } from 'date-fns';
import { AssistantMessageMarkdown } from '../components/ai/AssistantMessageMarkdown';
import { PageHeader } from '../components/PageHeader';
import { aiService, type ChatMessage } from '../services/aiService';
import { logService, type AuditLog } from '../services/logService';
import { authService } from '../services/authService';
import {
  fadeSlideCard,
  slideInDrawerRight,
  slideUpItem,
  zoomInPopup,
} from '../components/animations/motionPresets';

interface UiMessage extends ChatMessage {
  id: string;
}

interface ChatSessionRow {
  sessionId: string;
  preview: string;
  lastAt: string;
  email: string;
}

function createId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function newSessionId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : createId();
}

type AiChatDetails = {
  sessionId?: string;
  email?: string;
  userMessage?: string;
  assistantMessage?: string;
};

function parseAiChatDetails(log: AuditLog): AiChatDetails {
  const d = log.details;
  if (!d || typeof d !== 'object') return {};
  return d as AiChatDetails;
}

function adminEmailFromLog(log: AuditLog): string {
  const fromDetails = parseAiChatDetails(log).email;
  if (fromDetails) return fromDetails;
  const a = log.adminId;
  if (a && typeof a === 'object' && 'email' in a && typeof (a as { email: string }).email === 'string') {
    return (a as { email: string }).email;
  }
  return '';
}

/** Logs đã sort createdAt desc — lấy phiên mới nhất mỗi sessionId một lần. */
function sessionsFromLogsDesc(logs: AuditLog[]): ChatSessionRow[] {
  const seen = new Set<string>();
  const rows: ChatSessionRow[] = [];
  for (const log of logs) {
    const d = parseAiChatDetails(log);
    const sid = d.sessionId?.trim();
    if (!sid || seen.has(sid)) continue;
    seen.add(sid);
    rows.push({
      sessionId: sid,
      preview: (d.userMessage ?? '').replace(/\s+/g, ' ').trim().slice(0, 72),
      lastAt: log.createdAt,
      email: adminEmailFromLog(log),
    });
  }
  return rows;
}

function messagesFromSessionLogs(logs: AuditLog[]): UiMessage[] {
  const out: UiMessage[] = [];
  for (const log of logs) {
    const d = parseAiChatDetails(log);
    const uid = String(log._id);
    if (d.userMessage) {
      out.push({ id: `${uid}-u`, role: 'user', content: d.userMessage });
    }
    if (d.assistantMessage) {
      out.push({ id: `${uid}-a`, role: 'assistant', content: d.assistantMessage });
    }
  }
  return out;
}

export default function AIManage() {
  const [sessionId, setSessionId] = useState(newSessionId);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [sessions, setSessions] = useState<ChatSessionRow[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingSession, setLoadingSession] = useState(false);
  /** Sidebar lịch sử bên phải; nút nổi góc phải để mở/đóng. */
  const [historyOpen, setHistoryOpen] = useState(false);
  /** Ẩn PageHeader khi focus ô nhập; chỉ hiện lại khi bấm vào thanh Phiên / Email. */
  const [pageHeaderVisible, setPageHeaderVisible] = useState(true);
  const listRef = useRef<HTMLDivElement | null>(null);

  const currentEmail = authService.getUserEmail() ?? '';

  const scrollToBottom = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const refreshSessionList = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const { logs } = await logService.getLogs(1, 300, {
        action: 'ai_chat',
        resource: 'ai_chat',
        mineOnly: true,
      });
      setSessions(sessionsFromLogsDesc(logs));
    } catch {
      setSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshSessionList();
  }, [refreshSessionList]);

  const startNewChat = () => {
    setSessionId(newSessionId());
    setMessages([]);
    setError(null);
  };

  const openSession = async (sid: string) => {
    if (sid === sessionId && messages.length > 0) return;
    setLoadingSession(true);
    setError(null);
    try {
      const { logs } = await logService.getLogs(1, 500, {
        action: 'ai_chat',
        resource: 'ai_chat',
        sessionId: sid,
        mineOnly: true,
      });
      setSessionId(sid);
      setMessages(messagesFromSessionLogs(logs));
    } catch {
      setError('Không tải được lịch sử phiên chat.');
    } finally {
      setLoadingSession(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || loading || loadingSession) return;

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
      const assistant = await aiService.chat(historyForApi, { sessionId });
      const assistantMessage: UiMessage = {
        id: createId(),
        role: assistant.role ?? 'assistant',
        content: assistant.content,
      };
      setMessages((prev) => [...prev, assistantMessage]);
      void refreshSessionList();
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
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <motion.div
        className={`shrink-0 px-4 md:px-8 pt-2 pb-3 ${!pageHeaderVisible ? 'hidden' : ''}`}
        aria-hidden={!pageHeaderVisible}
        variants={fadeSlideCard}
        initial="hidden"
        animate="visible"
      >
        <PageHeader
          title="AI Manage"
          description="Chat với AI; mỗi phiên có ID riêng, lưu kèm email người hỏi trong logs."
        />
      </motion.div>

      <div className="flex min-h-0 flex-1 flex-row overflow-hidden">
        <motion.div
          layout
          transition={{ type: 'spring', stiffness: 380, damping: 38 }}
          className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
        >
          <motion.button
            type="button"
            title={!pageHeaderVisible ? 'Bấm để hiện lại tiêu đề AI Manage' : undefined}
            onClick={() => setPageHeaderVisible(true)}
            variants={fadeSlideCard}
            initial="hidden"
            animate="visible"
            className={`relative z-10 w-full shrink-0 cursor-pointer border-b border-slate-200/80 bg-white/80 px-4 text-left backdrop-blur-sm text-[11px] text-slate-500 flex flex-wrap items-center gap-x-4 gap-y-1 transition-colors hover:bg-slate-50/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/40 md:px-8 ${
              historyOpen ? 'min-h-14 py-3' : 'py-2'
            }`}
          >
            <span className="pointer-events-none">
              <span className="text-slate-400">Phiên:</span>{' '}
              <code className="text-slate-700 font-mono text-[10px] break-all">{sessionId}</code>
            </span>
            <span className="pointer-events-none">
              <span className="text-slate-400">Email:</span>{' '}
              <span className="text-slate-700">{currentEmail || '—'}</span>
            </span>
          </motion.button>

          <div
            ref={listRef}
            className="flex-1 min-h-0 overflow-y-auto px-4 md:px-8 py-4 pb-4 space-y-3 bg-slate-50/60"
          >
            {loadingSession ? (
              <motion.div
                key="loading-session"
                className="min-h-[40vh] flex items-center justify-center text-sm text-slate-400"
                variants={fadeSlideCard}
                initial="hidden"
                animate="visible"
              >
                Đang mở phiên…
              </motion.div>
            ) : messages.length === 0 ? (
              <motion.div
                key="empty-chat"
                className="min-h-[40vh] flex items-center justify-center text-sm text-slate-400 text-center px-4"
                variants={fadeSlideCard}
                initial="hidden"
                animate="visible"
              >
                Mở lịch sử phiên bên phải hoặc bắt đầu phiên mới, rồi nhập câu hỏi ở thanh dưới màn hình.
              </motion.div>
            ) : (
              messages.map((m, i) => (
                <motion.div
                  key={m.id}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  variants={slideUpItem}
                  initial="hidden"
                  animate="visible"
                  custom={Math.min(i, 12)}
                >
                  <div
                    className={`max-w-[min(80%,42rem)] rounded-2xl px-3 py-2 text-sm shadow-sm ${
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
                    {m.role === 'assistant' ? (
                      <AssistantMessageMarkdown content={m.content} variant="comfortable" />
                    ) : (
                      <div className="whitespace-pre-wrap break-words">{m.content}</div>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                key={error}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="shrink-0 overflow-hidden px-4 md:px-8 py-2 text-xs text-red-600 bg-red-50/95 border-t border-red-100"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            variants={fadeSlideCard}
            initial="hidden"
            animate="visible"
            className="shrink-0 bg-gradient-to-t from-slate-100/90 via-slate-50/80 to-transparent px-4 pb-3 pt-2"
            onFocusCapture={() => setPageHeaderVisible(false)}
          >
            <form onSubmit={handleSubmit} className="flex w-full flex-col gap-2">
              <div className="flex items-end gap-2">
                <div className="relative min-w-0 flex-1">
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
                    disabled={loadingSession}
                    className="w-full min-h-[2.75rem] resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 pr-12 text-sm text-slate-800 shadow-none outline-none transition-colors placeholder:text-slate-400 focus:border-blue-400/60 focus:outline-none focus:ring-2 focus:ring-blue-400/25 disabled:opacity-60"
                  />
                  <button
                    type="submit"
                    disabled={loading || loadingSession || !input.trim()}
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
          </motion.div>
        </motion.div>

        <AnimatePresence initial={false}>
          {historyOpen && (
            <motion.aside
              key="ai-history-drawer"
              variants={slideInDrawerRight}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex min-h-0 w-full max-w-[min(100%,20rem)] shrink-0 flex-col border-l border-slate-200 bg-slate-50/95 shadow-[inset_1px_0_0_rgba(0,0,0,0.04)] backdrop-blur-sm sm:w-72"
            >
              <div
                role="button"
                tabIndex={0}
                onClick={() => setHistoryOpen(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setHistoryOpen(false);
                  }
                }}
                className="min-h-14 px-3 py-3 border-b border-slate-200 flex items-center justify-between gap-2 cursor-pointer hover:bg-slate-100/80 transition-colors"
              >
                <p className="text-xs font-semibold text-slate-700">Lịch sử phiên</p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    startNewChat();
                  }}
                  className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-blue-700 shrink-0"
                >
                  <FontAwesomeIcon icon={faPlus} className="w-3 h-3" />
                  Phiên mới
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1">
                {sessionsLoading && (
                  <motion.p
                    className="text-[11px] text-slate-400 px-1"
                    variants={fadeSlideCard}
                    initial="hidden"
                    animate="visible"
                  >
                    Đang tải…
                  </motion.p>
                )}
                {!sessionsLoading && sessions.length === 0 && (
                  <motion.p
                    className="text-[11px] text-slate-400 px-1"
                    variants={fadeSlideCard}
                    initial="hidden"
                    animate="visible"
                  >
                    Chưa có phiên đã lưu.
                  </motion.p>
                )}
                {sessions.map((s, idx) => {
                  const active = s.sessionId === sessionId;
                  return (
                    <motion.div
                      key={s.sessionId}
                      variants={slideUpItem}
                      initial="hidden"
                      animate="visible"
                      custom={Math.min(idx, 14)}
                    >
                      <button
                        type="button"
                        onClick={() => void openSession(s.sessionId)}
                        className={`w-full text-left rounded-xl px-2 py-2 text-[11px] transition-colors ${
                          active
                            ? 'bg-blue-100 text-blue-900 ring-1 ring-blue-200'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-100'
                        }`}
                      >
                        <div className="font-mono text-[10px] text-slate-500 truncate" title={s.sessionId}>
                          {s.sessionId.slice(0, 8)}…
                        </div>
                        <div className="text-slate-500 truncate mt-0.5" title={s.email}>
                          {s.email || '—'}
                        </div>
                        <div className="text-slate-600 line-clamp-2 mt-0.5">{s.preview || '—'}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {s.lastAt ? format(new Date(s.lastAt), 'dd/MM/yyyy HH:mm') : ''}
                        </div>
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence initial={false}>
        {!historyOpen && (
          <motion.button
            type="button"
            key="history-fab"
            onClick={() => setHistoryOpen(true)}
            variants={zoomInPopup}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed z-40 top-24 right-4 inline-flex h-12 w-12 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-700 shadow-lg shadow-slate-900/10 hover:bg-slate-50 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:ring-offset-2 md:right-8"
            aria-label="Mở lịch sử phiên"
            title="Lịch sử phiên"
          >
            <FontAwesomeIcon icon={faClockRotateLeft} className="h-5 w-5" />
          </motion.button>
        )}
      </AnimatePresence>

    </div>
  );
}
