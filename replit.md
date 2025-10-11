# E-Commerce Platform

## Overview

This is a full-stack e-commerce platform built with React, Express.js, and PostgreSQL. The application provides a complete shopping experience with user authentication, product catalog management, shopping cart functionality, order processing, and admin capabilities. It features a modern responsive design using shadcn/ui components and Tailwind CSS.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

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