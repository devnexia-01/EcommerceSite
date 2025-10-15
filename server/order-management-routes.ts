import { Router, type Request, Response, NextFunction } from "express";
import { nanoid } from "nanoid";
import { 
  orders, orderItems, returns, returnItems, invoices, invoiceLineItems,
  tracking, trackingEvents, orderStatusHistory, shipments, shipmentItems,
  reviews, products, users
} from "@shared/schema";
import { 
  insertOrderSchema, insertOrderItemSchema, insertReturnSchema, insertReturnItemSchema,
  insertInvoiceSchema, insertInvoiceLineItemSchema, insertTrackingSchema, 
  insertTrackingEventSchema, insertOrderStatusHistorySchema, insertShipmentSchema,
  insertShipmentItemSchema, insertReviewSchema
} from "@shared/schema";
import { eq, desc, and, sql, or } from "drizzle-orm";
import { authenticateToken } from "./auth-routes";

// Enhanced request interface with user data
interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    isAdmin?: boolean;
    id?: string;
    username?: string;
  };
}

const router = Router();

// Test route to verify integration
router.get("/test", (req: AuthenticatedRequest, res: Response) => {
  res.json({ message: "Order management routes loaded successfully!" });
});

// Helper function to generate order number
function generateOrderNumber(): string {
  const timestamp = Date.now().toString();
  const random = nanoid(6).toUpperCase();
  return `ORD-${timestamp.slice(-6)}${random}`;
}

// Helper function to generate return number
function generateReturnNumber(): string {
  const timestamp = Date.now().toString();
  const random = nanoid(6).toUpperCase();
  return `RET-${timestamp.slice(-6)}${random}`;
}

// Helper function to generate invoice number
function generateInvoiceNumber(): string {
  const timestamp = Date.now().toString();
  const random = nanoid(6).toUpperCase();
  return `INV-${timestamp.slice(-6)}${random}`;
}

// Helper function to generate shipment number
function generateShipmentNumber(): string {
  const timestamp = Date.now().toString();
  const random = nanoid(6).toUpperCase();
  return `SHP-${timestamp.slice(-6)}${random}`;
}

// Helper function to add order status history
async function addOrderStatusHistory(
  orderId: string,
  fromStatus: string | null,
  toStatus: string,
  reason?: string,
  notes?: string,
  triggeredBy?: { id: string; type: string; name: string }
) {
  await db.insert(orderStatusHistory).values({
    orderId,
    fromStatus,
    toStatus,
    reason,
    notes,
    triggeredById: triggeredBy?.id,
    triggeredByType: triggeredBy?.type || "system",
    triggeredByName: triggeredBy?.name || "System",
    customerNotified: true,
    merchantNotified: true,
    notificationMethods: ["email"]
  });
}

// 1. POST /api/v1/orders - Create new order
router.post("/orders", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const orderData = insertOrderSchema.parse({
      ...req.body,
      userId,
      orderNumber: generateOrderNumber()
    });

    // Start transaction for order creation
    const result = await db.transaction(async (tx) => {
      // Create order
      const [newOrder] = await tx.insert(orders).values([orderData]).returning();
      
      // Create order items if provided
      if (req.body.items && Array.isArray(req.body.items)) {
        const orderItemsData = req.body.items.map((item: any) => ({
          ...item,
          orderId: newOrder.id,
          sku: item.sku || `SKU-${nanoid(8)}`,
          name: item.name || "Product",
          unitPrice: item.unitPrice || item.price || "0.00",
          totalPrice: item.totalPrice || item.total || "0.00",
          price: item.price || item.unitPrice || "0.00",
          total: item.total || item.totalPrice || "0.00"
        }));
        
        await tx.insert(orderItems).values(orderItemsData);
      }

      // Add initial status history
      await addOrderStatusHistory(
        newOrder.id,
        null,
        newOrder.status || "pending",
        "Order created",
        "New order placed",
        { id: userId, type: "user", name: "Customer" }
      );

      return newOrder;
    });

    res.status(201).json(result);
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(400).json({ error: "Failed to create order" });
  }
});

// 2. GET /api/v1/orders/{orderId} - Get specific order
router.get("/orders/:orderId", authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user?.id;

    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: {
        orderItems: {
          with: {
            product: true
          }
        },
        returns: {
          with: {
            returnItems: true
          }
        },
        invoices: {
          with: {
            lineItems: true
          }
        },
        tracking: {
          with: {
            events: {
              orderBy: desc(trackingEvents.timestamp)
            }
          }
        },
        statusHistory: {
          orderBy: desc(orderStatusHistory.timestamp)
        },
        shipments: {
          with: {
            items: true
          }
        }
      }
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Check if user has access to this order (user owns it or is admin)
    if (order.userId !== userId && !req.user?.isAdmin) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json(order);
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).json({ error: "Failed to fetch order" });
  }
});

// 3. GET /api/v1/orders/user/{userId} - Get orders for a user
router.get("/orders/user/:userId", authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const requestingUserId = req.user?.id;

    // Check if user has access (requesting own orders or is admin)
    if (userId !== requestingUserId && !req.user?.isAdmin) {
      return res.status(403).json({ error: "Access denied" });
    }

    const userOrders = await db.query.orders.findMany({
      where: eq(orders.userId, userId),
      with: {
        orderItems: {
          with: {
            product: true
          }
        }
      },
      orderBy: desc(orders.createdAt),
      limit: parseInt(req.query.limit as string) || 50,
      offset: parseInt(req.query.offset as string) || 0
    });

    res.json({
      orders: userOrders,
      total: userOrders.length
    });
  } catch (error) {
    console.error("Error fetching user orders:", error);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// 4. PUT /api/v1/orders/{orderId}/status - Update order status
router.put("/orders/:orderId/status", authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, reason, notes } = req.body;
    const userId = req.user?.id;

    if (!status) {
      return res.status(400).json({ error: "Status is required" });
    }

    // Get current order
    const currentOrder = await db.query.orders.findFirst({
      where: eq(orders.id, orderId)
    });

    if (!currentOrder) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Check admin access for status updates
    if (!req.user?.isAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const result = await db.transaction(async (tx) => {
      // Update order status
      const [updatedOrder] = await tx
        .update(orders)
        .set({ 
          status,
          updatedAt: sql`now()`,
          ...(status === "confirmed" && { confirmedAt: sql`now()` }),
          ...(status === "shipped" && { shippedAt: sql`now()` }),
          ...(status === "delivered" && { deliveredAt: sql`now()` }),
          ...(status === "cancelled" && { cancelledAt: sql`now()` })
        })
        .where(eq(orders.id, orderId))
        .returning();

      // Add status history
      await addOrderStatusHistory(
        orderId,
        currentOrder.status,
        status,
        reason,
        notes,
        { id: userId!, type: "admin", name: req.user?.username || "Admin" }
      );

      return updatedOrder;
    });

    res.json(result);
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ error: "Failed to update order status" });
  }
});

// 5. POST /api/v1/orders/{orderId}/cancel - Cancel order
router.post("/orders/:orderId/cancel", authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason, notes } = req.body;
    const userId = req.user?.id;

    const currentOrder = await db.query.orders.findFirst({
      where: eq(orders.id, orderId)
    });

    if (!currentOrder) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Check if user owns order or is admin
    if (currentOrder.userId !== userId && !req.user?.isAdmin) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Check if order can be cancelled
    if (["shipped", "delivered", "cancelled"].includes(currentOrder.status || "")) {
      return res.status(400).json({ error: "Order cannot be cancelled in current status" });
    }

    const result = await db.transaction(async (tx) => {
      // Update order status to cancelled
      const [updatedOrder] = await tx
        .update(orders)
        .set({ 
          status: "cancelled",
          cancelledAt: sql`now()`,
          updatedAt: sql`now()`
        })
        .where(eq(orders.id, orderId))
        .returning();

      // Add status history
      await addOrderStatusHistory(
        orderId,
        currentOrder.status,
        "cancelled",
        reason || "Customer requested cancellation",
        notes,
        { id: userId!, type: req.user?.isAdmin ? "admin" : "user", name: req.user?.username || "User" }
      );

      return updatedOrder;
    });

    res.json(result);
  } catch (error) {
    console.error("Error cancelling order:", error);
    res.status(500).json({ error: "Failed to cancel order" });
  }
});

// 6. POST /api/v1/orders/{orderId}/return - Create return request
router.post("/orders/:orderId/return", authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user?.id;

    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: {
        orderItems: true
      }
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Check if user owns order
    if (order.userId !== userId && !req.user?.isAdmin) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Check if order is eligible for return
    if (!["delivered"].includes(order.status || "")) {
      return res.status(400).json({ error: "Order is not eligible for return" });
    }

    const returnData = insertReturnSchema.parse({
      ...req.body,
      orderId,
      userId: order.userId,
      returnNumber: generateReturnNumber()
    });

    const result = await db.transaction(async (tx) => {
      // Create return
      const [newReturn] = await tx.insert(returns).values([returnData]).returning();

      // Create return items if provided
      if (req.body.items && Array.isArray(req.body.items)) {
        const returnItemsData = req.body.items.map((item: any) => ({
          ...item,
          returnId: newReturn.id
        }));
        
        await tx.insert(returnItems).values(returnItemsData);
      }

      return newReturn;
    });

    res.status(201).json(result);
  } catch (error) {
    console.error("Error creating return:", error);
    res.status(400).json({ error: "Failed to create return" });
  }
});

// 7. GET /api/v1/orders/{orderId}/invoice - Get order invoice
router.get("/orders/:orderId/invoice", authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user?.id;

    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: {
        user: true,
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

    // Check if user has access
    if (order.userId !== userId && !req.user?.isAdmin) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Check if invoice already exists
    let invoice = await db.query.invoices.findFirst({
      where: eq(invoices.orderId, orderId),
      with: {
        lineItems: true
      }
    });

    // Generate invoice if it doesn't exist
    if (!invoice) {
      const invoiceData = {
        invoiceNumber: generateInvoiceNumber(),
        orderId,
        userId: order.userId,
        status: "sent" as const,
        type: "invoice" as const,
        currency: order.currency || "USD",
        customerInfo: {
          name: `${order.user.firstName || ""} ${order.user.lastName || ""}`.trim(),
          email: order.user.email,
          phone: order.user.phoneNumber || undefined,
          address: {
            streetAddress: order.billingAddress.streetAddress,
            city: order.billingAddress.city,
            state: order.billingAddress.state,
            zipCode: order.billingAddress.zipCode,
            country: order.billingAddress.country
          }
        },
        merchantInfo: {
          name: "EliteCommerce",
          address: {
            streetAddress: "123 Business St",
            city: "Commerce City",
            state: "CA",
            zipCode: "90210",
            country: "USA"
          },
          phone: "+1-800-555-0123",
          email: "billing@elitecommerce.com",
          website: "https://elitecommerce.com"
        },
        subtotal: order.subtotal,
        discountTotal: "0.00",
        taxTotal: order.tax,
        shippingTotal: order.shipping,
        grandTotal: order.total,
        paymentTerms: "Net 30",
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        remainingAmount: order.total,
        issuedAt: sql`now()`,
        sentAt: sql`now()`
      };

      const result = await db.transaction(async (tx) => {
        const [newInvoice] = await tx.insert(invoices).values(invoiceData).returning();

        // Create invoice line items
        const lineItemsData = order.orderItems.map(item => ({
          invoiceId: newInvoice.id,
          productId: item.productId,
          sku: item.sku,
          description: item.description || item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: "0.00",
          taxRate: "0.0000",
          taxAmount: "0.00",
          totalAmount: item.totalPrice
        }));

        await tx.insert(invoiceLineItems).values(lineItemsData);

        return newInvoice;
      });

      // Fetch complete invoice with line items
      invoice = await db.query.invoices.findFirst({
        where: eq(invoices.id, result.id),
        with: {
          lineItems: true
        }
      });
    }

    res.json(invoice);
  } catch (error) {
    console.error("Error fetching invoice:", error);
    res.status(500).json({ error: "Failed to fetch invoice" });
  }
});

// 8. GET /api/v1/orders/{orderId}/tracking - Get order tracking
router.get("/orders/:orderId/tracking", authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user?.id;

    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId)
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Check if user has access
    if (order.userId !== userId && !req.user?.isAdmin) {
      return res.status(403).json({ error: "Access denied" });
    }

    const trackingInfo = await db.query.tracking.findMany({
      where: eq(tracking.orderId, orderId),
      with: {
        events: {
          orderBy: desc(trackingEvents.timestamp)
        }
      },
      orderBy: desc(tracking.createdAt)
    });

    res.json({
      tracking: trackingInfo,
      orderNumber: order.orderNumber,
      orderStatus: order.status
    });
  } catch (error) {
    console.error("Error fetching tracking:", error);
    res.status(500).json({ error: "Failed to fetch tracking" });
  }
});

// 9. POST /api/v1/orders/{orderId}/review - Create order review
router.post("/orders/:orderId/review", authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user?.id;

    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: {
        orderItems: true
      }
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Check if user owns order
    if (order.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Check if order is delivered
    if (order.status !== "delivered") {
      return res.status(400).json({ error: "Can only review delivered orders" });
    }

    const reviewData = insertReviewSchema.parse({
      ...req.body,
      userId,
      orderId,
      verified: true // Reviews from actual purchasers are verified
    });

    const result = await db.insert(reviews).values([reviewData]).returning();

    res.status(201).json(result[0]);
  } catch (error) {
    console.error("Error creating review:", error);
    res.status(400).json({ error: "Failed to create review" });
  }
});

export { router as orderManagementRoutes };