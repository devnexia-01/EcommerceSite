import type { Express, Request, Response } from "express";
import { Order, OrderItem, Product, User } from "./models/index";
import { authenticateToken } from "./auth-routes";
import { z } from "zod";
import { nanoid } from "nanoid";

// Enhanced request interface with user data
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    userId: string;
    email: string;
    isAdmin?: boolean;
  };
}

// Validation schemas
const createOrderSchema = z.object({
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().min(1),
    price: z.string()
  })),
  shippingAddress: z.object({
    firstName: z.string(),
    lastName: z.string(),
    streetAddress: z.string(),
    city: z.string(),
    state: z.string(),
    zipCode: z.string().regex(/^\d{6}$/, "Postal code must be 6 digits"),
    country: z.string(),
    phone: z.string().optional()
  }),
  billingAddress: z.object({
    firstName: z.string(),
    lastName: z.string(),
    streetAddress: z.string(),
    city: z.string(),
    state: z.string(),
    zipCode: z.string().regex(/^\d{6}$/, "Postal code must be 6 digits"),
    country: z.string(),
    phone: z.string().optional()
  }),
  paymentMethodId: z.string().optional(),
  shippingMethod: z.string().optional(),
  currency: z.string().default("INR")
});

const updateOrderStatusSchema = z.object({
  status: z.enum(["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "returned", "refunded"]),
  trackingNumber: z.string().optional(),
  notes: z.string().optional()
});

const cancelOrderSchema = z.object({
  reason: z.string(),
  refundAmount: z.string().optional()
});

const returnOrderSchema = z.object({
  items: z.array(z.object({
    orderItemId: z.string(),
    quantity: z.number().min(1),
    reason: z.string()
  })),
  reason: z.string(),
  returnType: z.enum(["refund", "exchange"]),
  notes: z.string().optional()
});

const addOrderReviewSchema = z.object({
  rating: z.number().min(1).max(5),
  comment: z.string().optional(),
  productId: z.string()
});

export function setupOrderManagementRoutes(app: Express): void {
  // POST /api/v1/orders - Create new order
  app.post("/api/v1/orders", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId || req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const orderData = createOrderSchema.parse(req.body);
      
      // Calculate totals
      let subtotal = 0;
      for (const item of orderData.items) {
        subtotal += parseFloat(item.price) * item.quantity;
      }
      
      const tax = subtotal * 0.08; // 8% tax rate
      const shipping = subtotal > 50 ? 0 : 9.99; // Free shipping over $50
      const total = subtotal + tax + shipping;

      // Generate order number
      const orderNumber = `ORD-${Date.now()}-${nanoid(6).toUpperCase()}`;

      // Create order
      const newOrder = await Order.create({
        _id: `ord_${nanoid()}`,
        orderNumber,
        userId,
        status: "pending",
        type: "standard",
        channel: "web",
        currency: orderData.currency,
        subtotal: subtotal.toFixed(2),
        tax: tax.toFixed(2),
        shipping: shipping.toFixed(2),
        total: total.toFixed(2),
        shippingAddress: orderData.shippingAddress,
        billingAddress: orderData.billingAddress,
        shippingMethod: orderData.shippingMethod || "standard",
        paymentStatus: "pending"
      });

      // Create order items
      for (const item of orderData.items) {
        const product = await Product.findById(item.productId).lean();
        
        if (!product) {
          throw new Error(`Product not found: ${item.productId}`);
        }
        
        const unitPrice = parseFloat(item.price);
        const totalPrice = (unitPrice * item.quantity).toFixed(2);
        
        await OrderItem.create({
          _id: `oi_${nanoid()}`,
          orderId: newOrder._id.toString(),
          productId: item.productId,
          sku: product.sku || `SKU-${Date.now()}-${item.productId.slice(-8)}`,
          name: product.name || 'Product',
          description: product.description || undefined,
          quantity: item.quantity,
          unitPrice: unitPrice.toFixed(2),
          totalPrice: totalPrice,
          price: unitPrice.toFixed(2),
          total: totalPrice
        });
      }

      // NOTE: Invoice creation would go here but Invoice model doesn't exist yet

      res.status(201).json({
        id: newOrder._id.toString(),
        ...newOrder.toObject()
      });
    } catch (error: any) {
      console.error("Error creating order:", error);
      res.status(400).json({ error: error.message || "Failed to create order" });
    }
  });

  // GET /api/v1/orders/{orderId} - Get order by ID
  app.get("/api/v1/orders/:orderId", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { orderId } = req.params;
      const userId = req.user?.userId || req.user?.id;
      const isAdmin = req.user?.isAdmin;

      const order = await Order.findById(orderId).lean();

      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Check if user has access to this order
      if (!isAdmin && order.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Get order items with product details
      const orderItems = await OrderItem.find({ orderId }).lean();
      const itemsWithProducts = await Promise.all(
        orderItems.map(async (item) => {
          const product = await Product.findById(item.productId).lean();
          return {
            ...item,
            id: item._id.toString(),
            product: product ? { id: product._id.toString(), ...product } : null
          };
        })
      );

      res.json({
        id: order._id.toString(),
        ...order,
        orderItems: itemsWithProducts
      });
    } catch (error: any) {
      console.error("Error fetching order:", error);
      res.status(500).json({ error: "Failed to fetch order" });
    }
  });

  // GET /api/v1/orders/user/{userId} - Get orders for user
  app.get("/api/v1/orders/user/:userId", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId: targetUserId } = req.params;
      const requestingUserId = req.user?.userId || req.user?.id;
      const isAdmin = req.user?.isAdmin;

      // Check if user has access
      if (!isAdmin && targetUserId !== requestingUserId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const userOrders = await Order.find({ userId: targetUserId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset)
        .lean();

      // Get order items for each order
      const ordersWithItems = await Promise.all(
        userOrders.map(async (order) => {
          const orderItems = await OrderItem.find({ orderId: order._id.toString() }).lean();
          return {
            id: order._id.toString(),
            ...order,
            orderItems: orderItems.map(item => ({ id: item._id.toString(), ...item }))
          };
        })
      );

      res.json({
        orders: ordersWithItems,
        total: ordersWithItems.length
      });
    } catch (error: any) {
      console.error("Error fetching user orders:", error);
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  // PUT /api/v1/orders/{orderId}/status - Update order status
  app.put("/api/v1/orders/:orderId/status", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { orderId } = req.params;
      const isAdmin = req.user?.isAdmin;
      
      const updateData = updateOrderStatusSchema.parse(req.body);

      // Only admins can update order status
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const existingOrder = await Order.findById(orderId);

      if (!existingOrder) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Update order status
      const updateFields: any = { status: updateData.status };
      
      if (updateData.status === 'confirmed') updateFields.confirmedAt = new Date();
      if (updateData.status === 'shipped') updateFields.shippedAt = new Date();
      if (updateData.status === 'delivered') updateFields.deliveredAt = new Date();
      if (updateData.trackingNumber) updateFields.trackingNumber = updateData.trackingNumber;

      const updatedOrder = await Order.findByIdAndUpdate(
        orderId,
        { $set: updateFields },
        { new: true }
      );

      // NOTE: Tracking creation would go here but Tracking model doesn't exist yet

      res.json({
        id: updatedOrder!._id.toString(),
        ...updatedOrder!.toObject()
      });
    } catch (error: any) {
      console.error("Error updating order status:", error);
      res.status(400).json({ error: error.message || "Failed to update order status" });
    }
  });

  // POST /api/v1/orders/{orderId}/cancel - Cancel order
  app.post("/api/v1/orders/:orderId/cancel", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { orderId } = req.params;
      const userId = req.user?.userId || req.user?.id;
      const isAdmin = req.user?.isAdmin;
      
      const cancelData = cancelOrderSchema.parse(req.body);

      const order = await Order.findById(orderId);

      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Check if user has access to cancel this order
      if (!isAdmin && order.userId !== (userId || '')) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Check if order can be cancelled
      if (!order.status || !["pending", "confirmed"].includes(order.status)) {
        return res.status(400).json({ error: "Order cannot be cancelled in current status" });
      }

      // Update order status to cancelled
      const cancelledOrder = await Order.findByIdAndUpdate(
        orderId,
        { $set: { status: "cancelled" } },
        { new: true }
      );

      // NOTE: Refund creation would go here but Refund model doesn't exist yet

      res.json({
        message: "Order cancelled successfully",
        order: {
          id: cancelledOrder!._id.toString(),
          ...cancelledOrder!.toObject()
        },
        reason: cancelData.reason
      });
    } catch (error: any) {
      console.error("Error cancelling order:", error);
      res.status(400).json({ error: error.message || "Failed to cancel order" });
    }
  });

  // POST /api/v1/orders/{orderId}/return - Create return request
  app.post("/api/v1/orders/:orderId/return", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { orderId } = req.params;
      const userId = req.user?.userId || req.user?.id;
      
      const returnData = returnOrderSchema.parse(req.body);

      const order = await Order.findById(orderId).lean();

      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Check if user owns this order
      if (order.userId !== (userId || '')) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Check if order is eligible for return
      if (!order.status || !["delivered"].includes(order.status)) {
        return res.status(400).json({ error: "Order is not eligible for return" });
      }

      // NOTE: Return creation would go here but Return model doesn't exist yet
      // For now, just return a placeholder response
      res.status(501).json({
        error: "Return functionality not yet implemented - Return model needs to be created"
      });
    } catch (error: any) {
      console.error("Error creating return request:", error);
      res.status(400).json({ error: error.message || "Failed to create return request" });
    }
  });

  // GET /api/v1/orders/{orderId}/invoice - Get order invoice
  app.get("/api/v1/orders/:orderId/invoice", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      res.status(501).json({
        error: "Invoice functionality not yet implemented - Invoice model needs to be created"
      });
    } catch (error: any) {
      console.error("Error fetching invoice:", error);
      res.status(500).json({ error: "Failed to fetch invoice" });
    }
  });

  // GET /api/v1/orders/{orderId}/tracking - Get order tracking
  app.get("/api/v1/orders/:orderId/tracking", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      res.status(501).json({
        error: "Tracking functionality not yet implemented - Tracking model needs to be created"
      });
    } catch (error: any) {
      console.error("Error fetching tracking:", error);
      res.status(500).json({ error: "Failed to fetch tracking information" });
    }
  });

  // POST /api/v1/orders/{orderId}/review - Add review for order
  app.post("/api/v1/orders/:orderId/review", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      res.status(501).json({
        error: "Review functionality not yet implemented in order service - Use separate review endpoint"
      });
    } catch (error: any) {
      console.error("Error submitting review:", error);
      res.status(400).json({ error: error.message || "Failed to submit review" });
    }
  });
}
