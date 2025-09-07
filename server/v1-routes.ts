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
}