# Shop Owner Authentication & Registration Guide

## Overview
This guide explains how shop owners can register, login, and access their shop management dashboard on the Zanira BuildLink platform.

## 🚀 Quick Start for Shop Owners

### Step 1: Registration
1. Navigate to `/register` or click "Sign up" from the login page
2. Select **"I sell Materials"** button (shop_owner role)
3. Fill in your personal information:
   - First Name & Last Name
   - Email Address
   - Phone Number (format: +254XXXXXXXXX)
   - County & Town
   - Password (minimum 8 characters)
4. Accept Terms of Service
5. Click "Create Account"

### Step 2: Initial Login
1. After registration, you'll be automatically logged in
2. You'll be redirected to the shop dashboard
3. If you don't have a shop yet, you'll see a prompt to create one

### Step 3: Create Your Shop
1. Click "Create Your Shop" button on the dashboard
2. Complete the 5-step registration wizard:
   - **Basic Info**: Shop name, type, description
   - **Location**: Address and contact details
   - **Contact**: Phone, email, website, social media
   - **Operating Hours**: Set your business hours
   - **Payment**: Configure payment methods
3. Submit for admin verification

### Step 4: Wait for Verification
1. Your shop application will be reviewed by admins
2. You'll receive a notification when verified
3. Once verified, your shop appears in public listings

## 📱 User Flow Diagram

```
┌─────────────────┐
│  Visit Website  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Click Register  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│ Select "I sell Materials"│
└────────┬────────────────┘
         │
         ▼
┌──────────────────────┐
│ Fill Registration    │
│ Form                 │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│ Auto Login           │
│ & Redirect           │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐     No Shop      ┌──────────────────┐
│ Shop Dashboard       │ ────────────────▶│ Create Shop Flow │
└────────┬─────────────┘                  └────────┬─────────┘
         │                                          │
         │ Has Shop                                 │
         │                                          │
         ▼                                          ▼
┌──────────────────────┐                  ┌──────────────────┐
│ Manage Shop          │                  │ Pending          │
│ - View Metrics       │                  │ Verification     │
│ - Edit Inventory     │                  └──────────────────┘
│ - Track Orders       │
│ - View Analytics     │
└──────────────────────┘
```

## 🔑 Authentication Features

### For Shop Owners

#### Registration
- **Role Selection**: Dedicated "I sell Materials" button
- **Role Value**: `shop_owner` stored in database
- **Validation**: Same as clients/fundis (name, email, phone)
- **Auto-Login**: Immediately logged in after registration

#### Login
- **Endpoint**: Same as clients/fundis (`/api/v1/auth/login`)
- **Credentials**: Email + Password
- **Redirect**: Automatically sent to `/shop-dashboard`
- **Quick Links**: Login page shows role-specific signup links

#### Dashboard Access
- **URL**: `/shop-dashboard`
- **Access Control**: Only `shop_owner`, `admin`, and `super_admin` roles
- **Default View**: If no shop exists, shows "Create Shop" prompt
- **With Shop**: Shows full management dashboard

## 🔐 Role-Based Access Control

### Shop Owner Permissions

```javascript
// Routes accessible to shop_owner role:
✅ /shop-dashboard          // Shop management dashboard
✅ /shops/create            // Create new shop
✅ /shops/:id/edit          // Edit own shop
✅ /shops/:id/inventory     // Manage inventory
✅ /profile                 // Personal profile
✅ /wallet                  // Wallet management
✅ /messages                // Chat/messaging
✅ /notifications           // Notifications

// Public routes (everyone):
✅ /shops                   // Browse shops
✅ /shops/:id               // View shop details
✅ /                        // Home page
✅ /services                // Services listing
```

### Route Protection

```javascript
// Example from App.jsx
<Route
  path="shop-dashboard"
  element={
    <ProtectedRoute allowedRoles={['shop_owner', 'admin', 'super_admin']}>
      <ShopDashboard />
    </ProtectedRoute>
  }
/>
```

## 🎯 Implementation Details

### Register.jsx Changes

**Added Third Role Button**:
```jsx
<button
  type="button"
  onClick={() => setFormData({ ...formData, role: 'shop_owner' })}
  className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all duration-200 ${
    formData.role === 'shop_owner'
      ? 'bg-gradient-to-r from-teal-500 to-primary-600 text-white shadow-lg'
      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
  }`}
>
  I sell Materials
</button>
```

**Dynamic Header Text**:
```jsx
<p className="mt-2 text-gray-600">
  Join as a {formData.role === 'client' ? 'Client' : formData.role === 'fundi' ? 'Fundi' : 'Shop Owner'}
</p>
```

### Login.jsx Changes

**Quick Registration Links**:
```jsx
<div className="pt-3 border-t border-gray-200">
  <p className="text-xs text-gray-500 mb-2">Join as:</p>
  <div className="flex gap-2 justify-center">
    <Link to="/register?role=client">Client</Link>
    <Link to="/register?role=fundi">Fundi</Link>
    <Link to="/register?role=shop_owner">Shop Owner</Link>
  </div>
</div>
```

### App.jsx Changes

**DashboardRouter Updated**:
```jsx
switch (user?.role) {
  case 'client':
    return <ClientDashboard />
  case 'fundi':
    return <FundiDashboard />
  case 'shop_owner':
    return <Navigate to="/shop-dashboard" replace />  // ← New
  case 'admin':
  case 'super_admin':
    return <AdminDashboard />
  default:
    return <Navigate to="/profile" replace />
}
```

## 🧪 Testing the Flow

### Test Case 1: New Shop Owner Registration
1. Navigate to `/register`
2. Click "I sell Materials"
3. Fill form with test data:
   ```
   First Name: John
   Last Name: Materials
   Email: john@materials.com
   Phone: +254712345678
   County: Nairobi
   Town: Westlands
   Password: TestPass123!
   ```
4. Submit form
5. **Expected**: Redirect to `/shop-dashboard`
6. **Expected**: See "Create Your Shop" prompt

### Test Case 2: Shop Owner Login
1. Navigate to `/login`
2. Enter credentials:
   ```
   Email: john@materials.com
   Password: TestPass123!
   ```
3. Click "Sign In"
4. **Expected**: Redirect to `/shop-dashboard`
5. **Expected**: If shop exists, see management dashboard

### Test Case 3: Create Shop After Registration
1. From shop dashboard, click "Create Your Shop"
2. Complete all 5 steps
3. Submit shop application
4. **Expected**: Shop status = "pending"
5. **Expected**: Dashboard shows shop with pending badge
6. Wait for admin verification
7. **Expected**: Once verified, shop appears in `/shops`

### Test Case 4: Direct URL Access
1. As shop owner, try accessing `/shop-dashboard`
2. **Expected**: Access granted, dashboard loads
3. As client/fundi, try accessing `/shop-dashboard`
4. **Expected**: Redirected to `/unauthorized`

## 🚦 Status Flow

```
Registration
    ↓
[shop_owner role assigned]
    ↓
Auto Login
    ↓
Redirect to /shop-dashboard
    ↓
┌───────────────────────┐
│ Has Existing Shop?    │
├───────────┬───────────┤
│    NO     │    YES    │
│     ↓     │     ↓     │
│  Create   │  Manage   │
│   Shop    │   Shop    │
└───────────┴───────────┘
```

## 📝 Backend Requirements

### User Model
The User model must support `shop_owner` role:
```javascript
role: {
  type: String,
  enum: ['client', 'fundi', 'shop_owner', 'admin', 'super_admin'],
  required: true
}
```

### Shop Model
Each shop is linked to a user:
```javascript
user: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'User',
  required: true,
  unique: true  // One shop per user
}
```

### Authentication Endpoint
```
POST /api/v1/auth/register
Body: {
  firstName: string,
  lastName: string,
  email: string,
  phone: string,
  password: string,
  passwordConfirm: string,
  role: 'shop_owner',  // ← Key field
  county: string,
  town: string,
  terms: boolean
}

Response: {
  success: true,
  data: {
    user: { ...userObject, role: 'shop_owner' },
    token: string,
    refreshToken: string
  }
}
```

## 🎨 UI/UX Considerations

### Registration Page
- **Three Buttons**: Client, Fundi, Shop Owner
- **Equal Width**: All buttons same size
- **Clear Labels**: "I need a Fundi", "I am a Fundi", "I sell Materials"
- **Visual Feedback**: Selected button highlighted with gradient
- **Responsive**: Stacks on mobile

### Login Page
- **Quick Links**: Direct registration links for each role
- **Role Hints**: Shows "Join as: Client | Fundi | Shop Owner"
- **Single Form**: Same login form for all roles
- **Smart Redirect**: Automatically sends user to correct dashboard

### Dashboard
- **First-Time UX**: Clear CTA to create shop
- **Empty State**: Friendly message with icon
- **Single Button**: "Create Your Shop" is prominent
- **Existing Shop**: Full management interface

## 🔍 Troubleshooting

### Issue: Can't see shop owner option on register
**Solution**: Clear browser cache and refresh

### Issue: Registered but redirected to wrong page
**Solution**: Check role was saved correctly in database

### Issue: Can't access /shop-dashboard
**Solution**: Verify user role is 'shop_owner' in auth store

### Issue: Shop not appearing in listings
**Solution**: Shop must be verified by admin first

### Issue: Can't create shop
**Solution**: Check if shop already exists for user (one per user)

## 📊 Database Query Examples

### Find all shop owners:
```javascript
await User.find({ role: 'shop_owner' })
```

### Find user's shop:
```javascript
await Shop.findOne({ user: userId })
```

### Get all pending shops:
```javascript
await Shop.find({
  'verification.overallStatus': 'pending'
})
```

## 🎉 Success Indicators

When shop owner auth is working correctly:

✅ Register page shows 3 role buttons
✅ Clicking "I sell Materials" sets role to shop_owner
✅ Registration completes successfully
✅ User is auto-logged in
✅ Redirected to /shop-dashboard
✅ Can create shop via wizard
✅ Can manage shop after creation
✅ Admin can verify shop
✅ Verified shop appears in /shops
✅ Login redirects to shop dashboard
✅ Role-based access control works

## 🔗 Related Documentation

- **SHOP_INTERFACE_DOCUMENTATION.md** - Complete shop feature docs
- **SHOP_IMPLEMENTATION_SUMMARY.md** - Implementation overview
- **SHOP_QUICK_REFERENCE.md** - Developer quick reference

## 💡 Tips for Shop Owners

1. **Complete Your Profile**: Fill in all shop details for better visibility
2. **Set Accurate Hours**: Customers check if you're open before visiting
3. **Keep Inventory Updated**: Show what products are in stock
4. **Respond Quickly**: Enable notifications for new orders
5. **Build Your Reputation**: Good service leads to better ratings
6. **Use Analytics**: Track your performance and improve

## 📞 Support

For authentication issues:
- Check browser console for errors
- Verify network requests in DevTools
- Check auth token in localStorage
- Confirm user role in auth store
- Review backend logs for API errors

---

**Shop owner authentication is now fully integrated!** 🎉

Shop owners can seamlessly register, login, create their shops, and manage their business through an intuitive dashboard interface.
