import { createContext, useContext, useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "./use-auth";
import { useToast } from "./use-toast";
import { io, Socket } from "socket.io-client";

// Enhanced Cart Types
interface Product {
  id: string;
  name: string;
  price: string;
  imageUrl: string | null;
  stock: number;
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
  product: Product;
}

interface CartSummary {
  subtotal: string;
  tax: string;
  shipping: string;
  discount: string;
  total: string;
}

interface CartCoupon {
  id: string;
  code: string;
  discount: string;
  type: string;
  discountAmount: string;
}

interface CartValidation {
  isValid: boolean;
  issues: Array<{
    itemId: string;
    issue: string;
    severity: 'warning' | 'error';
  }>;
}

interface EnhancedCart {
  id: string | null;
  userId?: string;
  sessionId?: string;
  items: EnhancedCartItem[];
  summary: CartSummary;
  coupons: CartCoupon[];
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    expiresAt?: Date;
    abandoned: boolean;
  };
  currency: string;
  notes?: string;
}

interface EnhancedCartContextType {
  cart: EnhancedCart | null;
  isLoading: boolean;
  
  // Basic cart operations
  addToCart: (productId: string, options?: {
    quantity?: number;
    variantId?: string;
    price?: string;
    customization?: CartCustomization;
  }) => Promise<void>;
  updateCartItem: (itemId: string, updates: {
    quantity?: number;
    customization?: CartCustomization;
    savedForLater?: boolean;
  }) => Promise<void>;
  removeFromCart: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  
  // Enhanced features
  applyCoupon: (code: string) => Promise<void>;
  removeCoupon: (couponId: string) => Promise<void>;
  saveForLater: (itemIds: string[]) => Promise<void>;
  moveToCart: (itemIds: string[]) => Promise<void>;
  validateCart: () => Promise<CartValidation>;
  
  // Computed values
  totalItems: number;
  totalPrice: number;
  cartValidation: CartValidation | null;
  
  // Real-time status
  isConnected: boolean;
}

const EnhancedCartContext = createContext<EnhancedCartContextType | undefined>(undefined);

export function EnhancedCartProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [cartValidation, setCartValidation] = useState<CartValidation | null>(null);
  
  // Session ID for guest carts
  const [sessionId] = useState(() => {
    if (typeof window !== 'undefined') {
      let id = localStorage.getItem('cart-session-id');
      if (!id) {
        id = 'session-' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('cart-session-id', id);
      }
      return id;
    }
    return null;
  });

  // Get cart data
  const { data: cart = null, isLoading } = useQuery({
    queryKey: ["/api/v1/cart"],
    queryFn: () => apiRequest("GET", "/api/v1/cart") as Promise<EnhancedCart>,
    enabled: isAuthenticated || !!sessionId,
    refetchOnWindowFocus: false
  });

  // Initialize WebSocket connection
  useEffect(() => {
    if (!isAuthenticated && !sessionId) return;
    
    const newSocket = io(window.location.origin, {
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      // Join cart room for real-time updates
      newSocket.emit('join-cart-room', {
        userId: user?.id,
        sessionId: sessionId
      });
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Cart event listeners
    newSocket.on('cart-updated', () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/cart"] });
    });

    newSocket.on('cart-item-added', () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/cart"] });
    });

    newSocket.on('cart-item-updated', () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/cart"] });
    });

    newSocket.on('cart-item-removed', () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/cart"] });
    });

    newSocket.on('cart-cleared', () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/cart"] });
    });

    newSocket.on('coupon-applied', (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/cart"] });
      toast({
        title: "Coupon Applied",
        description: `Coupon "${data.coupon?.code}" applied successfully!`
      });
    });

    newSocket.on('coupon-removed', () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/cart"] });
    });

    newSocket.on('cart-validation', (data) => {
      setCartValidation(data.validation);
      if (data.validation && !data.validation.isValid) {
        toast({
          title: "Cart Issues Found",
          description: "Some items in your cart need attention",
          variant: "destructive"
        });
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [isAuthenticated, user?.id, sessionId, queryClient, toast]);

  // Mutations
  const addToCartMutation = useMutation({
    mutationFn: ({ productId, options = {} }: {
      productId: string;
      options?: {
        quantity?: number;
        variantId?: string;
        price?: string;
        customization?: CartCustomization;
      };
    }) => apiRequest("POST", "/api/v1/cart/items", {
      productId,
      quantity: options.quantity || 1,
      variantId: options.variantId,
      price: options.price,
      customization: options.customization
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/cart"] });
      toast({
        title: "Success",
        description: "Item added to cart"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add item to cart",
        variant: "destructive"
      });
    }
  });

  const updateCartItemMutation = useMutation({
    mutationFn: ({ itemId, updates }: {
      itemId: string;
      updates: {
        quantity?: number;
        customization?: CartCustomization;
        savedForLater?: boolean;
      };
    }) => apiRequest("PUT", `/api/v1/cart/items/${itemId}`, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/cart"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update cart item",
        variant: "destructive"
      });
    }
  });

  const removeFromCartMutation = useMutation({
    mutationFn: (itemId: string) => apiRequest("DELETE", `/api/v1/cart/items/${itemId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/cart"] });
      toast({
        title: "Success",
        description: "Item removed from cart"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove item",
        variant: "destructive"
      });
    }
  });

  const clearCartMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/v1/cart/clear"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/cart"] });
      toast({
        title: "Success",
        description: "Cart cleared"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to clear cart",
        variant: "destructive"
      });
    }
  });

  const applyCouponMutation = useMutation({
    mutationFn: (code: string) => apiRequest("POST", "/api/v1/cart/coupons", { code }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/cart"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to apply coupon",
        variant: "destructive"
      });
    }
  });

  const removeCouponMutation = useMutation({
    mutationFn: (couponId: string) => apiRequest("DELETE", `/api/v1/cart/coupons/${couponId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/cart"] });
      toast({
        title: "Success",
        description: "Coupon removed"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove coupon",
        variant: "destructive"
      });
    }
  });

  const saveForLaterMutation = useMutation({
    mutationFn: (itemIds: string[]) => apiRequest("POST", "/api/v1/cart/save-for-later", { itemIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/cart"] });
      toast({
        title: "Success",
        description: "Items saved for later"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save items for later",
        variant: "destructive"
      });
    }
  });

  const moveToCartMutation = useMutation({
    mutationFn: (itemIds: string[]) => apiRequest("POST", "/api/v1/cart/move-to-cart", { itemIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/cart"] });
      toast({
        title: "Success",
        description: "Items moved to cart"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to move items to cart",
        variant: "destructive"
      });
    }
  });

  // Validation
  const validateCart = async (): Promise<CartValidation> => {
    try {
      const response = await apiRequest("GET", "/api/v1/cart/validate") as any;
      setCartValidation(response.validation);
      return response.validation;
    } catch (error) {
      console.error("Cart validation failed:", error);
      return { isValid: true, issues: [] };
    }
  };

  // Computed values
  const totalItems = cart?.items?.filter((item: any) => !item.savedForLater)
    .reduce((sum: number, item: any) => sum + item.quantity, 0) || 0;

  const totalPrice = cart?.summary ? parseFloat(cart.summary.total) : 0;

  const value: EnhancedCartContextType = {
    cart,
    isLoading,
    addToCart: (productId: string, options = {}) => addToCartMutation.mutateAsync({ productId, options }),
    updateCartItem: (itemId: string, updates: any) => updateCartItemMutation.mutateAsync({ itemId, updates }),
    removeFromCart: (itemId: string) => removeFromCartMutation.mutateAsync(itemId),
    clearCart: () => clearCartMutation.mutateAsync(),
    applyCoupon: (code: string) => applyCouponMutation.mutateAsync(code),
    removeCoupon: (couponId: string) => removeCouponMutation.mutateAsync(couponId),
    saveForLater: (itemIds: string[]) => saveForLaterMutation.mutateAsync(itemIds),
    moveToCart: (itemIds: string[]) => moveToCartMutation.mutateAsync(itemIds),
    validateCart,
    totalItems,
    totalPrice,
    cartValidation,
    isConnected
  };

  return (
    <EnhancedCartContext.Provider value={value}>
      {children}
    </EnhancedCartContext.Provider>
  );
}

export function useEnhancedCart() {
  const context = useContext(EnhancedCartContext);
  if (context === undefined) {
    throw new Error("useEnhancedCart must be used within an EnhancedCartProvider");
  }
  return context;
}

// Legacy compatibility - update existing useCart hook to use enhanced version
export function useCart() {
  const context = useContext(EnhancedCartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider or EnhancedCartProvider");
  }
  
  // Map enhanced cart to legacy interface for backward compatibility
  const legacyItems = context.cart?.items?.filter((item: any) => !item.savedForLater).map((item: any) => ({
    id: item.id,
    userId: context.cart?.userId || '',
    productId: item.productId,
    quantity: item.quantity,
    product: item.product
  })) || [];

  return {
    items: legacyItems,
    isLoading: context.isLoading,
    addToCart: (productId: string, quantity = 1) => 
      context.addToCart(productId, { quantity }),
    updateQuantity: (itemId: string, quantity: number) => 
      context.updateCartItem(itemId, { quantity }),
    removeItem: context.removeFromCart,
    clearCart: context.clearCart,
    totalItems: context.totalItems,
    totalPrice: context.totalPrice
  };
}