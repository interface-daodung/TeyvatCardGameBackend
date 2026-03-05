import type { Request, Response } from 'express';
import * as adventureCardService from '../services/adventureCardService.js';
import * as characterService from '../services/characterService.js';
import * as mapService from '../services/mapService.js';
import * as itemService from '../services/itemService.js';
import * as dashboardService from '../services/dashboardService.js';
import * as userService from '../services/userService.js';
import * as paymentService from '../services/paymentService.js';

type ChatRole = 'user' | 'assistant' | 'system';

interface ChatMessage {
  role: ChatRole;
  content: string;
}

interface ChatRequestBody {
  messages: ChatMessage[];
  model?: string;
}

type ToolName =
  | 'count_adventure_cards'
  | 'count_adventure_cards_by_type'
  | 'count_characters'
  | 'count_characters_by_status'
  | 'count_maps'
  | 'count_maps_by_status'
  | 'count_items'
  | 'get_dashboard_stats'
  | 'get_payment_stats'
  | 'get_user_xu_by_email';

interface ToolCall {
  id: string;
  tool: ToolName;
  params?: Record<string, unknown>;
}

interface AnalysisResult {
  calls: ToolCall[];
}

interface ToolResult {
  id: string;
  tool: ToolName;
  params?: unknown;
  success: boolean;
  data?: unknown;
  error?: string;
}

const DEFAULT_OLLAMA_URL = 'http://localhost:11434';
const DEFAULT_OLLAMA_MODEL = 'deepseek-coder:6.7b-instruct-q4_K_M';

const ANALYZER_SYSTEM_PROMPT = `
Bạn là "AI phân tích yêu cầu" cho trang quản trị game Teyvat Card.

NHIỆM VỤ:
- KHÔNG trả lời câu hỏi của người dùng.
- Chỉ phân tích câu hỏi cuối cùng của người dùng và quyết định cần gọi những "tool" (CALL_API nội bộ) nào để lấy dữ liệu.
- Trả về DUY NHẤT MỘT OBJECT JSON theo format bên dưới, không thêm text, không thêm giải thích, không dùng markdown, không dùng \`\`\`.

FORMAT JSON BẮT BUỘC:
{
  "calls": [
    {
      "id": "một_id_ngắn_de_dang_nho",
      "tool": "tên_tool",
      "params": { ...tuỳ_chọn... }
    }
  ]
}

DANH SÁCH TOOL HỖ TRỢ (CALL_API NỘI BỘ):

1) Adventure Cards (model AdventureCard, tương đương các API /api/adventure-cards)
- "count_adventure_cards":
  - Mô tả: Đếm tổng số adventure cards trong hệ thống (bất kể type/status).
  - params: {} hoặc không truyền.

- "count_adventure_cards_by_type":
  - Mô tả: Đếm số adventure cards theo type và/hoặc status.
  - Liên quan: dữ liệu tương tự như gọi GET /api/adventure-cards?type=...&status=...
  - params:
    {
      "type"?: string,     // ví dụ: "enemy", "weapon", "food", "trap", "treasure", "bomb", "coin", "empty"
      "status"?: string    // ví dụ: "enabled", "disabled", "hidden"
    }

2) Characters (model Character, tương đương /api/characters)
- "count_characters":
  - Mô tả: Đếm tổng số characters.
  - params: {} hoặc không truyền.

- "count_characters_by_status":
  - Mô tả: Đếm số characters theo status.
  - Status hợp lệ: "enabled", "disabled", "hidden", "unreleased".
  - params:
    {
      "status"?: string
    }

3) Maps (model Map, tương đương /api/maps)
- "count_maps":
  - Mô tả: Đếm tổng số maps.
  - params: {} hoặc không truyền.

- "count_maps_by_status":
  - Mô tả: Đếm số maps theo status (enabled, disabled, hidden).
  - params:
    {
      "status"?: string
    }

4) Items (model Item, tương đương /api/items)
- "count_items":
  - Mô tả: Đếm tổng số items (game consumables).
  - params: {} hoặc không truyền.

5) Dashboard / Payments (tương đương /api/logs/dashboard và thống kê payments)
- "get_dashboard_stats":
  - Mô tả: Lấy thống kê tổng quan Dashboard, tương tự API GET /api/logs/dashboard.
  - Kết quả (data) có thể chứa:
    {
      "totalUsers": number,
      "totalRevenue": number,      // tổng doanh thu (sum amount các Payment status=success)
      "totalPayments": number,
      "totalCharacters": number,
      "totalEquipment": number,    // thực tế là tổng Item
      "totalMaps": number,
      "revenueByDate": Array<...>,
      "usersByDate": Array<...>
    }
  - params: {} hoặc không truyền.

- "get_payment_stats":
  - Mô tả: Lấy thống kê chi tiết về payments (doanh thu, số giao dịch theo ngày), tương tự logic trong service Payment.
  - Kết quả (data) có thể chứa:
    {
      "totalRevenue": number,
      "totalPayments": number,
      "revenueByDate": Array<...>
    }
  - params: {} hoặc không truyền.

6) Users / Xu (model User, tương đương /api/users)
- "get_user_xu_by_email":
  - Mô tả: Tìm user theo email (gần giống GET /api/users?search=...) và trả về thông tin xu hiện tại của user đó.
  - Nếu hệ thống có nhiều user trùng email (hiếm khi), tool có thể trả về nhiều kết quả.
  - params:
    {
      "email": string   // email hoặc keyword email để tìm user, ví dụ: "admin@example.com"
    }

HƯỚNG DẪN ÁNH XẠ CÂU HỎI → TOOL:
- Nếu câu hỏi KHÔNG cần dữ liệu nội bộ (chỉ là lý thuyết, ví dụ: "REST API là gì?") → trả về:
  { "calls": [] }

- Nếu người dùng hỏi về adventure cards:
  - "bao nhiêu card type X" → dùng "count_adventure_cards_by_type" với params.type suy ra từ câu hỏi (vd: "enemy", "weapon"...).
  - "bao nhiêu card type enemy đang enabled" → dùng "count_adventure_cards_by_type" với params.type = "enemy", params.status = "enabled".
  - "tổng số adventure card" → dùng "count_adventure_cards".

- Nếu người dùng hỏi về characters:
  - "bao nhiêu character đang enabled" → dùng "count_characters_by_status" với params.status = "enabled".
  - "tổng số character" → dùng "count_characters".

- Nếu người dùng hỏi về maps:
  - "tổng số map" → dùng "count_maps".
  - "bao nhiêu map đang hidden" → dùng "count_maps_by_status" với params.status = "hidden".

- Nếu người dùng hỏi về items:
  - "tổng số items" → dùng "count_items".

- Nếu người dùng hỏi về doanh thu / payments:
  - "tổng doanh thu", "total revenue", "doanh thu hiện tại" → ưu tiên dùng "get_dashboard_stats" (hoặc "get_payment_stats" nếu muốn chi tiết theo ngày).
  - "tổng số giao dịch thành công" → có thể dùng "get_dashboard_stats" hoặc "get_payment_stats".

- Nếu người dùng hỏi về xu (coin) của một user:
  - Ví dụ: "User admin@example.com đang có bao nhiêu xu?", "xu của user X" → dùng "get_user_xu_by_email" với params.email là email tương ứng.

- Có thể trả về NHIỀU CALL trong mảng "calls" nếu câu hỏi phức tạp cần nhiều loại dữ liệu.

NHỚ:
- CHỈ output JSON hợp lệ.
- KHÔNG dùng markdown, KHÔNG dùng \`\`\`, KHÔNG thêm text ngoài JSON.
`.trim();

const SECRETARY_SYSTEM_PROMPT = `
Bạn là "AI thư ký" cho trang quản trị game Teyvat Card.

HỆ THỐNG ĐÃ LÀM GIÚP BẠN:
- Đã phân tích câu hỏi của người dùng.
- Đã gọi các API nội bộ và trả về kết quả dưới dạng JSON (toolResults).

NHIỆM VỤ CỦA BẠN:
- Dựa trên câu hỏi của người dùng và toolResults (JSON) được cung cấp, hãy trả lời lại cho admin bằng ngôn ngữ tự nhiên, dễ hiểu.
- Không nhắc đến CALL_API, tool, hay các chi tiết kỹ thuật nội bộ.
- Nếu user hỏi bằng tiếng Việt → trả lời bằng tiếng Việt. Nếu user hỏi bằng tiếng Anh → trả lời bằng tiếng Anh.
- Nếu không đủ dữ liệu để trả lời chính xác, hãy nói rõ là "không đủ dữ liệu" thay vì đoán bừa.
`.trim();

function getFetchImpl() {
  const f = (globalThis as any).fetch as ((input: string, init?: any) => Promise<any>) | undefined;
  return f;
}

async function callOllamaChat(args: {
  messages: ChatMessage[];
  model: string;
}) {
  const fetchImpl = getFetchImpl();
  if (!fetchImpl) {
    throw new Error('fetch is not available in this Node runtime');
  }

  const ollamaUrl = (process.env.OLLAMA_URL || DEFAULT_OLLAMA_URL).replace(/\/+$/, '');

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
    (error as any).status = response.status;
    (error as any).body = text;
    throw error;
  }

  const data = await response.json().catch(() => null);
  const firstChoice = data?.choices?.[0]?.message ?? null;
  return { data, message: firstChoice as ChatMessage | null };
}

function extractJsonObject(text: string): string | null {
  if (!text) return null;
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) return null;
  const slice = text.slice(firstBrace, lastBrace + 1);
  return slice;
}

async function executeToolCall(call: ToolCall): Promise<ToolResult> {
  try {
    switch (call.tool) {
      case 'count_adventure_cards': {
        const { cards } = await adventureCardService.getAdventureCards({});
        return {
          id: call.id,
          tool: call.tool,
          params: call.params,
          success: true,
          data: { total: cards.length },
        };
      }
      case 'count_adventure_cards_by_type': {
        const type =
          typeof call.params?.type === 'string' && call.params.type.trim()
            ? (call.params.type as string)
            : undefined;
        const status =
          typeof call.params?.status === 'string' && call.params.status.trim()
            ? (call.params.status as string)
            : undefined;
        const { cards } = await adventureCardService.getAdventureCards({
          ...(type && { type }),
          ...(status && { status }),
        });
        return {
          id: call.id,
          tool: call.tool,
          params: call.params,
          success: true,
          data: { total: cards.length, type: type ?? null, status: status ?? null },
        };
      }
      case 'count_characters': {
        const { characters } = await characterService.getCharacters();
        return {
          id: call.id,
          tool: call.tool,
          params: call.params,
          success: true,
          data: { total: characters.length },
        };
      }
      case 'count_characters_by_status': {
        const status =
          typeof call.params?.status === 'string' && call.params.status.trim()
            ? (call.params.status as string)
            : undefined;
        const { characters } = await characterService.getCharacters(status);
        return {
          id: call.id,
          tool: call.tool,
          params: call.params,
          success: true,
          data: { total: characters.length, status: status ?? null },
        };
      }
      case 'count_maps': {
        const { maps } = await mapService.getMaps();
        return {
          id: call.id,
          tool: call.tool,
          params: call.params,
          success: true,
          data: { total: maps.length },
        };
      }
      case 'count_maps_by_status': {
        const status =
          typeof call.params?.status === 'string' && call.params.status.trim()
            ? (call.params.status as string)
            : undefined;
        const { maps } = await mapService.getMaps(status);
        return {
          id: call.id,
          tool: call.tool,
          params: call.params,
          success: true,
          data: { total: maps.length, status: status ?? null },
        };
      }
      case 'count_items': {
        const { items } = await itemService.getItems();
        return {
          id: call.id,
          tool: call.tool,
          params: call.params,
          success: true,
          data: { total: items.length },
        };
      }
      case 'get_dashboard_stats': {
        const stats = await dashboardService.getDashboardStats();
        return {
          id: call.id,
          tool: call.tool,
          params: call.params,
          success: true,
          data: stats,
        };
      }
      case 'get_payment_stats': {
        const stats = await paymentService.getPaymentStats();
        return {
          id: call.id,
          tool: call.tool,
          params: call.params,
          success: true,
          data: stats,
        };
      }
      case 'get_user_xu_by_email': {
        const rawEmail = typeof call.params?.email === 'string' ? call.params.email.trim() : '';
        if (!rawEmail) {
          return {
            id: call.id,
            tool: call.tool,
            params: call.params,
            success: false,
            error: 'email is required for get_user_xu_by_email',
          };
        }

        const search = rawEmail;
        const { users } = await userService.getUsers({ search, limit: 50 });
        const lower = rawEmail.toLowerCase();
        const matched = (users as any[]).filter(
          (u) => typeof u.email === 'string' && u.email.toLowerCase() === lower
        );

        const simplified = matched.map((u) => ({
          id: String(u._id),
          email: u.email,
          xu: typeof u.xu === 'number' ? u.xu : 0,
          isBanned: Boolean(u.isBanned),
        }));

        return {
          id: call.id,
          tool: call.tool,
          params: call.params,
          success: true,
          data: {
            emailQuery: rawEmail,
            matchedCount: simplified.length,
            users: simplified,
          },
        };
      }
      default: {
        return {
          id: call.id,
          tool: call.tool,
          params: call.params,
          success: false,
          error: `Unsupported tool: ${call.tool}`,
        };
      }
    }
  } catch (err: unknown) {
    return {
      id: call.id,
      tool: call.tool,
      params: call.params,
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error while executing tool',
    };
  }
}

export const chatWithAi = async (req: Request, res: Response) => {
  try {
    const body = req.body as ChatRequestBody | undefined;
    const messages = body?.messages;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages is required and must be a non-empty array' });
    }

    const model = body?.model || process.env.OLLAMA_MODEL || DEFAULT_OLLAMA_MODEL;

    // Lấy câu hỏi cuối cùng của user để phân tích
    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user') ?? null;
    if (!lastUserMessage) {
      return res.status(400).json({ error: 'At least one user message is required' });
    }

    let analysis: AnalysisResult | null = null;
    let toolResults: ToolResult[] = [];

    try {
      // Bước 1: gọi AI "phân tích yêu cầu" để quyết định CALL_API (tool calls)
      const analyzer = await callOllamaChat({
        model,
        messages: [
          { role: 'system', content: ANALYZER_SYSTEM_PROMPT },
          { role: 'user', content: lastUserMessage.content },
        ],
      });

      const analysisContent = analyzer.message?.content ?? '';
      const jsonText = extractJsonObject(analysisContent);
      if (jsonText) {
        const parsed = JSON.parse(jsonText) as AnalysisResult;
        if (parsed && Array.isArray(parsed.calls)) {
          analysis = parsed;
        }
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('AI analysis phase failed, falling back to direct chat', err);
    }

    const hasCalls = analysis && Array.isArray(analysis.calls) && analysis.calls.length > 0;

    if (hasCalls && analysis) {
      // Bước 2: thực thi các tool (CALL_API nội bộ) dựa trên kết quả phân tích
      const results: ToolResult[] = [];
      for (const call of analysis.calls) {
        if (!call || !call.id || !call.tool) continue;
        // eslint-disable-next-line no-await-in-loop
        const result = await executeToolCall(call);
        results.push(result);
      }
      toolResults = results;

      // Bước 3: gọi lại AI "thư ký" để tổng hợp dữ liệu thành câu trả lời tự nhiên
      const secretary = await callOllamaChat({
        model,
        messages: [
          { role: 'system', content: SECRETARY_SYSTEM_PROMPT },
          { role: 'user', content: lastUserMessage.content },
          {
            role: 'assistant',
            content: `Dữ liệu nội bộ (toolResults) dưới dạng JSON:\n${JSON.stringify(
              toolResults,
              null,
              2
            )}`,
          },
        ],
      });

      return res.json({
        message: secretary.message,
        meta: {
          analysis,
          toolResults,
        },
        raw: secretary.data,
      });
    }

    // Nếu không có CALL_API nào (hoặc phase phân tích bị lỗi) → fallback: chat trực tiếp
    const direct = await callOllamaChat({
      model,
      messages,
    });

    return res.json({
      message: direct.message,
      meta: {
        analysis: analysis ?? null,
        toolResults,
      },
      raw: direct.data,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('chatWithAi error', error);
    if ((error as any)?.status) {
      return res.status(502).json({
        error: 'Failed to contact local AI (Ollama)',
        status: (error as any).status,
        body: (error as any).body,
      });
    }
    return res.status(500).json({ error: 'Internal server error while talking to AI' });
  }
};

