import { Router } from "express";
import { Wishlist, WishlistItem, Product } from "./models/index";
import { authenticateToken } from "./auth-routes.js";

const router = Router();

// Get user's wishlists
router.get("/", authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;
    
    const userWishlists = await Wishlist.find({ userId }).sort({ isDefault: -1, createdAt: -1 }).lean();
    
    const wishlistsWithCounts = await Promise.all(userWishlists.map(async (wishlist) => {
      const itemCount = await WishlistItem.countDocuments({ wishlistId: wishlist._id.toString() });
      return {
        id: wishlist._id.toString(),
        name: wishlist.name,
        description: wishlist.description,
        isDefault: wishlist.isDefault,
        isPublic: wishlist.isPublic,
        createdAt: wishlist.createdAt,
        itemCount
      };
    }));

    res.json(wishlistsWithCounts);
  } catch (error) {
    console.error("Error fetching wishlists:", error);
    res.status(500).json({ error: "Failed to fetch wishlists" });
  }
});

// Get default wishlist for user
router.get("/default", authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;
    
    let defaultWishlist = await Wishlist.findOne({ userId, isDefault: true });

    // Create default wishlist if it doesn't exist
    if (!defaultWishlist) {
      defaultWishlist = await Wishlist.create({
        _id: `wl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        name: "My Wishlist",
        isDefault: true
      });
    }

    res.json({
      id: defaultWishlist._id.toString(),
      ...defaultWishlist.toObject()
    });
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
    const wishlist = await Wishlist.findOne({ _id: wishlistId, userId });

    if (!wishlist) {
      return res.status(404).json({ error: "Wishlist not found" });
    }

    const items = await WishlistItem.find({ wishlistId }).sort({ addedAt: -1 }).lean();
    
    const itemsWithProducts = await Promise.all(items.map(async (item) => {
      const product = await Product.findById(item.productId).lean();
      return {
        id: item._id.toString(),
        addedAt: item.addedAt,
        notes: item.notes,
        product: product ? {
          id: product._id.toString(),
          name: product.name,
          slug: product.slug,
          price: product.price,
          comparePrice: product.comparePrice,
          imageUrl: product.imageUrl,
          rating: product.rating,
          reviewCount: product.reviewCount,
          stock: product.stock
        } : null
      };
    }));

    res.json(itemsWithProducts.filter(item => item.product !== null));
  } catch (error) {
    console.error("Error fetching wishlist items:", error);
    res.status(500).json({ error: "Failed to fetch wishlist items" });
  }
});

// Add item to default wishlist (special route)
router.post("/default/items", authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { productId, notes } = req.body;

    if (!productId) {
      return res.status(400).json({ error: "Product ID is required" });
    }

    // Get or create default wishlist
    let defaultWishlist = await Wishlist.findOne({ userId, isDefault: true });

    if (!defaultWishlist) {
      defaultWishlist = await Wishlist.create({
        _id: `wl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        name: "My Wishlist",
        isDefault: true
      });
    }

    const wishlistId = defaultWishlist._id.toString();

    // Verify product exists
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Check if item already exists in wishlist
    const existingItem = await WishlistItem.findOne({ wishlistId, productId });

    if (existingItem) {
      return res.status(409).json({ error: "Product already in wishlist" });
    }

    // Add item to wishlist
    const newItem = await WishlistItem.create({
      _id: `wli_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      wishlistId,
      productId,
      notes
    });

    res.status(201).json({
      id: newItem._id.toString(),
      ...newItem.toObject()
    });
  } catch (error) {
    console.error("Error adding item to default wishlist:", error);
    res.status(500).json({ error: "Failed to add item to wishlist" });
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
    const wishlist = await Wishlist.findOne({ _id: wishlistId, userId });

    if (!wishlist) {
      return res.status(404).json({ error: "Wishlist not found" });
    }

    // Verify product exists
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Check if item already exists in wishlist
    const existingItem = await WishlistItem.findOne({ wishlistId, productId });

    if (existingItem) {
      return res.status(409).json({ error: "Product already in wishlist" });
    }

    // Add item to wishlist
    const newItem = await WishlistItem.create({
      _id: `wli_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      wishlistId,
      productId,
      notes
    });

    res.status(201).json({
      id: newItem._id.toString(),
      ...newItem.toObject()
    });
  } catch (error) {
    console.error("Error adding item to wishlist:", error);
    res.status(500).json({ error: "Failed to add item to wishlist" });
  }
});

// Remove item from default wishlist by product ID
router.delete("/default/items/product/:productId", authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { productId } = req.params;

    // Get default wishlist
    const defaultWishlist = await Wishlist.findOne({ userId, isDefault: true });

    if (!defaultWishlist) {
      return res.status(404).json({ error: "Default wishlist not found" });
    }

    // Remove item by productId
    const deletedItem = await WishlistItem.findOneAndDelete({ 
      wishlistId: defaultWishlist._id.toString(), 
      productId 
    });

    if (!deletedItem) {
      return res.status(404).json({ error: "Item not found in wishlist" });
    }

    res.json({ 
      message: "Item removed from wishlist", 
      item: {
        id: deletedItem._id.toString(),
        ...deletedItem.toObject()
      }
    });
  } catch (error) {
    console.error("Error removing item from default wishlist:", error);
    res.status(500).json({ error: "Failed to remove item from wishlist" });
  }
});

// Remove item from wishlist
router.delete("/:wishlistId/items/:itemId", authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { wishlistId, itemId } = req.params;

    // Verify wishlist belongs to user
    const wishlist = await Wishlist.findOne({ _id: wishlistId, userId });

    if (!wishlist) {
      return res.status(404).json({ error: "Wishlist not found" });
    }

    // Remove item
    const deletedItem = await WishlistItem.findOneAndDelete({ _id: itemId, wishlistId });

    if (!deletedItem) {
      return res.status(404).json({ error: "Item not found in wishlist" });
    }

    res.json({ 
      message: "Item removed from wishlist", 
      item: {
        id: deletedItem._id.toString(),
        ...deletedItem.toObject()
      }
    });
  } catch (error) {
    console.error("Error removing item from wishlist:", error);
    res.status(500).json({ error: "Failed to remove item from wishlist" });
  }
});

// Check if product is in user's default wishlist
router.get("/default/items/product/:productId", authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { productId } = req.params;

    // Get default wishlist
    const defaultWishlist = await Wishlist.findOne({ userId, isDefault: true });

    if (!defaultWishlist) {
      return res.json({ inWishlist: false });
    }

    // Check if product exists in wishlist
    const existingItem = await WishlistItem.findOne({ 
      wishlistId: defaultWishlist._id.toString(), 
      productId 
    });

    res.json({ inWishlist: !!existingItem });
  } catch (error) {
    console.error("Error checking wishlist status:", error);
    res.status(500).json({ error: "Failed to check wishlist status" });
  }
});

export default router;
