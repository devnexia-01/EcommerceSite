import { nanoid } from "nanoid";
import WebSocketService from "./websocket-service";
import { Cart as CartModel, CartItem as CartItemModel, Product } from "../models";

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
      cart = await CartModel.findOne({ userId }).exec();
    } else if (sessionId) {
      cart = await CartModel.findOne({ sessionId }).exec();
    }

    if (!cart) {
      const cartId = nanoid();
      cart = await CartModel.create({
        _id: cartId,
        userId: userId || undefined,
        sessionId: sessionId || undefined,
        subtotal: 0,
        tax: 0,
        shipping: 0,
        discount: 0,
        total: 0,
        currency: "USD"
      });
    }

    return cart._id;
  }

  // Get cart with items
  async getCart(userId?: string, sessionId?: string): Promise<Cart | null> {
    if (!userId && !sessionId) {
      throw new Error("Either userId or sessionId must be provided");
    }

    let cart;
    if (userId) {
      cart = await CartModel.findOne({ userId }).exec();
    } else if (sessionId) {
      cart = await CartModel.findOne({ sessionId }).exec();
    }

    if (!cart) {
      return null;
    }

    // Get cart items with product details
    const items = await CartItemModel.find({
      cartId: cart._id,
      savedForLater: false
    }).exec();

    // Populate product details for each item
    const itemsWithProducts = await Promise.all(
      items.map(async (item) => {
        const product = await Product.findById(item.productId).exec();
        return {
          id: item._id,
          cartId: item.cartId,
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          addedAt: item.addedAt || new Date(),
          product: product
        };
      })
    );

    return {
      id: cart._id,
      userId: cart.userId || undefined,
      sessionId: cart.sessionId || undefined,
      items: itemsWithProducts,
      subtotal: cart.subtotal.toString(),
      tax: cart.tax.toString(),
      shipping: cart.shipping.toString(),
      total: cart.total.toString()
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
    const existingItem = await CartItemModel.findOne({
      cartId,
      productId,
      savedForLater: false
    }).exec();

    let cartItem;
    if (existingItem) {
      // Update quantity
      existingItem.quantity += quantity;
      existingItem.updatedAt = new Date();
      cartItem = await existingItem.save();
    } else {
      // Get product price
      const product = await Product.findById(productId).exec();

      if (!product) {
        throw new Error("Product not found");
      }

      // Add new item
      const itemId = nanoid();
      cartItem = await CartItemModel.create({
        _id: itemId,
        cartId,
        productId,
        quantity,
        price: product.price,
        discount: 0,
        savedForLater: false,
        addedAt: new Date()
      });
    }

    // Recalculate cart totals
    await this.recalculateCartTotals(cartId);

    // Get the item with product details
    const product = await Product.findById(cartItem.productId).exec();
    const itemWithProduct = {
      id: cartItem._id,
      cartId: cartItem.cartId,
      productId: cartItem.productId,
      quantity: cartItem.quantity,
      price: cartItem.price,
      addedAt: cartItem.addedAt || new Date(),
      product: product
    };

    // Emit WebSocket events
    const websocketService = WebSocketService.getInstance();
    websocketService.emitCartItemAdded(userId, sessionId, itemWithProduct);
    websocketService.emitCartUpdate(userId, sessionId);

    return itemWithProduct;
  }

  // Update cart item quantity
  async updateCartItemQuantity(itemId: string, quantity: number): Promise<void> {
    if (quantity <= 0) {
      await this.removeFromCart(itemId);
      return;
    }

    const cartItem = await CartItemModel.findById(itemId).exec();

    if (!cartItem) {
      throw new Error("Cart item not found");
    }

    cartItem.quantity = quantity;
    cartItem.updatedAt = new Date();
    await cartItem.save();

    // Get cart info for WebSocket events
    const cart = await CartModel.findById(cartItem.cartId).exec();

    // Recalculate cart totals
    await this.recalculateCartTotals(cartItem.cartId);

    // Emit WebSocket events
    const websocketService = WebSocketService.getInstance();
    websocketService.emitCartItemUpdated(cart?.userId || undefined, cart?.sessionId || undefined, cartItem);
    websocketService.emitCartUpdate(cart?.userId || undefined, cart?.sessionId || undefined);
  }

  // Remove item from cart
  async removeFromCart(itemId: string): Promise<void> {
    const cartItem = await CartItemModel.findById(itemId).exec();

    if (!cartItem) {
      throw new Error("Cart item not found");
    }

    // Get cart info before deletion
    const cart = await CartModel.findById(cartItem.cartId).exec();

    await CartItemModel.findByIdAndDelete(itemId).exec();

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

    await CartItemModel.deleteMany({ cartId }).exec();

    // Reset cart totals
    await CartModel.findByIdAndUpdate(cartId, {
      subtotal: 0,
      tax: 0,
      shipping: 0,
      total: 0,
      updatedAt: new Date()
    }).exec();

    // Emit WebSocket events
    const websocketService = WebSocketService.getInstance();
    websocketService.emitCartUpdate(userId, sessionId);
  }

  // Recalculate cart totals
  private async recalculateCartTotals(cartId: string): Promise<void> {
    // Get all cart items
    const items = await CartItemModel.find({
      cartId,
      savedForLater: false
    }).exec();

    // Calculate subtotal
    const subtotal = items.reduce((sum, item) => {
      return sum + (item.price * item.quantity);
    }, 0);

    // Calculate tax (8.5% for now)
    const taxRate = 0.085;
    const tax = subtotal * taxRate;

    // Calculate shipping (free over $50)
    const shipping = subtotal >= 50 ? 0 : 5.99;

    const total = subtotal + tax + shipping;

    // Update cart totals
    await CartModel.findByIdAndUpdate(cartId, {
      subtotal: parseFloat(subtotal.toFixed(2)),
      tax: parseFloat(tax.toFixed(2)),
      shipping: parseFloat(shipping.toFixed(2)),
      total: parseFloat(total.toFixed(2)),
      updatedAt: new Date()
    }).exec();
  }
}

export const cartService = new CartService();
