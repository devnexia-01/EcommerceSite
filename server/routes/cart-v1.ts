import express from "express";
import { cartService } from "../services/cart-service";
import { z } from "zod";

const router = express.Router();

// Enhanced request interface with user data
interface AuthenticatedRequest extends express.Request {
  user?: {
    userId: string;
    email: string;
    isAdmin?: boolean;
  };
}

// Middleware to extract user info from session or token
const getUserInfo = (req: AuthenticatedRequest) => {
  const userId = req.user?.userId; // From authentication middleware
  const sessionId = req.headers['x-session-id'] as string || req.sessionID || 'session-' + Math.random().toString(36).substr(2, 9);
  console.log('Server received session ID:', sessionId); // Debug log
  return { userId, sessionId };
};

// Error handler wrapper
const asyncHandler = (fn: Function) => (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Validation schemas
const addToCartSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive().max(100).default(1)
});

const updateQuantitySchema = z.object({
  quantity: z.number().int().min(0).max(100)
});

// GET /api/v1/cart - Get cart for user/session
router.get('/', asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
  const { userId, sessionId } = getUserInfo(req);
  
  // Always allow requests - use sessionId if no userId
  if (!sessionId) {
    return res.status(400).json({ 
      error: 'Session required' 
    });
  }

  try {
    let cart = await cartService.getCart(userId, sessionId);
    
    if (!cart) {
      // Create a new cart if none exists
      await cartService.getOrCreateCart(userId, sessionId);
      cart = await cartService.getCart(userId, sessionId);
    }
    
    return res.json(cart);
  } catch (error) {
    console.error('Error getting cart:', error);
    return res.status(500).json({ error: 'Failed to get cart' });
  }
}));

// POST /api/v1/cart/items - Add item to cart
router.post('/items', asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
  const { userId, sessionId } = getUserInfo(req);
  
  // Always allow requests - use sessionId if no userId
  if (!sessionId) {
    return res.status(400).json({ 
      error: 'Session required' 
    });
  }

  try {
    const validatedData = addToCartSchema.parse(req.body);
    
    const item = await cartService.addToCart(
      userId, 
      sessionId, 
      validatedData.productId, 
      validatedData.quantity
    );
    
    return res.status(201).json({ 
      success: true, 
      item 
    });
  } catch (error) {
    console.error('Error adding to cart:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.errors 
      });
    }
    return res.status(500).json({ error: 'Failed to add item to cart' });
  }
}));

// PUT /api/v1/cart/items/:itemId - Update cart item quantity
router.put('/items/:itemId', asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { itemId } = req.params;
    const validatedData = updateQuantitySchema.parse(req.body);
    
    await cartService.updateCartItemQuantity(itemId, validatedData.quantity);
    
    return res.json({ success: true });
  } catch (error) {
    console.error('Error updating cart item:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.errors 
      });
    }
    return res.status(500).json({ error: 'Failed to update cart item' });
  }
}));

// DELETE /api/v1/cart/items/:itemId - Remove item from cart
router.delete('/items/:itemId', asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { itemId } = req.params;
    
    await cartService.removeFromCart(itemId);
    
    return res.json({ success: true });
  } catch (error) {
    console.error('Error removing from cart:', error);
    return res.status(500).json({ error: 'Failed to remove item from cart' });
  }
}));

// DELETE /api/v1/cart - Clear entire cart
router.delete('/', asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
  const { userId, sessionId } = getUserInfo(req);
  
  // Always allow requests - use sessionId if no userId
  if (!sessionId) {
    return res.status(400).json({ 
      error: 'Session required' 
    });
  }

  try {
    await cartService.clearCart(userId, sessionId);
    
    return res.json({ success: true });
  } catch (error) {
    console.error('Error clearing cart:', error);
    return res.status(500).json({ error: 'Failed to clear cart' });
  }
}));

// Error handling middleware
router.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Cart API Error:', error);
  
  if (error instanceof z.ZodError) {
    return res.status(400).json({
      error: 'Validation error',
      details: error.errors
    });
  }
  
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

export default router;