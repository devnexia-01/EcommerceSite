import type { Express, Request, Response } from 'express';
import { z } from 'zod';
import { storage } from './storage';

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
  intentId: z.string().uuid("Invalid intent ID")
});

export function setupBuyNowRoutes(app: Express) {

  // Create buy now purchase intent
  app.post('/api/buy-now/create-intent', async (req: Request, res: Response) => {
    try {
      const { productId, variantId, quantity, customization } = createPurchaseIntentSchema.parse(req.body);

      // Get user ID from session or JWT
      const userId = req.session?.userId; // For guest users, this will be undefined
      const sessionId = req.sessionID; // Use session ID for guest purchases

      // Get product details and check availability
      const product = await storage.getProduct(productId);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      // Check stock availability
      if (product.stock < quantity) {
        return res.status(400).json({ 
          message: `Only ${product.stock} items available in stock`
        });
      }

      // Calculate price (use sale price if available)
      const price = product.salePrice || product.price;
      const totalPrice = parseFloat(price.toString()) * quantity;

      // Create purchase intent that expires in 15 minutes
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      const intent = await storage.createPurchaseIntent({
        userId,
        sessionId: userId ? undefined : sessionId,
        productId,
        variantId,
        quantity,
        price: price.toString(),
        customization,
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
        redirectUrl: `/checkout/buy-now/${intent.id}`,
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

  // Get purchase intent details
  app.get('/api/buy-now/intent/:intentId', async (req: Request, res: Response) => {
    try {
      const { intentId } = req.params;
      
      if (!intentId) {
        return res.status(400).json({ message: 'Intent ID is required' });
      }

      const intent = await storage.getPurchaseIntent(intentId);
      if (!intent) {
        return res.status(404).json({ message: 'Purchase intent not found' });
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

  // Complete purchase intent (convert to order)
  app.post('/api/buy-now/complete', async (req: Request, res: Response) => {
    try {
      const { intentId } = completePurchaseIntentSchema.parse(req.body);

      const intent = await storage.getPurchaseIntent(intentId);
      if (!intent) {
        return res.status(404).json({ message: 'Purchase intent not found' });
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
      if (product.stock < intent.quantity) {
        return res.status(400).json({ 
          message: `Only ${product.stock} items available in stock`
        });
      }

      // Mark intent as completed
      await storage.updatePurchaseIntentStatus(intentId, 'completed');

      res.json({
        message: 'Purchase intent completed successfully',
        intentId: intent.id,
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

  // Cancel purchase intent
  app.post('/api/buy-now/cancel/:intentId', async (req: Request, res: Response) => {
    try {
      const { intentId } = req.params;
      
      const intent = await storage.getPurchaseIntent(intentId);
      if (!intent) {
        return res.status(404).json({ message: 'Purchase intent not found' });
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