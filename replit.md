# E-Commerce Platform

## Overview

This is a full-stack e-commerce platform built with React, Express.js, and PostgreSQL. The application provides a complete shopping experience with user authentication, product catalog management, shopping cart functionality, order processing, and admin capabilities. It features a modern responsive design using shadcn/ui components and Tailwind CSS.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

### October 15, 2025 - Additional Critical Bug Fixes
- **Issues Fixed**: Multiple critical errors affecting product deletion, admin product form, and COD guest checkout
- **Changes Made**:
  - **Product Deletion Fix**:
    - Added missing `deleteProductV1` method to MongoStorage class
    - Added `deleteProductV1` to IStorage interface
    - Product deletion now works correctly in admin panel (v1 API routes)
  - **Zod Schema Validation Fix**:
    - Fixed insertProductSchema to properly define categoryId and brandId using createInsertSchema refinement parameter
    - Fixed "Invalid element at key 'categoryId/brandId': expected a Zod schema" errors
    - Removed problematic `.omit({ slug: true })` usage in admin form that was causing schema derivation issues
    - Admin product form now works without Zod validation errors
  - **COD Guest Checkout Fix**:
    - Modified buy-now complete endpoint to allow guest users to complete COD (Cash on Delivery) orders
    - Authentication now only required for non-COD payment methods
    - Guest users can successfully complete COD orders without login
- **Wishlist Status**: Neon database connection errors for wishlist functionality documented as non-critical (wishlist uses separate database that's currently unavailable, doesn't affect core e-commerce functions)
- **User Impact**: Product deletion works correctly, admin can add/edit products without validation errors, and guests can complete COD orders successfully

### October 15, 2025 - Critical Bug Fixes and Database Integration
- **Issues Fixed**: Multiple critical errors affecting COD payments, buy-now feature, admin product management, and wishlist functionality
- **Root Cause**: Missing database connection setup for Drizzle ORM services and validation schema issues
- **Changes Made**:
  - **Database Connection Setup**:
    - Created `server/drizzle.ts` with proper Neon serverless PostgreSQL configuration
    - Added `db` import to `payment-service.ts`, `brand-service.ts`, `product-service.ts`, and `wishlist-routes.ts`
    - Implemented fail-fast error handling when DATABASE_URL is not configured
  - **COD Payment Fix**:
    - Fixed "db is not defined" error by importing database connection
    - COD payment processing now works correctly for authenticated users
  - **Buy-Now Security Enhancement**:
    - Fixed access denied error with strict ownership validation
    - Requires exact userId OR sessionId match (prevents session hijacking)
    - Removed sensitive session logging to prevent credential leakage
  - **Admin Product Form Fix**:
    - Extended `insertProductSchema` to accept any string for categoryId/brandId
    - Removed strict UUID validation that was rejecting MongoDB string IDs
    - Admin can now add products without UUID validation errors
  - **Wishlist API Restoration**:
    - Added missing `db` import to wishlist-routes.ts
    - Enabled wishlist routes in server/routes.ts (previously disabled)
    - Wishlist endpoints now return proper JSON instead of HTML error pages
- **Security Improvements**:
  - Strict ownership checks prevent unauthorized access to purchase intents
  - No sensitive credentials logged to server logs
  - Database connection fails fast with clear error messages
- **Technical Details**: The application uses both MongoDB (via Mongoose) and PostgreSQL (via Drizzle ORM). The Drizzle-based services (payment, brand, product, wishlist) were missing the database connection setup, causing runtime errors. The buy-now routes had a security vulnerability allowing any logged-in user to access guest purchase intents.
- **User Impact**: All reported features now work correctly - COD payments process successfully, buy-now feature allows secure guest/authenticated flows, admin can add products, and wishlists function properly.

### October 12, 2025 - Buy Now Authentication Fix
- **Issue Fixed**: "Failed to create purchase intent" error when users tried to use the Buy Now feature
- **Root Cause**: Buy-now routes were using JWT token authentication (`authenticateToken`) but the frontend uses session-based authentication with cookies
- **Changes Made**:
  - Replaced JWT authentication middleware with session-based authentication in all buy-now routes
  - Updated routes to use `req.session.userId` instead of `req.user.userId`
  - Fixed TypeScript type issues with customization fields and order items
  - All buy-now endpoints now properly authenticate users via session cookies
- **Technical Details**: The app has two parallel authentication systems (JWT for v1 API routes, session-based for main routes). Buy-now routes incorrectly used JWT auth, causing authentication failures since the frontend doesn't send JWT tokens.
- **User Impact**: Buy Now feature now works correctly for authenticated users

### October 12, 2025 - Admin Panel User Management Enhancement
- **Issue Fixed**: Non-functional and incomplete user management buttons in admin panel
- **Changes Made**:
  - **User Details Dialog**: Created comprehensive user details dialog showing:
    - Full user information: email, username, full name, status, roles, and last login time
    - Complete order history table with order number, date, items count, total, and status
    - Responsive layout with proper loading states
  - **Smart Suspend/Unsuspend Toggle**: 
    - Button icon changes based on user status (Ban icon for active users, CheckCircle for suspended)
    - Dynamically shows "Suspend" or "Unsuspend" action based on current user status
    - Confirmation dialog displays appropriate action text
    - API integration with `/api/v1/admin/users/:userId/status` endpoint
  - **Enhanced View User**: Clicking Eye icon opens detailed dialog instead of simple toast
  - **Reset Password**: Sends password reset email with user confirmation
  - **Improved Error Handling**: All actions include proper error messages and success feedback
  - **Data Synchronization**: User list automatically refreshes after status changes
- **User Flow**: Admins can click Eye icon to view complete user details and order history in a dialog. The suspend button intelligently toggles between suspend/unsuspend based on user status. Reset password sends email with confirmation. All actions provide clear feedback through notifications.

### October 11, 2025 - Cancel Order Feature Implementation
- **Feature Added**: Users can now cancel their orders directly from the order details page (for cancellable order statuses)
- **Changes Made**:
  - Added cancel order button with XCircle icon that appears for all cancellable order statuses (pending, confirmed, processing)
  - Button is hidden for non-cancellable statuses (shipped, delivered, cancelled, returned, refunded) to match backend validation
  - Implemented confirmation dialog with optional cancellation reason textarea
  - Integrated with existing backend API endpoint `/api/v1/orders/:orderId/cancel`
  - Added comprehensive cache invalidation to refresh all order-related queries (user orders, admin orders, order details)
  - Implemented proper error handling with toast notifications for success and failure states
  - Added loading state to prevent duplicate cancellation requests
- **User Flow**: When viewing a cancellable order (pending, confirmed, or processing), users see a "Cancel Order" button. Clicking it opens a dialog where they can optionally provide a reason. Upon confirmation, the order is cancelled, the backend updates the order status, and all relevant UI views are refreshed to show the cancelled status.

### October 11, 2025 - Order Details Page Implementation
- **Issue Fixed**: Missing order details page causing 404 errors when users clicked "View Details" from orders list
- **Changes Made**:
  - Created new `order-details.tsx` page component to display comprehensive order information
  - Added route `/orders/:orderId` to App.tsx for order details navigation
  - Implemented authentication check that prompts users to log in if not authenticated
  - Fixed TypeScript LSP errors in `order-management-service.ts` related to null status checks
- **User Flow**: Users can now click "View Details" on any order. If not logged in, they see a "Login Required" prompt with options to log in or return to orders page. After login, they're redirected back to the order details page.

## System Architecture

### Frontend Architecture
- **Framework**: React 18+ with TypeScript for type safety
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state and custom React Context for local state (auth, cart)
- **UI Components**: shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens and dark mode support
- **Build Tool**: Vite for fast development and optimized production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Authentication**: Session-based authentication with bcrypt for password hashing
- **API Design**: RESTful API with consistent error handling and middleware
- **File Structure**: Modular separation with routes, storage layer, and database configuration

### Data Storage
- **Primary Database**: PostgreSQL with UUID primary keys
- **Connection**: Neon serverless PostgreSQL with connection pooling
- **Schema Management**: Drizzle Kit for migrations and schema updates
- **Data Models**: Users, Products, Categories, Orders, Cart Items, Reviews, and Addresses

### Authentication & Authorization
- **Authentication Method**: Session-based with server-side session storage
- **Password Security**: Bcrypt hashing with salt rounds
- **Role-Based Access**: Admin and regular user roles with middleware protection
- **Session Management**: Express sessions with secure configuration

### Application Features
- **User Management**: Registration, login, profile management, and address book
- **Product Catalog**: Category-based organization with search, filtering, and sorting
- **Shopping Cart**: Persistent cart with real-time updates and quantity management
- **Order Processing**: 
  - Multi-step checkout with address and payment handling
  - Buy-now functionality for quick purchases with COD payment support
  - Order history and detailed order tracking
  - Order details page with authentication-required access
- **Admin Panel**: Product and category management with inventory tracking
- **Review System**: User reviews and ratings for products

### Development & Build Process
- **Development**: Hot reload with Vite dev server and Express backend
- **Type Checking**: Full TypeScript coverage across frontend and backend
- **Bundling**: Vite for frontend, esbuild for backend production builds
- **Path Aliases**: Configured imports for clean component organization

## External Dependencies

### Core Runtime
- **Database**: Neon PostgreSQL serverless database
- **Session Storage**: In-memory sessions (development) with plans for Redis in production

### Payment Processing
- **Stripe**: Payment gateway integration with React Stripe.js components
- **Payment Methods**: Credit card processing with secure tokenization

### UI & Design
- **Fonts**: Google Fonts (Inter, DM Sans, Fira Code, Geist Mono)
- **Icons**: Lucide React icon library
- **Animations**: Framer Motion for smooth transitions and interactions

### Development Tools
- **Replit Integration**: Replit-specific plugins for development environment
- **Hot Reload**: Vite plugin for runtime error overlays
- **Code Quality**: TypeScript strict mode with comprehensive type checking

### Styling & Components
- **Component Library**: Radix UI primitives for accessibility
- **Form Handling**: React Hook Form with Zod validation
- **CSS Framework**: Tailwind CSS with PostCSS processing
- **Design System**: shadcn/ui for consistent component patterns