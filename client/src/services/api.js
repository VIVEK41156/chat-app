import axios from 'axios';

const getApiBase = () => {
  if (import.meta.env.VITE_API_URL) return `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api`;
  if (import.meta.env.VITE_BACKEND_URL) return `${import.meta.env.VITE_BACKEND_URL.replace(/\/$/, '')}/api`;
  return '/api';
};

const apiClient = axios.create({
  baseURL: getApiBase(),
  headers: {
    'Content-Type': 'application/json'
  }
});

export const api = {
  // Auth & Email OTP
  sendOtp: async (email, name = 'User', purpose = 'registration') => {
    const res = await apiClient.post('/auth/send-otp', { email, name, purpose });
    return res.data;
  },

  verifyOtp: async (email, otp, purpose = 'registration') => {
    const res = await apiClient.post('/auth/verify-otp', { email, otp, purpose });
    return res.data;
  },

  register: async (userData) => {
    const res = await apiClient.post('/auth/register', userData);
    return res.data;
  },

  login: async (credentials) => {
    const res = await apiClient.post('/auth/login', credentials);
    return res.data;
  },

  getMe: async (userId, account = null) => {
    if (account) {
      const res = await apiClient.post('/auth/me', { userId, account });
      return res.data.user;
    }
    const res = await apiClient.get('/auth/me', { params: { userId } });
    return res.data.user;
  },

  getAccounts: async () => {
    const res = await apiClient.get('/auth/accounts');
    return res.data.users;
  },

  updateProfile: async (id, data) => {
    const res = await apiClient.put(`/auth/profile/${id}`, data);
    return res.data;
  },

  // Users & Discovery
  getUsers: async (currentUserId, search = '') => {
    const params = {};
    if (currentUserId) params.current_user_id = currentUserId;
    if (search) params.search = search;
    const res = await apiClient.get('/users', { params });
    return res.data.users;
  },

  getUserSummary: async (userId) => {
    const res = await apiClient.get(`/users/${userId}/summary`);
    return res.data;
  },

  // Friends & Requests
  getFriendsList: async (userId) => {
    const res = await apiClient.get(`/friends/list/${userId}`);
    return res.data.friends;
  },

  getFriendRequests: async (userId) => {
    const res = await apiClient.get(`/friends/requests/${userId}`);
    return res.data;
  },

  sendFriendRequest: async (sender_id, receiver_id) => {
    const res = await apiClient.post('/friends/request', { sender_id, receiver_id });
    return res.data;
  },

  respondFriendRequest: async (request_id, user_id, action) => {
    const res = await apiClient.post('/friends/respond', { request_id, user_id, action });
    return res.data;
  },

  cancelFriendRequest: async (request_id, user_id) => {
    const res = await apiClient.post('/friends/cancel', { request_id, user_id });
    return res.data;
  },

  removeFriend: async (user_id, friend_id) => {
    const res = await apiClient.post('/friends/remove', { user_id, friend_id });
    return res.data;
  },

  // Messages
  getMessages: async (userId, friendId) => {
    const res = await apiClient.get(`/messages/${userId}/${friendId}`);
    return res.data.messages;
  },

  sendMessage: async (sender_id, receiver_id, content, message_type = 'text') => {
    const res = await apiClient.post('/messages/send', { sender_id, receiver_id, content, message_type });
    return res.data.data;
  },

  markMessagesRead: async (reader_id, friend_id) => {
    const res = await apiClient.post('/messages/read', { reader_id, friend_id });
    return res.data;
  },

  sendFileMessage: async (formData) => {
    const res = await apiClient.post('/messages/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return res.data.data;
  },

  clearChat: async (user_id, friend_id) => {
    const res = await apiClient.post('/messages/clear', { user_id, friend_id });
    return res.data;
  },

  editMessage: async (messageId, userId, content) => {
    const res = await apiClient.put(`/messages/edit/${messageId}`, { user_id: userId, content });
    return res.data;
  },

  deleteForEveryone: async (messageId, userId) => {
    const res = await apiClient.post('/messages/delete-for-everyone', { message_id: messageId, user_id: userId });
    return res.data;
  },

  deleteForMe: async (messageId, userId) => {
    const res = await apiClient.post('/messages/delete-for-me', { message_id: messageId, user_id: userId });
    return res.data;
  },

  setDisappearingTimer: async (user_id, friend_id, timer) => {
    const res = await apiClient.post('/friends/disappearing-timer', { user_id, friend_id, timer });
    return res.data;
  },

  // Custom Avatar Upload
  uploadAvatar: async (userId, file) => {
    const formData = new FormData();
    formData.append('userId', userId);
    formData.append('avatar', file);
    const res = await apiClient.post('/users/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  },

  // WhatsApp Status / Stories
  uploadStatus: async (formData) => {
    const res = await apiClient.post('/status/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data.status;
  },

  getStatusFeed: async (userId) => {
    const res = await apiClient.get(`/status/feed/${userId}`);
    return res.data;
  },

  recordStatusView: async (statusId, viewerId) => {
    const res = await apiClient.post('/status/view', { status_id: statusId, viewer_id: viewerId });
    return res.data;
  },

  getStatusViewers: async (statusId) => {
    const res = await apiClient.get(`/status/${statusId}/views`);
    return res.data.viewers;
  },

  deleteStatus: async (statusId) => {
    const res = await apiClient.delete(`/status/${statusId}`);
    return res.data;
  }
};

export default api;
