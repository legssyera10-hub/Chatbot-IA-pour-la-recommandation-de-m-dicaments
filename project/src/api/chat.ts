// project/src/api/chat.ts
import { apiClient } from './client';
import { ChatHistoryResponse } from '@/types';

type NewChatResp = { chat_id: string };
type CloseResp   = { closed: boolean; error?: string };

export const chatApi = {
  async sendMessage(message: string): Promise<{ reply: string }> {
    return apiClient.post<{ reply: string }>('/chat/message', { message });
  },

  async getHistory(): Promise<ChatHistoryResponse> {
    return apiClient.get<ChatHistoryResponse>('/chat/history');
  },

  // -> POST /chat/new  (corps vide ou {})
  async newChat(): Promise<NewChatResp> {
    return apiClient.post<NewChatResp>('/chat/new', {}); // pas de params
  },

  // -> POST /chat/close  (body JSON { chat_id })
  async closeChat(chatId?: string): Promise<CloseResp> {
    return apiClient.post<CloseResp>('/chat/close', { chat_id: chatId ?? null });
  },
};
