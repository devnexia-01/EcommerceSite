import express from "express";
import { cartService } from "../services/cart-service";
import { z } from "zod";

const router = express.Router();

// Enhanced request interface with user data
interface AuthenticatedRequest extends express.Request {
  user?: {
    id: string;
    email: string;
    isAdmin?: boolean;
  };
}

// Middleware to extract user info from session or token
const getUserInfo = (req: AuthenticatedRequest) => {
  const userId = req.user?.id; // From authentication middleware
  const sessionId = req.headers['x-session-id'] as string;
  return { userId, sessionId };
};

// Error handler wrapper
const asyncHandler = (fn: Function) => (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Validation schemas
const addToCartSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional(),
  quantity: z.number().int().positive().max(100).default(1),
  price: z.string().optional(),
  customization: z.object({
    engraving: z.string().optional(),
    giftWrap: z.boolean().optional(),
    giftMessage: z.string().optional(),
    color: z.string().optional(),
    size: z.string().optional()
  }).optional()
});

const updateCartItemSchema = z.object({
  quantity: z.number().int().min(0).max(100).optional(),
  customization: z.object({
    engraving: z.string().optional(),
    giftWrap: z.boolean().optional(),
    giftMessage: z.string().optional(),
    color: z.string().optional(),
    size: z.string().optional()
  }).optional(),
  savedForLater: z.boolean().optional()
});

const applyCouponSchema = z.object({
  code: z.string().min(1).max(50)
});

// GET /api/v1/cart/{userId} - Get cart for user
router.get('/', asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
  const { userId, sessionId } = getUserInfo(req);
  
  if (!userId && !sessionId) {
    return res.status(400).json({ 
      error: 'User authentication or session required' 
    });
  }

  try {
    const cart = await cartService.getCart(userId, sessionId);
    
    if (!cart) {
      // Create a new cart if none exists
      const newCartId = await cartService.getOrCreateCart(userId, sessionId);
      const newCart = await cartService.getCart(userId, sessionId);
      
      if (newCart) {
        return res.json(newCart);
      }
      
      // Fallback response if cart creation fails - use the original sessionId
      return res.json({
        id: null,
        userId,
        sessionId: sessionId, // Use the original session ID from request
        items: [],
        summary: {
          subtotal: "0",
          tax: "0",
          shipping: "0",
          discount: "0",
          total: "0"
        },
        coupons: [],
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          abandoned: false
        },
        currency: "USD"
      });
    }

    res.json(cart);
  } catch (error) {
    console.error('Error getting cart:', error);
    res.status(500).json({ error: 'Failed to get cart' });
  }
}));

// POST /api/v1/cart/{userId}/items - Add item to cart
router.post('/items', asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
  const { userId, sessionId } = getUserInfo(req);
  
  if (!userId && !sessionId) {
    return res.status(400).json({ 
      error: 'User authentication or session required' 
    });
  }

  try {
    const validatedData = addToCartSchema.parse(req.body);
    const cartItem = await cartService.addToCart(userId, sessionId, validatedData);
    
    res.status(201).json({
      success: true,
      item: cartItem,
      message: 'Item added to cart'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Invalid input', 
        details: error.errors 
      });
    }
    
    console.error('Error adding to cart:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to add item to cart' 
    });
  }
}));

// PUT /api/v1/cart/{userId}/items/{itemId} - Update cart item
router.put('/items/:itemId', asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
  const { itemId } = req.params;
  
  if (!itemId) {
    return res.status(400).json({ error: 'Item ID is required' });
  }

  try {
    const validatedData = updateCartItemSchema.parse(req.body);
    const cartItem = await cartService.updateCartItem(itemId, validatedData);
    
    res.json({
      success: true,
      item: cartItem,
      message: 'Cart item updated'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Invalid input', 
        details: error.errors 
      });
    }
    
    console.error('Error updating cart item:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to update cart item' 
    });
  }
}));

// DELETE /api/v1/cart/{userId}/items/{itemId} - Remove item from cart
router.delete('/items/:itemId', asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
  const { itemId } = req.params;
  
  if (!itemId) {
    return res.status(400).json({ error: 'Item ID is required' });
  }

  try {
    await cartService.removeFromCart(itemId);
    
    res.json({
      success: true,
      message: 'Item removed from cart'
    });
  } catch (error) {
    console.error('Error removing cart item:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to remove cart item' 
    });
  }
}));

// POST /api/v1/cart/{userId}/clear - Clear entire cart
router.post('/clear', asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
  const { userId, sessionId } = getUserInfo(req);
  
  if (!userId && !sessionId) {
    return res.status(400).json({ 
      error: 'User authentication or session required' 
    });
  }

  try {
    await cartService.clearCart(userId, sessionId);
    
    res.json({
      success: true,
      message: 'Cart cleared'
    });
  } catch (error) {
    console.error('Error clearing cart:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to clear cart' 
    });
  }
}));

// POST /api/v1/cart/{userId}/merge - Merge guest cart with user cart
router.post('/merge', asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
  const { userId } = getUserInfo(req);
  const { guestSessionId } = req.body;
  
  if (!userId) {
    return res.status(400).json({ 
      error: 'User authentication required for cart merge' 
    });
  }

  if (!guestSessionId) {
    return res.status(400).json({ 
      error: 'Guest session ID required for merge' 
    });
  }

  try {
    await cartService.mergeCart(guestSessionId, userId);
    
    res.json({
      success: true,
      message: 'Carts merged successfully'
    });
  } catch (error) {
    console.error('Error merging carts:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to merge carts' 
    });
  }
}));

// GET /api/v1/cart/{userId}/validate - Validate cart items
router.get('/validate', asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
  const { userId, sessionId } = getUserInfo(req);
  
  if (!userId && !sessionId) {
    return res.status(400).json({ 
      error: 'User authentication or session required' 
    });
  }

  try {
    const validation = await cartService.validateCart(userId, sessionId);
    
    res.json({
      success: true,
      validation
    });
  } catch (error) {
    console.error('Error validating cart:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to validate cart' 
    });
  }
}));

// POST /api/v1/cart/{userId}/save-for-later - Save items for later
router.post('/save-for-later', asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
  const { itemIds } = req.body;
  
  if (!itemIds || !Array.isArray(itemIds)) {
    return res.status(400).json({ 
      error: 'Array of item IDs is required' 
    });
  }

  try {
    await cartService.saveForLater(itemIds);
    
    res.json({
      success: true,
      message: 'Items saved for later'
    });
  } catch (error) {
    console.error('Error saving items for later:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to save items for later' 
    });
  }
}));

// POST /api/v1/cart/{userId}/move-to-cart - Move saved items back to cart
router.post('/move-to-cart', asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
  const { itemIds } = req.body;
  
  if (!itemIds || !Array.isArray(itemIds)) {
    return res.status(400).json({ 
      error: 'Array of item IDs is required' 
    });
  }

  try {
    await cartService.moveToCart(itemIds);
    
    res.json({
      success: true,
      message: 'Items moved back to cart'
    });
  } catch (error) {
    console.error('Error moving items to cart:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to move items to cart' 
    });
  }
}));

// POST /api/v1/cart/{userId}/coupons - Apply coupon to cart
router.post('/coupons', asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
  const { userId, sessionId } = getUserInfo(req);
  
  if (!userId && !sessionId) {
    return res.status(400).json({ 
      error: 'User authentication or session required' 
    });
  }

  try {
    const validatedData = applyCouponSchema.parse(req.body);
    await cartService.applyCoupon(userId, sessionId, validatedData);
    
    res.json({
      success: true,
      message: 'Coupon applied successfully'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Invalid input', 
        details: error.errors 
      });
    }
    
    console.error('Error applying coupon:', error);
    res.status(400).json({ 
      error: error instanceof Error ? error.message : 'Failed to apply coupon' 
    });
  }
}));

// DELETE /api/v1/cart/{userId}/coupons/{couponId} - Remove coupon from cart
router.delete('/coupons/:couponId', asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
  const { couponId } = req.params;
  
  if (!couponId) {
    return res.status(400).json({ error: 'Coupon ID is required' });
  }

  try {
    await cartService.removeCoupon(couponId);
    
    res.json({
      success: true,
      message: 'Coupon removed from cart'
    });
  } catch (error) {
    console.error('Error removing coupon:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to remove coupon' 
    });
  }
}));

// Error handling middleware
router.use((error: any, req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
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