# Shop Interface Documentation

## Overview
This document details the complete shop interface implementation for the Zanira BuildLink platform. The shop feature allows material suppliers (plumbing, electrical, hardware, and general stores) to register, manage inventory, and connect with fundis and clients.

## Implementation Summary

### Backend (Already Implemented)
The backend was already fully implemented with the following components:

#### Models
- **Shop Model** (`src/models/Shop.js`):
  - Shop information (name, type, description)
  - Location details with coordinates
  - Contact information (phone, email, website, social media)
  - Business verification details
  - Operating hours for each day
  - Commission rates and pricing tiers
  - Inventory management
  - Statistics tracking
  - Payment methods configuration

#### Controllers
- **Shop Controller** (`src/controllers/shopController.js`):
  - `createShop`: Register a new shop
  - `getShops`: Retrieve all shops with filtering options
  - `getShop`: Get single shop details
  - `updateShop`: Update shop information
  - `deleteShop`: Delete a shop
  - `verifyShop`: Admin verification of shops
  - `manageInventory`: Add, update, remove inventory items
  - `getShopAnalytics`: Retrieve shop analytics data

#### Routes
- **Shop Routes** (`src/routes/shops.js`):
  - `POST /api/v1/shops` - Create shop (shop_owner only)
  - `GET /api/v1/shops` - List all shops (with filters)
  - `GET /api/v1/shops/:id` - Get shop details
  - `PUT /api/v1/shops/:id` - Update shop
  - `DELETE /api/v1/shops/:id` - Delete shop
  - `PATCH /api/v1/shops/:id/verify` - Verify shop (admin only)
  - `POST /api/v1/shops/:id/inventory` - Manage inventory (shop_owner only)
  - `GET /api/v1/shops/:id/analytics` - Get shop analytics

### Frontend (Newly Implemented)

#### Pages Created

##### 1. Shops Listing Page (`frontend/src/pages/shops/Shops.jsx`)
**Purpose**: Browse all verified shops with advanced filtering

**Features**:
- **Search Functionality**: Search by shop name or location
- **Filters**:
  - Shop Type (plumbing, electrical, hardware, general)
  - Pricing Tier (budget, standard, premium)
  - Location (county)
  - Verification Status
- **Shop Cards Display**:
  - Shop image/logo
  - Shop name and type
  - Location information
  - Verification badge
  - Pricing tier badge
  - Rating and reviews count
  - Inventory count
  - Contact information
- **Pagination**: Navigate through multiple pages of results
- **Responsive Grid Layout**: Adapts to different screen sizes

**Key Components**:
```jsx
- Search bar with icon
- Filter dropdowns (shop type, pricing tier)
- Clear filters button
- Shop cards with hover effects
- Empty state with call-to-action
- Pagination controls
```

##### 2. Shop Detail Page (`frontend/src/pages/shops/ShopDetail.jsx`)
**Purpose**: Display comprehensive information about a specific shop

**Features**:
- **Hero Section**:
  - Shop banner image
  - Verification badge
  - Open/Closed status indicator
  - Shop name and description
  - Location and contact info
  - Rating and reviews
  - Shop type and pricing tier badges
- **Contact Methods**:
  - Click-to-call phone
  - Click-to-email
  - Website link
  - Social media links (Facebook, Twitter, Instagram)
- **Statistics Dashboard**:
  - Total orders
  - Total revenue
  - Total customers
  - Products available
- **Tabbed Interface**:
  - **Overview Tab**: About the shop, location details, payment methods
  - **Inventory Tab**: Grid of available products with prices and stock status
  - **Hours Tab**: Operating hours for each day of the week

**Key Components**:
```jsx
- Back button navigation
- Hero image with overlay badges
- Contact information grid
- Stats cards with icons
- Tabbed navigation
- Inventory product cards
- Operating hours table
```

##### 3. Shop Dashboard (`frontend/src/pages/shops/ShopDashboard.jsx`)
**Purpose**: Shop owner's management interface

**Features**:
- **Shop Header**:
  - Shop logo/icon
  - Shop name and type
  - Verification status
  - Open/Closed indicator
  - Edit shop button
  - View public page button
- **Key Metrics**:
  - Total orders with trend
  - Total revenue with trend
  - Customer count (fundis + clients)
  - Product inventory count
- **Management Tabs**:
  - **Overview**: Recent activity, analytics summary
  - **Inventory**: Manage products, add new items, edit existing
  - **Orders**: View and manage shop orders
  - **Settings**: Shop configuration and preferences
- **Quick Actions**:
  - Add new products
  - Edit shop details
  - View analytics
- **Create Shop Prompt**: If no shop exists, guides user to create one

**Key Components**:
```jsx
- Shop header with status badges
- Statistics cards with growth indicators
- Activity feed
- Inventory management grid
- Tabbed interface
- Empty states with CTAs
```

##### 4. Create Shop Page (`frontend/src/pages/shops/CreateShop.jsx`)
**Purpose**: Multi-step shop registration form

**Features**:
- **5-Step Wizard Interface**:
  1. **Basic Info**:
     - Shop name
     - Shop type selection
     - Description
     - Business registration number
     - Tax PIN
     - Years in operation
     - Pricing tier

  2. **Location Details**:
     - County and town
     - Street address
     - Building name and floor
     - Landmark

  3. **Contact Information**:
     - Phone number
     - Email address
     - Website (optional)
     - Social media links (Facebook, Twitter, Instagram)

  4. **Operating Hours**:
     - Set hours for each day of the week
     - Option to mark days as closed
     - Time picker inputs

  5. **Payment Information**:
     - Payment methods selection (M-Pesa, Bank, Cash)
     - M-Pesa paybill number (if applicable)
     - Bank account details (if applicable)

**Form Features**:
- Step-by-step progress indicator
- Visual completion status for each step
- Form validation at each step
- Back/Next navigation
- Field-level error handling
- Responsive layout
- Auto-save to local state
- Submit confirmation

**Key Components**:
```jsx
- Progress stepper with icons
- Form inputs with validation
- Operating hours configurator
- Payment method checkboxes
- Navigation buttons
- Loading states
```

#### API Integration
All shop-related API calls are configured in `frontend/src/lib/api.js`:

```javascript
export const shopAPI = {
  create: (data) => axios.post('/shops', data),
  getAll: (params) => axios.get('/shops', { params }),
  getById: (id) => axios.get(`/shops/${id}`),
  update: (id, data) => axios.patch(`/shops/${id}`, data),
  delete: (id) => axios.delete(`/shops/${id}`),
  verify: (id) => axios.patch(`/shops/${id}/verify`),
  manageInventory: (id, data) => axios.post(`/shops/${id}/inventory`, data),
  getAnalytics: (id) => axios.get(`/shops/${id}/analytics`),
  setCommission: (id, commissionRate) => axios.patch(`/shops/${id}/commission`, { commissionRate }),
  getPendingShops: () => axios.get('/shops?status=pending'),
  getShopOrders: (id) => axios.get(`/shops/${id}/orders`),
}
```

#### Routing Configuration
Routes added to `frontend/src/App.jsx`:

```javascript
// Public shop routes
<Route path="shops" element={<Shops />} />
<Route path="shops/:id" element={<ShopDetail />} />

// Protected shop owner routes
<Route
  path="shop-dashboard"
  element={
    <ProtectedRoute allowedRoles={['shop_owner', 'admin', 'super_admin']}>
      <ShopDashboard />
    </ProtectedRoute>
  }
/>

<Route
  path="shops/create"
  element={
    <ProtectedRoute allowedRoles={['shop_owner', 'admin', 'super_admin']}>
      <CreateShop />
    </ProtectedRoute>
  }
/>
```

## User Flows

### 1. Shop Owner Registration Flow
1. Shop owner registers/logs in to platform
2. Navigates to `/shops/create` or clicks "Create Shop" button
3. Completes 5-step registration form:
   - Enters basic shop information
   - Provides location details
   - Adds contact information
   - Sets operating hours
   - Configures payment methods
4. Submits shop for admin verification
5. Receives confirmation and is redirected to shop dashboard
6. Shop status is "Pending" until admin verifies

### 2. Admin Verification Flow
1. Admin logs into admin panel
2. Navigates to "Shop Verification" page
3. Reviews pending shop applications
4. Views shop details, location, and documentation
5. Sets commission rate (default 10%)
6. Either verifies or rejects shop
7. Shop owner receives notification of decision
8. Verified shops appear in public listings

### 3. Customer Shop Discovery Flow
1. Customer navigates to `/shops`
2. Browses available shops
3. Uses filters to narrow search:
   - Shop type (e.g., electrical supplies)
   - Location (county/town)
   - Price range (budget/standard/premium)
4. Clicks on shop card to view details
5. Reviews shop information, inventory, hours
6. Contacts shop via phone, email, or visits in person
7. Can save shop for future reference

### 4. Shop Management Flow
1. Shop owner accesses `/shop-dashboard`
2. Views key performance metrics
3. Manages inventory:
   - Adds new products
   - Updates prices and stock
   - Removes discontinued items
4. Views orders and transactions
5. Updates shop information as needed
6. Monitors analytics and customer feedback

## Features & Functionality

### Shop Types Supported
- **Plumbing Supplies**: Pipes, fittings, fixtures
- **Electrical Supplies**: Wires, switches, fixtures
- **Hardware Store**: Tools, building materials
- **General Store**: Mixed construction supplies

### Pricing Tiers
- **Budget**: Affordable, value-focused shops
- **Standard**: Mid-range pricing
- **Premium**: High-end, quality-focused shops

### Verification System
- Shops must be admin-verified before appearing publicly
- Verification checks:
  - Business documentation
  - Location verification
  - Contact information validation
- Verified shops display trust badge

### Inventory Management
- Add/remove/update products
- Track stock levels
- Set product prices
- SKU management
- Stock alerts for low inventory

### Operating Hours
- Configurable for each day of week
- Mark specific days as closed
- Display real-time open/closed status
- Helps customers plan visits

### Payment Methods
- **M-Pesa**: Digital mobile payments
- **Bank Transfer**: Direct bank deposits
- **Cash**: In-person payments
- Multiple methods can be enabled

### Analytics & Reporting
- Total orders count
- Revenue tracking
- Customer segmentation (fundis vs clients)
- Transaction history
- Performance trends

## Database Schema

### Shop Collection
```javascript
{
  user: ObjectId (ref: User),
  shopName: String,
  shopType: Enum ['plumbing_supplies', 'electrical_supplies', 'hardware', 'general'],
  description: String,
  location: {
    county: String,
    town: String,
    address: String,
    building: String,
    floor: String,
    coordinates: { latitude: Number, longitude: Number },
    landmark: String
  },
  contactPhone: String,
  contactEmail: String,
  website: String,
  socialMedia: {
    facebook: String,
    twitter: String,
    instagram: String
  },
  businessRegistrationNumber: String,
  taxPin: String,
  yearsInOperation: Number,
  operatingHours: {
    [day]: { open: String, close: String, closed: Boolean }
  },
  commissionRate: Number,
  pricingTier: Enum ['budget', 'standard', 'premium'],
  inventory: [{
    product: ObjectId,
    quantity: Number,
    price: Number,
    sku: String
  }],
  verification: {
    overallStatus: Enum ['pending', 'verified', 'rejected', 'suspended'],
    verificationDate: Date,
    verifiedBy: ObjectId (ref: Admin)
  },
  stats: {
    totalTransactions: Number,
    totalRevenue: Number,
    fundiCustomers: Number,
    clientCustomers: Number,
    rating: Number
  },
  paymentMethods: [String],
  mpesaPaybill: String,
  bankAccount: {
    bankName: String,
    accountNumber: String,
    accountName: String
  },
  timestamps: { createdAt, updatedAt }
}
```

## Security Considerations

### Authentication & Authorization
- Shop creation restricted to `shop_owner` role
- Shop editing restricted to owner or admin
- Verification restricted to admin roles
- Public viewing allowed for verified shops only

### Data Validation
- Required fields enforced on backend
- Email and phone format validation
- Operating hours time format validation
- Commission rate limits (0-100%)
- XSS protection on text inputs

### Audit Logging
All shop operations are logged:
- Shop creation
- Shop updates
- Verification actions
- Inventory changes
- Status modifications

## Testing Checklist

### Shop Creation
- [ ] All required fields validated
- [ ] Operating hours correctly saved
- [ ] Contact information properly formatted
- [ ] Shop created with pending status
- [ ] Owner can view their shop

### Shop Listing
- [ ] Only verified shops appear in public listing
- [ ] Filters work correctly
- [ ] Search functionality works
- [ ] Pagination operates properly
- [ ] Shop cards display all info

### Shop Detail
- [ ] All shop information displays
- [ ] Tabs switch correctly
- [ ] Inventory items load
- [ ] Operating hours display properly
- [ ] Contact links work

### Shop Dashboard
- [ ] Only shop owner can access
- [ ] Statistics load correctly
- [ ] Inventory management works
- [ ] Edit functionality operates
- [ ] Analytics display properly

### Admin Verification
- [ ] Pending shops appear in admin panel
- [ ] Commission rate can be set
- [ ] Verify action updates status
- [ ] Reject action works
- [ ] Notifications sent to owner

## Future Enhancements

### Phase 2 Features
1. **Order Management**:
   - Direct ordering from shops
   - Order tracking
   - Delivery coordination

2. **Reviews & Ratings**:
   - Customer reviews
   - Rating system
   - Photo uploads
   - Response from shop owners

3. **Inventory Enhancements**:
   - Product categories
   - Product images
   - Low stock alerts
   - Automatic reordering

4. **Advanced Analytics**:
   - Sales trends
   - Popular products
   - Customer insights
   - Revenue forecasting

5. **Promotions**:
   - Discount codes
   - Special offers
   - Bulk pricing
   - Loyalty programs

6. **Map Integration**:
   - Google Maps display
   - Directions to shop
   - Nearby shops
   - Area coverage

### Phase 3 Features
1. **Multi-location support**
2. **Shop staff management**
3. **Advanced reporting**
4. **Integration with accounting systems**
5. **Mobile app for shop owners**

## Maintenance Notes

### Regular Tasks
- Monitor shop verifications
- Review shop analytics
- Check for inactive shops
- Update commission rates as needed
- Verify contact information accuracy

### Performance Optimization
- Index shop location fields
- Cache frequently accessed shops
- Optimize image loading
- Implement lazy loading for shop lists

### Backup Procedures
- Regular database backups
- Shop image backups
- Document retention policy
- Disaster recovery plan

## Support & Contact
For technical issues or questions about the shop interface:
- Backend Issues: Review controller logs
- Frontend Issues: Check browser console
- API Issues: Verify route configuration
- Database Issues: Check MongoDB connection

## Conclusion
The shop interface is now fully implemented and ready for use. Shop owners can register their stores, manage inventory, and connect with customers. Admins can verify and monitor shops. Customers can discover and contact material suppliers easily.

All components follow the existing project patterns, use the established authentication system, and integrate seamlessly with the platform's design system.
