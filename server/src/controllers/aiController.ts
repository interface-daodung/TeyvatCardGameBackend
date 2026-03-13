import type { Request, Response } from 'express';
import { AdventureCard } from '../models/AdventureCard.js';
import { AuditLog } from '../models/AuditLog.js';
import { Character } from '../models/Character.js';
import { Item } from '../models/Item.js';
import { Localization } from '../models/Localization.js';
import { Map } from '../models/Map.js';
import { Payment } from '../models/Payment.js';
import { User } from '../models/User.js';
import { MONGO_ANALYZER_SYSTEM_PROMPT } from '../prompts/tools/mongoAnalyzerPrompt.js';
import { SECRETARY_SYSTEM_PROMPT } from '../prompts/agents/secretaryPrompt.js';
import { logAiError, logAiInfo } from './logController.js';

type ChatRole = 'user' | 'assistant' | 'system';

interface ChatMessage {
  role: ChatRole;
  content: string;
}

interface ChatRequestBody {
  messages: ChatMessage[];
  model?: string;
}

interface AggregationAnalysisResult {
  collection: string;
  aggregate: unknown[];
}

/** Đọc tại runtime để tránh đọc env trước khi dotenv.config() chạy. Thiếu env thì throw, không fallback. */
function getLocalOllamaModel(): string {
  const v = process.env.OLLAMA_LOCAL_MODEL || process.env.OLLAMA_MODEL;
  if (!v?.trim()) {
    throw new Error('OLLAMA_LOCAL_MODEL or OLLAMA_MODEL is required for local Ollama');
  }
  return v.trim();
}

function getCloudOllamaModel(): string {
  const v = process.env.OLLAMA_CLOUD_MODEL || process.env.OLLAMA_MODEL;
  if (!v?.trim()) {
    throw new Error('OLLAMA_CLOUD_MODEL or OLLAMA_MODEL is required for cloud Ollama');
  }
  return v.trim();
}

function isDev(): boolean {
  return process.env.NODE_ENV === 'development';
}

function useOllamaCloud(): boolean {
  return String(process.env.OLLAMA_CLOUD || '').trim().toLowerCase() === 'true';
}

function getOllamaApiKey(): string | undefined {
  return process.env.OLLAMA_API_KEY;
}

function getOllamaCloudUrl(): string {
  const v = process.env.OLLAMA_CLOUD_URL?.trim();
  if (!v) {
    throw new Error('OLLAMA_CLOUD_URL is required when using Ollama cloud');
  }
  return v.replace(/\/+$/, '');
}

function getOllamaLocalUrl(): string {
  const v = process.env.OLLAMA_URL?.trim();
  if (!v) {
    throw new Error('OLLAMA_URL is required for local Ollama');
  }
  return v.replace(/\/+$/, '');
}

function getFetchImpl() {
  const f = (globalThis as any).fetch as ((input: string, init?: any) => Promise<any>) | undefined;
  return f;
}

async function callOllamaLocalChat(args: {
  messages: ChatMessage[];
  model: string;
}) {
  const fetchImpl = getFetchImpl();
  if (!fetchImpl) {
    throw new Error('fetch is not available in this Node runtime');
  }

  const ollamaUrl = getOllamaLocalUrl();

  const response = await fetchImpl(`${ollamaUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: args.model,
      messages: args.messages,
      stream: false,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    const error = new Error(
      `Failed to contact local AI (Ollama). status=${response.status} body=${text.slice(0, 500)}`
    );
    (error as any).source = 'local';
    (error as any).status = response.status;
    (error as any).body = text;
    throw error;
  }

  const data = await response.json().catch(() => null);
  const firstChoice = data?.choices?.[0]?.message ?? null;
  return { data, message: firstChoice as ChatMessage | null };
}

/** Ollama Cloud: https://ollama.com/api/chat — header gửi Bearer với key thật (có thể đặt sk-... trong .env). */
const OLLAMA_CLOUD_CHAT_PATH = '/api/chat';

async function callOllamaCloudChat(args: { messages: ChatMessage[]; model: string }) {
  const fetchImpl = getFetchImpl();
  if (!fetchImpl) {
    throw new Error('fetch is not available in this Node runtime');
  }

  const apiKey = getOllamaApiKey();
  if (!apiKey?.trim()) {
    throw new Error('OLLAMA_API_KEY is required for Ollama cloud');
  }

  const baseUrl = getOllamaCloudUrl().replace(/\/+$/, '');
  const response = await fetchImpl(`${baseUrl}${OLLAMA_CLOUD_CHAT_PATH}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey.trim()}`,
    },
    body: JSON.stringify({
      model: args.model,
      messages: args.messages,
      stream: false,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    const error = new Error(
      `Failed to contact cloud AI (Ollama). status=${response.status} body=${text.slice(0, 500)}`
    );
    (error as any).source = 'cloud';
    (error as any).status = response.status;
    (error as any).body = text;
    throw error;
  }

  const data = await response.json().catch(() => null);
  // Ollama /api/chat trả về { message: { role, content } }; OpenAI format là choices[0].message
  const firstChoice = data?.message ?? data?.choices?.[0]?.message ?? null;
  return { data, message: firstChoice as ChatMessage | null };
}

async function callAiWithRouting(args: { messages: ChatMessage[]; model?: string }) {
  const preferredModel = args.model;

  // Development: tôn trọng OLLAMA_CLOUD, không fallback khi cloud lỗi
  if (isDev()) {
    if (useOllamaCloud() && getOllamaApiKey()) {
      return callOllamaCloudChat({
        messages: args.messages,
        model: preferredModel || getCloudOllamaModel(),
      });
    }
    return callOllamaLocalChat({
      messages: args.messages,
      model: preferredModel || getLocalOllamaModel(),
    });
  }

  // Production: cloud nếu có API key; không fallback khi cloud lỗi
  if (getOllamaApiKey()) {
    return callOllamaCloudChat({
      messages: args.messages,
      model: preferredModel || getCloudOllamaModel(),
    });
  }

  return callOllamaLocalChat({
    messages: args.messages,
    model: preferredModel || getLocalOllamaModel(),
  });
}

function extractJsonObject(text: string): string | null {
  if (!text) return null;
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) return null;
  const slice = text.slice(firstBrace, lastBrace + 1);
  return slice;
}

const AGGREGATION_COLLECTION_MODEL_MAP: Record<string, any> = {
  auditlogs: AuditLog,
  auditlog: AuditLog,
  adventurecards: AdventureCard,
  adventurecard: AdventureCard,
  characters: Character,
  character: Character,
  items: Item,
  item: Item,
  localizations: Localization,
  localization: Localization,
  maps: Map,
  map: Map,
  payments: Payment,
  payment: Payment,
  users: User,
  user: User,
};

export const chatWithAi = async (req: Request, res: Response) => {
  try {
    const body = req.body as ChatRequestBody | undefined;
    const messages = body?.messages;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages is required and must be a non-empty array' });
    }

    const requestedModel = body?.model;

    // Lấy câu hỏi cuối cùng của user để phân tích
    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user') ?? null;
    if (!lastUserMessage) {
      return res.status(400).json({ error: 'At least one user message is required' });
    }

    let analysis: AggregationAnalysisResult | null = null;
    let aggregationResult: unknown = null;

    // Bước 1: gọi AI "phân tích yêu cầu" để sinh MongoDB aggregation pipeline (không catch fallback)
    const analyzer = await callAiWithRouting({
      model: requestedModel,
      messages: [
        { role: 'system', content: MONGO_ANALYZER_SYSTEM_PROMPT },
        { role: 'user', content: lastUserMessage.content },
      ],
    });

    const analysisContent = analyzer.message?.content ?? '';
    // eslint-disable-next-line no-console
    console.log('[AI analyzer output]', {
      userMessage: lastUserMessage.content,
      raw: analysisContent,
    });

    const jsonText = extractJsonObject(analysisContent);
    if (jsonText) {
      const parsed = JSON.parse(jsonText) as AggregationAnalysisResult;
      if (parsed && typeof parsed.collection === 'string' && Array.isArray(parsed.aggregate)) {
        analysis = parsed;
      }
    }

    await logAiInfo({
      phase: 'analyzer',
      userMessage: lastUserMessage.content,
      rawOutput: analysisContent,
      analysis,
    });

    const hasAggregation =
      analysis &&
      typeof analysis.collection === 'string' &&
      analysis.collection.trim() &&
      Array.isArray(analysis.aggregate) &&
      analysis.aggregate.length > 0;

    if (hasAggregation && analysis) {
      // Bước 2: thực thi aggregation trên MongoDB
      const collectionKey = analysis.collection.toLowerCase().trim();
      const Model = AGGREGATION_COLLECTION_MODEL_MAP[collectionKey];

      if (Model) {
        try {
          aggregationResult = await Model.aggregate(analysis.aggregate as any[]).exec();
        } catch (err) {
          const error = err as Error;
          // eslint-disable-next-line no-console
          console.error('[AI aggregation error]', {
            collection: analysis.collection,
            aggregate: analysis.aggregate,
            message: error.message,
          });
          await logAiError({
            phase: 'aggregation',
            collection: analysis.collection,
            aggregate: analysis.aggregate,
            error: error.message,
          });
          throw error;
        }
      } else {
        // eslint-disable-next-line no-console
        console.error('[AI aggregation error] Unknown collection', {
          collection: analysis.collection,
          aggregate: analysis.aggregate,
        });
        await logAiError({
          phase: 'aggregation',
          error: 'Unknown collection for aggregation',
          collection: analysis.collection,
          aggregate: analysis.aggregate,
        });
      }

      // Bước 3: gọi lại AI "thư ký" để tổng hợp dữ liệu thành câu trả lời tự nhiên
      const secretary = await callAiWithRouting({
        model: requestedModel,
        messages: [
          { role: 'system', content: SECRETARY_SYSTEM_PROMPT },
          { role: 'user', content: lastUserMessage.content },
          {
            role: 'assistant',
            content: `Kết quả truy vấn MongoDB dưới dạng JSON (aggregationResult):\n${JSON.stringify(
              {
                collection: analysis.collection,
                aggregate: analysis.aggregate,
                aggregationResult,
              },
              null,
              2
            )}`,
          },
        ],
      });

      // eslint-disable-next-line no-console
      console.log('[AI secretary output]', {
        userMessage: lastUserMessage.content,
        analysis,
        aggregationResult,
        reply: secretary.message,
      });

      await logAiInfo({
        phase: 'secretary',
        userMessage: lastUserMessage.content,
        analysis,
        aggregationResult,
        reply: secretary.message,
      });

      return res.json({
        message: secretary.message,
        meta: {
          analysis,
          aggregationResult,
        },
        raw: secretary.data,
      });
    }

    // Không có aggregation hợp lệ → chat trực tiếp với user
    const direct = await callAiWithRouting({
      model: requestedModel,
      messages,
    });

    return res.json({
      message: direct.message,
      meta: {
        analysis: analysis ?? null,
        aggregationResult,
      },
      raw: direct.data,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('chatWithAi error', error);
    const err = error as Error & { status?: number; source?: string; body?: string };

    await logAiError({
      phase: 'chatWithAi',
      message: err.message,
      status: err.status,
      source: err.source,
    });

    if (err?.status) {
      const source = err.source === 'cloud' ? 'cloud' : 'local';
      const baseMessage =
        source === 'cloud'
          ? 'Failed to contact cloud AI (Ollama)'
          : 'Failed to contact local AI (Ollama)';

      return res.status(502).json({
        error: baseMessage,
        source,
        status: err.status,
        body: err.body,
      });
    }

    // Thiếu env (OLLAMA_*) → 503 với message rõ ràng
    if (err?.message && /OLLAMA_|is required/.test(err.message)) {
      return res.status(503).json({
        error: 'AI service misconfigured',
        detail: err.message,
      });
    }

    return res.status(500).json({
      error: 'Internal server error while talking to AI',
    });
  }
};

