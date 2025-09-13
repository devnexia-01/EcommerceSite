import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './use-auth';
import { useToast } from './use-toast';
import { io, Socket } from 'socket.io-client';

interface CartItem {
  id: string;
  cartId: string;
  productId: string;
  quantity: number;
  price: string;
  addedAt: Date;
  product: {
    id: string;
    name: string;
    slug: string;
    price: string;
    imageUrl: string;
    stock: number;
  };
}

interface Cart {
  id: string;
  userId?: string;
  sessionId?: string;
  items: CartItem[];
  subtotal: string;
  tax: string;
  shipping: string;
  total: string;
}

interface UseCartReturn {
  cart: Cart | null;
  items: CartItem[];
  itemCount: number;
  totalPrice: number;
  isLoading: boolean;
  addToCart: (productId: string, quantity?: number) => Promise<boolean>;
  updateQuantity: (itemId: string, quantity: number) => Promise<boolean>;
  removeItem: (itemId: string) => Promise<boolean>;
  clearCart: () => Promise<boolean>;
  refreshCart: () => Promise<void>;
}

let socket: Socket | null = null;

// Create Cart Context
const CartContext = createContext<UseCartReturn | undefined>(undefined);

// Cart Provider Component
export function EnhancedCartProvider({ children }: { children: React.ReactNode }) {
  const cartValue = useCartLogic();
  return (
    <CartContext.Provider value={cartValue}>
      {children}
    </CartContext.Provider>
  );
}

// Hook to use cart context
export function useCart(): UseCartReturn {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within an EnhancedCartProvider');
  }
  return context;
}

// Main cart logic
function useCartLogic(): UseCartReturn {
  const [cart, setCart] = useState<Cart | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Generate unique session ID for each browser session
  const generateSessionId = () => {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  // Get session ID (unique per user/session to avoid cart contamination)
  const getSessionId = useCallback(() => {
    if (user?.id) {
      // For logged users, use user ID as session
      return `user-${user.id}`;
    }
    
    // For non-logged users, generate/retrieve unique session ID
    if (typeof window !== 'undefined') {
      let sessionId = localStorage.getItem('cart-session-id');
      if (!sessionId) {
        sessionId = generateSessionId();
        localStorage.setItem('cart-session-id', sessionId);
      }
      return sessionId;
    }
    
    return generateSessionId();
  }, [user?.id]);

  // Initialize WebSocket connection
  useEffect(() => {
    if (!socket) {
      socket = io();
      
      socket.on('connect', () => {
        console.log('Connected to WebSocket server');
        // Join cart room for real-time updates
        const sessionId = getSessionId();
        if (socket) {
          socket.emit('join-cart-room', { 
            userId: user?.id,
            sessionId: sessionId 
          });
        }
      });

      socket.on('cart-item-added', (data) => {
        console.log('Cart item added:', data);
        refreshCart();
      });

      socket.on('cart-item-updated', (data) => {
        console.log('Cart item updated:', data);
        refreshCart();
      });

      socket.on('cart-item-removed', (data) => {
        console.log('Cart item removed:', data);
        refreshCart();
      });

      socket.on('cart-updated', (data) => {
        console.log('Cart updated:', data);
        refreshCart();
      });
    }

    return () => {
      if (socket) {
        socket.disconnect();
        socket = null;
      }
    };
  }, [user, getSessionId]);

  // Get authorization headers
  const getAuthHeaders = () => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Always add session ID for consistency
    const sessionId = getSessionId();
    headers['x-session-id'] = sessionId;
    console.log('Frontend sending session ID:', sessionId, 'Headers:', headers); // Debug log

    return headers;
  };

  // Fetch cart data
  const refreshCart = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/cart', {
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const cartData = await response.json();
        setCart(cartData);
      }
    } catch (error) {
      console.error('Error fetching cart:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, getSessionId]);

  // Load cart on mount and when user changes
  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  // Add item to cart
  const addToCart = async (productId: string, quantity: number = 1): Promise<boolean> => {
    try {
      const response = await fetch('/api/v1/cart/items', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ productId, quantity })
      });

      if (response.ok) {
        toast({
          title: "Added to cart",
          description: "Item has been added to your cart",
        });
        // Refresh cart immediately after adding item
        await refreshCart();
        return true;
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.error || "Failed to add item to cart",
          variant: "destructive"
        });
        return false;
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast({
        title: "Error",
        description: "Failed to add item to cart",
        variant: "destructive"
      });
      return false;
    }
  };

  // Update item quantity
  const updateQuantity = async (itemId: string, quantity: number): Promise<boolean> => {
    try {
      // Optimistically update the cart UI
      if (cart && cart.items) {
        const updatedItems = cart.items.map(item => 
          item.id === itemId ? { ...item, quantity } : item
        );
        setCart({
          ...cart,
          items: updatedItems
        });
      }

      const response = await fetch(`/api/v1/cart/items/${itemId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ quantity })
      });

      if (response.ok) {
        // Refresh cart to get accurate data from server
        await refreshCart();
        return true;
      } else {
        const errorData = await response.json();
        // Revert optimistic update on error
        await refreshCart();
        toast({
          title: "Error",
          description: errorData.error || "Failed to update quantity",
          variant: "destructive"
        });
        return false;
      }
    } catch (error) {
      console.error('Error updating quantity:', error);
      // Revert optimistic update on error
      await refreshCart();
      toast({
        title: "Error",
        description: "Failed to update quantity",
        variant: "destructive"
      });
      return false;
    }
  };

  // Remove item from cart
  const removeItem = async (itemId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/v1/cart/items/${itemId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        toast({
          title: "Removed from cart",
          description: "Item has been removed from your cart",
        });
        return true;
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.error || "Failed to remove item",
          variant: "destructive"
        });
        return false;
      }
    } catch (error) {
      console.error('Error removing item:', error);
      toast({
        title: "Error",
        description: "Failed to remove item",
        variant: "destructive"
      });
      return false;
    }
  };

  // Clear entire cart
  const clearCart = async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/v1/cart', {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        toast({
          title: "Cart cleared",
          description: "All items have been removed from your cart",
        });
        return true;
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.error || "Failed to clear cart",
          variant: "destructive"
        });
        return false;
      }
    } catch (error) {
      console.error('Error clearing cart:', error);
      toast({
        title: "Error",
        description: "Failed to clear cart",
        variant: "destructive"
      });
      return false;
    }
  };

  const items = cart?.items || [];
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = parseFloat(cart?.subtotal || '0');

  return {
    cart,
    items,
    itemCount,
    totalPrice,
    isLoading,
    addToCart,
    updateQuantity,
    removeItem,
    clearCart,
    refreshCart
  };
}