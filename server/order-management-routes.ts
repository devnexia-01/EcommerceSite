import { Router, type Request, Response, NextFunction } from "express";
import { nanoid } from "nanoid";
import { Order, OrderItem, Product, User } from "./models/index";
// NOTE: The following models don't exist yet in MongoDB and need to be created:
// - Return, ReturnItem, Invoice, InvoiceLineItem
// - Tracking, TrackingEvent, OrderStatusHistory
// - Shipment, ShipmentItem, Review
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

// 1. POST /api/v1/orders - Create new order
router.post("/orders", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const orderData = {
      ...req.body,
      userId,
      orderNumber: generateOrderNumber()
    };

    // Create order
    const newOrder = await Order.create({
      _id: `ord_${nanoid()}`,
      ...orderData
    });
    
    // Create order items if provided
    if (req.body.items && Array.isArray(req.body.items)) {
      for (const item of req.body.items) {
        await OrderItem.create({
          _id: `oi_${nanoid()}`,
          orderId: newOrder._id.toString(),
          sku: item.sku || `SKU-${nanoid(8)}`,
          name: item.name || "Product",
          unitPrice: item.unitPrice || item.price || 0,
          totalPrice: item.totalPrice || item.total || 0,
          price: item.price || item.unitPrice || 0,
          total: item.total || item.totalPrice || 0,
          ...item
        });
      }
    }

    res.status(201).json({
      id: newOrder._id.toString(),
      ...newOrder.toObject()
    });
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

    const order = await Order.findById(orderId).lean();

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Check if user has access to this order (user owns it or is admin)
    if (order.userId !== userId && !req.user?.isAdmin) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Get order items
    const orderItems = await OrderItem.find({ orderId }).lean();

    res.json({
      id: order._id.toString(),
      ...order,
      orderItems: orderItems.map(item => ({ id: item._id.toString(), ...item }))
    });
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

    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const userOrders = await Order.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(offset)
      .lean();

    res.json({
      orders: userOrders.map(order => ({ id: order._id.toString(), ...order })),
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
    const currentOrder = await Order.findById(orderId);

    if (!currentOrder) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Check admin access for status updates
    if (!req.user?.isAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const updateFields: any = { status };

    if (status === "confirmed") updateFields.confirmedAt = new Date();
    if (status === "shipped") updateFields.shippedAt = new Date();
    if (status === "delivered") updateFields.deliveredAt = new Date();
    if (status === "cancelled") updateFields.cancelledAt = new Date();

    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      { $set: updateFields },
      { new: true }
    );

    res.json({
      id: updatedOrder!._id.toString(),
      ...updatedOrder!.toObject()
    });
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

    const currentOrder = await Order.findById(orderId);

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

    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      { $set: { status: "cancelled", cancelledAt: new Date() } },
      { new: true }
    );

    res.json({
      id: updatedOrder!._id.toString(),
      ...updatedOrder!.toObject()
    });
  } catch (error) {
    console.error("Error cancelling order:", error);
    res.status(500).json({ error: "Failed to cancel order" });
  }
});

// NOTE: The following routes require models that don't exist yet:
// - Returns (POST /orders/:orderId/return)
// - Invoices (GET /orders/:orderId/invoice)
// - Tracking (GET /orders/:orderId/tracking)
// - Reviews (POST /orders/:orderId/review)

// Return 501 Not Implemented for these features
router.post("/orders/:orderId/return", authenticateToken, async (req, res) => {
  res.status(501).json({ error: "Return functionality requires Return model to be created" });
});

router.get("/orders/:orderId/invoice", authenticateToken, async (req, res) => {
  res.status(501).json({ error: "Invoice functionality requires Invoice model to be created" });
});

router.get("/orders/:orderId/tracking", authenticateToken, async (req, res) => {
  res.status(501).json({ error: "Tracking functionality requires Tracking model to be created" });
});

router.post("/orders/:orderId/review", authenticateToken, async (req, res) => {
  res.status(501).json({ error: "Review functionality requires Review model to be created" });
});

export { router as orderManagementRoutes };
