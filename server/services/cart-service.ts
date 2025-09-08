import { eq, and } from "drizzle-orm";
import { db } from "../db";
import WebSocketService from "./websocket-service";
import { 
  carts, 
  enhancedCartItems, 
  products
} from "../../shared/schema";

export interface CartItem {
  id: string;
  cartId: string;
  productId: string;
  quantity: number;
  price: string;
  addedAt: Date;
  product: any;
}

export interface Cart {
  id: string;
  userId?: string;
  sessionId?: string;
  items: CartItem[];
  subtotal: string;
  tax: string;
  shipping: string;
  total: string;
}

export class CartService {
  
  // Get or create cart for user/session
  async getOrCreateCart(userId?: string, sessionId?: string): Promise<string> {
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
        .where(eq(carts.sessionId, sessionId))
        .limit(1);
    }

    if (!cart) {
      [cart] = await db
        .insert(carts)
        .values({
          userId: userId || null,
          sessionId: sessionId || null,
          subtotal: "0",
          tax: "0",
          shipping: "0",
          total: "0",
          currency: "USD"
        })
        .returning();
    }

    return cart.id;
  }

  // Get cart with items
  async getCart(userId?: string, sessionId?: string): Promise<Cart | null> {
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
        .where(eq(carts.sessionId, sessionId))
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
        quantity: enhancedCartItems.quantity,
        price: enhancedCartItems.price,
        addedAt: enhancedCartItems.addedAt,
        product: products
      })
      .from(enhancedCartItems)
      .leftJoin(products, eq(enhancedCartItems.productId, products.id))
      .where(and(eq(enhancedCartItems.cartId, cart.id), eq(enhancedCartItems.savedForLater, false)));

    return {
      id: cart.id,
      userId: cart.userId || undefined,
      sessionId: cart.sessionId || undefined,
      items: items.map((item: any) => ({
        id: item.id,
        cartId: item.cartId,
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
        addedAt: item.addedAt!,
        product: item.product
      })),
      subtotal: cart.subtotal!,
      tax: cart.tax!,
      shipping: cart.shipping!,
      total: cart.total!
    };
  }

  // Add item to cart
  async addToCart(
    userId: string | undefined,
    sessionId: string | undefined,
    productId: string,
    quantity: number = 1
  ): Promise<CartItem> {
    const cartId = await this.getOrCreateCart(userId, sessionId);

    // Check if item already exists in cart
    const [existingItem] = await db
      .select()
      .from(enhancedCartItems)
      .where(and(
        eq(enhancedCartItems.cartId, cartId),
        eq(enhancedCartItems.productId, productId),
        eq(enhancedCartItems.savedForLater, false)
      ))
      .limit(1);

    let cartItem;
    if (existingItem) {
      // Update quantity
      [cartItem] = await db
        .update(enhancedCartItems)
        .set({
          quantity: existingItem.quantity + quantity,
          updatedAt: new Date()
        })
        .where(eq(enhancedCartItems.id, existingItem.id))
        .returning();
    } else {
      // Get product price
      const [product] = await db
        .select()
        .from(products)
        .where(eq(products.id, productId))
        .limit(1);

      if (!product) {
        throw new Error("Product not found");
      }

      // Add new item
      [cartItem] = await db
        .insert(enhancedCartItems)
        .values({
          cartId,
          productId,
          quantity,
          price: product.price,
          discount: "0",
          savedForLater: false
        })
        .returning();
    }

    // Recalculate cart totals
    await this.recalculateCartTotals(cartId);

    // Get the item with product details
    const [itemWithProduct] = await db
      .select({
        id: enhancedCartItems.id,
        cartId: enhancedCartItems.cartId,
        productId: enhancedCartItems.productId,
        quantity: enhancedCartItems.quantity,
        price: enhancedCartItems.price,
        addedAt: enhancedCartItems.addedAt,
        product: products
      })
      .from(enhancedCartItems)
      .leftJoin(products, eq(enhancedCartItems.productId, products.id))
      .where(eq(enhancedCartItems.id, cartItem.id))
      .limit(1);

    // Emit WebSocket events
    const websocketService = WebSocketService.getInstance();
    websocketService.emitCartItemAdded(userId, sessionId, itemWithProduct);
    websocketService.emitCartUpdate(userId, sessionId);

    return {
      id: itemWithProduct.id,
      cartId: itemWithProduct.cartId,
      productId: itemWithProduct.productId,
      quantity: itemWithProduct.quantity,
      price: itemWithProduct.price,
      addedAt: itemWithProduct.addedAt!,
      product: itemWithProduct.product
    };
  }

  // Update cart item quantity
  async updateCartItemQuantity(itemId: string, quantity: number): Promise<void> {
    if (quantity <= 0) {
      await this.removeFromCart(itemId);
      return;
    }

    const [cartItem] = await db
      .update(enhancedCartItems)
      .set({
        quantity,
        updatedAt: new Date()
      })
      .where(eq(enhancedCartItems.id, itemId))
      .returning();

    if (!cartItem) {
      throw new Error("Cart item not found");
    }

    // Get cart info for WebSocket events
    const [cart] = await db
      .select()
      .from(carts)
      .where(eq(carts.id, cartItem.cartId))
      .limit(1);

    // Recalculate cart totals
    await this.recalculateCartTotals(cartItem.cartId);

    // Emit WebSocket events
    const websocketService = WebSocketService.getInstance();
    websocketService.emitCartItemUpdated(cart?.userId || undefined, cart?.sessionId || undefined, cartItem);
    websocketService.emitCartUpdate(cart?.userId || undefined, cart?.sessionId || undefined);
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

    // Get cart info before deletion
    const [cart] = await db
      .select()
      .from(carts)
      .where(eq(carts.id, cartItem.cartId))
      .limit(1);

    await db
      .delete(enhancedCartItems)
      .where(eq(enhancedCartItems.id, itemId));

    // Recalculate cart totals
    await this.recalculateCartTotals(cartItem.cartId);

    // Emit WebSocket events
    const websocketService = WebSocketService.getInstance();
    websocketService.emitCartItemRemoved(cart?.userId || undefined, cart?.sessionId || undefined, itemId);
    websocketService.emitCartUpdate(cart?.userId || undefined, cart?.sessionId || undefined);
  }

  // Clear entire cart
  async clearCart(userId?: string, sessionId?: string): Promise<void> {
    const cartId = await this.getOrCreateCart(userId, sessionId);

    await db
      .delete(enhancedCartItems)
      .where(eq(enhancedCartItems.cartId, cartId));

    // Reset cart totals
    await db
      .update(carts)
      .set({
        subtotal: "0",
        tax: "0",
        shipping: "0",
        total: "0",
        updatedAt: new Date()
      })
      .where(eq(carts.id, cartId));

    // Emit WebSocket events
    const websocketService = WebSocketService.getInstance();
    websocketService.emitCartUpdate(userId, sessionId);
  }

  // Recalculate cart totals
  private async recalculateCartTotals(cartId: string): Promise<void> {
    // Get all cart items
    const items = await db
      .select()
      .from(enhancedCartItems)
      .where(and(
        eq(enhancedCartItems.cartId, cartId),
        eq(enhancedCartItems.savedForLater, false)
      ));

    // Calculate subtotal
    const subtotal = items.reduce((sum, item) => {
      return sum + (parseFloat(item.price) * item.quantity);
    }, 0);

    // Calculate tax (8.5% for now)
    const taxRate = 0.085;
    const tax = subtotal * taxRate;

    // Calculate shipping (free over $50)
    const shipping = subtotal >= 50 ? 0 : 5.99;

    const total = subtotal + tax + shipping;

    // Update cart totals
    await db
      .update(carts)
      .set({
        subtotal: subtotal.toFixed(2),
        tax: tax.toFixed(2),
        shipping: shipping.toFixed(2),
        total: total.toFixed(2),
        updatedAt: new Date()
      })
      .where(eq(carts.id, cartId));
  }
}

export const cartService = new CartService();