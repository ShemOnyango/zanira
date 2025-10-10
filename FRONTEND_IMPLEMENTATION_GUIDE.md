# Zanira BuildLink - Frontend Implementation Guide

## Completed Implementations

### 1. Admin Authentication System

#### Backend
- Created `adminLogin` endpoint in `authController.js`
- Created `createSuperAdmin` endpoint for initial super admin setup
- Added routes: `/auth/admin/login` and `/auth/admin/create-super-admin`

#### Frontend
- Created `AdminLogin.jsx` - Dark theme admin login page
- Created `AdminRegister.jsx` - Super admin creation page (requires secret key)
- Added admin routes to `App.jsx`:
  - `/admin-access-2024` - Admin login page
  - `/admin-setup-initial` - Super admin registration page
- Updated `api.js` with admin authentication endpoints

#### Usage
1. **Create Super Admin (First Time Setup)**
   - Navigate to: `http://localhost:5173/admin-setup-initial`
   - Fill in admin details
   - Enter the `SUPER_ADMIN_SECRET_KEY` from `.env` file
   - Submit to create first super admin account

2. **Admin Login (For existing admins)**
   - Navigate to: `http://localhost:5173/admin-access-2024`
   - Login with admin credentials
   - Only users with role `admin` or `super_admin` can access

### 2. Security Implementation
- Normal `/login` route is restricted to clients, fundis, and shop owners
- Admin authentication is completely separate with unique URLs
- Secret key required for super admin creation
- All admin logins are logged

## Remaining Implementations

### 1. Booking Management

#### BookingCreate.jsx
```jsx
// Features to implement:
- Service category selection dropdown
- Location input with coordinates
- Date and time picker
- Budget/price estimation
- Special requirements textarea
- Materials checklist
- Real-time fundi matching preview
- Image upload for job description
```

#### BookingDetails.jsx
```jsx
// Features to implement:
- Booking information display
- Status timeline/stepper
- Real-time chat integration
- Payment status and escrow info
- Rating and review system
- Before/After photo gallery
- Action buttons (Cancel, Complete, Dispute)
```

#### Bookings.jsx
```jsx
// Features to implement:
- Bookings list with pagination
- Status filters (pending, confirmed, in_progress, completed)
- Date range filter
- Search by booking ID
- Quick view cards
- Export to PDF/CSV
```

### 2. Dashboard Implementations

#### ClientDashboard.jsx
```jsx
// Features to implement:
- Active bookings count
- Total spent
- Completed jobs count
- Recent bookings list with quick actions
- Booking status pie chart
- Quick create booking button
- Notifications panel
- Favorite fundis list
```

#### FundiDashboard.jsx
```jsx
// Features to implement:
- Available jobs feed
- Today's schedule
- Weekly earnings chart
- Pending/Active/Completed stats
- Performance metrics (rating, completion rate)
- Wallet balance quick view
- Upcoming appointments calendar
- Recent reviews
```

#### AdminDashboard.jsx
```jsx
// Features to implement:
- Total users stats
- Revenue metrics
- Pending verifications list
- Active bookings map
- Platform analytics charts
- System health indicators
- Recent disputes
- Top performing fundis
```

### 3. Wallet Implementation

#### Wallet.jsx
```jsx
// Features to implement:
- Balance display (available, pending, locked)
- Top-up with M-Pesa STK push
- Withdrawal request form
- Transaction history table
- Transaction filters (type, date range)
- Download statement button
- Quick transfer to fundi
- PIN management
```

### 4. Profile Management

#### Profile.jsx
```jsx
// Features to implement:
- Profile photo upload with preview
- Personal information edit form
- Contact details update
- Location/address management
- For Fundis:
  - Skills and certifications
  - Portfolio images
  - Service areas
  - Hourly rates
- For Clients:
  - Preferences
  - Saved addresses
- Password change
- 2FA setup
```

### 5. Messaging System

#### Messages.jsx
```jsx
// Features to implement:
- Chat list sidebar (with unread count)
- Message thread display
- Real-time message updates (Socket.io)
- Message input with emoji picker
- File/image sharing
- Typing indicators
- Read receipts
- Search conversations
- Archive/delete chats
```

### 6. Notifications

#### Notifications.jsx
```jsx
// Features to implement:
- Notification list grouped by date
- Mark as read/unread
- Mark all as read
- Delete notifications
- Real-time notification updates
- Notification preferences
- Filter by type
- Link to related entity (booking, payment, etc.)
```

### 7. Additional Pages Needed

#### Services.jsx Enhancement
```jsx
// Add:
- Service category cards
- Fundi listings per category
- Search and filter fundis
- Map view of fundis
- Rating and review display
- Quick booking button
```

#### FundiProfile.jsx (New)
```jsx
// Create:
- Fundi details and stats
- Portfolio gallery
- Reviews and ratings
- Availability calendar
- Services offered
- Pricing information
- Contact/booking button
```

## API Integration Required

### Update `frontend/src/lib/api.js`

```javascript
// Add missing endpoints:
export const bookingAPI = {
  getAll: (params) => axios.get('/bookings', { params }),
  getById: (id) => axios.get(`/bookings/${id}`),
  create: (data) => axios.post('/bookings', data),
  update: (id, data) => axios.patch(`/bookings/${id}`, data),
  updateStatus: (id, status) => axios.patch(`/bookings/${id}/status`, { status }),
  cancel: (id, reason) => axios.post(`/bookings/${id}/cancel`, { reason }),
  complete: (id) => axios.post(`/bookings/${id}/complete`),
  rate: (id, rating) => axios.post(`/bookings/${id}/rate`, rating),
}

export const walletAPI = {
  getWallet: () => axios.get('/wallet'),
  getBalance: () => axios.get('/wallet/balance'),
  getTransactions: (params) => axios.get('/wallet/transactions', { params }),
  topUp: (data) => axios.post('/wallet/add-funds', data),
  withdraw: (data) => axios.post('/wallet/withdraw', data),
  transfer: (data) => axios.post('/wallet/transfer', data),
}

export const serviceAPI = {
  getAll: () => axios.get('/services'),
  getById: (id) => axios.get(`/services/${id}`),
  getFundis: (serviceId, params) => axios.get(`/services/${serviceId}/fundis`, { params }),
}

export const fundiAPI = {
  getProfile: (id) => axios.get(`/users/fundi/${id}`),
  getReviews: (id) => axios.get(`/users/fundi/${id}/reviews`),
  getAvailability: (id) => axios.get(`/users/fundi/${id}/availability`),
}

export const chatAPI = {
  getChats: () => axios.get('/chats'),
  getChat: (id) => axios.get(`/chats/${id}`),
  getMessages: (chatId, params) => axios.get(`/chats/${chatId}/messages`, { params }),
  sendMessage: (chatId, data) => axios.post(`/chats/${chatId}/messages`, data),
  markAsRead: (chatId) => axios.patch(`/chats/${chatId}/read`),
}

export const notificationAPI = {
  getAll: (params) => axios.get('/notifications', { params }),
  markAsRead: (id) => axios.patch(`/notifications/${id}/read`),
  markAllAsRead: () => axios.patch('/notifications/read-all'),
  delete: (id) => axios.delete(`/notifications/${id}`),
}

export const adminAPI = {
  getStats: () => axios.get('/admin/statistics'),
  getPendingVerifications: () => axios.get('/admin/verifications/pending'),
  approveVerification: (id) => axios.post(`/admin/verifications/${id}/approve`),
  rejectVerification: (id, reason) => axios.post(`/admin/verifications/${id}/reject`, { reason }),
  getDisputes: () => axios.get('/admin/disputes'),
  resolveDispute: (id, resolution) => axios.post(`/admin/disputes/${id}/resolve`, resolution),
}
```

## Socket.io Integration

### Setup in main.jsx or App.jsx
```javascript
import { io } from 'socket.io-client'
import { useAuthStore } from './store/authStore'

// Initialize socket connection
const socket = io(import.meta.env.VITE_API_URL, {
  auth: {
    token: useAuthStore.getState().token
  }
})

// Listen to events
socket.on('notification', (notification) => {
  // Show toast notification
  toast.info(notification.message)
})

socket.on('message', (message) => {
  // Update messages in store
})

socket.on('booking_update', (booking) => {
  // Update booking status
})
```

## Environment Variables

Ensure these are set in `frontend/.env`:
```
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
```

## Styling Guidelines

All components should use:
- Tailwind CSS for styling
- Lucide React for icons
- Consistent color scheme:
  - Primary: Teal (teal-500, teal-600)
  - Secondary: Blue (blue-500, blue-600)
  - Admin: Red (red-600, red-700) with dark slate background
  - Success: Green
  - Warning: Amber
  - Error: Red

## Component Structure

```
src/
├── components/
│   ├── layout/
│   │   ├── Header.jsx
│   │   ├── Footer.jsx
│   │   └── Layout.jsx
│   ├── bookings/
│   │   ├── BookingCard.jsx
│   │   ├── BookingStatusBadge.jsx
│   │   └── BookingTimeline.jsx
│   ├── wallet/
│   │   ├── TransactionItem.jsx
│   │   └── BalanceCard.jsx
│   └── common/
│       ├── LoadingSpinner.jsx
│       ├── ErrorMessage.jsx
│       └── Modal.jsx
```

## Next Steps

1. Implement booking creation form with all required fields
2. Create booking details page with full information display
3. Build comprehensive dashboards for each user role
4. Implement wallet functionality with M-Pesa integration
5. Create messaging interface with Socket.io
6. Build notifications system
7. Implement profile management with image upload
8. Create services page with fundi listings
9. Add search and filter functionality
10. Build admin panel features

## Testing Checklist

- [ ] Admin can register with secret key
- [ ] Admin can login via admin URL
- [ ] Clients cannot access admin routes
- [ ] Booking creation works end-to-end
- [ ] Real-time chat updates work
- [ ] M-Pesa payments process correctly
- [ ] Wallet transactions are recorded
- [ ] Notifications appear in real-time
- [ ] Profile updates save correctly
- [ ] File uploads work properly
