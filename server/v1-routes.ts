import { Request, Response } from "express";
import cartV1Routes from "./routes/cart-v1";
import { storage } from "./storage";
import { productService } from "./product-service";
import { brandService } from "./brand-service";
import {
  createProductSchema,
  updateProductSchema,
  productSearchSchema,
  createVariantSchema,
  updateVariantSchema,
  addMediaSchema,
  createBrandSchema,
  updateBrandSchema,
  brandSearchSchema,
  createCategorySchema,
  updateCategorySchema,
  categorySearchSchema,
  uuidSchema,
  formatValidationError
} from "./validation-schemas";
import { z } from "zod";
import { authenticateToken } from "./auth-routes";
import { nanoid } from "nanoid";
import { db } from "./db";
import { 
  orders, orderItems, returns, returnItems, invoices, invoiceLineItems,
  tracking, trackingEvents, orderStatusHistory, shipments, shipmentItems,
  reviews, products, users
} from "@shared/schema";
import { 
  insertOrderSchema, insertOrderItemSchema, insertReturnSchema, insertReturnItemSchema,
  insertInvoiceSchema, insertInvoiceLineItemSchema, insertTrackingSchema, 
  insertTrackingEventSchema, insertOrderStatusHistorySchema, insertShipmentSchema,
  insertShipmentItemSchema, insertReviewSchema
} from "@shared/schema";
import { eq, desc, and, sql, or } from "drizzle-orm";

export function setupV1Routes(app: any, storage: any) {
  
  // ===== Enhanced Cart Service Endpoints =====
  app.use("/api/v1/cart", cartV1Routes);
  
  // ===== Product Management Endpoints =====
  
  // GET /api/v1/products/search (must be before /:productId)
  app.get("/api/v1/products/search", async (req: Request, res: Response) => {
    try {
      const validatedQuery = productSearchSchema.parse(req.query);
      const result = await productService.searchProducts(validatedQuery);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          ...formatValidationError(error)
        });
      }
      
      console.error("Error searching products:", error);
      res.status(500).json({
        success: false,
        error: "Failed to search products"
      });
    }
  });

  // GET /api/v1/products/filters (must be before /:productId)
  app.get("/api/v1/products/filters", async (req: Request, res: Response) => {
    try {
      const filters = await productService.getProductFilters();

      res.json({
        success: true,
        data: {
          filters
        }
      });
    } catch (error) {
      console.error("Error fetching product filters:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch product filters"
      });
    }
  });

  // GET /api/v1/products
  app.get("/api/v1/products", async (req: Request, res: Response) => {
    try {
      const validatedQuery = productSearchSchema.parse(req.query);
      const result = await productService.searchProducts(validatedQuery);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          ...formatValidationError(error)
        });
      }
      
      console.error("Error searching products:", error);
      res.status(500).json({
        success: false,
        error: "Failed to search products"
      });
    }
  });

  // GET /api/v1/products/:productId
  app.get("/api/v1/products/:productId", async (req: Request, res: Response) => {
    try {
      const productId = uuidSchema.parse(req.params.productId);
      const product = await productService.getProductWithDetails(productId);

      if (!product) {
        return res.status(404).json({
          success: false,
          error: "Product not found"
        });
      }

      res.json({
        success: true,
        data: {
          product
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          ...formatValidationError(error)
        });
      }
      
      console.error("Error fetching product:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch product"
      });
    }
  });

  // POST /api/v1/products
  app.post("/api/v1/products", async (req: Request, res: Response) => {
    try {
      const validatedData = createProductSchema.parse(req.body);
      const product = await productService.createProduct(validatedData);

      res.status(201).json({
        success: true,
        data: {
          product
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          ...formatValidationError(error)
        });
      }
      
      if (error instanceof Error && error.message.includes('already exists')) {
        return res.status(409).json({
          success: false,
          error: error.message
        });
      }
      
      console.error("Error creating product:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create product"
      });
    }
  });

  // PUT /api/v1/products/:productId
  app.put("/api/v1/products/:productId", async (req: Request, res: Response) => {
    try {
      const productId = uuidSchema.parse(req.params.productId);
      const validatedData = updateProductSchema.parse(req.body);
      
      const product = await productService.updateProduct(productId, validatedData);

      res.json({
        success: true,
        data: {
          product
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          ...formatValidationError(error)
        });
      }
      
      if (error instanceof Error && error.message === 'Product not found') {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }
      
      console.error("Error updating product:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update product"
      });
    }
  });

  // DELETE /api/v1/products/:productId
  app.delete("/api/v1/products/:productId", async (req: Request, res: Response) => {
    try {
      const productId = uuidSchema.parse(req.params.productId);
      await storage.deleteProductV1(productId);

      res.json({
        success: true,
        message: "Product deleted successfully"
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          ...formatValidationError(error)
        });
      }
      
      console.error("Error deleting product:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete product"
      });
    }
  });

  // GET /api/v1/products/:productId/variants
  app.get("/api/v1/products/:productId/variants", async (req: Request, res: Response) => {
    try {
      const productId = uuidSchema.parse(req.params.productId);
      const variants = await productService.getProductVariants(productId);

      res.json({
        success: true,
        data: {
          variants
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          ...formatValidationError(error)
        });
      }
      
      console.error("Error fetching variants:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch variants"
      });
    }
  });

  // POST /api/v1/products/:productId/variants
  app.post("/api/v1/products/:productId/variants", async (req: Request, res: Response) => {
    try {
      const productId = uuidSchema.parse(req.params.productId);
      const validatedData = createVariantSchema.parse(req.body);
      
      const variant = await productService.createProductVariant(productId, validatedData);

      res.status(201).json({
        success: true,
        data: {
          variant
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          ...formatValidationError(error)
        });
      }
      
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }
      
      console.error("Error creating variant:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create variant"
      });
    }
  });

  // GET /api/v1/products/:productId/media
  app.get("/api/v1/products/:productId/media", async (req: Request, res: Response) => {
    try {
      const productId = uuidSchema.parse(req.params.productId);
      const media = await productService.getProductMedia(productId);

      res.json({
        success: true,
        data: {
          media
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          ...formatValidationError(error)
        });
      }
      
      console.error("Error fetching media:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch media"
      });
    }
  });

  // POST /api/v1/products/:productId/media
  app.post("/api/v1/products/:productId/media", async (req: Request, res: Response) => {
    try {
      const productId = uuidSchema.parse(req.params.productId);
      const validatedData = addMediaSchema.parse(req.body);
      
      const media = await productService.addProductMedia(productId, validatedData);

      res.status(201).json({
        success: true,
        data: {
          media
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          ...formatValidationError(error)
        });
      }
      
      console.error("Error adding media:", error);
      res.status(500).json({
        success: false,
        error: "Failed to add media"
      });
    }
  });

  // ===== Brand Management Endpoints =====

  // GET /api/v1/brands
  app.get("/api/v1/brands", async (req: Request, res: Response) => {
    try {
      const validatedQuery = brandSearchSchema.parse(req.query);
      const result = await brandService.getAllBrands(validatedQuery);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          ...formatValidationError(error)
        });
      }
      
      console.error("Error fetching brands:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch brands"
      });
    }
  });

  // GET /api/v1/brands/:brandId
  app.get("/api/v1/brands/:brandId", async (req: Request, res: Response) => {
    try {
      const brandId = uuidSchema.parse(req.params.brandId);
      const brand = await brandService.getBrandById(brandId);

      if (!brand) {
        return res.status(404).json({
          success: false,
          error: "Brand not found"
        });
      }

      res.json({
        success: true,
        data: {
          brand
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          ...formatValidationError(error)
        });
      }
      
      console.error("Error fetching brand:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch brand"
      });
    }
  });

  // POST /api/v1/brands
  app.post("/api/v1/brands", async (req: Request, res: Response) => {
    try {
      const validatedData = createBrandSchema.parse(req.body);
      const brand = await brandService.createBrand(validatedData);

      res.status(201).json({
        success: true,
        data: {
          brand
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          ...formatValidationError(error)
        });
      }
      
      if (error instanceof Error && error.message.includes('already exists')) {
        return res.status(409).json({
          success: false,
          error: error.message
        });
      }
      
      console.error("Error creating brand:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create brand"
      });
    }
  });

  // PUT /api/v1/brands/:brandId
  app.put("/api/v1/brands/:brandId", async (req: Request, res: Response) => {
    try {
      const brandId = uuidSchema.parse(req.params.brandId);
      const validatedData = updateBrandSchema.parse(req.body);
      
      const brand = await brandService.updateBrand(brandId, validatedData);

      res.json({
        success: true,
        data: {
          brand
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          ...formatValidationError(error)
        });
      }
      
      if (error instanceof Error && error.message === 'Brand not found') {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }
      
      console.error("Error updating brand:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update brand"
      });
    }
  });

  // DELETE /api/v1/brands/:brandId
  app.delete("/api/v1/brands/:brandId", async (req: Request, res: Response) => {
    try {
      const brandId = uuidSchema.parse(req.params.brandId);
      await brandService.deleteBrand(brandId);

      res.json({
        success: true,
        message: "Brand deleted successfully"
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          ...formatValidationError(error)
        });
      }
      
      if (error instanceof Error && error.message.includes('Cannot delete brand')) {
        return res.status(409).json({
          success: false,
          error: error.message
        });
      }
      
      console.error("Error deleting brand:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete brand"
      });
    }
  });

  // GET /api/v1/brands/:brandId/products
  app.get("/api/v1/brands/:brandId/products", async (req: Request, res: Response) => {
    try {
      const brandId = uuidSchema.parse(req.params.brandId);
      const { limit = "20", offset = "0", sortBy = "created", sortOrder = "desc" } = req.query as Record<string, string>;
      
      const result = await brandService.getBrandProducts(brandId, {
        limit: parseInt(limit),
        offset: parseInt(offset),
        sortBy: sortBy as any,
        sortOrder: sortOrder as any
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          ...formatValidationError(error)
        });
      }
      
      console.error("Error fetching brand products:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch brand products"
      });
    }
  });

  // ===== Category Management Endpoints =====

  // GET /api/v1/categories
  app.get("/api/v1/categories", async (req: Request, res: Response) => {
    try {
      const validatedQuery = categorySearchSchema.parse(req.query);
      const result = await storage.getCategoriesV1({
        parentId: validatedQuery.parentId,
        search: validatedQuery.search,
        sortBy: validatedQuery.sortBy as any,
        sortOrder: validatedQuery.sortOrder as any,
        limit: validatedQuery.limit,
        offset: validatedQuery.offset,
        includeChildren: true
      });

      res.json({
        success: true,
        data: {
          categories: result.categories,
          total: result.total,
          pagination: {
            limit: validatedQuery.limit,
            offset: validatedQuery.offset,
            hasMore: result.total > validatedQuery.offset + validatedQuery.limit
          }
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          ...formatValidationError(error)
        });
      }
      
      console.error("Error fetching categories:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch categories"
      });
    }
  });

  // GET /api/v1/categories/:categoryId
  app.get("/api/v1/categories/:categoryId", async (req: Request, res: Response) => {
    try {
      const categoryId = uuidSchema.parse(req.params.categoryId);
      const category = await storage.getCategoryByIdV1(categoryId);
      
      if (!category) {
        return res.status(404).json({
          success: false,
          error: "Category not found"
        });
      }
      
      res.json({
        success: true,
        data: {
          category
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          ...formatValidationError(error)
        });
      }
      
      console.error("Error fetching category:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch category"
      });
    }
  });

  // POST /api/v1/categories
  app.post("/api/v1/categories", async (req: Request, res: Response) => {
    try {
      const validatedData = createCategorySchema.parse(req.body);
      const category = await storage.createCategoryV1(validatedData);

      res.status(201).json({
        success: true,
        data: {
          category
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          ...formatValidationError(error)
        });
      }
      
      console.error("Error creating category:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create category"
      });
    }
  });

  // PUT /api/v1/categories/:categoryId
  app.put("/api/v1/categories/:categoryId", async (req: Request, res: Response) => {
    try {
      const categoryId = uuidSchema.parse(req.params.categoryId);
      const validatedData = updateCategorySchema.parse(req.body);
      const category = await storage.updateCategoryV1(categoryId, validatedData);

      res.json({
        success: true,
        data: {
          category
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          ...formatValidationError(error)
        });
      }
      
      console.error("Error updating category:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update category"
      });
    }
  });

  // DELETE /api/v1/categories/:categoryId
  app.delete("/api/v1/categories/:categoryId", async (req: Request, res: Response) => {
    try {
      const categoryId = uuidSchema.parse(req.params.categoryId);
      await storage.deleteCategoryV1(categoryId);

      res.json({
        success: true,
        message: "Category deleted successfully"
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          ...formatValidationError(error)
        });
      }
      
      console.error("Error deleting category:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete category"
      });
    }
  });

  // GET /api/v1/categories/:categoryId/products
  app.get("/api/v1/categories/:categoryId/products", async (req: Request, res: Response) => {
    try {
      const categoryId = uuidSchema.parse(req.params.categoryId);
      const { limit = "20", offset = "0", sortBy = "created", sortOrder = "desc" } = req.query as Record<string, string>;
      
      const result = await storage.getProductsByCategoryV1(categoryId, {
        limit: parseInt(limit),
        offset: parseInt(offset),
        sortBy: sortBy as any,
        sortOrder: sortOrder as any
      });
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          ...formatValidationError(error)
        });
      }
      
      console.error("Error fetching category products:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch category products"
      });
    }
  });

  // ===== Order Management Service Endpoints =====

  // Test endpoint for order management
  app.get("/api/v1/orders", async (req: Request, res: Response) => {
    res.json({
      success: true,
      message: "Order Management Service is running",
      data: []
    });
  });

  // Helper functions for order management
  function generateOrderNumber(): string {
    const timestamp = Date.now().toString();
    const random = nanoid(6).toUpperCase();
    return `ORD-${timestamp.slice(-6)}${random}`;
  }

  function generateReturnNumber(): string {
    const timestamp = Date.now().toString();
    const random = nanoid(6).toUpperCase();
    return `RET-${timestamp.slice(-6)}${random}`;
  }

  function generateInvoiceNumber(): string {
    const timestamp = Date.now().toString();
    const random = nanoid(6).toUpperCase();
    return `INV-${timestamp.slice(-6)}${random}`;
  }

  function generateTrackingNumber(): string {
    const timestamp = Date.now().toString();
    const random = nanoid(8).toUpperCase();
    return `TRK${timestamp.slice(-8)}${random}`;
  }

  // 1. POST /api/v1/orders - Create new order
  app.post("/api/v1/orders", authenticateToken, async (req: any, res: Response) => {
    try {
      const userId = req.user?.userId || req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const orderData = insertOrderSchema.parse({
        ...req.body,
        userId,
        orderNumber: generateOrderNumber()
      });

      // Start transaction for order creation
      const result = await db.transaction(async (tx) => {
        // Create order
        const [newOrder] = await tx.insert(orders).values([orderData]).returning();
        
        // Create order items if provided
        if (req.body.items && Array.isArray(req.body.items)) {
          const orderItemsData = req.body.items.map((item: any) => ({
            ...item,
            orderId: newOrder.id
          }));
          
          await tx.insert(orderItems).values(orderItemsData);
        }

        // Create initial status history
        await tx.insert(orderStatusHistory).values([{
          id: nanoid(),
          orderId: newOrder.id,
          toStatus: orderData.status || "pending",
          timestamp: new Date(),
          notes: "Order created"
        }]);

        return newOrder;
      });

      res.status(201).json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error("Error creating order:", error);
      res.status(400).json({ 
        success: false,
        error: "Failed to create order" 
      });
    }
  });

  // 2. GET /api/v1/orders/{orderId} - Get specific order
  app.get("/api/v1/orders/:orderId", authenticateToken, async (req: any, res: Response) => {
    try {
      const { orderId } = req.params;
      const userId = req.user?.userId || req.user?.id;

      const order = await db.query.orders.findFirst({
        where: eq(orders.id, orderId),
        with: {
          orderItems: true,
          statusHistory: { orderBy: desc(orderStatusHistory.timestamp) }
        }
      });

      if (!order) {
        return res.status(404).json({ 
          success: false,
          error: "Order not found" 
        });
      }

      // Check if user owns order or is admin
      if (order.userId !== userId && !req.user?.isAdmin) {
        return res.status(403).json({ 
          success: false,
          error: "Access denied" 
        });
      }

      res.json({
        success: true,
        data: order
      });
    } catch (error) {
      console.error("Error fetching order:", error);
      res.status(500).json({ 
        success: false,
        error: "Failed to fetch order" 
      });
    }
  });

  // 3. GET /api/v1/users/{userId}/orders - Get user orders  
  app.get("/api/v1/users/:userId/orders", authenticateToken, async (req: any, res: Response) => {
    try {
      const { userId: targetUserId } = req.params;
      const currentUserId = req.user?.userId || req.user?.id;

      // Check if user can access these orders
      if (targetUserId !== currentUserId && !req.user?.isAdmin) {
        return res.status(403).json({ 
          success: false,
          error: "Access denied" 
        });
      }

      const userOrders = await db.query.orders.findMany({
        where: eq(orders.userId, targetUserId),
        with: {
          orderItems: true,
          statusHistory: { 
            orderBy: desc(orderStatusHistory.timestamp),
            limit: 1 
          }
        },
        orderBy: desc(orders.createdAt)
      });

      res.json({
        success: true,
        data: userOrders
      });
    } catch (error) {
      console.error("Error fetching user orders:", error);
      res.status(500).json({ 
        success: false,
        error: "Failed to fetch orders" 
      });
    }
  });

  // 4. PUT /api/v1/orders/{orderId}/status - Update order status
  app.put("/api/v1/orders/:orderId/status", authenticateToken, async (req: any, res: Response) => {
    try {
      const { orderId } = req.params;
      const { status, notes } = req.body;

      const order = await db.query.orders.findFirst({
        where: eq(orders.id, orderId)
      });

      if (!order) {
        return res.status(404).json({ 
          success: false,
          error: "Order not found" 
        });
      }

      // Update order status and add to history
      await db.transaction(async (tx) => {
        await tx.update(orders)
          .set({ status, updatedAt: new Date() })
          .where(eq(orders.id, orderId));

        await tx.insert(orderStatusHistory).values([{
          id: nanoid(),
          orderId,
          toStatus: status,
          timestamp: new Date(),
          notes: notes || `Status updated to ${status}`
        }]);
      });

      res.json({
        success: true,
        message: "Order status updated successfully"
      });
    } catch (error) {
      console.error("Error updating order status:", error);
      res.status(500).json({ 
        success: false,
        error: "Failed to update order status" 
      });
    }
  });

  // 5. POST /api/v1/orders/{orderId}/cancel - Cancel order
  app.post("/api/v1/orders/:orderId/cancel", authenticateToken, async (req: any, res: Response) => {
    try {
      const { orderId } = req.params;
      const userId = req.user?.userId || req.user?.id;

      const order = await db.query.orders.findFirst({
        where: eq(orders.id, orderId)
      });

      if (!order) {
        return res.status(404).json({ 
          success: false,
          error: "Order not found" 
        });
      }

      // Check if user owns order or is admin
      if (order.userId !== userId && !req.user?.isAdmin) {
        return res.status(403).json({ 
          success: false,
          error: "Access denied" 
        });
      }

      // Check if order can be cancelled
      if (["shipped", "delivered", "cancelled"].includes(order.status || "")) {
        return res.status(400).json({ 
          success: false,
          error: "Order cannot be cancelled in current status" 
        });
      }

      // Update order status to cancelled
      await db.transaction(async (tx) => {
        await tx.update(orders)
          .set({ status: "cancelled", updatedAt: new Date() })
          .where(eq(orders.id, orderId));

        await tx.insert(orderStatusHistory).values([{
          id: nanoid(),
          orderId,
          toStatus: "cancelled",
          timestamp: new Date(),
          notes: req.body.reason || "Order cancelled by customer"
        }]);
      });

      res.json({
        success: true,
        message: "Order cancelled successfully"
      });
    } catch (error) {
      console.error("Error cancelling order:", error);
      res.status(500).json({ 
        success: false,
        error: "Failed to cancel order" 
      });
    }
  });

}