import { Product, Category, Brand } from "./models/index";
import { nanoid } from "nanoid";

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

    const searchQuery: any = { status };

    // Text search
    if (query) {
      searchQuery.$or = [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } }
      ];
    }

    // Category filter
    if (categoryId) {
      searchQuery.categoryId = categoryId;
    }

    // Brand filter
    if (brandId) {
      searchQuery.brandId = brandId;
    }

    // Price filters
    if (minPrice !== undefined || maxPrice !== undefined) {
      searchQuery.price = {};
      if (minPrice !== undefined) {
        searchQuery.price.$gte = minPrice;
      }
      if (maxPrice !== undefined) {
        searchQuery.price.$lte = maxPrice;
      }
    }

    // Attribute filters
    if (attributes) {
      for (const [key, value] of Object.entries(attributes)) {
        searchQuery[`attributes.${key}`] = value;
      }
    }

    const sortField = {
      name: 'name',
      price: 'price',
      rating: 'rating',
      created: 'createdAt'
    }[sortBy];

    const sortDirection = sortOrder === 'asc' ? 1 : -1;

    const [productsResult, total] = await Promise.all([
      Product.find(searchQuery)
        .sort({ [sortField]: sortDirection })
        .limit(limit)
        .skip(offset)
        .lean(),
      Product.countDocuments(searchQuery)
    ]);

    // Populate with category and brand info
    const productsWithDetails = await Promise.all(
      productsResult.map(async (product) => {
        const [category, brand] = await Promise.all([
          product.categoryId ? Category.findById(product.categoryId).lean() : Promise.resolve(null),
          product.brandId ? Brand.findById(product.brandId).lean() : Promise.resolve(null)
        ]);
        return this.formatProductResponse(product, category, brand);
      })
    );

    return {
      products: productsWithDetails,
      total,
      pagination: {
        limit,
        offset,
        hasMore: total > offset + limit
      }
    };
  }

  // Get product with all related data
  async getProductWithDetails(productId: string) {
    const product = await Product.findById(productId).lean();

    if (!product) {
      return null;
    }

    const [category, brand] = await Promise.all([
      product.categoryId ? Category.findById(product.categoryId).lean() : Promise.resolve(null),
      product.brandId ? Brand.findById(product.brandId).lean() : Promise.resolve(null)
    ]);

    const formattedProduct = this.formatProductResponse(product, category, brand);

    return {
      ...formattedProduct,
      variants: [],
      media: []
    };
  }

  // Create product with validation
  async createProduct(productData: any) {
    // Validate required fields
    if (!productData.sku || !productData.name || !productData.price) {
      throw new Error('SKU, name, and price are required');
    }

    // Check for duplicate SKU
    const existingProduct = await Product.findOne({ sku: productData.sku });

    if (existingProduct) {
      throw new Error('Product with this SKU already exists');
    }

    // Generate slug if not provided
    if (!productData.slug) {
      productData.slug = this.generateSlug(productData.name);
    }

    const newProduct = await Product.create({
      _id: `prod_${nanoid()}`,
      sku: productData.sku,
      name: productData.name,
      slug: productData.slug,
      description: productData.description,
      shortDescription: productData.shortDescription,
      price: productData.price,
      basePrice: productData.basePrice,
      salePrice: productData.salePrice,
      currency: productData.currency || 'USD',
      taxRate: productData.taxRate || 0,
      categoryId: productData.categoryId,
      brandId: productData.brandId,
      stock: productData.stock || 0,
      attributes: productData.attributes || {},
      seo: productData.seo || {},
      status: productData.status || 'active',
      imageUrl: productData.imageUrl,
      images: productData.images || [],
      categories: productData.categories || []
    });

    return {
      id: newProduct._id.toString(),
      ...newProduct.toObject()
    };
  }

  // Update product with validation
  async updateProduct(productId: string, productData: any) {
    const existingProduct = await Product.findById(productId);

    if (!existingProduct) {
      throw new Error('Product not found');
    }

    // Check for duplicate SKU if changing
    if (productData.sku && productData.sku !== existingProduct.sku) {
      const duplicateSku = await Product.findOne({ 
        sku: productData.sku,
        _id: { $ne: productId }
      });

      if (duplicateSku) {
        throw new Error('Product with this SKU already exists');
      }
    }

    const updateData: any = {};

    // Only update provided fields
    const fields = ['sku', 'name', 'slug', 'description', 'shortDescription', 
                   'price', 'basePrice', 'salePrice', 'currency', 'taxRate',
                   'categoryId', 'brandId', 'stock', 'attributes', 'seo', 'status',
                   'imageUrl', 'images', 'categories'];
    
    for (const field of fields) {
      if (productData[field] !== undefined) {
        updateData[field] = productData[field];
      }
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      { $set: updateData },
      { new: true }
    );

    return {
      id: updatedProduct!._id.toString(),
      ...updatedProduct!.toObject()
    };
  }

  // Product variants management
  async getProductVariants(productId: string) {
    // Simplified - variants not yet in MongoDB models
    return [];
  }

  async createProductVariant(productId: string, variantData: any) {
    // Simplified - variants not yet in MongoDB models
    throw new Error('Product variants not yet implemented in MongoDB');
  }

  // Product media management
  async getProductMedia(productId: string) {
    // Simplified - using product.images array instead
    const product = await Product.findById(productId).lean();
    if (!product || !product.images) return [];
    
    return product.images.map((url, index) => ({
      mediaId: `${productId}_${index}`,
      type: 'image',
      url,
      thumbnailUrl: url,
      alt: product.name,
      position: index
    }));
  }

  async addProductMedia(productId: string, mediaData: any) {
    // Simplified - add to images array
    const product = await Product.findByIdAndUpdate(
      productId,
      { $push: { images: mediaData.url } },
      { new: true }
    );

    if (!product) {
      throw new Error('Product not found');
    }

    const position = product.images.length - 1;
    return {
      mediaId: `${productId}_${position}`,
      type: 'image',
      url: mediaData.url,
      thumbnailUrl: mediaData.url,
      alt: product.name,
      position
    };
  }

  // Get available filters for products
  async getProductFilters() {
    try {
      const [categoriesData, priceRange, brandsData] = await Promise.all([
        Category.find({ status: 'active' }).lean(),
        Product.aggregate([
          { $match: { status: 'active' } },
          {
            $group: {
              _id: null,
              min: { $min: '$price' },
              max: { $max: '$price' }
            }
          }
        ]),
        Brand.find({ status: 'active' }).lean()
      ]);

      const attributeOptions = await this.getAttributeOptions();

      return {
        categories: categoriesData.map(c => ({ id: c._id.toString(), ...c })),
        brands: brandsData.map(b => ({ id: b._id.toString(), ...b })),
        priceRange: {
          min: priceRange[0]?.min || 0,
          max: priceRange[0]?.max || 1000
        },
        attributes: attributeOptions
      };
    } catch (error) {
      console.error('Error getting product filters:', error);
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
    const products = await Product.find(
      { 
        status: 'active',
        attributes: { $exists: true, $ne: null }
      },
      { attributes: 1 }
    ).lean();

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
      productId: product._id?.toString() || product.id,
      sku: product.sku,
      name: product.name,
      slug: product.slug,
      description: product.description,
      shortDescription: product.shortDescription,
      categories: product.categories || [],
      brand: brand ? {
        brandId: brand._id?.toString() || brand.id,
        name: brand.name,
        logo: brand.logo
      } : null,
      pricing: {
        basePrice: product.basePrice || product.price,
        salePrice: product.salePrice,
        currency: product.currency || 'USD',
        taxRate: product.taxRate || 0
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
        id: category._id?.toString() || category.id,
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
