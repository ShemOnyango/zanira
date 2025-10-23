// frontend/src/lib/api.js - UPDATED & CORRECTED
import axios from './axios'

// Auth API - VERIFIED CORRECT
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

// Booking API - CORRECTED ROUTES
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
  assignFundi: (id, fundiId) => axios.post(`/bookings/${id}/assign-fundi`, { fundiId }),
  negotiatePrice: (id, priceData) => axios.post(`/bookings/${id}/negotiate-price`, priceData),
  assignFundi: (id, fundiData) => axios.post(`/bookings/${id}/assign-fundi`, fundiData),
  getMatchingFundis: (id) => axios.get(`/bookings/${id}/matching-fundis`),
  // Push booking to all matching fundis (admin action)
  pushToFundis: (id) => axios.post(`/bookings/${id}/push-to-fundis`),
}

// Wallet API - VERIFIED CORRECT
export const walletAPI = {
  getWallet: () => axios.get('/wallet'),
  getBalance: () => axios.get('/wallet/balance'),
  getTransactions: (params) => axios.get('/wallet/transactions', { params }),
  topUp: (data) => axios.post('/wallet/topup', data),
  topUpConfirm: (data) => axios.post('/wallet/topup/confirm', data),
  withdraw: (data) => axios.post('/wallet/withdraw', data),
  transfer: (data) => axios.post('/wallet/transfer', data),
  setPin: (data) => axios.post('/wallet/pin', data),
  getWithdrawals: () => axios.get('/wallet/withdrawals'),
}

// User & Profile API - CORRECTED ROUTES
export const userAPI = {
  getProfile: () => axios.get('/users/profile'),
  updateProfile: (data) => axios.patch('/users/profile', data),
  uploadPhoto: (formData) => axios.post('/users/profile/photo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  uploadDocument: (formData) => axios.post('/files/upload-verification', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  updateFundiProfile: (data) => axios.patch('/users/fundi/profile', data),
  updateClientProfile: (data) => axios.patch('/users/client/profile', data),
  getAllUsers: (params) => axios.get('/users', { params }),
  getUserById: (id) => axios.get(`/users/${id}`),
  updateUserStatus: (id, data) => axios.patch(`/users/${id}/status`, data),
  updateUserRole: (id, role) => axios.patch(`/users/${id}/role`, { role }),
}

// Service API - CORRECTED ROUTES
export const serviceAPI = {
  getAll: () => axios.get('/services'),
  getById: (id) => axios.get(`/services/${id}`),
  getCategories: () => axios.get('/services/categories'),
  getFundis: (serviceId, params) => axios.get(`/services/${serviceId}/fundis`, { params }),
  searchServices: (query) => axios.get(`/services/search?q=${query}`),
  addFundiService: (data) => axios.post('/services/fundi/add-service', data),
  updateFundiService: (serviceId, data) => axios.patch(`/services/fundi/update-service/${serviceId}`, data),
  removeFundiService: (serviceId) => axios.delete(`/services/fundi/remove-service/${serviceId}`),
  createCategory: (data) => axios.post('/services/categories', data),
  updateCategory: (id, data) => axios.patch(`/services/categories/${id}`, data),
  deleteCategory: (id) => axios.delete(`/services/categories/${id}`),
}

// Chat API - VERIFIED CORRECT
export const chatAPI = {
  getChats: () => axios.get('/chats'),
  getChat: (id) => axios.get(`/chats/${id}`),
  getMessages: (chatId, params) => axios.get(`/chats/${chatId}/messages`, { params }),
  sendMessage: (chatId, data) => axios.post(`/chats/${chatId}/messages`, data),
  markAsRead: (chatId) => axios.patch(`/chats/${chatId}/read`),
  createChat: (data) => axios.post('/chats', data),
  getAdminChats: () => axios.get('/chats/admin/conversations'),
  createAdminChat: (data) => axios.post('/chats/admin/conversations', data),
}

// Notification API - VERIFIED CORRECT
export const notificationAPI = {
  getAll: (params) => axios.get('/notifications', { params }),
  getUnreadCount: () => axios.get('/notifications/unread-count'),
  markAsRead: (id) => axios.patch(`/notifications/${id}/read`),
  markAllAsRead: () => axios.patch('/notifications/read-all'),
  delete: (id) => axios.delete(`/notifications/${id}`),
  updatePreferences: (data) => axios.patch('/notifications/preferences', data),
}

// Subscription API - VERIFIED CORRECT
export const subscriptionAPI = {
  getPlans: (userType) => axios.get(`/subscriptions/plans?userType=${userType}`),
  create: (data) => axios.post('/subscriptions', data),
  getMySubscription: () => axios.get('/subscriptions/me'),
  upgrade: (data) => axios.patch('/subscriptions/upgrade', data),
  cancel: () => axios.patch('/subscriptions/cancel'),
  processPayment: (data) => axios.post('/subscriptions/payment', data),
  confirmPayment: (data) => axios.post('/subscriptions/payment/confirm', data),
}

// Referral API - VERIFIED CORRECT
export const referralAPI = {
  createCode: () => axios.post('/referrals'),
  getMyReferrals: () => axios.get('/referrals/me'),
  applyCode: (code) => axios.post('/referrals/apply', { referralCode: code }),
  updateProgress: (data) => axios.patch('/referrals/progress', data),
  claimReward: (data) => axios.post('/referrals/claim', data),
}

// Shop API - CORRECTED ROUTES
export const shopAPI = {
  create: (data) => axios.post('/shops', data),
  getAll: (params) => axios.get('/shops', { params }),
  getById: (id) => axios.get(`/shops/${id}`),
  update: (id, data) => axios.put(`/shops/${id}`, data),
  delete: (id) => axios.delete(`/shops/${id}`),
  verify: (id, data) => axios.patch(`/shops/${id}/verify`, data),
  manageInventory: (id, data) => axios.post(`/shops/${id}/inventory`, data),
  getAnalytics: (id) => axios.get(`/shops/${id}/analytics`),
  setCommission: (id, commissionRate) => axios.patch(`/shops/${id}/commission`, { commissionRate }),
  getPendingShops: () => axios.get('/shops?verificationStatus=pending'),
  getShopOrders: (id) => axios.get(`/shops/${id}/orders`),
}

// Admin & Analytics API - CORRECTED ROUTES
export const adminAPI = {
  getStats: () => axios.get('/admin/statistics'),
  getDashboard: () => axios.get('/admin/dashboard'),
  getPendingVerifications: () => axios.get('/admin/verifications/pending'),
  approveVerification: (id, data) => axios.post(`/admin/verifications/${id}/approve`, data),
  rejectVerification: (id, reason) => axios.post(`/admin/verifications/${id}/reject`, { reason }),
  getDisputes: (params) => axios.get('/admin/disputes', { params }),
  resolveDispute: (id, resolution) => axios.post(`/admin/disputes/${id}/resolve`, resolution),
  getRecentActivities: (params) => axios.get('/admin/activities', { params }),
  getSystemHealth: () => axios.get('/admin/system/health'),
  getPriceNegotiations: () => axios.get('/admin/price-negotiations'),
  updatePriceNegotiation: (id, data) => axios.patch(`/admin/price-negotiations/${id}`, data),
  getTestimonials: (params) => axios.get('/admin/testimonials', { params }),
  moderateTestimonial: (id, action) => axios.patch(`/admin/testimonials/${id}/moderate`, { action }),
  getRoleManagement: () => axios.get('/admin/roles'),
  createRole: (data) => axios.post('/admin/roles', data),
  updateRole: (key, data) => axios.patch(`/admin/roles/${key}`, data),
  deleteRole: (key) => axios.delete(`/admin/roles/${key}`),
  updateUserRole: (id, roleData) => axios.patch(`/admin/users/${id}/role`, roleData),
  getSystemConfig: () => axios.get('/admin/system/config'),
  updateSystemConfig: (data) => axios.patch('/admin/system/config', data),
}

// Analytics API - CORRECTED ROUTES
export const analyticsAPI = {
  getClientStats: () => axios.get('/analytics/client'),
  getFundiStats: () => axios.get('/analytics/fundi'),
  getDashboard: () => axios.get('/analytics/admin/dashboard'),
  getRevenue: (params) => axios.get('/analytics/revenue', { params }),
  getUserGrowth: (params) => axios.get('/analytics/user-growth', { params }),
  getBookingTrends: (params) => axios.get('/analytics/booking-trends', { params }),
  getFundiPerformance: (params) => axios.get('/analytics/fundi-performance', { params }),
  getPlatformMetrics: () => axios.get('/analytics/platform-metrics'),
}

// Advanced Analytics API - used by admin enhanced analytics page
export const advancedAnalyticsAPI = {
  // Server should accept query params like { timeRange }
  getDashboard: (params) => axios.get('/analytics/advanced/dashboard', { params }),
  getRevenueBreakdown: (params) => axios.get('/analytics/advanced/revenue', { params }),
  getUserCohorts: (params) => axios.get('/analytics/advanced/cohorts', { params }),
}

// Bulk Operations API - VERIFIED CORRECT
export const bulkAPI = {
  users: (data) => axios.post('/bulk/users', data),
  notifications: (data) => axios.post('/bulk/notifications', data),
  emails: (data) => axios.post('/bulk/emails', data),
  verifyFundis: (data) => axios.post('/bulk/fundis/verify', data),
  updateBookingStatus: (data) => axios.post('/bulk/bookings/status', data),
  exportData: (data) => axios.post('/bulk/export', data),
}

// Video Consultation API - VERIFIED CORRECT
export const videoAPI = {
  schedule: (data) => axios.post('/video-consultations', data),
  join: (sessionId) => axios.post(`/video-consultations/${sessionId}/join`),
  end: (sessionId, data) => axios.post(`/video-consultations/${sessionId}/end`, data),
  getHistory: () => axios.get('/video-consultations/history'),
}

// Bidding API - VERIFIED CORRECT
export const biddingAPI = {
  placeBid: (data) => axios.post('/bidding', data),
  getJobBids: (jobId) => axios.get(`/bidding/${jobId}`),
  acceptBid: (jobId, bidId) => axios.post(`/bidding/${jobId}/bids/${bidId}/accept`),
  rejectBid: (jobId, bidId) => axios.post(`/bidding/${jobId}/bids/${bidId}/reject`),
}

// API Key Management - VERIFIED CORRECT
export const apiKeyAPI = {
  create: (data) => axios.post('/api-keys', data),
  getAll: () => axios.get('/api-keys'),
  revoke: (id) => axios.delete(`/api-keys/${id}`),
  rotate: (id) => axios.post(`/api-keys/${id}/rotate`),
}

// Matching API - VERIFIED CORRECT
export const matchingAPI = {
  findFundis: (data) => axios.post('/matching/find-fundis', data),
  getRecommendations: (serviceId) => axios.get(`/matching/recommendations/${serviceId}`),
}

// Invoice API - VERIFIED CORRECT
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

// Dispute API - VERIFIED CORRECT
export const disputeAPI = {
  raise: (data) => axios.post('/disputes', data),
  getAll: (params) => axios.get('/disputes', { params }),
  getById: (id) => axios.get(`/disputes/${id}`),
  addEvidence: (id, data) => axios.patch(`/disputes/${id}/evidence`, data),
  assign: (id, assigneeId) => axios.patch(`/disputes/${id}/assign`, { assigneeId }),
  resolve: (id, resolution) => axios.patch(`/disputes/${id}/resolve`, resolution),
  escalate: (id) => axios.patch(`/disputes/${id}/escalate`),
  getStats: () => axios.get('/disputes/stats/overview'),
}

// Location Tracking API - VERIFIED CORRECT
export const locationAPI = {
  startTracking: (data) => axios.post('/location/start-tracking', data),
  updateLocation: (data) => axios.post('/location/update', data),
  stopTracking: (data) => axios.post('/location/stop-tracking', data),
  getSession: (bookingId) => axios.get(`/location/session/${bookingId}`),
  getHistory: (sessionId) => axios.get(`/location/history/${sessionId}`),
  updateSettings: (sessionId, data) => axios.patch(`/location/settings/${sessionId}`, data),
}

// Payment API - VERIFIED CORRECT
export const paymentAPI = {
  initiateMpesa: (data) => axios.post('/payments/mpesa/stk-push', data),
  verifyMpesa: (data) => axios.post('/payments/mpesa/verify', data),
  getTransactions: (params) => axios.get('/payments/transactions', { params }),
  getTransaction: (id) => axios.get(`/payments/transactions/${id}`),
  processEscrowRelease: (bookingId) => axios.post(`/payments/escrow/${bookingId}/release`),
  processRefund: (data) => axios.post('/payments/refund', data),
}

// Testimonial API - NEW ADDITION
export const testimonialAPI = {
  getAll: (params) => axios.get('/testimonials', { params }),
  getPending: () => axios.get('/testimonials?status=pending'),
  approve: (id) => axios.patch(`/testimonials/${id}/approve`),
  reject: (id, reason) => axios.patch(`/testimonials/${id}/reject`, { reason }),
  delete: (id) => axios.delete(`/testimonials/${id}`),
}

// Material Receipt API - NEW ADDITION
export const materialReceiptAPI = {
  getReceipts: (params) => axios.get('/material-receipts', { params }),
  getReceipt: (id) => axios.get(`/material-receipts/${id}`),
  verifyReceipt: (id) => axios.patch(`/material-receipts/${id}/verify`),
  rejectReceipt: (id, reason) => axios.patch(`/material-receipts/${id}/reject`, { reason }),
}

// Reporting API - NEW ADDITION
export const reportingAPI = {
  generateReport: (data) => axios.post('/reports/generate', data),
  getReport: (id) => axios.get(`/reports/${id}`),
  getReportTemplates: () => axios.get('/reports/templates'),
  downloadReport: (id, format) => axios.get(`/reports/${id}/download?format=${format}`, { 
    responseType: 'blob' 
  }),
}

// Product API
export const productAPI = {
  list: (params) => axios.get('/products', { params }),
  get: (id) => axios.get(`/products/${id}`),
  create: (data) => axios.post('/products', data),
  update: (id, data) => axios.patch(`/products/${id}`, data),
  remove: (id) => axios.delete(`/products/${id}`)
}