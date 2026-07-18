import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authService = {
  register: (email, password) => api.post('/auth/register', { email, password }),
  login: (email, password) => api.post('/auth/login', { email, password }),
  verifyTotp: (email, code) => api.post('/auth/verify-totp', { email, code }),
  verifyEmail: (token) => api.get(`/auth/verify-email?token=${token}`),
  setupTotp: (email) => api.post('/auth/setup-totp', { email }),
  enableTotp: (email, code) => api.post('/auth/enable-totp', { email, code }),
  disableTotp: (email) => api.post('/auth/disable-totp', { email }),
  getMe: (email) => api.get(`/auth/me?email=${email}`),
  resendVerification: (email) => api.post('/auth/resend-verification', { email }),
  changePassword: (data) => api.put('/auth/change-password', data),
  promoteAdmin: (email) => api.put('/auth/promote-admin', { email }),
};

export const userService = {
  create: (data) => api.post('/users', data),
  getAll: () => api.get('/users'),
  getById: (id) => api.get(`/users/${id}`),
  updateBalance: (id, amount) => api.put(`/users/${id}/balance?amount=${amount}`),
  updateSettings: (id, params) => {
    const query = new URLSearchParams();
    if (params.dailyLimit) query.append('dailyLimit', params.dailyLimit);
    if (params.currency) query.append('currency', params.currency);
    return api.put(`/users/${id}/settings?${query.toString()}`);
  },
};

export const transactionService = {
  transfer: (data) => api.post('/transactions/transfer', data),
  getByUser: (userId) => api.get(`/transactions/user/${userId}`),
  getAll: () => api.get('/transactions/all'),
  // Money requests
  createRequest: (data) => api.post('/transactions/request', data),
  getRequests: (userId) => api.get(`/transactions/requests/${userId}`),
  acceptRequest: (id) => api.put(`/transactions/requests/${id}/accept`),
  rejectRequest: (id) => api.put(`/transactions/requests/${id}/reject`),
};

export const notificationService = {
  getByUser: (userId) => api.get(`/notifications/${userId}`),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  getUnreadCount: (userId) => api.get(`/notifications/${userId}/unread-count`),
};

// Currency utils
export const CURRENCIES = {
  ARS: { symbol: '$', name: 'Peso Argentino', flag: 'AR' },
  USD: { symbol: 'US$', name: 'Dolar', flag: 'US' },
  EUR: { symbol: '€', name: 'Euro', flag: 'EU' },
};

export const EXCHANGE_RATES = {
  ARS: { ARS: 1, USD: 0.001, EUR: 0.0009 },
  USD: { ARS: 1000, USD: 1, EUR: 0.91 },
  EUR: { ARS: 1100, USD: 1.10, EUR: 1 },
};

export const convertCurrency = (amount, from, to) => {
  const rate = EXCHANGE_RATES[from]?.[to] || 1;
  return amount * rate;
};

export default api;
