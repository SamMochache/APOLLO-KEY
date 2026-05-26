import { apiClient } from '../services/apiClient';
import { PaginatedResponse, Message } from '@types';
import { User } from '@types';

const BASE = '/messaging';

export const getInbox = async (params: Record<string, any> = {}): Promise<PaginatedResponse<Message>> =>
  apiClient.getData<PaginatedResponse<Message>>(`${BASE}/inbox/`, { params } as any);

export const getThread = async (id: number): Promise<Message> => apiClient.getData<Message>(`${BASE}/threads/${id}/`);

export const getRecipients = async (): Promise<User[]> => apiClient.getData<User[]>(`${BASE}/recipients/`);

export const getUnreadCount = async (): Promise<number> => {
  const res = await apiClient.getData<{ unread_count: number }>(`${BASE}/unread-count/`);
  return res?.unread_count ?? 0;
};

export const sendMessage = async (data: { subject: string; body: string; recipients: number[] }): Promise<Message> =>
  apiClient.postData<Message>(`${BASE}/send/`, data);

export const deleteMessage = async (id: number): Promise<{ detail: string }> =>
  apiClient.postData<{ detail: string }>(`${BASE}/delete/${id}/`, {});

export const replyToMessage = async (id: number, data: { body: string }): Promise<Message> =>
  apiClient.postData<Message>(`${BASE}/threads/${id}/reply/`, data);

export default {
  getInbox,
  getThread,
  sendMessage,
  deleteMessage,
};
