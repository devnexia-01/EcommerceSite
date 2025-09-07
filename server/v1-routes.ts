import { Request, Response } from "express";
import { storage } from "./storage";
import { z } from "zod";

export function setupV1Routes(app: any, storage: any) {
  
  // ===== Product Management Endpoints =====
  
  // GET /api/v1/products
  app.get("/api/v1/products", async (req: Request, res: Response) => {
    try {
      const {
        categoryId,
        search,
        sortBy,
        sortOrder,
        limit = "20",
        offset = "0",
        brand,
        minPrice,
        maxPrice,
        status = "active"
      } = req.query as Record<string, string>;

      const result = await storage.getProductsV1({
        categoryId,
        search,
        sortBy: sortBy as any,
        sortOrder: sortOrder as any,
        limit: parseInt(limit),
        offset: parseInt(offset),
        brand,
        minPrice: minPrice ? parseFloat(minPrice) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
        status
      });

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // GET /api/v1/products/:productId
  app.get("/api/v1/products/:productId", async (req: Request, res: Response) => {
    try {
      const { productId } = req.params;
      const product = await storage.getProductByIdV1(productId);
      
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      res.json(product);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // POST /api/v1/products
  app.post("/api/v1/products", async (req: Request, res: Response) => {
    try {
      const productData = req.body;
      const product = await storage.createProductV1(productData);
      res.status(201).json(product);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // PUT /api/v1/products/:productId
  app.put("/api/v1/products/:productId", async (req: Request, res: Response) => {
    try {
      const { productId } = req.params;
      const productData = req.body;
      const product = await storage.updateProductV1(productId, productData);
      res.json(product);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // DELETE /api/v1/products/:productId
  app.delete("/api/v1/products/:productId", async (req: Request, res: Response) => {
    try {
      const { productId } = req.params;
      await storage.deleteProductV1(productId);
      res.json({ message: "Product deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // GET /api/v1/products/:productId/variants
  app.get("/api/v1/products/:productId/variants", async (req: Request, res: Response) => {
    try {
      const { productId } = req.params;
      const variants = await storage.getProductVariants(productId);
      res.json(variants);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // POST /api/v1/products/:productId/media
  app.post("/api/v1/products/:productId/media", async (req: Request, res: Response) => {
    try {
      const { productId } = req.params;
      const mediaData = req.body;
      const media = await storage.addProductMedia(productId, mediaData);
      res.status(201).json(media);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // GET /api/v1/products/search
  app.get("/api/v1/products/search", async (req: Request, res: Response) => {
    try {
      const { q, category, brand, minPrice, maxPrice, limit = "20" } = req.query as Record<string, string>;
      
      const results = await storage.searchProductsV1({
        query: q,
        category,
        brand,
        minPrice: minPrice ? parseFloat(minPrice) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
        limit: parseInt(limit)
      });
      
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // GET /api/v1/products/filters
  app.get("/api/v1/products/filters", async (req: Request, res: Response) => {
    try {
      const filters = await storage.getProductFilters();
      res.json(filters);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== Category Management Endpoints =====

  // GET /api/v1/categories
  app.get("/api/v1/categories", async (req: Request, res: Response) => {
    try {
      const { includeChildren = "false" } = req.query as Record<string, string>;
      const categories = await storage.getCategoriesV1({
        includeChildren: includeChildren === "true"
      });
      res.json(categories);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // GET /api/v1/categories/:categoryId
  app.get("/api/v1/categories/:categoryId", async (req: Request, res: Response) => {
    try {
      const { categoryId } = req.params;
      const category = await storage.getCategoryByIdV1(categoryId);
      
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      res.json(category);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // POST /api/v1/categories
  app.post("/api/v1/categories", async (req: Request, res: Response) => {
    try {
      const categoryData = req.body;
      const category = await storage.createCategoryV1(categoryData);
      res.status(201).json(category);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // PUT /api/v1/categories/:categoryId
  app.put("/api/v1/categories/:categoryId", async (req: Request, res: Response) => {
    try {
      const { categoryId } = req.params;
      const categoryData = req.body;
      const category = await storage.updateCategoryV1(categoryId, categoryData);
      res.json(category);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // DELETE /api/v1/categories/:categoryId
  app.delete("/api/v1/categories/:categoryId", async (req: Request, res: Response) => {
    try {
      const { categoryId } = req.params;
      await storage.deleteCategoryV1(categoryId);
      res.json({ message: "Category deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // GET /api/v1/categories/:categoryId/products
  app.get("/api/v1/categories/:categoryId/products", async (req: Request, res: Response) => {
    try {
      const { categoryId } = req.params;
      const { limit = "20", offset = "0", sortBy, sortOrder } = req.query as Record<string, string>;
      
      const result = await storage.getProductsByCategoryV1(categoryId, {
        limit: parseInt(limit),
        offset: parseInt(offset),
        sortBy: sortBy as any,
        sortOrder: sortOrder as any
      });
      
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
}