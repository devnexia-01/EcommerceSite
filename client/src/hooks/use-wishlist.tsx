import { useState, useEffect } from 'react';
import { useToast } from './use-toast';
import { useAuth } from './use-auth';

interface Product {
  id: string;
  name: string;
  slug: string;
  price: string;
  comparePrice?: string | null;
  imageUrl: string | null;
  rating: string;
  reviewCount: number;
  stock: number;
}

interface WishlistItem {
  id: string;
  addedAt: string;
  notes?: string;
  product: Product;
}

interface Wishlist {
  id: string;
  name: string;
  description?: string;
  isDefault: boolean;
  isPublic: boolean;
  createdAt: string;
  itemCount?: number;
}

export function useWishlist() {
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [defaultWishlist, setDefaultWishlist] = useState<Wishlist | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInWishlist, setIsInWishlist] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const { user } = useAuth();

  // Get authorization headers
  const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_access_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    };
  };

  // Fetch default wishlist
  const fetchDefaultWishlist = async () => {
    if (!user) return;
    
    try {
      const response = await fetch('/api/wishlists/default', {
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const wishlist = await response.json();
        setDefaultWishlist(wishlist);
        return wishlist;
      }
    } catch (error) {
      console.error('Error fetching default wishlist:', error);
    }
    return null;
  };

  // Fetch wishlist items
  const fetchWishlistItems = async (wishlistId?: string) => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      let targetWishlistId = wishlistId;
      
      if (!targetWishlistId) {
        const wishlist = defaultWishlist || await fetchDefaultWishlist();
        if (!wishlist) return;
        targetWishlistId = wishlist.id;
      }

      const response = await fetch(`/api/wishlists/${targetWishlistId}/items`, {
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const items = await response.json();
        setWishlistItems(items);
        
        // Update isInWishlist status
        const statusMap: Record<string, boolean> = {};
        items.forEach((item: WishlistItem) => {
          statusMap[item.product.id] = true;
        });
        setIsInWishlist(statusMap);
      }
    } catch (error) {
      console.error('Error fetching wishlist items:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Check if product is in wishlist
  const checkWishlistStatus = async (productId: string) => {
    if (!user) return false;
    
    try {
      const response = await fetch(`/api/wishlists/default/items/product/${productId}`, {
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        setIsInWishlist(prev => ({ ...prev, [productId]: data.inWishlist }));
        return data.inWishlist;
      }
    } catch (error) {
      console.error('Error checking wishlist status:', error);
    }
    return false;
  };

  // Add product to wishlist
  const addToWishlist = async (productId: string, notes?: string) => {
    if (!user) {
      toast({
        title: "Please login",
        description: "You need to be logged in to add items to your wishlist",
        variant: "destructive"
      });
      return false;
    }

    try {
      const response = await fetch('/api/wishlists/default/items', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ productId, notes })
      });

      if (response.ok) {
        setIsInWishlist(prev => ({ ...prev, [productId]: true }));
        await fetchWishlistItems(); // Refresh the list
        
        toast({
          title: "Added to wishlist",
          description: "Product has been added to your wishlist",
        });
        return true;
      } else if (response.status === 409) {
        toast({
          title: "Already in wishlist",
          description: "This product is already in your wishlist",
          variant: "destructive"
        });
      } else {
        throw new Error('Failed to add to wishlist');
      }
    } catch (error) {
      console.error('Error adding to wishlist:', error);
      toast({
        title: "Error",
        description: "Failed to add product to wishlist",
        variant: "destructive"
      });
    }
    return false;
  };

  // Remove product from wishlist
  const removeFromWishlist = async (productId: string) => {
    if (!user) return false;

    try {
      const response = await fetch(`/api/wishlists/default/items/product/${productId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        setIsInWishlist(prev => ({ ...prev, [productId]: false }));
        setWishlistItems(prev => prev.filter(item => item.product.id !== productId));
        
        toast({
          title: "Removed from wishlist",
          description: "Product has been removed from your wishlist",
        });
        return true;
      } else {
        throw new Error('Failed to remove from wishlist');
      }
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      toast({
        title: "Error",
        description: "Failed to remove product from wishlist",
        variant: "destructive"
      });
    }
    return false;
  };

  // Toggle wishlist status
  const toggleWishlist = async (productId: string) => {
    const inWishlist = isInWishlist[productId];
    
    if (inWishlist) {
      return await removeFromWishlist(productId);
    } else {
      return await addToWishlist(productId);
    }
  };

  // Initialize wishlist data when user logs in
  useEffect(() => {
    if (user) {
      fetchDefaultWishlist().then((wishlist) => {
        if (wishlist) {
          fetchWishlistItems(wishlist.id);
        }
      });
    } else {
      // Clear data when user logs out
      setWishlistItems([]);
      setDefaultWishlist(null);
      setIsInWishlist({});
    }
  }, [user]);

  return {
    wishlistItems,
    defaultWishlist,
    isLoading,
    isInWishlist,
    addToWishlist,
    removeFromWishlist,
    toggleWishlist,
    checkWishlistStatus,
    fetchWishlistItems,
    fetchDefaultWishlist
  };
}