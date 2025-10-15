import type { Express, Request, Response } from "express";
import type { Session } from "express-session";

// Extend the session interface to include userId
declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}
import { createServer, type Server } from "http";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { insertUserSchema, insertProductSchema, insertCategorySchema, insertAddressSchema, insertCartItemSchema, insertOrderSchema, insertReviewSchema } from "@shared/schema";
import { z } from "zod";
import { setupAuthRoutes, authenticateToken, requireAdmin } from "./auth-routes";
import { setupUserRoutes } from "./user-routes";
import { emailNotificationService } from "./email-service";
import { setupNotificationRoutes } from "./notification-routes";
import { setupAdminRoutes } from "./admin-routes";
import { setupV1Routes } from "./v1-routes";
import { setupOrderManagementRoutes } from "./order-management-service";
import { setupOTPRoutes } from "./otp-routes";
import { setupSubscriptionRoutes } from "./subscription-routes";
import { setupBuyNowRoutes } from "./buy-now-routes";
import { setupMongoAuthRoutes } from "./auth-mongodb";
import { setupUserProfileRoutes } from "./user-profile-routes";
import { setupNewsletterRoutes } from "./newsletter-routes";
import Razorpay from "razorpay";
import crypto from "crypto";
import { 
  processPayment, 
  authorizePayment, 
  capturePayment, 
  refundPayment, 
  getTransaction,
  createPaymentMethod,
  getUserPaymentMethods,
  deletePaymentMethod,
  process3DSecure,
  processApplePay,
  processGooglePay,
  processCODPayment,
  confirmCODPayment
} from "./payment-service";
import WebSocketService from "./services/websocket-service";

// Enhanced request interface with user data
interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    isAdmin?: boolean;
  };
}

// Legacy session auth middleware for backward compatibility
const requireSessionAuth = (req: Request, res: Response, next: any) => {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Add session middleware
  app.use((req: Request, res: Response, next) => {
    if (!req.session) {
      req.session = {} as any;
    }
    next();
  });

  // Setup comprehensive authentication routes
  setupAuthRoutes(app);
  
  // Setup MongoDB-based OTP authentication routes
  setupMongoAuthRoutes(app);
  
  // Setup OTP verification routes
  setupOTPRoutes(app);
  
  // Setup email subscription routes
  setupSubscriptionRoutes(app);
  
  // Setup newsletter routes
  setupNewsletterRoutes(app);
  
  // Setup buy now routes
  setupBuyNowRoutes(app);
  
  // Setup user profile management routes
  setupUserRoutes(app);
  
  // Setup MongoDB user profile routes
  setupUserProfileRoutes(app);
  
  // Setup notification routes
  setupNotificationRoutes(app);
  
  // Setup admin routes
  setupAdminRoutes(app);
  
  // Setup v1 API routes
  setupV1Routes(app, storage);
  
  // Setup comprehensive order management routes
  setupOrderManagementRoutes(app);
  
  // ============ PAYMENT SERVICE ROUTES ============
  
  // Payment Processing Endpoints
  app.post("/api/v1/payments/process", authenticateToken, processPayment);
  app.post("/api/v1/payments/authorize", authenticateToken, authorizePayment);
  app.post("/api/v1/payments/capture/:transactionId", authenticateToken, capturePayment);
  app.post("/api/v1/payments/refund", authenticateToken, refundPayment);
  app.get("/api/v1/payments/:transactionId", authenticateToken, getTransaction);
  
  // Payment Methods Management
  app.post("/api/v1/payment-methods", authenticateToken, createPaymentMethod);
  app.get("/api/v1/payment-methods/user/:userId", authenticateToken, getUserPaymentMethods);
  app.delete("/api/v1/payment-methods/:methodId", authenticateToken, deletePaymentMethod);
  
  // 3D Secure Authentication
  app.post("/api/v1/payments/3d-secure", authenticateToken, process3DSecure);
  
  // Wallet Payments
  app.post("/api/v1/payments/wallet/apple-pay", authenticateToken, processApplePay);
  app.post("/api/v1/payments/wallet/google-pay", authenticateToken, processGooglePay);
  
  // Cash on Delivery (COD) Payments
  app.post("/api/v1/payments/cod", authenticateToken, processCODPayment);
  app.post("/api/v1/payments/cod/confirm", authenticateToken, confirmCODPayment);
  
  // Setup wishlist routes
  const { default: wishlistRoutes } = await import("./wishlist-routes.js");
  app.use("/api/wishlists", wishlistRoutes);
  
  // Setup content routes (footer links, contact, support, etc.)
  const { default: contentRoutes } = await import("./content-routes.js");
  app.use("/api/content", contentRoutes);

  // Legacy session-based auth routes for backward compatibility
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email) || 
                          await storage.getUserByUsername(userData.username);
      
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      const user = await storage.createUser(userData as any);
      req.session!.userId = user.id;
      
      res.json({ user: { ...user, passwordHash: undefined } });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      req.session!.userId = user.id;
      res.json({ user: { ...user, passwordHash: undefined } });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session!.userId = undefined;
    res.json({ message: "Logged out successfully" });
  });

  app.get("/api/auth/me", requireSessionAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session!.userId!;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ user: { ...user, passwordHash: undefined } });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Category routes
  app.get("/api/categories", async (req: Request, res: Response) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/categories", requireAdmin, async (req: Request, res: Response) => {
    try {
      const categoryData = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(categoryData);
      res.status(201).json(category);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/categories/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const categoryData = insertCategorySchema.partial().parse(req.body);
      const category = await storage.updateCategory(req.params.id, categoryData);
      res.json(category);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/categories/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      await storage.deleteCategory(req.params.id);
      res.json({ message: "Category deleted successfully" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Product routes
  app.get("/api/products", async (req: Request, res: Response) => {
    try {
      const {
        categoryId,
        search,
        sortBy,
        sortOrder,
        limit = "20",
        offset = "0"
      } = req.query as Record<string, string>;

      const result = await storage.getProducts({
        categoryId,
        search,
        sortBy: sortBy as any,
        sortOrder: sortOrder as any,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/products/:id", async (req: Request, res: Response) => {
    try {
      const product = await storage.getProduct(req.params.id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/products/slug/:slug", async (req: Request, res: Response) => {
    try {
      const product = await storage.getProductBySlug(req.params.slug);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/products", requireAdmin, async (req: Request, res: Response) => {
    try {
      const productData = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(productData);
      res.status(201).json(product);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/products/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const productData = insertProductSchema.partial().parse(req.body);
      const product = await storage.updateProduct(req.params.id, productData);
      res.json(product);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/products/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      await storage.deleteProduct(req.params.id);
      res.json({ message: "Product deleted successfully" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Cart routes
  app.get("/api/cart", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.userId;
      const cartItems = await storage.getCartItems(userId);
      res.json(cartItems);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/cart", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const cartData = insertCartItemSchema.parse({
        ...req.body,
        userId: req.user!.userId
      });
      
      const cartItem = await storage.addToCart(cartData);
      res.status(201).json(cartItem);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/cart/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { quantity } = req.body;
      const cartItem = await storage.updateCartItem(req.params.id, quantity);
      res.json(cartItem);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/cart/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      await storage.removeCartItem(req.params.id);
      res.json({ message: "Item removed from cart" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/cart", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.userId;
      await storage.clearCart(userId);
      res.json({ message: "Cart cleared" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Address routes
  app.get("/api/addresses", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.userId;
      const addresses = await storage.getUserAddresses(userId);
      res.json(addresses);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/addresses", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const addressData = insertAddressSchema.parse({
        ...req.body,
        userId: req.user!.userId
      });
      
      const address = await storage.createAddress(addressData);
      res.status(201).json(address);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Validation error', 
          errors: error.errors 
        });
      }
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/addresses/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const addressData = insertAddressSchema.partial().parse(req.body);
      const address = await storage.updateAddress(req.params.id, addressData);
      res.json(address);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/addresses/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      await storage.deleteAddress(req.params.id);
      res.json({ message: "Address deleted successfully" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Order routes
  app.get("/api/orders", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const orders = await storage.getOrders(req.user!.userId);
      res.json(orders);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/orders/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const order = await storage.getOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      res.json(order);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/orders", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { orderItems, ...orderData } = req.body;
      
      const orderNumber = `ORD-${Date.now()}`;
      const order = await storage.createOrder(
        {
          ...orderData,
          orderNumber,
          userId: req.user!.userId
        },
        orderItems || []
      );

      // Clear cart after successful order
      const userId = req.user!.userId;
      await storage.clearCart(userId);
      
      // Send order confirmation email
      try {
        await emailNotificationService.notifyOrderConfirmed(
          userId,
          order.orderNumber,
          orderItems || [],
          orderData.total || 0
        );
      } catch (emailError) {
        console.error('Failed to send order confirmation email:', emailError);
        // Don't fail the order creation if email fails
      }
      
      res.status(201).json(order);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/orders/:id/status", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { status, trackingNumber } = req.body;
      const order = await storage.updateOrderStatus(req.params.id, status);
      
      // Send shipping notification if order status is shipped
      if (status === 'shipped' && order.userId && trackingNumber) {
        try {
          await emailNotificationService.notifyOrderShipped(
            order.userId,
            order.orderNumber,
            trackingNumber
          );
        } catch (emailError) {
          console.error('Failed to send shipping notification email:', emailError);
          // Don't fail the status update if email fails
        }
      }
      
      res.json(order);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Get orders for current user (supports both authenticated users and guest sessions)
  app.get("/api/orders", async (req: Request, res: Response) => {
    try {
      // Check if user is authenticated via session
      const userId = req.session?.userId;
      
      if (userId) {
        // Authenticated user - get orders by userId
        const orders = await storage.getOrders(userId);
        return res.json(orders);
      }
      
      // Guest user - get orders by sessionId
      const sessionId = req.sessionID;
      if (sessionId) {
        const orders = await storage.getOrdersBySession(sessionId);
        return res.json(orders);
      }
      
      // No session, return empty orders
      res.json([]);
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Admin order management
  app.get("/api/admin/orders", requireAdmin, async (req: Request, res: Response) => {
    try {
      const orders = await storage.getOrders(); // All orders for admin
      res.json(orders);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Review routes
  app.get("/api/products/:productId/reviews", async (req: Request, res: Response) => {
    try {
      const reviews = await storage.getProductReviews(req.params.productId);
      res.json(reviews);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/reviews", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const reviewData = insertReviewSchema.parse({
        ...req.body,
        userId: req.session!.userId
      });
      
      const review = await storage.createReview(reviewData);
      res.status(201).json(review);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  
  // Initialize WebSocket service for real-time cart updates
  WebSocketService.getInstance(httpServer);
  
  return httpServer;
}
