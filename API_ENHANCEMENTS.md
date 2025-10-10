# Zanira BuildLink - API Enhancements Documentation

## Overview
This document outlines all the new features, endpoints, and enhancements added to the Zanira BuildLink platform.

---

## New Features Implemented

### 1. Shop Management System
Complete CRUD operations for shop owners to manage their business profiles and inventory.

**Endpoints:**
- `POST /api/v1/shops` - Create shop
- `GET /api/v1/shops` - List all shops (with filters)
- `GET /api/v1/shops/:id` - Get shop details
- `PUT /api/v1/shops/:id` - Update shop
- `DELETE /api/v1/shops/:id` - Delete shop
- `PATCH /api/v1/shops/:id/verify` - Admin verify shop
- `POST /api/v1/shops/:id/inventory` - Manage inventory
- `GET /api/v1/shops/:id/analytics` - Shop analytics

---

### 2. Bulk Operations (Admin Only)
Powerful bulk operations for administrative tasks.

**Endpoints:**
- `POST /api/v1/bulk/users` - Bulk user actions (activate, deactivate, delete)
- `POST /api/v1/bulk/notifications` - Send bulk notifications
- `POST /api/v1/bulk/emails` - Send bulk emails
- `POST /api/v1/bulk/fundis/verify` - Bulk verify fundis
- `POST /api/v1/bulk/bookings/status` - Bulk update booking status
- `POST /api/v1/bulk/export` - Export data in bulk

**Example Request:**
```json
POST /api/v1/bulk/users
{
  "action": "activate",
  "userIds": ["userId1", "userId2", "userId3"],
  "reason": "Account verification completed"
}
```

---

### 3. Advanced Analytics
Comprehensive analytics for admin dashboard.

**Endpoints:**
- `GET /api/v1/advanced-analytics/revenue` - Revenue analytics
- `GET /api/v1/advanced-analytics/user-growth` - User growth trends
- `GET /api/v1/advanced-analytics/booking-trends` - Booking patterns
- `GET /api/v1/advanced-analytics/fundi-performance` - Top performers
- `GET /api/v1/advanced-analytics/dashboard` - Comprehensive dashboard

**Query Parameters:**
- `startDate` - Filter start date
- `endDate` - Filter end date
- `groupBy` - Group by: hour, day, week, month
- `userType` - Filter by user type

---

### 4. Subscription System
Tiered subscription plans for fundis and clients.

**Plans:**
- **Fundi Plans:** Basic (Free), Professional (KES 1,500/month), Premium (KES 3,000/month)
- **Client Plans:** Basic (Free), Premium (KES 500/month), Enterprise (KES 5,000/month)

**Endpoints:**
- `GET /api/v1/subscriptions/plans` - Get available plans
- `POST /api/v1/subscriptions` - Create subscription
- `GET /api/v1/subscriptions/me` - Get user subscription
- `PATCH /api/v1/subscriptions/upgrade` - Upgrade plan
- `PATCH /api/v1/subscriptions/cancel` - Cancel subscription
- `POST /api/v1/subscriptions/payment` - Process payment
- `POST /api/v1/subscriptions/payment/confirm` - Confirm payment

**Features by Plan:**
```
Basic: Limited jobs, basic support
Professional: Unlimited jobs, priority listing, analytics
Premium: All features + API access, custom branding
```

---

### 5. In-App Wallet System
Digital wallet for managing funds within the platform.

**Endpoints:**
- `POST /api/v1/wallet` - Create wallet
- `GET /api/v1/wallet` - Get wallet details
- `GET /api/v1/wallet/transactions` - Transaction history
- `POST /api/v1/wallet/topup` - Add funds (M-Pesa)
- `POST /api/v1/wallet/topup/confirm` - Confirm top-up
- `POST /api/v1/wallet/withdraw` - Request withdrawal
- `GET /api/v1/wallet/withdrawals` - Get withdrawal history
- `POST /api/v1/wallet/transfer` - Transfer to another user
- `POST /api/v1/wallet/pin` - Set wallet PIN

**Features:**
- Real-time balance tracking (available, pending, locked)
- Transaction history with filtering
- M-Pesa integration for top-ups
- Withdrawal to M-Pesa or bank account
- User-to-user transfers
- PIN protection
- Daily withdrawal limits

---

### 6. Referral System
Incentivize user growth through referrals.

**Endpoints:**
- `POST /api/v1/referrals` - Create referral code
- `GET /api/v1/referrals/me` - Get user referrals
- `POST /api/v1/referrals/apply` - Apply referral code
- `PATCH /api/v1/referrals/progress` - Update progress
- `POST /api/v1/referrals/claim` - Claim reward

**Rewards:**
- Referrer: KES 500 cash reward
- Referred user: KES 200 discount
- Conditions: 1 completed booking, KES 1,000 minimum spend
- 90-day validity period

---

### 7. Video Consultation
Virtual consultations between clients and fundis.

**Endpoints:**
- `POST /api/v1/video-consultations` - Schedule consultation
- `POST /api/v1/video-consultations/:sessionId/join` - Join session
- `POST /api/v1/video-consultations/:sessionId/end` - End session
- `GET /api/v1/video-consultations/history` - Consultation history

**Features:**
- Scheduled and instant consultations
- Twilio/Agora integration
- Recording capability
- Pre-booking consultations
- Support calls
- Quality tracking

---

### 8. API Key Management
Secure API access for integrations.

**Endpoints:**
- `POST /api/v1/api-keys` - Create API key
- `GET /api/v1/api-keys` - List user's API keys
- `DELETE /api/v1/api-keys/:id` - Revoke API key
- `POST /api/v1/api-keys/:id/rotate` - Rotate API key

**Features:**
- Multiple API key types (public, secret, admin)
- Granular permissions
- Rate limiting per key
- IP whitelisting
- Automatic rotation
- Usage tracking
- Expiration dates

**Permissions:**
```
- read:bookings, write:bookings, delete:bookings
- read:users, write:users, delete:users
- read:payments, write:payments
- read:analytics, write:analytics
- admin:all
```

---

### 9. Job Bidding System
Allow fundis to bid on jobs.

**Endpoints:**
- `POST /api/v1/bidding` - Place bid
- `GET /api/v1/bidding/:jobId` - Get job bids
- `POST /api/v1/bidding/:jobId/bids/:bidId/accept` - Accept bid
- `POST /api/v1/bidding/:jobId/bids/:bidId/reject` - Reject bid

**Workflow:**
1. Client posts job
2. Fundis submit bids with proposals
3. Client reviews bids
4. Client accepts one bid
5. Other bids automatically rejected
6. Job assigned to winning fundi

---

### 10. Security Enhancements

#### A. API Key Authentication
```javascript
// Headers
{
  "X-API-Key": "zbapi_your_api_key_here"
}
```

#### B. Role-Based Rate Limiting
- Guest: 20 requests/15min
- Client: 100 requests/15min
- Fundi: 150 requests/15min
- Admin: 500 requests/15min
- Super Admin: 1000 requests/15min

#### C. Request Signing (for sensitive operations)
```javascript
// Headers
{
  "X-Signature": "sha256_signature",
  "X-Timestamp": "1234567890"
}
```

#### D. IP Whitelisting
Configure in `.env`:
```
ENABLE_ADMIN_IP_WHITELIST=true
ADMIN_IP_WHITELIST=192.168.1.1,10.0.0.1
```

#### E. Audit Logging
All admin actions are automatically logged with:
- User details
- Action performed
- Target entity
- Before/after states
- IP address and user agent
- Timestamp
- Severity level

---

### 11. Multi-Language Support (i18n)
Automatic language detection and translation.

**Supported Languages:**
- English (en)
- Swahili (sw)

**Usage:**
```javascript
// Client sends header
Accept-Language: sw

// Server responds with translated messages
{
  "message": "Uhifadhi umefanywa kwa mafanikio"
}
```

---

## Security Features Summary

### 1. Authentication & Authorization
- JWT-based authentication
- 2FA support
- Role-based access control (RBAC)
- API key authentication

### 2. Request Security
- Request signing for sensitive operations
- Rate limiting (role-based)
- IP whitelisting for admin endpoints
- CORS protection
- XSS protection
- SQL injection prevention

### 3. Audit & Compliance
- Comprehensive audit logging
- Admin action tracking
- Security alerts
- Failed attempt monitoring

### 4. Data Protection
- Password hashing (bcrypt)
- Encrypted sensitive fields
- PII protection
- Secure session management

---

## Usage Examples

### Creating a Subscription
```bash
curl -X POST http://localhost:5000/api/v1/subscriptions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "planName": "professional",
    "billingCycle": "monthly"
  }'
```

### Topping Up Wallet
```bash
curl -X POST http://localhost:5000/api/v1/wallet/topup \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "phoneNumber": "+254712345678"
  }'
```

### Bulk Sending Notifications
```bash
curl -X POST http://localhost:5000/api/v1/bulk/notifications \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "System Maintenance",
    "message": "Platform will be down for maintenance",
    "recipientType": "all",
    "notificationType": "system_announcement"
  }'
```

### Creating API Key
```bash
curl -X POST http://localhost:5000/api/v1/api-keys \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production API Key",
    "type": "secret",
    "permissions": ["read:bookings", "write:bookings"],
    "ipWhitelist": ["192.168.1.1"],
    "expiresIn": 365
  }'
```

### Getting Advanced Analytics
```bash
curl -X GET "http://localhost:5000/api/v1/advanced-analytics/revenue?startDate=2025-01-01&endDate=2025-10-03&groupBy=day" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

---

## Database Models Added

1. **Subscription** - User subscription plans
2. **Referral** - Referral tracking and rewards
3. **Wallet** - In-app wallet system
4. **ApiKey** - API key management
5. **AuditLog** - Admin action logging
6. **VideoConsultation** - Video call sessions

---

## Environment Variables Added

```env
# Security
REQUEST_SIGNING_SECRET=your_secret
ENABLE_ADMIN_IP_WHITELIST=false
ADMIN_IP_WHITELIST=127.0.0.1,::1

# Video Consultation
TWILIO_VIDEO_API_KEY=your_key
TWILIO_VIDEO_API_SECRET=your_secret
AGORA_APP_ID=your_app_id
AGORA_APP_CERTIFICATE=your_certificate
```

---

## Next Steps

1. **Testing**: Test all new endpoints thoroughly
2. **Documentation**: Share API docs with frontend team
3. **Video Integration**: Complete Twilio/Agora setup
4. **Monitoring**: Set up application monitoring
5. **Migration**: Plan Supabase migration strategy

---

## Support

For questions or issues, contact the development team or check the main README.md file.
