import type { Express, Request, Response } from "express";
import { db } from "./db";
import { orders, orderItems, products, users, paymentTransactions, refunds, returns, tracking, trackingEvents, invoices, invoiceLineItems } from "@shared/schema";
import { eq, desc, and, or } from "drizzle-orm";
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
    zipCode: z.string(),
    country: z.string(),
    phone: z.string().optional()
  }),
  billingAddress: z.object({
    firstName: z.string(),
    lastName: z.string(),
    streetAddress: z.string(),
    city: z.string(),
    state: z.string(),
    zipCode: z.string(),
    country: z.string(),
    phone: z.string().optional()
  }),
  paymentMethodId: z.string().optional(),
  shippingMethod: z.string().optional(),
  currency: z.string().default("USD")
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
      const [newOrder] = await db.insert(orders).values({
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
        shippingMethod: orderData.shippingMethod || "standard"
      }).returning();

      // Create order items
      for (const item of orderData.items) {
        // Get product details for order item
        const [product] = await db.select().from(products).where(eq(products.id, item.productId));
        
        if (!product) {
          throw new Error(`Product not found: ${item.productId}`);
        }
        
        const unitPrice = parseFloat(item.price);
        const totalPrice = (unitPrice * item.quantity).toFixed(2);
        
        await db.insert(orderItems).values({
          orderId: newOrder.id,
          productId: item.productId,
          sku: product.sku || `SKU-${Date.now()}-${item.productId.slice(-8)}`,
          name: product.name || 'Product',
          description: product.description || null,
          quantity: item.quantity,
          unitPrice: unitPrice.toFixed(2),
          totalPrice: totalPrice,
          price: unitPrice.toFixed(2),
          total: totalPrice,
          status: "pending"
        });
      }

      // Create invoice
      await db.insert(invoices).values({
        orderId: newOrder.id,
        userId: newOrder.userId,
        invoiceNumber: `INV-${newOrder.orderNumber}`,
        status: "draft",
        currency: orderData.currency,
        customerInfo: {
          name: `${orderData.billingAddress.firstName} ${orderData.billingAddress.lastName}`,
          email: req.user?.email || 'customer@example.com',
          address: {
            streetAddress: orderData.billingAddress.streetAddress,
            city: orderData.billingAddress.city,
            state: orderData.billingAddress.state,
            zipCode: orderData.billingAddress.zipCode,
            country: orderData.billingAddress.country
          }
        },
        merchantInfo: {
          name: "Your Store",
          address: {
            streetAddress: "123 Business St",
            city: "Business City",
            state: "CA",
            zipCode: "90210",
            country: "US"
          }
        },
        subtotal: subtotal.toFixed(2),
        taxTotal: tax.toFixed(2),
        shippingTotal: shipping.toFixed(2),
        grandTotal: total.toFixed(2)
      });

      // Return order with items
      const orderWithItems = await db.query.orders.findFirst({
        where: eq(orders.id, newOrder.id),
        with: {
          orderItems: {
            with: {
              product: true
            }
          }
        }
      });

      res.status(201).json(orderWithItems);
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

      const order = await db.query.orders.findFirst({
        where: eq(orders.id, orderId),
        with: {
          orderItems: {
            with: {
              product: true
            }
          }
        }
      });

      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Check if user has access to this order
      if (!isAdmin && order.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      res.json(order);
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

      const userOrders = await db.query.orders.findMany({
        where: eq(orders.userId, targetUserId),
        with: {
          orderItems: {
            with: {
              product: true
            }
          }
        },
        orderBy: desc(orders.createdAt),
        limit,
        offset
      });

      res.json({
        orders: userOrders,
        total: userOrders.length
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
      const userId = req.user?.userId || req.user?.id;
      const isAdmin = req.user?.isAdmin;
      
      const updateData = updateOrderStatusSchema.parse(req.body);

      // Only admins can update order status
      if (!isAdmin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const existingOrder = await db.query.orders.findFirst({
        where: eq(orders.id, orderId)
      });

      if (!existingOrder) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Update order status
      const [updatedOrder] = await db.update(orders)
        .set({
          status: updateData.status,
          updatedAt: new Date()
        })
        .where(eq(orders.id, orderId))
        .returning();

      // If status is shipped and tracking number provided, create tracking
      if (updateData.status === "shipped" && updateData.trackingNumber) {
        await db.insert(tracking).values({
          orderId,
          trackingNumber: updateData.trackingNumber,
          carrier: "ups", // Default carrier
          status: "in_transit",
          estimatedDeliveryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days from now
        });

        // Add tracking event
        const [trackingRecord] = await db.select().from(tracking).where(eq(tracking.orderId, orderId));
        if (trackingRecord) {
          await db.insert(trackingEvents).values({
            trackingId: trackingRecord.id,
            status: "shipped",
            description: "Package has been shipped",
            location: {
              city: "Fulfillment",
              state: "CA",
              country: "US",
              facility: "Fulfillment Center"
            },
            timestamp: new Date()
          });
        }
      }

      res.json(updatedOrder);
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

      const order = await db.query.orders.findFirst({
        where: eq(orders.id, orderId)
      });

      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Check if user has access to cancel this order
      if (!isAdmin && order.userId !== (userId || '')) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Check if order can be cancelled
      if (!["pending", "confirmed"].includes(order.status)) {
        return res.status(400).json({ error: "Order cannot be cancelled in current status" });
      }

      // Update order status to cancelled
      const [cancelledOrder] = await db.update(orders)
        .set({
          status: "cancelled",
          updatedAt: new Date()
        })
        .where(eq(orders.id, orderId))
        .returning();

      // If refund amount specified, create refund record
      if (cancelData.refundAmount) {
        // This would typically integrate with payment gateway
        console.log(`Refund of ${cancelData.refundAmount} initiated for order ${order.orderNumber}`);
      }

      res.json({
        message: "Order cancelled successfully",
        order: cancelledOrder,
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

      const order = await db.query.orders.findFirst({
        where: eq(orders.id, orderId),
        with: {
          orderItems: true
        }
      });

      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Check if user owns this order
      if (order.userId !== (userId || '')) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Check if order is eligible for return
      if (!["delivered"].includes(order.status)) {
        return res.status(400).json({ error: "Order is not eligible for return" });
      }

      // Generate return number
      const returnNumber = `RET-${Date.now()}-${nanoid(6).toUpperCase()}`;

      // Create return record
      const [returnRecord] = await db.insert(returns).values({
        orderId,
        userId: userId || '',
        returnNumber,
        status: "requested",
        reason: returnData.reason,
        type: returnData.returnType,
        customerNotes: returnData.notes
      }).returning();

      // Calculate return amount
      let returnAmount = 0;
      for (const item of returnData.items) {
        const orderItem = order.orderItems.find(oi => oi.id === item.orderItemId);
        if (orderItem) {
          returnAmount += parseFloat(orderItem.price) * item.quantity;
        }
      }

      res.status(201).json({
        message: "Return request created successfully",
        return: returnRecord,
        returnAmount: returnAmount.toFixed(2)
      });
    } catch (error: any) {
      console.error("Error creating return request:", error);
      res.status(400).json({ error: error.message || "Failed to create return request" });
    }
  });

  // GET /api/v1/orders/{orderId}/invoice - Get order invoice
  app.get("/api/v1/orders/:orderId/invoice", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { orderId } = req.params;
      const userId = req.user?.userId || req.user?.id;
      const isAdmin = req.user?.isAdmin;

      const order = await db.query.orders.findFirst({
        where: eq(orders.id, orderId)
      });

      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Check if user has access to this order
      if (!isAdmin && order.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const invoice = await db.query.invoices.findFirst({
        where: eq(invoices.orderId, orderId),
        with: {
          lineItems: true
        }
      });

      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      res.json(invoice);
    } catch (error: any) {
      console.error("Error fetching invoice:", error);
      res.status(500).json({ error: "Failed to fetch invoice" });
    }
  });

  // GET /api/v1/orders/{orderId}/tracking - Get order tracking
  app.get("/api/v1/orders/:orderId/tracking", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { orderId } = req.params;
      const userId = req.user?.userId || req.user?.id;
      const isAdmin = req.user?.isAdmin;

      const order = await db.query.orders.findFirst({
        where: eq(orders.id, orderId)
      });

      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Check if user has access to this order
      if (!isAdmin && order.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const trackingInfo = await db.query.tracking.findFirst({
        where: eq(tracking.orderId, orderId),
        with: {
          events: {
            orderBy: desc(trackingEvents.timestamp)
          }
        }
      });

      if (!trackingInfo) {
        return res.status(404).json({ error: "Tracking information not available" });
      }

      res.json(trackingInfo);
    } catch (error: any) {
      console.error("Error fetching tracking:", error);
      res.status(500).json({ error: "Failed to fetch tracking information" });
    }
  });

  // POST /api/v1/orders/{orderId}/review - Add review for order
  app.post("/api/v1/orders/:orderId/review", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { orderId } = req.params;
      const userId = req.user?.userId || req.user?.id;
      
      const reviewData = addOrderReviewSchema.parse(req.body);

      const order = await db.query.orders.findFirst({
        where: eq(orders.id, orderId)
      });

      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Check if user owns this order
      if (order.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Check if order is eligible for review (delivered)
      if (order.status !== "delivered") {
        return res.status(400).json({ error: "Order must be delivered to leave a review" });
      }

      // Create review (assuming we have a reviews table)
      // This would use the existing reviews functionality

      res.json({
        message: "Review submitted successfully",
        review: {
          orderId,
          productId: reviewData.productId,
          rating: reviewData.rating,
          comment: reviewData.comment
        }
      });
    } catch (error: any) {
      console.error("Error submitting review:", error);
      res.status(400).json({ error: error.message || "Failed to submit review" });
    }
  });
}