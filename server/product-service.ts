import { db } from "./db";
import { products, categories, productVariants, productMedia, brands } from "@shared/schema";
import { eq, desc, asc, ilike, and, sql, or, gte, lte } from "drizzle-orm";

export class ProductService {
  
  // Advanced product search with filters
  async searchProducts(params: {
    query?: string;
    categoryId?: string;
    brandId?: string;
    minPrice?: number;
    maxPrice?: number;
    attributes?: Record<string, any>;
    status?: string;
    sortBy?: 'name' | 'price' | 'rating' | 'created';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  }) {
    const {
      query,
      categoryId,
      brandId,
      minPrice,
      maxPrice,
      attributes,
      status = 'active',
      sortBy = 'created',
      sortOrder = 'desc',
      limit = 20,
      offset = 0
    } = params;

    const conditions = [eq(products.status, status)];

    // Text search
    if (query) {
      conditions.push(
        or(
          ilike(products.name, `%${query}%`),
          ilike(products.description, `%${query}%`)
        ) as any
      );
    }

    // Category filter
    if (categoryId) {
      conditions.push(eq(products.categoryId, categoryId));
    }

    // Brand filter
    if (brandId) {
      conditions.push(eq(products.brandId, brandId));
    }

    // Price filters
    if (minPrice !== undefined) {
      conditions.push(gte(products.price, minPrice.toString()));
    }
    if (maxPrice !== undefined) {
      conditions.push(lte(products.price, maxPrice.toString()));
    }

    // Attribute filters
    if (attributes) {
      for (const [key, value] of Object.entries(attributes)) {
        conditions.push(sql`${products.attributes}->>${key} = ${value}`);
      }
    }

    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

    // Sort mapping
    const sortColumn = {
      name: products.name,
      price: products.price,
      rating: products.rating,
      created: products.createdAt
    }[sortBy];

    const [productsResult, countResult] = await Promise.all([
      db.select({
        product: products,
        category: categories,
        brand: brands
      })
        .from(products)
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .leftJoin(brands, eq(products.brandId, brands.id))
        .where(whereClause)
        .orderBy(sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn))
        .limit(limit)
        .offset(offset),
      
      db.select({ count: sql<number>`count(*)` })
        .from(products)
        .where(whereClause)
    ]);

    return {
      products: productsResult.map(row => this.formatProductResponse(row.product, row.category, row.brand)),
      total: countResult[0].count,
      pagination: {
        limit,
        offset,
        hasMore: countResult[0].count > offset + limit
      }
    };
  }

  // Get product with all related data
  async getProductWithDetails(productId: string) {
    const [productResult] = await db.select({
      product: products,
      category: categories,
      brand: brands
    })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(brands, eq(products.brandId, brands.id))
      .where(eq(products.id, productId));

    if (!productResult) {
      return null;
    }

    // Get variants and media
    const [variants, media] = await Promise.all([
      this.getProductVariants(productId),
      this.getProductMedia(productId)
    ]);

    const formattedProduct = this.formatProductResponse(
      productResult.product,
      productResult.category,
      productResult.brand
    );

    return {
      ...formattedProduct,
      variants,
      media
    };
  }

  // Create product with validation
  async createProduct(productData: any) {
    // Validate required fields
    if (!productData.sku || !productData.name || !productData.price) {
      throw new Error('SKU, name, and price are required');
    }

    // Check for duplicate SKU
    const existingProduct = await db.select()
      .from(products)
      .where(eq(products.sku, productData.sku))
      .limit(1);

    if (existingProduct.length > 0) {
      throw new Error('Product with this SKU already exists');
    }

    // Generate slug if not provided
    if (!productData.slug) {
      productData.slug = this.generateSlug(productData.name);
    }

    const [newProduct] = await db.insert(products).values({
      sku: productData.sku,
      name: productData.name,
      slug: productData.slug,
      description: productData.description,
      shortDescription: productData.shortDescription,
      price: productData.price.toString(),
      basePrice: productData.basePrice?.toString(),
      salePrice: productData.salePrice?.toString(),
      currency: productData.currency || 'USD',
      taxRate: productData.taxRate || '0',
      categoryId: productData.categoryId,
      brandId: productData.brandId,
      stock: productData.stock || 0,
      attributes: productData.attributes || {},
      seo: productData.seo || {},
      status: productData.status || 'active',
      imageUrl: productData.imageUrl,
      images: productData.images || []
    } as any).returning();

    return newProduct;
  }

  // Update product with validation
  async updateProduct(productId: string, productData: any) {
    const existingProduct = await db.select()
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    if (existingProduct.length === 0) {
      throw new Error('Product not found');
    }

    // Check for duplicate SKU if changing
    if (productData.sku && productData.sku !== existingProduct[0].sku) {
      const duplicateSku = await db.select()
        .from(products)
        .where(and(
          eq(products.sku, productData.sku),
          sql`${products.id} != ${productId}`
        ))
        .limit(1);

      if (duplicateSku.length > 0) {
        throw new Error('Product with this SKU already exists');
      }
    }

    const updateData: any = {
      updatedAt: sql`now()`
    };

    // Only update provided fields
    const fields = ['sku', 'name', 'slug', 'description', 'shortDescription', 
                   'price', 'basePrice', 'salePrice', 'currency', 'taxRate',
                   'categoryId', 'brandId', 'stock', 'attributes', 'seo', 'status'];
    
    for (const field of fields) {
      if (productData[field] !== undefined) {
        if (['price', 'basePrice', 'salePrice', 'taxRate'].includes(field)) {
          updateData[field] = productData[field]?.toString();
        } else {
          updateData[field] = productData[field];
        }
      }
    }

    const [updatedProduct] = await db.update(products)
      .set(updateData)
      .where(eq(products.id, productId))
      .returning();

    return updatedProduct;
  }

  // Product variants management
  async getProductVariants(productId: string) {
    const variants = await db.select()
      .from(productVariants)
      .where(eq(productVariants.productId, productId))
      .orderBy(asc(productVariants.createdAt));

    return variants.map(variant => ({
      variantId: variant.id,
      sku: variant.sku,
      attributes: variant.attributes || {},
      pricing: {
        price: variant.price,
        compareAtPrice: variant.compareAtPrice
      },
      inventory: {
        quantity: variant.quantity || 0,
        reserved: variant.reserved || 0
      },
      media: variant.media || [],
      status: variant.status,
      createdAt: variant.createdAt,
      updatedAt: variant.updatedAt
    }));
  }

  async createProductVariant(productId: string, variantData: any) {
    // Validate product exists
    const product = await db.select()
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    if (product.length === 0) {
      throw new Error('Product not found');
    }

    // Check for duplicate SKU
    if (variantData.sku) {
      const existingSku = await db.select()
        .from(productVariants)
        .where(eq(productVariants.sku, variantData.sku))
        .limit(1);

      if (existingSku.length > 0) {
        throw new Error('Variant with this SKU already exists');
      }
    }

    const [newVariant] = await db.insert(productVariants).values({
      productId,
      sku: variantData.sku,
      attributes: variantData.attributes || {},
      price: variantData.pricing?.price || '0',
      compareAtPrice: variantData.pricing?.compareAtPrice,
      quantity: variantData.inventory?.quantity || 0,
      reserved: variantData.inventory?.reserved || 0,
      media: variantData.media || [],
      status: variantData.status || 'active'
    } as any).returning();

    return newVariant;
  }

  // Product media management
  async getProductMedia(productId: string) {
    const media = await db.select()
      .from(productMedia)
      .where(eq(productMedia.productId, productId))
      .orderBy(asc(productMedia.position));

    return media.map(item => ({
      mediaId: item.id,
      type: item.type,
      url: item.url,
      thumbnailUrl: item.thumbnailUrl,
      alt: item.alt,
      position: item.position
    }));
  }

  async addProductMedia(productId: string, mediaData: any) {
    const [newMedia] = await db.insert(productMedia).values({
      productId,
      type: mediaData.type || 'image',
      url: mediaData.url,
      thumbnailUrl: mediaData.thumbnailUrl,
      alt: mediaData.alt,
      position: mediaData.position || 0
    } as any).returning();

    return {
      mediaId: newMedia.id,
      type: newMedia.type,
      url: newMedia.url,
      thumbnailUrl: newMedia.thumbnailUrl,
      alt: newMedia.alt,
      position: newMedia.position
    };
  }

  // Get available filters for products
  async getProductFilters() {
    try {
      const [categoriesData, priceRange, attributeOptions] = await Promise.all([
        db.select().from(categories).where(eq(categories.status, 'active')),
        db.select({
          min: sql<number>`MIN(${products.price}::numeric)`,
          max: sql<number>`MAX(${products.price}::numeric)`
        }).from(products).where(eq(products.status, 'active')),
        this.getAttributeOptions()
      ]);

      // Get brands separately to handle potential errors
      let brandsData: any[] = [];
      try {
        brandsData = await db.select().from(brands).where(eq(brands.status, 'active'));
      } catch (error) {
        console.log('Brands table may not exist yet:', error);
        brandsData = [];
      }

      return {
        categories: categoriesData,
        brands: brandsData,
        priceRange: {
          min: priceRange[0]?.min || 0,
          max: priceRange[0]?.max || 1000
        },
        attributes: attributeOptions
      };
    } catch (error) {
      console.error('Error getting product filters:', error);
      // Return basic filters if there's an error
      return {
        categories: [],
        brands: [],
        priceRange: {
          min: 0,
          max: 1000
        },
        attributes: {}
      };
    }
  }

  // Get unique attribute options from all products
  private async getAttributeOptions() {
    const products = await db.select({ attributes: products.attributes })
      .from(products)
      .where(and(
        eq(products.status, 'active'),
        sql`${products.attributes} IS NOT NULL`
      ));

    const attributeMap: Record<string, Set<any>> = {};

    products.forEach(product => {
      if (product.attributes && typeof product.attributes === 'object') {
        Object.entries(product.attributes).forEach(([key, value]) => {
          if (!attributeMap[key]) {
            attributeMap[key] = new Set();
          }
          attributeMap[key].add(value);
        });
      }
    });

    // Convert sets to arrays
    const result: Record<string, any[]> = {};
    Object.entries(attributeMap).forEach(([key, valueSet]) => {
      result[key] = Array.from(valueSet);
    });

    return result;
  }

  // Format product for API response
  private formatProductResponse(product: any, category: any = null, brand: any = null) {
    return {
      productId: product.id,
      sku: product.sku,
      name: product.name,
      slug: product.slug,
      description: product.description,
      shortDescription: product.shortDescription,
      categories: product.categories || [],
      brand: brand ? {
        brandId: brand.id,
        name: brand.name,
        logo: brand.logo
      } : null,
      pricing: {
        basePrice: product.basePrice || product.price,
        salePrice: product.salePrice,
        currency: product.currency || 'USD',
        taxRate: product.taxRate || '0'
      },
      attributes: product.attributes || {},
      seo: product.seo || {},
      rating: product.rating,
      reviewCount: product.reviewCount,
      status: product.status,
      metadata: {
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        publishedAt: product.publishedAt
      },
      category: category ? {
        id: category.id,
        name: category.name,
        slug: category.slug
      } : null,
      // Legacy fields for backward compatibility
      price: product.price,
      comparePrice: product.comparePrice,
      stock: product.stock,
      imageUrl: product.imageUrl,
      images: product.images || []
    };
  }

  // Generate slug from name
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}

export const productService = new ProductService();