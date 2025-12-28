CUSTOMER PORTAL MODULE
======================

A mobile-first customer-facing portal for the Dukani Pro POS system.

FEATURES
--------
✅ Product browsing and search
✅ Product detail view with variants
✅ Customer authentication (phone-based)
✅ Customer dashboard with quick actions
✅ Profile management
✅ Order history and tracking
✅ Loyalty rewards system
✅ Mobile-optimized UI with bottom navigation

PAGES
-----
1. Login Page (/customer-portal/login)
   - Phone-based authentication
   - Guest browsing option
   - Password optional

2. Dashboard (/customer-portal/dashboard)
   - Welcome banner with customer name
   - Quick action buttons
   - Activity stats (points, orders, devices, appointments)
   - Featured sections and promotional banners

3. Products Page (/customer-portal/products)
   - Product grid/list view
   - Search functionality
   - Filter by category and brand
   - Sort options (popular, newest, price)
   - Favorites system

4. Product Detail (/customer-portal/products/:id)
   - Image gallery with thumbnails
   - Variant selection
   - Quantity selector
   - Add to cart functionality
   - Product specifications
   - Share and favorite options

5. Profile Page (/customer-portal/profile)
   - View and edit personal information
   - Settings and preferences
   - Help & support links
   - Logout functionality

6. Orders Page (/customer-portal/orders)
   - Order history with filters
   - Order status tracking
   - Order details and items
   - Delivery status

7. Loyalty Page (/customer-portal/loyalty)
   - Points balance and tier status
   - Available rewards catalog
   - Redeem rewards
   - Points earning guide
   - Benefits overview

COMPONENTS
----------
- MobileLayout: Mobile-first layout with header and bottom navigation
- ProductCard: Product display card with pricing, images, and actions
- (Additional components as needed)

ROUTES
------
All customer portal routes are prefixed with /customer-portal/
- /customer-portal/login
- /customer-portal/dashboard
- /customer-portal/products
- /customer-portal/products/:id
- /customer-portal/profile
- /customer-portal/orders
- /customer-portal/loyalty

MOBILE-FIRST DESIGN
-------------------
✅ Responsive layouts optimized for mobile devices
✅ Touch-friendly UI elements
✅ Bottom navigation for easy thumb access
✅ Smooth animations and transitions
✅ Large tap targets (minimum 44x44px)
✅ Optimized for portrait orientation
✅ Fast loading with lazy-loaded images

AUTHENTICATION
--------------
- Simple phone-based authentication
- Session stored in localStorage (customer_id)
- Guest browsing supported for product catalog
- No complex password requirements for easy access

DATA INTEGRATION
----------------
- Connected to existing customers table
- Uses lats_products and lats_variants tables
- Real-time data from Supabase
- Cart stored in localStorage
- Favorites stored in localStorage

FUTURE ENHANCEMENTS
-------------------
□ Push notifications
□ In-app chat support
□ Appointment booking
□ Device repair tracking
□ Payment gateway integration
□ Shopping cart checkout
□ Order confirmation emails/SMS
□ Product reviews and ratings
□ Wishlist functionality
□ Recently viewed products

TECH STACK
----------
- React + TypeScript
- React Router for navigation
- Tailwind CSS for styling
- Lucide React for icons
- Supabase for backend
- React Hot Toast for notifications

ACCESS
------
Customers can access the portal at:
https://your-domain.com/customer-portal/login

No admin panel needed - fully self-service portal!

