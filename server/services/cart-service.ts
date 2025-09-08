import { eq, and, sql, desc } from "drizzle-orm";
import { db } from "../db";
import WebSocketService from "./websocket-service";
import { 
  carts, 
  enhancedCartItems, 
  cartCoupons, 
  coupons,
  products,
  insertCartSchema,
  insertEnhancedCartItemSchema,
  insertCartCouponSchema
} from "../../shared/schema";
import { z } from "zod";

// Enhanced Cart Types
interface CartSummary {
  subtotal: string;
  tax: string;
  shipping: string;
  discount: string;
  total: string;
}

interface CartCustomization {
  engraving?: string;
  giftWrap?: boolean;
  giftMessage?: string;
  color?: string;
  size?: string;
  [key: string]: any;
}

interface EnhancedCartItem {
  id: string;
  cartId: string;
  productId: string;
  variantId?: string;
  quantity: number;
  price: string;
  discount: string;
  customization?: CartCustomization;
  addedAt: Date;
  savedForLater: boolean;
  product?: any;
}

interface CartWithDetails {
  id: string;
  userId?: string;
  sessionId?: string;
  items: EnhancedCartItem[];
  summary: CartSummary;
  coupons: Array<{
    id: string;
    code: string;
    discount: string;
    type: string;
    discountAmount: string;
  }>;
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    expiresAt?: Date;
    abandoned: boolean;
  };
  currency: string;
  notes?: string;
}

// Input validation schemas
const addToCartSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional(),
  quantity: z.number().int().positive().max(100),
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

export class EnhancedCartService {
  
  // Get or create cart for user/session
  async getOrCreateCart(userId?: string, sessionId?: string): Promise<string> {
    if (!userId && !sessionId) {
      throw new Error("Either userId or sessionId must be provided");
    }

    let existingCart;
    if (userId) {
      [existingCart] = await db
        .select()
        .from(carts)
        .where(eq(carts.userId, userId))
        .limit(1);
    } else if (sessionId) {
      [existingCart] = await db
        .select()
        .from(carts)
        .where(eq(carts.sessionId, sessionId!))
        .limit(1);
    }

    if (existingCart) {
      return existingCart.id;
    }

    // Create new cart
    const [newCart] = await db
      .insert(carts)
      .values({
        userId,
        sessionId,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      })
      .returning();

    return newCart.id;
  }

  // Get full cart with all details
  async getCart(userId?: string, sessionId?: string): Promise<CartWithDetails | null> {
    if (!userId && !sessionId) {
      throw new Error("Either userId or sessionId must be provided");
    }

    let cart;
    if (userId) {
      [cart] = await db
        .select()
        .from(carts)
        .where(eq(carts.userId, userId))
        .limit(1);
    } else if (sessionId) {
      [cart] = await db
        .select()
        .from(carts)
        .where(eq(carts.sessionId, sessionId!))
        .limit(1);
    }

    if (!cart) {
      return null;
    }

    // Get cart items with product details
    const items = await db
      .select({
        id: enhancedCartItems.id,
        cartId: enhancedCartItems.cartId,
        productId: enhancedCartItems.productId,
        variantId: enhancedCartItems.variantId,
        quantity: enhancedCartItems.quantity,
        price: enhancedCartItems.price,
        discount: enhancedCartItems.discount,
        customization: enhancedCartItems.customization,
        addedAt: enhancedCartItems.addedAt,
        savedForLater: enhancedCartItems.savedForLater,
        product: products
      })
      .from(enhancedCartItems)
      .leftJoin(products, eq(enhancedCartItems.productId, products.id))
      .where(eq(enhancedCartItems.cartId, cart.id));

    // Get applied coupons
    const appliedCoupons = await db
      .select({
        id: cartCoupons.id,
        code: coupons.code,
        discount: coupons.value,
        type: coupons.type,
        discountAmount: cartCoupons.discountAmount
      })
      .from(cartCoupons)
      .leftJoin(coupons, eq(cartCoupons.couponId, coupons.id))
      .where(eq(cartCoupons.cartId, cart.id));

    return {
      id: cart.id,
      userId: cart.userId || undefined,
      sessionId: cart.sessionId || undefined,
      items: items.map((item: any) => ({
        id: item.id,
        cartId: item.cartId,
        productId: item.productId,
        variantId: item.variantId || undefined,
        quantity: item.quantity,
        price: item.price,
        discount: item.discount,
        customization: item.customization as CartCustomization || undefined,
        addedAt: item.addedAt!,
        savedForLater: item.savedForLater,
        product: item.product
      })),
      summary: {
        subtotal: cart.subtotal,
        tax: cart.tax,
        shipping: cart.shipping,
        discount: cart.discount,
        total: cart.total
      },
      coupons: appliedCoupons,
      metadata: {
        createdAt: cart.createdAt!,
        updatedAt: cart.updatedAt!,
        expiresAt: cart.expiresAt || undefined,
        abandoned: cart.abandoned
      },
      currency: cart.currency,
      notes: cart.notes || undefined
    };
  }

  // Add item to cart
  async addToCart(
    userId: string | undefined, 
    sessionId: string | undefined, 
    data: z.infer<typeof addToCartSchema>
  ): Promise<EnhancedCartItem> {
    const validatedData = addToCartSchema.parse(data);
    const cartId = await this.getOrCreateCart(userId, sessionId);

    // Get product details for pricing
    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, validatedData.productId))
      .limit(1);

    if (!product) {
      throw new Error("Product not found");
    }

    const price = validatedData.price || product.price;

    // Check if item already exists in cart
    const [existingItem] = await db
      .select()
      .from(enhancedCartItems)
      .where(and(
        eq(enhancedCartItems.cartId, cartId),
        eq(enhancedCartItems.productId, validatedData.productId),
        validatedData.variantId ? eq(enhancedCartItems.variantId, validatedData.variantId) : sql`variant_id IS NULL`
      ))
      .limit(1);

    let cartItem;
    if (existingItem) {
      // Update quantity
      [cartItem] = await db
        .update(enhancedCartItems)
        .set({ 
          quantity: sql`${enhancedCartItems.quantity} + ${validatedData.quantity}`,
          updatedAt: new Date()
        })
        .where(eq(enhancedCartItems.id, existingItem.id))
        .returning();
    } else {
      // Add new item
      [cartItem] = await db
        .insert(enhancedCartItems)
        .values({
          cartId,
          productId: validatedData.productId,
          variantId: validatedData.variantId,
          quantity: validatedData.quantity,
          price,
          customization: validatedData.customization
        })
        .returning();
    }

    // Recalculate cart totals
    await this.recalculateCartTotals(cartId);

    // Emit WebSocket event for cart item added
    const websocketService = WebSocketService.getInstance();
    websocketService.emitCartItemAdded(userId, sessionId, cartItem);
    websocketService.emitCartUpdate(userId, sessionId);

    return {
      id: cartItem.id,
      cartId: cartItem.cartId,
      productId: cartItem.productId,
      variantId: cartItem.variantId || undefined,
      quantity: cartItem.quantity,
      price: cartItem.price,
      discount: cartItem.discount,
      customization: cartItem.customization as CartCustomization || undefined,
      addedAt: cartItem.addedAt!,
      savedForLater: cartItem.savedForLater
    };
  }

  // Update cart item
  async updateCartItem(
    itemId: string,
    data: z.infer<typeof updateCartItemSchema>
  ): Promise<EnhancedCartItem> {
    const validatedData = updateCartItemSchema.parse(data);

    const [cartItem] = await db
      .update(enhancedCartItems)
      .set({
        ...validatedData,
        updatedAt: new Date()
      })
      .where(eq(enhancedCartItems.id, itemId))
      .returning();

    if (!cartItem) {
      throw new Error("Cart item not found");
    }

    // Recalculate cart totals
    await this.recalculateCartTotals(cartItem.cartId);

    // Get cart info for WebSocket events
    const cart = await this.getCart(undefined, undefined);
    const websocketService = WebSocketService.getInstance();
    websocketService.emitCartItemUpdated(cart?.userId, cart?.sessionId, cartItem);
    websocketService.emitCartUpdate(cart?.userId, cart?.sessionId);

    return {
      id: cartItem.id,
      cartId: cartItem.cartId,
      productId: cartItem.productId,
      variantId: cartItem.variantId || undefined,
      quantity: cartItem.quantity,
      price: cartItem.price,
      discount: cartItem.discount,
      customization: cartItem.customization as CartCustomization || undefined,
      addedAt: cartItem.addedAt!,
      savedForLater: cartItem.savedForLater
    };
  }

  // Remove item from cart
  async removeFromCart(itemId: string): Promise<void> {
    const [cartItem] = await db
      .select()
      .from(enhancedCartItems)
      .where(eq(enhancedCartItems.id, itemId))
      .limit(1);

    if (!cartItem) {
      throw new Error("Cart item not found");
    }

    await db
      .delete(enhancedCartItems)
      .where(eq(enhancedCartItems.id, itemId));

    // Recalculate cart totals
    await this.recalculateCartTotals(cartItem.cartId);

    // Get cart info for WebSocket events
    const cart = await this.getCart(undefined, undefined);
    const websocketService = WebSocketService.getInstance();
    websocketService.emitCartItemRemoved(cart?.userId, cart?.sessionId, itemId);
    websocketService.emitCartUpdate(cart?.userId, cart?.sessionId);
  }

  // Clear entire cart
  async clearCart(userId?: string, sessionId?: string): Promise<void> {
    const cartId = await this.getOrCreateCart(userId, sessionId);

    await db
      .delete(enhancedCartItems)
      .where(eq(enhancedCartItems.cartId, cartId));

    await db
      .delete(cartCoupons)
      .where(eq(cartCoupons.cartId, cartId));

    // Reset cart totals
    await db
      .update(carts)
      .set({
        subtotal: "0",
        tax: "0",
        shipping: "0",
        discount: "0",
        total: "0",
        updatedAt: new Date()
      })
      .where(eq(carts.id, cartId));
  }

  // Apply coupon to cart
  async applyCoupon(
    userId: string | undefined,
    sessionId: string | undefined,
    data: z.infer<typeof applyCouponSchema>
  ): Promise<void> {
    const validatedData = applyCouponSchema.parse(data);
    const cartId = await this.getOrCreateCart(userId, sessionId);

    // Find coupon
    const [coupon] = await db
      .select()
      .from(coupons)
      .where(and(
        eq(coupons.code, validatedData.code),
        eq(coupons.active, true)
      ))
      .limit(1);

    if (!coupon) {
      throw new Error("Invalid coupon code");
    }

    // Check if coupon is already applied
    const [existingApplication] = await db
      .select()
      .from(cartCoupons)
      .where(and(
        eq(cartCoupons.cartId, cartId),
        eq(cartCoupons.couponId, coupon.id)
      ))
      .limit(1);

    if (existingApplication) {
      throw new Error("Coupon already applied");
    }

    // Validate coupon (dates, usage limits, etc.)
    if (coupon.startDate && new Date() < coupon.startDate) {
      throw new Error("Coupon not yet valid");
    }

    if (coupon.endDate && new Date() > coupon.endDate) {
      throw new Error("Coupon has expired");
    }

    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      throw new Error("Coupon usage limit exceeded");
    }

    // Calculate discount amount
    const cart = await this.getCart(userId, sessionId);
    if (!cart) {
      throw new Error("Cart not found");
    }

    let discountAmount = "0";
    const subtotal = parseFloat(cart.summary.subtotal);

    if (coupon.minOrderAmount && subtotal < parseFloat(coupon.minOrderAmount)) {
      throw new Error(`Minimum order amount of $${coupon.minOrderAmount} required`);
    }

    if (coupon.type === "percentage") {
      discountAmount = (subtotal * parseFloat(coupon.value) / 100).toFixed(2);
    } else if (coupon.type === "fixed") {
      discountAmount = Math.min(subtotal, parseFloat(coupon.value)).toFixed(2);
    }

    if (coupon.maxDiscount && parseFloat(discountAmount) > parseFloat(coupon.maxDiscount)) {
      discountAmount = coupon.maxDiscount;
    }

    // Apply coupon
    await db
      .insert(cartCoupons)
      .values({
        cartId,
        couponId: coupon.id,
        discountAmount
      });

    // Update coupon usage count
    await db
      .update(coupons)
      .set({ usedCount: sql`${coupons.usedCount} + 1` })
      .where(eq(coupons.id, coupon.id));

    // Recalculate cart totals
    await this.recalculateCartTotals(cartId);
  }

  // Remove coupon from cart
  async removeCoupon(cartCouponId: string): Promise<void> {
    const [cartCoupon] = await db
      .select()
      .from(cartCoupons)
      .where(eq(cartCoupons.id, cartCouponId))
      .limit(1);

    if (!cartCoupon) {
      throw new Error("Cart coupon not found");
    }

    await db
      .delete(cartCoupons)
      .where(eq(cartCoupons.id, cartCouponId));

    // Decrease coupon usage count
    await db
      .update(coupons)
      .set({ usedCount: sql`${coupons.usedCount} - 1` })
      .where(eq(coupons.id, cartCoupon.couponId));

    // Recalculate cart totals
    await this.recalculateCartTotals(cartCoupon.cartId);
  }

  // Merge guest cart with user cart on login
  async mergeCart(guestSessionId: string, userId: string): Promise<void> {
    const userCartId = await this.getOrCreateCart(userId);
    
    const [guestCart] = await db
      .select()
      .from(carts)
      .where(eq(carts.sessionId, guestSessionId))
      .limit(1);

    if (!guestCart) {
      return; // No guest cart to merge
    }

    // Move guest cart items to user cart
    await db
      .update(enhancedCartItems)
      .set({ cartId: userCartId })
      .where(eq(enhancedCartItems.cartId, guestCart.id));

    // Move guest cart coupons to user cart
    await db
      .update(cartCoupons)
      .set({ cartId: userCartId })
      .where(eq(cartCoupons.cartId, guestCart.id));

    // Delete guest cart
    await db
      .delete(carts)
      .where(eq(carts.id, guestCart.id));

    // Recalculate merged cart totals
    await this.recalculateCartTotals(userCartId);
  }

  // Validate cart (check product availability, pricing, etc.)
  async validateCart(userId?: string, sessionId?: string): Promise<{
    isValid: boolean;
    issues: Array<{
      itemId: string;
      issue: string;
      severity: 'warning' | 'error';
    }>;
  }> {
    const cart = await this.getCart(userId, sessionId);
    if (!cart) {
      return { isValid: true, issues: [] };
    }

    const issues: Array<{
      itemId: string;
      issue: string;
      severity: 'warning' | 'error';
    }> = [];

    for (const item of cart.items) {
      if (!item.product) {
        issues.push({
          itemId: item.id,
          issue: "Product no longer available",
          severity: 'error'
        });
        continue;
      }

      // Check stock
      if (item.product.stock < item.quantity) {
        issues.push({
          itemId: item.id,
          issue: `Only ${item.product.stock} items in stock`,
          severity: item.product.stock === 0 ? 'error' : 'warning'
        });
      }

      // Check price changes
      if (parseFloat(item.price) !== parseFloat(item.product.price)) {
        issues.push({
          itemId: item.id,
          issue: `Price changed from $${item.price} to $${item.product.price}`,
          severity: 'warning'
        });
      }
    }

    return {
      isValid: issues.filter(i => i.severity === 'error').length === 0,
      issues
    };
  }

  // Save items for later
  async saveForLater(itemIds: string[]): Promise<void> {
    await db
      .update(enhancedCartItems)
      .set({ 
        savedForLater: true,
        savedAt: new Date()
      })
      .where(sql`${enhancedCartItems.id} = ANY(${itemIds})`);
  }

  // Move saved items back to cart
  async moveToCart(itemIds: string[]): Promise<void> {
    await db
      .update(enhancedCartItems)
      .set({ 
        savedForLater: false,
        savedAt: null
      })
      .where(sql`${enhancedCartItems.id} = ANY(${itemIds})`);
  }

  // Private method to recalculate cart totals
  private async recalculateCartTotals(cartId: string): Promise<void> {
    // Get all active cart items (not saved for later)
    const items = await db
      .select()
      .from(enhancedCartItems)
      .where(and(
        eq(enhancedCartItems.cartId, cartId),
        eq(enhancedCartItems.savedForLater, false)
      ));

    // Calculate subtotal
    const subtotal = items.reduce((sum: number, item: any) => {
      return sum + (parseFloat(item.price) * item.quantity);
    }, 0);

    // Get applied coupons
    const appliedCoupons = await db
      .select()
      .from(cartCoupons)
      .where(eq(cartCoupons.cartId, cartId));

    const totalDiscount = appliedCoupons.reduce((sum: number, coupon: any) => {
      return sum + parseFloat(coupon.discountAmount);
    }, 0);

    // Calculate tax (8.5% for now - should be configurable)
    const taxRate = 0.085;
    const taxableAmount = subtotal - totalDiscount;
    const tax = Math.max(0, taxableAmount * taxRate);

    // Calculate shipping (free over $50 for now - should be configurable)
    const shipping = subtotal >= 50 ? 0 : 5.99;

    const total = subtotal + tax + shipping - totalDiscount;

    // Update cart totals
    await db
      .update(carts)
      .set({
        subtotal: subtotal.toFixed(2),
        tax: tax.toFixed(2),
        shipping: shipping.toFixed(2),
        discount: totalDiscount.toFixed(2),
        total: Math.max(0, total).toFixed(2),
        updatedAt: new Date()
      })
      .where(eq(carts.id, cartId));
  }
}

export const cartService = new EnhancedCartService();