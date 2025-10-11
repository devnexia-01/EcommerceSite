import type { Express, Request, Response } from 'express';
import { z } from 'zod';
import { storage } from './storage';
import { authenticateToken, type AuthenticatedRequest } from './auth-routes';

// Validation schemas
const createPurchaseIntentSchema = z.object({
  productId: z.string().uuid("Invalid product ID"),
  variantId: z.string().uuid().optional(),
  quantity: z.number().int().min(1).max(10).default(1),
  customization: z.object({
    color: z.string().optional(),
    size: z.string().optional(),
    engraving: z.string().max(100).optional(),
    giftMessage: z.string().max(500).optional()
  }).optional()
});

const completePurchaseIntentSchema = z.object({
  intentId: z.string().uuid("Invalid intent ID"),
  paymentMethod: z.enum(["online", "cod"]).optional().default("online")
});

export function setupBuyNowRoutes(app: Express) {

  // Create buy now purchase intent - requires authentication
  app.post('/api/buy-now/create-intent', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { productId, variantId, quantity, customization } = createPurchaseIntentSchema.parse(req.body);

      // Get authenticated user ID
      const userId = req.user!.userId;

      // Get product details and check availability
      const product = await storage.getProduct(productId);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      // Check stock availability
      if (!product.stock || product.stock < quantity) {
        return res.status(400).json({ 
          message: `Only ${product.stock || 0} items available in stock`
        });
      }

      // Calculate price (use sale price if available)
      const price = product.salePrice || product.price;
      const totalPrice = parseFloat(price.toString()) * quantity;

      // Create purchase intent that expires in 15 minutes
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      const intent = await storage.createPurchaseIntent({
        userId,
        sessionId: undefined, // No session ID needed for authenticated users
        productId,
        variantId,
        quantity,
        price: price.toString(),
        customization: customization || undefined,
        status: 'pending',
        expiresAt
      });

      res.json({
        intent: {
          id: intent.id,
          productId: intent.productId,
          quantity: intent.quantity,
          price: intent.price,
          totalPrice: totalPrice.toFixed(2),
          expiresAt: intent.expiresAt,
          customization: intent.customization
        },
        redirectUrl: `/checkout/buy-now/${intent.id}/address`,
        product: {
          id: product.id,
          name: product.name,
          imageUrl: product.imageUrl,
          price: product.price,
          salePrice: product.salePrice
        }
      });

    } catch (error) {
      console.error('Create purchase intent error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get purchase intent details - requires authentication
  app.get('/api/buy-now/intent/:intentId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { intentId } = req.params;
      
      if (!intentId) {
        return res.status(400).json({ message: 'Intent ID is required' });
      }

      const intent = await storage.getPurchaseIntent(intentId);
      if (!intent) {
        return res.status(404).json({ message: 'Purchase intent not found' });
      }

      // Verify ownership - user can only access their own purchase intents
      if (intent.userId !== req.user!.userId) {
        return res.status(403).json({ message: 'Access denied - you do not own this purchase intent' });
      }

      // Check if intent is expired
      if (intent.expiresAt < new Date()) {
        await storage.updatePurchaseIntentStatus(intentId, 'expired');
        return res.status(410).json({ message: 'Purchase intent has expired' });
      }

      // Get product details
      const product = await storage.getProduct(intent.productId);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      const totalPrice = parseFloat(intent.price.toString()) * intent.quantity;

      res.json({
        intent: {
          id: intent.id,
          productId: intent.productId,
          quantity: intent.quantity,
          price: intent.price,
          totalPrice: totalPrice.toFixed(2),
          customization: intent.customization,
          status: intent.status,
          expiresAt: intent.expiresAt
        },
        product: {
          id: product.id,
          name: product.name,
          imageUrl: product.imageUrl,
          description: product.description,
          price: product.price,
          salePrice: product.salePrice
        }
      });

    } catch (error) {
      console.error('Get purchase intent error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Save shipping address to purchase intent - requires authentication
  app.post('/api/buy-now/intent/:intentId/address', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { intentId } = req.params;
      const { shippingAddress, email, phone } = req.body;

      if (!intentId) {
        return res.status(400).json({ message: 'Intent ID is required' });
      }

      if (!shippingAddress) {
        return res.status(400).json({ message: 'Shipping address is required' });
      }

      const intent = await storage.getPurchaseIntent(intentId);
      if (!intent) {
        return res.status(404).json({ message: 'Purchase intent not found' });
      }

      // Verify ownership - user can only update their own purchase intents
      if (intent.userId !== req.user!.userId) {
        return res.status(403).json({ message: 'Access denied - you do not own this purchase intent' });
      }

      // Check if intent is expired
      if (intent.expiresAt < new Date()) {
        await storage.updatePurchaseIntentStatus(intentId, 'expired');
        return res.status(410).json({ message: 'Purchase intent has expired' });
      }

      // Update the purchase intent with shipping address
      await storage.updatePurchaseIntentAddress(intentId, shippingAddress, email, phone);

      res.json({ 
        message: 'Shipping address saved successfully',
        intentId 
      });

    } catch (error) {
      console.error('Save address error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Complete purchase intent (convert to order) - requires authentication
  app.post('/api/buy-now/complete', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { intentId, paymentMethod } = completePurchaseIntentSchema.parse(req.body);

      const intent = await storage.getPurchaseIntent(intentId);
      if (!intent) {
        return res.status(404).json({ message: 'Purchase intent not found' });
      }

      // Verify ownership - user can only complete their own purchase intents
      if (intent.userId !== req.user!.userId) {
        return res.status(403).json({ message: 'Access denied - you do not own this purchase intent' });
      }

      // Check if intent is expired
      if (intent.expiresAt < new Date()) {
        await storage.updatePurchaseIntentStatus(intentId, 'expired');
        return res.status(410).json({ message: 'Purchase intent has expired' });
      }

      // Check if already completed
      if (intent.status === 'completed') {
        return res.status(400).json({ message: 'Purchase intent already completed' });
      }

      // Get product details
      const product = await storage.getProduct(intent.productId);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      // Check stock again before completing
      if (!product.stock || product.stock < intent.quantity) {
        return res.status(400).json({ 
          message: `Only ${product.stock || 0} items available in stock`
        });
      }

      // Create the actual order
      const subtotal = parseFloat(intent.price) * intent.quantity;
      const shippingCost = subtotal >= 50 ? 0 : 9.99;
      const totalPrice = subtotal + shippingCost;
      
      // Generate order number
      const timestamp = Date.now().toString();
      const random = Math.random().toString(36).substring(2, 8).toUpperCase();
      const orderNumber = `ORD-${timestamp.slice(-6)}${random}`;
      
      // Validate shipping address is present
      if (!intent.shippingAddress) {
        return res.status(400).json({ 
          message: 'Shipping address is required. Please provide shipping details before completing the order.'
        });
      }

      // Create order record
      const orderData = {
        userId: intent.userId || null, // Can be null for guest orders
        sessionId: intent.sessionId || null,
        orderNumber: orderNumber,
        status: 'pending', // Default status for new orders
        subtotal: subtotal.toFixed(2),
        shipping: shippingCost.toFixed(2),
        total: totalPrice.toFixed(2),
        shippingAddress: intent.shippingAddress,
        paymentMethod: paymentMethod || 'online',
        paymentStatus: paymentMethod === 'cod' ? 'pending' : 'pending'
      };

      // Create order items
      const orderItems = [{
        productId: intent.productId,
        variantId: intent.variantId || null,
        quantity: intent.quantity,
        price: intent.price,
        customization: intent.customization || null
      }];

      // Create the order in the database
      const order = await storage.createOrder(orderData, orderItems);

      // Mark intent as completed
      await storage.updatePurchaseIntentStatus(intentId, 'completed');

      res.json({
        message: 'Purchase intent completed successfully',
        intentId: intent.id,
        orderId: order.id,
        redirectUrl: '/orders' // Redirect to orders page after checkout
      });

    } catch (error) {
      console.error('Complete purchase intent error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Cancel purchase intent - requires authentication
  app.post('/api/buy-now/cancel/:intentId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { intentId } = req.params;
      
      const intent = await storage.getPurchaseIntent(intentId);
      if (!intent) {
        return res.status(404).json({ message: 'Purchase intent not found' });
      }

      // Verify ownership - user can only cancel their own purchase intents
      if (intent.userId !== req.user!.userId) {
        return res.status(403).json({ message: 'Access denied - you do not own this purchase intent' });
      }

      await storage.updatePurchaseIntentStatus(intentId, 'cancelled');

      res.json({ message: 'Purchase intent cancelled successfully' });

    } catch (error) {
      console.error('Cancel purchase intent error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Cleanup expired purchase intents (this could be called by a cron job)
  app.post('/api/buy-now/cleanup', async (req: Request, res: Response) => {
    try {
      await storage.cleanupExpiredPurchaseIntents();
      res.json({ message: 'Cleanup completed successfully' });
    } catch (error) {
      console.error('Cleanup expired intents error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
}