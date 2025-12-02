// frontend/src/api/messagingService.js
import api from './axios';

class MessagingService {
  constructor() {
    this.cache = new Map();
    this.cacheDuration = 60 * 1000; // 1 minute for messages
  }

  _getCacheKey(endpoint, params = {}) {
    return `${endpoint}?${new URLSearchParams(params).toString()}`;
  }

  _getCached(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    const { data, timestamp } = entry;
    if (Date.now() - timestamp > this.cacheDuration) {
      this.cache.delete(key);
      return null;
    }
    return data;
  }

  _setCache(key, data) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  clearCache() {
    this.cache.clear();
  }

  async getInbox(params = {}) {
    try {
      const response = await api.get('/messages/inbox/', { params });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to load inbox');
    }
  }

  async getSent(params = {}) {
    try {
      const response = await api.get('/messages/sent/', { params });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to load sent messages');
    }
  }

  async getMessage(id) {
    try {
      const response = await api.get(`/messages/${id}/`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to load message');
    }
  }

  async sendMessage(data) {
    try {
      this.clearCache(); // Invalidate cache
      const response = await api.post('/messages/', data);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to send message');
    }
  }

  async markAsRead(id) {
    try {
      const response = await api.patch(`/messages/${id}/mark_read/`);
      this.clearCache();
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to mark as read');
    }
  }

  async markAsUnread(id) {
    try {
      const response = await api.patch(`/messages/${id}/mark_unread/`);
      this.clearCache();
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to mark as unread');
    }
  }

  async getUnreadCount() {
    const cacheKey = 'unread_count';
    const cached = this._getCached(cacheKey);
    if (cached) return cached;

    try {
      const response = await api.get('/messages/unread_count/');
      const data = response.data;
      this._setCache(cacheKey, data);
      return data;
    } catch (error) {
      return { unread_count: 0 };
    }
  }

  async markAllAsRead() {
    try {
      const response = await api.post('/messages/mark_all_read/');
      this.clearCache();
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to mark all as read');
    }
  }

  async getRecipients() {
    const cacheKey = 'recipients';
    const cached = this._getCached(cacheKey);
    if (cached) return cached;

    try {
      const response = await api.get('/messages/recipients/');
      const data = response.data;
      this._setCache(cacheKey, data);
      return data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to load recipients');
    }
  }

  async replyToMessage(messageId, data) {
    try {
      this.clearCache();
      const response = await api.post(`/messages/${messageId}/reply/`, data);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to send reply');
    }
  }

  async deleteMessage(id) {
    try {
      await api.delete(`/messages/${id}/`);
      this.clearCache();
      return { success: true };
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to delete message');
    }
  }
}

const messagingService = new MessagingService();
export default messagingService;