import { Router } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db } from "./db";
import { wishlists, wishlistItems, products } from "@shared/schema";
import { authenticateToken } from "./auth-routes.js";

const router = Router();

// Get user's wishlists
router.get("/", authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;
    
    const userWishlists = await db
      .select({
        id: wishlists.id,
        name: wishlists.name,
        description: wishlists.description,
        isDefault: wishlists.isDefault,
        isPublic: wishlists.isPublic,
        createdAt: wishlists.createdAt,
        itemCount: db.select({ count: "*" }).from(wishlistItems).where(eq(wishlistItems.wishlistId, wishlists.id))
      })
      .from(wishlists)
      .where(eq(wishlists.userId, userId))
      .orderBy(desc(wishlists.isDefault), desc(wishlists.createdAt));

    res.json(userWishlists);
  } catch (error) {
    console.error("Error fetching wishlists:", error);
    res.status(500).json({ error: "Failed to fetch wishlists" });
  }
});

// Get default wishlist for user
router.get("/default", authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;
    
    let defaultWishlist = await db
      .select()
      .from(wishlists)
      .where(and(eq(wishlists.userId, userId), eq(wishlists.isDefault, true)))
      .limit(1);

    // Create default wishlist if it doesn't exist
    if (defaultWishlist.length === 0) {
      const [newWishlist] = await db
        .insert(wishlists)
        .values({
          userId,
          name: "My Wishlist",
          isDefault: true
        })
        .returning();
      
      defaultWishlist = [newWishlist];
    }

    res.json(defaultWishlist[0]);
  } catch (error) {
    console.error("Error fetching default wishlist:", error);
    res.status(500).json({ error: "Failed to fetch default wishlist" });
  }
});

// Get wishlist items
router.get("/:wishlistId/items", authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { wishlistId } = req.params;
    
    // Verify wishlist belongs to user
    const wishlist = await db
      .select()
      .from(wishlists)
      .where(and(eq(wishlists.id, wishlistId), eq(wishlists.userId, userId)))
      .limit(1);

    if (wishlist.length === 0) {
      return res.status(404).json({ error: "Wishlist not found" });
    }

    const items = await db
      .select({
        id: wishlistItems.id,
        addedAt: wishlistItems.addedAt,
        notes: wishlistItems.notes,
        product: {
          id: products.id,
          name: products.name,
          slug: products.slug,
          price: products.price,
          comparePrice: products.comparePrice,
          imageUrl: products.imageUrl,
          rating: products.rating,
          reviewCount: products.reviewCount,
          stock: products.stock
        }
      })
      .from(wishlistItems)
      .innerJoin(products, eq(wishlistItems.productId, products.id))
      .where(eq(wishlistItems.wishlistId, wishlistId))
      .orderBy(desc(wishlistItems.addedAt));

    res.json(items);
  } catch (error) {
    console.error("Error fetching wishlist items:", error);
    res.status(500).json({ error: "Failed to fetch wishlist items" });
  }
});

// Add item to wishlist
router.post("/:wishlistId/items", authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { wishlistId } = req.params;
    const { productId, notes } = req.body;

    if (!productId) {
      return res.status(400).json({ error: "Product ID is required" });
    }

    // Verify wishlist belongs to user
    const wishlist = await db
      .select()
      .from(wishlists)
      .where(and(eq(wishlists.id, wishlistId), eq(wishlists.userId, userId)))
      .limit(1);

    if (wishlist.length === 0) {
      return res.status(404).json({ error: "Wishlist not found" });
    }

    // Verify product exists
    const product = await db
      .select()
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    if (product.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Check if item already exists in wishlist
    const existingItem = await db
      .select()
      .from(wishlistItems)
      .where(and(eq(wishlistItems.wishlistId, wishlistId), eq(wishlistItems.productId, productId)))
      .limit(1);

    if (existingItem.length > 0) {
      return res.status(409).json({ error: "Product already in wishlist" });
    }

    // Add item to wishlist
    const [newItem] = await db
      .insert(wishlistItems)
      .values({
        wishlistId,
        productId,
        notes
      })
      .returning();

    res.status(201).json(newItem);
  } catch (error) {
    console.error("Error adding item to wishlist:", error);
    res.status(500).json({ error: "Failed to add item to wishlist" });
  }
});

// Add to default wishlist (simplified endpoint)
router.post("/default/items", authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { productId, notes } = req.body;

    if (!productId) {
      return res.status(400).json({ error: "Product ID is required" });
    }

    // Get or create default wishlist
    let defaultWishlist = await db
      .select()
      .from(wishlists)
      .where(and(eq(wishlists.userId, userId), eq(wishlists.isDefault, true)))
      .limit(1);

    if (defaultWishlist.length === 0) {
      const [newWishlist] = await db
        .insert(wishlists)
        .values({
          userId,
          name: "My Wishlist",
          isDefault: true
        })
        .returning();
      
      defaultWishlist = [newWishlist];
    }

    // Check if item already exists in default wishlist
    const existingItem = await db
      .select()
      .from(wishlistItems)
      .where(and(eq(wishlistItems.wishlistId, defaultWishlist[0].id), eq(wishlistItems.productId, productId)))
      .limit(1);

    if (existingItem.length > 0) {
      return res.status(409).json({ error: "Product already in wishlist" });
    }

    // Add item to default wishlist
    const [newItem] = await db
      .insert(wishlistItems)
      .values({
        wishlistId: defaultWishlist[0].id,
        productId,
        notes
      })
      .returning();

    res.status(201).json(newItem);
  } catch (error) {
    console.error("Error adding item to default wishlist:", error);
    res.status(500).json({ error: "Failed to add item to wishlist" });
  }
});

// Remove item from wishlist
router.delete("/:wishlistId/items/:itemId", authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { wishlistId, itemId } = req.params;

    // Verify wishlist belongs to user
    const wishlist = await db
      .select()
      .from(wishlists)
      .where(and(eq(wishlists.id, wishlistId), eq(wishlists.userId, userId)))
      .limit(1);

    if (wishlist.length === 0) {
      return res.status(404).json({ error: "Wishlist not found" });
    }

    // Remove item
    const deletedItems = await db
      .delete(wishlistItems)
      .where(and(eq(wishlistItems.id, itemId), eq(wishlistItems.wishlistId, wishlistId)))
      .returning();

    if (deletedItems.length === 0) {
      return res.status(404).json({ error: "Item not found in wishlist" });
    }

    res.json({ message: "Item removed from wishlist", item: deletedItems[0] });
  } catch (error) {
    console.error("Error removing item from wishlist:", error);
    res.status(500).json({ error: "Failed to remove item from wishlist" });
  }
});

// Remove product from default wishlist by product ID
router.delete("/default/items/product/:productId", authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { productId } = req.params;

    // Get default wishlist
    const defaultWishlist = await db
      .select()
      .from(wishlists)
      .where(and(eq(wishlists.userId, userId), eq(wishlists.isDefault, true)))
      .limit(1);

    if (defaultWishlist.length === 0) {
      return res.status(404).json({ error: "Default wishlist not found" });
    }

    // Remove item
    const deletedItems = await db
      .delete(wishlistItems)
      .where(and(eq(wishlistItems.wishlistId, defaultWishlist[0].id), eq(wishlistItems.productId, productId)))
      .returning();

    if (deletedItems.length === 0) {
      return res.status(404).json({ error: "Product not found in wishlist" });
    }

    res.json({ message: "Product removed from wishlist", item: deletedItems[0] });
  } catch (error) {
    console.error("Error removing product from wishlist:", error);
    res.status(500).json({ error: "Failed to remove product from wishlist" });
  }
});

// Check if product is in user's default wishlist
router.get("/default/items/product/:productId", authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { productId } = req.params;

    // Get default wishlist
    const defaultWishlist = await db
      .select()
      .from(wishlists)
      .where(and(eq(wishlists.userId, userId), eq(wishlists.isDefault, true)))
      .limit(1);

    if (defaultWishlist.length === 0) {
      return res.json({ inWishlist: false });
    }

    // Check if product exists in wishlist
    const existingItem = await db
      .select()
      .from(wishlistItems)
      .where(and(eq(wishlistItems.wishlistId, defaultWishlist[0].id), eq(wishlistItems.productId, productId)))
      .limit(1);

    res.json({ inWishlist: existingItem.length > 0 });
  } catch (error) {
    console.error("Error checking wishlist status:", error);
    res.status(500).json({ error: "Failed to check wishlist status" });
  }
});

export default router;