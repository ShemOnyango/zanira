// frontend/src/lib/api.js
import axios from './axios'

// auth API
export const authAPI = {
  register: (data) => axios.post('/auth/register', data),
  login: (data) => axios.post('/auth/login', data),
  adminLogin: (data) => axios.post('/auth/admin/login', data),
  createSuperAdmin: (data) => axios.post('/auth/admin/create-super-admin', data),
  logout: () => axios.post('/auth/logout'),
  forgotPassword: (email) => axios.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => axios.patch(`/auth/reset-password/${token}`, { password }),
  getMe: () => axios.get('/auth/me'),
  verifyEmail: (token) => axios.patch(`/auth/verify-email/${token}`),
  resendVerification: (email) => axios.post('/auth/resend-verification', { email }),
}

// Booking API
export const bookingAPI = {
  getAll: (params) => axios.get('/bookings', { params }),
  getById: (id) => axios.get(`/bookings/${id}`),
  create: (data) => axios.post('/bookings', data),
  update: (id, data) => axios.patch(`/bookings/${id}`, data),
  updateStatus: (id, status) => axios.patch(`/bookings/${id}/status`, { status }),
  cancel: (id, reason) => axios.post(`/bookings/${id}/cancel`, { reason }),
  complete: (id) => axios.post(`/bookings/${id}/complete`),
  rate: (id, rating) => axios.post(`/bookings/${id}/rate`, rating),
  confirmCompletion: (id) => axios.patch(`/bookings/${id}/confirm-completion`),
  initiatePayment: (id, paymentData) => axios.post(`/bookings/${id}/payment`, paymentData),
}

// Wallet API
export const walletAPI = {
  getWallet: () => axios.get('/wallet'),
  // backend exposes wallet details at GET /wallet; use that for balance
  getBalance: () => axios.get('/wallet'),
  getTransactions: (params) => axios.get('/wallet/transactions', { params }),
  topUp: (data) => axios.post('/wallet/topup', data),
  topUpConfirm: (data) => axios.post('/wallet/topup/confirm', data),
  withdraw: (data) => axios.post('/wallet/withdraw', data),
  transfer: (data) => axios.post('/wallet/transfer', data),
  setPin: (data) => axios.post('/wallet/pin', data),
  getWithdrawals: () => axios.get('/wallet/withdrawals'),
}

// User & Profile API
export const userAPI = {
  getProfile: () => axios.get('/users/profile'),
  updateProfile: (data) => axios.patch('/users/profile', data),
  uploadPhoto: (formData) => axios.post('/users/profile/photo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  uploadDocument: (formData) => axios.post('/files/upload-verification', formData, { // routed to files
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  updateFundiProfile: (data) => axios.patch('/users/fundi/profile', data),
  updateClientProfile: (data) => axios.patch('/users/client/profile', data),
};




// Service API
export const serviceAPI = {
  getAll: () => axios.get('/services/categories'), // Changed from '/services' to '/services/categories'
  getById: (id) => axios.get(`/services/categories/${id}`),
  getFundis: (serviceId, params) => axios.get(`/services/fundi/${serviceId}`, { params }), // Updated path
  getCategories: () => axios.get('/services/categories'),
  searchServices: (query) => axios.get(`/services/search?q=${query}`), // Added search endpoint
  addFundiService: (data) => axios.post('/services/fundi/add-service', data),
  updateFundiService: (serviceId, data) => axios.patch(`/services/fundi/update-service/${serviceId}`, data),
  removeFundiService: (serviceId) => axios.delete(`/services/fundi/remove-service/${serviceId}`),
}

// Chat API
export const chatAPI = {
  getChats: () => axios.get('/chats'),
  getChat: (id) => axios.get(`/chats/${id}`),
  getMessages: (chatId, params) => axios.get(`/chats/${chatId}/messages`, { params }),
  sendMessage: (chatId, data) => axios.post(`/chats/${chatId}/messages`, data),
  markAsRead: (chatId) => axios.patch(`/chats/${chatId}/read`),
  createChat: (data) => axios.post('/chats', data),
}

// Notification API
export const notificationAPI = {
  getAll: (params) => axios.get('/notifications', { params }),
  getUnreadCount: () => axios.get('/notifications/unread-count'),
  markAsRead: (id) => axios.patch(`/notifications/${id}/read`),
  markAllAsRead: () => axios.patch('/notifications/read-all'),
  delete: (id) => axios.delete(`/notifications/${id}`),
  updatePreferences: (data) => axios.patch('/notifications/preferences', data),
}

// Subscription API
export const subscriptionAPI = {
  getPlans: (userType) => axios.get(`/subscriptions/plans?userType=${userType}`),
  create: (data) => axios.post('/subscriptions', data),
  getMySubscription: () => axios.get('/subscriptions/me'),
  upgrade: (data) => axios.patch('/subscriptions/upgrade', data),
  cancel: () => axios.patch('/subscriptions/cancel'),
  processPayment: (data) => axios.post('/subscriptions/payment', data),
  confirmPayment: (data) => axios.post('/subscriptions/payment/confirm', data),
}

// Referral API
export const referralAPI = {
  createCode: () => axios.post('/referrals'),
  getMyReferrals: () => axios.get('/referrals/me'),
  applyCode: (code) => axios.post('/referrals/apply', { referralCode: code }),
  updateProgress: (data) => axios.patch('/referrals/progress', data),
  claimReward: (data) => axios.post('/referrals/claim', data),
}

// Shop API
export const shopAPI = {
  create: (data) => axios.post('/shops', data),
  getAll: (params) => axios.get('/shops', { params }),
  getById: (id) => axios.get(`/shops/${id}`),
  update: (id, data) => axios.put(`/shops/${id}`, data),
  delete: (id) => axios.delete(`/shops/${id}`),
  verify: (id) => axios.patch(`/shops/${id}/verify`),
  manageInventory: (id, data) => axios.post(`/shops/${id}/inventory`, data),
  getAnalytics: (id) => axios.get(`/shops/${id}/analytics`),
}

// Admin & Analytics API
export const adminAPI = {
  getStats: () => axios.get('/admin/statistics'),
  getPendingVerifications: () => axios.get('/admin/verifications/pending'),
  approveVerification: (id) => axios.post(`/admin/verifications/${id}/approve`),
  rejectVerification: (id, reason) => axios.post(`/admin/verifications/${id}/reject`, { reason }),
  getDisputes: () => axios.get('/admin/disputes'),
  resolveDispute: (id, resolution) => axios.post(`/admin/disputes/${id}/resolve`, resolution),
  getRecentActivities: (params) => axios.get('/admin/activities', { params }),
  getSystemHealth: () => axios.get('/admin/system/health'),
}

// Analytics API
export const analyticsAPI = {
  getClientStats: () => axios.get('/analytics/client'),
  getFundiStats: () => axios.get('/analytics/fundi'),
  getDashboard: () => axios.get('/analytics/admin/dashboard'),
  getRevenue: (params) => axios.get('/analytics/revenue', { params }),
  getUserGrowth: (params) => axios.get('/analytics/user-growth', { params }),
  getBookingTrends: (params) => axios.get('/analytics/booking-trends', { params }),
  getFundiPerformance: (params) => axios.get('/advanced-analytics/fundi-performance', { params }),
}

// Bulk Operations API
export const bulkAPI = {
  users: (data) => axios.post('/bulk/users', data),
  notifications: (data) => axios.post('/bulk/notifications', data),
  emails: (data) => axios.post('/bulk/emails', data),
  verifyFundis: (data) => axios.post('/bulk/fundis/verify', data),
  updateBookingStatus: (data) => axios.post('/bulk/bookings/status', data),
  exportData: (data) => axios.post('/bulk/export', data),
}

// Video Consultation API
export const videoAPI = {
  schedule: (data) => axios.post('/video-consultations', data),
  join: (sessionId) => axios.post(`/video-consultations/${sessionId}/join`),
  end: (sessionId, data) => axios.post(`/video-consultations/${sessionId}/end`, data),
  getHistory: () => axios.get('/video-consultations/history'),
}

// Bidding API
export const biddingAPI = {
  placeBid: (data) => axios.post('/bidding', data),
  getJobBids: (jobId) => axios.get(`/bidding/${jobId}`),
  acceptBid: (jobId, bidId) => axios.post(`/bidding/${jobId}/bids/${bidId}/accept`),
  rejectBid: (jobId, bidId) => axios.post(`/bidding/${jobId}/bids/${bidId}/reject`),
}

// API Key Management
export const apiKeyAPI = {
  create: (data) => axios.post('/api-keys', data),
  getAll: () => axios.get('/api-keys'),
  revoke: (id) => axios.delete(`/api-keys/${id}`),
  rotate: (id) => axios.post(`/api-keys/${id}/rotate`),
}

// Matching API
export const matchingAPI = {
  findFundis: (data) => axios.post('/matching/find-fundis', data),
  getRecommendations: (serviceId) => axios.get(`/matching/recommendations/${serviceId}`),
}

// Invoice API
export const invoiceAPI = {
  getMyInvoices: () => axios.get('/invoices/my-invoices'),
  getById: (id) => axios.get(`/invoices/${id}`),
  generate: (data) => axios.post('/invoices/generate', data),
  generatePenalty: (data) => axios.post('/invoices/generate-penalty', data),
  getAll: () => axios.get('/invoices'),
  updateStatus: (id, status) => axios.patch(`/invoices/${id}/status`, { status }),
  send: (id) => axios.post(`/invoices/${id}/send`),
  recordPayment: (id, data) => axios.post(`/invoices/${id}/payment`, data),
  getStats: () => axios.get('/invoices/stats/overview'),
}

// Dispute API
export const disputeAPI = {
  raise: (data) => axios.post('/disputes', data),
  getAll: () => axios.get('/disputes'),
  getById: (id) => axios.get(`/disputes/${id}`),
  addEvidence: (id, data) => axios.patch(`/disputes/${id}/evidence`, data),
  assign: (id, assigneeId) => axios.patch(`/disputes/${id}/assign`, { assigneeId }),
  resolve: (id, resolution) => axios.patch(`/disputes/${id}/resolve`, resolution),
  escalate: (id) => axios.patch(`/disputes/${id}/escalate`),
  getStats: () => axios.get('/disputes/stats/overview'),
}

// Location Tracking API
export const locationAPI = {
  startTracking: (data) => axios.post('/location/start-tracking', data),
  updateLocation: (data) => axios.post('/location/update', data),
  stopTracking: (data) => axios.post('/location/stop-tracking', data),
  getSession: (bookingId) => axios.get(`/location/session/${bookingId}`),
  getHistory: (sessionId) => axios.get(`/location/history/${sessionId}`),
  updateSettings: (sessionId, data) => axios.patch(`/location/settings/${sessionId}`, data),
}

// Payment API 
export const paymentAPI = {
  initiateMpesa: (data) => axios.post('/payments/mpesa/stk-push', data),
  verifyMpesa: (data) => axios.post('/payments/mpesa/verify', data),
  getTransactions: (params) => axios.get('/payments/transactions', { params }),
  getTransaction: (id) => axios.get(`/payments/transactions/${id}`),
}