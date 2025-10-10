# Zanira BuildLink - Quick Start Guide

## Admin System Setup & Access

### Step 1: Configure Environment Variables

Add this to your backend `.env` file:
```bash
SUPER_ADMIN_SECRET_KEY=ZaniraSuperAdmin2024SecretKey!@#
```

### Step 2: Start the Servers

**Terminal 1 - Backend:**
```bash
npm start
```
Backend runs on: `http://localhost:5000`

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```
Frontend runs on: `http://localhost:5173`

### Step 3: Create Super Admin Account

1. Open browser and go to:
   ```
   http://localhost:5173/admin-setup-initial
   ```

2. Fill in the form:
   - **First Name**: John
   - **Last Name**: Doe
   - **Email**: admin@zanira.com
   - **Phone**: +254712345678
   - **County**: Nairobi
   - **Town**: Westlands
   - **Password**: Admin@2024
   - **Confirm Password**: Admin@2024
   - **Secret Key**: ZaniraSuperAdmin2024SecretKey!@#

3. Click "Create Super Admin"

4. You'll be automatically logged in and redirected to the admin dashboard

### Step 4: Admin Login (Future Use)

Once your super admin account is created, you can login at:
```
http://localhost:5173/admin-access-2024
```

**Login Credentials:**
- Email: admin@zanira.com
- Password: Admin@2024

## User Types & Their Login URLs

### 1. Super Admin / Admin
**URL**: `http://localhost:5173/admin-access-2024`
- Full system access
- Can manage users, bookings, disputes
- View analytics and statistics
- Process payments and verifications

### 2. Clients, Fundis, Shop Owners
**URL**: `http://localhost:5173/login`
- Standard user login
- Cannot access admin functions
- Role-specific dashboards

## Key Features Implemented

### ✅ Admin Authentication System
- Separate login endpoint for admins
- Secret key protection for super admin creation
- Role-based access control
- Secure URLs not exposed in normal UI

### ✅ Security Features
- Email verification bypass for admin accounts
- Password hashing with bcrypt
- JWT token authentication
- Role validation on both frontend and backend

## Quick Access URLs

| User Type | Registration | Login |
|-----------|-------------|-------|
| Super Admin | `/admin-setup-initial` | `/admin-access-2024` |
| Client | `/register` (role: client) | `/login` |
| Fundi | `/register` (role: fundi) | `/login` |
| Shop Owner | `/register` (role: shop_owner) | `/login` |

## Testing the System

### Test Super Admin Creation
```bash
curl -X POST http://localhost:5000/api/v1/auth/admin/create-super-admin \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "Admin",
    "email": "test@zanira.com",
    "phone": "+254700000000",
    "county": "Nairobi",
    "town": "CBD",
    "password": "Test@12345",
    "secretKey": "ZaniraSuperAdmin2024SecretKey!@#"
  }'
```

### Test Admin Login
```bash
curl -X POST http://localhost:5000/api/v1/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@zanira.com",
    "password": "Admin@2024"
  }'
```

## Common Issues & Solutions

### Issue 1: "Invalid secret key"
**Solution**: Make sure the secret key in the form matches exactly what's in your `.env` file

### Issue 2: "User with this email already exists"
**Solution**: Use a different email or login with existing credentials at `/admin-access-2024`

### Issue 3: Frontend doesn't connect to backend
**Solution**:
- Check if backend is running on port 5000
- Verify `VITE_API_URL` in `frontend/.env` is set to `http://localhost:5000/api/v1`

### Issue 4: Build errors
**Solution**:
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run build
```

## What's Next?

Now that admin authentication is set up, you can:

1. **Create Additional Admins**
   - Login as super admin
   - Navigate to user management
   - Create admin accounts with different roles

2. **Implement Booking System**
   - Service selection
   - Fundi matching
   - Payment processing

3. **Build Dashboards**
   - Client dashboard with bookings
   - Fundi dashboard with jobs
   - Admin dashboard with statistics

4. **Add Wallet Features**
   - M-Pesa integration
   - Transaction history
   - Withdrawals

5. **Implement Messaging**
   - Real-time chat
   - Notifications
   - File sharing

## Important Notes

1. **Security**
   - Never commit the `.env` file to version control
   - Change the secret key in production
   - Use HTTPS in production
   - Enable rate limiting on auth endpoints

2. **Admin URLs**
   - Keep admin URLs obscure
   - Don't link them from public pages
   - Consider IP whitelisting in production

3. **Super Admin**
   - Create only one super admin initially
   - Additional admins should be created from admin panel
   - Super admin secret key should be rotated periodically

## Production Deployment

Before deploying to production:

1. Update environment variables:
   ```
   NODE_ENV=production
   SUPER_ADMIN_SECRET_KEY=<strong-random-string>
   JWT_SECRET=<strong-random-string>
   ```

2. Enable HTTPS for all connections

3. Set up MongoDB Atlas or production database

4. Configure CORS properly

5. Enable rate limiting

6. Set up logging and monitoring

7. Create backup and recovery procedures

## Support & Documentation

- **Implementation Guide**: See `IMPLEMENTATION_COMPLETE.md`
- **Frontend Guide**: See `FRONTEND_IMPLEMENTATION_GUIDE.md`
- **API Documentation**: See `API_ENHANCEMENTS.md`

## Development Team

**Backend Features Complete:**
- User authentication (all roles)
- Admin authentication system ✅
- Booking management
- Wallet system
- Chat system
- Payment processing (M-Pesa)
- Notifications
- File uploads

**Frontend Features Complete:**
- Admin login page ✅
- Super admin registration ✅
- Route protection ✅
- Authentication flow ✅

**Frontend Features Pending:**
- Booking creation form
- Dashboard enhancements
- Wallet interface
- Messaging system
- Profile management
- Notifications panel

---

**Happy Building! 🚀**
