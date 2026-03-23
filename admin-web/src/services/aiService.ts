import api from '../lib/api';

export type ChatRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ChatResponse {
  message: ChatMessage | null;
}

export const aiService = {
  chat: async (
    messages: ChatMessage[],
    opts?: { sessionId?: string }
  ): Promise<ChatMessage> => {
    const { data } = await api.post<ChatResponse>('/ai/chat', {
      messages,
      ...(opts?.sessionId ? { sessionId: opts.sessionId } : {}),
    });
    if (!data.message) {
      throw new Error('AI did not return a message');
    }
    return data.message;
  },
};

