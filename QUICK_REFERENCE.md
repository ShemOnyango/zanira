# Zanira BuildLink - Quick Reference Guide

## 🚀 Quick Start

### Base URL
```
Development: http://localhost:5000/api/v1
Production: https://your-domain.com/api/v1
```

### Authentication
All protected endpoints require JWT token:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## 🔥 Most Used Endpoints

### User Authentication
```bash
# Register
POST /auth/register
Body: { firstName, lastName, email, phone, password, role, county, town }

# Login
POST /auth/login
Body: { email, password }

# Get Profile
GET /auth/me
```

### Subscriptions
```bash
# View Plans
GET /subscriptions/plans?userType=fundi

# Create Subscription
POST /subscriptions
Body: { planName: "professional", billingCycle: "monthly" }

# Get My Subscription
GET /subscriptions/me
```

### Wallet Operations
```bash
# Get Wallet
GET /wallet

# Top Up (M-Pesa)
POST /wallet/topup
Body: { amount: 1000, phoneNumber: "+254712345678" }

# Request Withdrawal
POST /wallet/withdraw
Body: { amount: 500, method: "mpesa", destination: { mpesaNumber: "+254712345678" } }

# Transfer to User
POST /wallet/transfer
Body: { recipientId: "userId", amount: 200, description: "Payment" }
```

### Referrals
```bash
# Create Referral Code
POST /referrals

# Apply Code
POST /referrals/apply
Body: { referralCode: "ZB123ABC" }

# Get My Referrals
GET /referrals/me

# Claim Reward
POST /referrals/claim
Body: { referralId: "ref123", type: "referrer" }
```

### Shop Management
```bash
# Create Shop
POST /shops
Body: { shopName, shopType, location, commissionRate }

# Get Shops Near Me
GET /shops?county=Nairobi&town=Westlands

# Update Inventory
POST /shops/:shopId/inventory
Body: { action: "add", items: [{ product, quantity, price }] }
```

### Video Consultations
```bash
# Schedule Consultation
POST /video-consultations
Body: { fundiId, type: "consultation", scheduledStartTime }

# Join Session
POST /video-consultations/:sessionId/join

# End Session
POST /video-consultations/:sessionId/end
Body: { notes: "Consultation notes" }
```

### Job Bidding
```bash
# Place Bid (Fundi)
POST /bidding
Body: { jobId, amount: 5000, proposal: "I can complete this in 2 days", timeline: 2 }

# View Bids (Client)
GET /bidding/:jobId

# Accept Bid (Client)
POST /bidding/:jobId/bids/:bidId/accept
```

### API Keys
```bash
# Create API Key
POST /api-keys
Body: { name: "Production Key", type: "secret", permissions: ["read:bookings"], expiresIn: 365 }

# List Keys
GET /api-keys

# Rotate Key
POST /api-keys/:keyId/rotate

# Revoke Key
DELETE /api-keys/:keyId
Body: { reason: "Security concern" }
```

---

## 🔐 Admin Endpoints

### Bulk Operations
```bash
# Bulk User Action
POST /bulk/users
Body: { action: "activate", userIds: ["id1", "id2"], reason: "Verified" }

# Bulk Notifications
POST /bulk/notifications
Body: { title: "Update", message: "New features", recipientType: "all" }

# Bulk Email
POST /bulk/emails
Body: { subject: "Newsletter", htmlContent: "<h1>News</h1>", recipientType: "fundi" }

# Export Data
POST /bulk/export
Body: { dataType: "bookings", filters: {}, format: "json" }
```

### Advanced Analytics
```bash
# Dashboard Overview
GET /advanced-analytics/dashboard

# Revenue Analysis
GET /advanced-analytics/revenue?startDate=2025-01-01&endDate=2025-10-03&groupBy=day

# User Growth
GET /advanced-analytics/user-growth?userType=fundi

# Booking Trends
GET /advanced-analytics/booking-trends?status=completed

# Top Performers
GET /advanced-analytics/fundi-performance?limit=10&sortBy=rating
```

---

## 📊 Common Query Parameters

### Pagination
```
?page=1&limit=20
```

### Sorting
```
?sort=-createdAt  (descending)
?sort=price       (ascending)
```

### Filtering
```
?status=active
?county=Nairobi
?town=Westlands
?startDate=2025-01-01
?endDate=2025-12-31
```

### Language
```
Headers: Accept-Language: sw (Swahili) or en (English)
```

---

## 🔑 API Key Usage

### Using API Key
```bash
curl -X GET http://localhost:5000/api/v1/bookings \
  -H "X-API-Key: zbapi_your_api_key_here"
```

### Permissions Required
- `read:bookings` - View bookings
- `write:bookings` - Create/update bookings
- `delete:bookings` - Delete bookings
- `read:users` - View users
- `admin:all` - All permissions

---

## 💰 Subscription Plans

### Fundi Plans
| Plan | Price | Jobs/Month | Commission | Features |
|------|-------|------------|------------|----------|
| Basic | Free | 5 | 15% | Basic support |
| Professional | KES 1,500 | 20 | 10% | Priority listing, analytics |
| Premium | KES 3,000 | Unlimited | 7% | All features, API access |

### Client Plans
| Plan | Price | Jobs/Month | Features |
|------|-------|------------|----------|
| Basic | Free | 10 | Basic support |
| Premium | KES 500 | Unlimited | Priority support, video calls |
| Enterprise | KES 5,000 | Unlimited | Dedicated manager, all features |

---

## ⚡ Rate Limits

| Role | Requests | Window |
|------|----------|--------|
| Guest | 20 | 15 minutes |
| Client | 100 | 15 minutes |
| Fundi | 150 | 15 minutes |
| Admin | 500 | 15 minutes |
| Super Admin | 1000 | 15 minutes |

---

## 🎯 Quick Tips

### 1. Testing Locally
```bash
# Start server
npm start

# Health check
curl http://localhost:5000/api/health
```

### 2. M-Pesa Testing
Use sandbox credentials in `.env` for testing payments.

### 3. Wallet Limits
- Minimum withdrawal: KES 100
- Daily withdrawal limit: KES 100,000
- Daily transfer limit: KES 50,000

### 4. Referral Rewards
- Referrer gets KES 500 (cash)
- Referred gets KES 200 (discount)
- Must complete 1 booking worth KES 1,000+

### 5. Security Best Practices
- Enable IP whitelist for admin in production
- Rotate API keys every 90 days
- Enable request signing for sensitive operations
- Review audit logs regularly

---

## 🐛 Common Issues & Solutions

### Issue: "API key is required"
**Solution:** Add header: `X-API-Key: your_key_here`

### Issue: "Too many requests"
**Solution:** Wait for rate limit window to reset or upgrade plan

### Issue: "IP address not authorized"
**Solution:** Add your IP to whitelist in `.env` or disable IP whitelist

### Issue: "Insufficient balance"
**Solution:** Top up wallet before withdrawal/transfer

### Issue: "Subscription expired"
**Solution:** Renew subscription or upgrade plan

---

## 📞 Support Contacts

- **Technical Issues:** dev@zanirabuildlink.com
- **Payment Issues:** payments@zanirabuildlink.com
- **Security Concerns:** security@zanirabuildlink.com
- **General Support:** support@zanirabuildlink.com

---

## 🔗 Useful Links

- [Full API Documentation](./API_ENHANCEMENTS.md)
- [Implementation Summary](./IMPLEMENTATION_SUMMARY.md)
- [Main README](./README.md)

---

**Version:** 1.0.0
**Last Updated:** October 3, 2025
**Status:** Production Ready ✅
