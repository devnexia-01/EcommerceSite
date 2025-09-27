import { z } from "zod";

// Product schemas
export const createProductSchema = z.object({
  sku: z.string().min(1, "SKU is required"),
  name: z.string().min(1, "Product name is required"),
  slug: z.string().optional(),
  description: z.string().optional(),
  shortDescription: z.string().optional(),
  price: z.number().positive("Price must be positive"),
  basePrice: z.number().positive().optional(),
  salePrice: z.number().positive().optional(),
  currency: z.string().default("USD"),
  taxRate: z.number().min(0).max(1).default(0),
  categoryId: z.string().uuid().optional(),
  brandId: z.string().uuid().optional(),
  stock: z.number().int().min(0).default(0),
  attributes: z.record(z.any()).default({}),
  seo: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    keywords: z.array(z.string()).optional()
  }).default({}),
  status: z.enum(['active', 'inactive', 'draft']).default('active'),
  imageUrl: z.string().url().optional(),
  images: z.array(z.string().url()).default([])
});

export const updateProductSchema = createProductSchema.partial();

export const productSearchSchema = z.object({
  query: z.string().optional(),
  search: z.string().optional(), // Accept both search and query for compatibility
  categoryId: z.string().uuid().optional(),
  brandId: z.string().uuid().optional(),
  minPrice: z.union([z.string(), z.number()]).transform(val => typeof val === 'string' ? parseFloat(val) : val).optional(),
  maxPrice: z.union([z.string(), z.number()]).transform(val => typeof val === 'string' ? parseFloat(val) : val).optional(),
  attributes: z.record(z.any()).optional(),
  status: z.enum(['active', 'inactive', 'draft']).optional(),
  sortBy: z.enum(['name', 'price', 'rating', 'created']).default('created'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  limit: z.union([z.string(), z.number()]).transform(val => typeof val === 'string' ? parseInt(val) : val).default(20),
  offset: z.union([z.string(), z.number()]).transform(val => typeof val === 'string' ? parseInt(val) : val).default(0)
}).transform(({ search, query, ...rest }) => ({
  ...rest,
  // Map search to query for compatibility with ProductService, trim and normalize
  query: (query ?? search)?.trim() || undefined
}));

// Product variant schemas
export const createVariantSchema = z.object({
  sku: z.string().min(1, "Variant SKU is required"),
  attributes: z.record(z.any()).default({}),
  pricing: z.object({
    price: z.number().positive("Price must be positive"),
    compareAtPrice: z.number().positive().optional()
  }),
  inventory: z.object({
    quantity: z.number().int().min(0).default(0),
    reserved: z.number().int().min(0).default(0)
  }).default({ quantity: 0, reserved: 0 }),
  media: z.array(z.string().url()).default([]),
  status: z.enum(['active', 'inactive']).default('active')
});

export const updateVariantSchema = createVariantSchema.partial();

// Product media schemas
export const addMediaSchema = z.object({
  type: z.enum(['image', 'video']).default('image'),
  url: z.string().url("Invalid URL"),
  thumbnailUrl: z.string().url().optional(),
  alt: z.string().optional(),
  position: z.number().int().min(0).default(0)
});

export const updateMediaSchema = addMediaSchema.partial();

// Brand schemas
export const createBrandSchema = z.object({
  name: z.string().min(1, "Brand name is required"),
  slug: z.string().optional(),
  description: z.string().optional(),
  logo: z.string().url().optional(),
  website: z.string().url().optional(),
  status: z.enum(['active', 'inactive']).default('active')
});

export const updateBrandSchema = createBrandSchema.partial();

export const brandSearchSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  sortBy: z.enum(['name', 'created']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  limit: z.union([z.string(), z.number()]).transform(val => typeof val === 'string' ? parseInt(val) : val).default(50),
  offset: z.union([z.string(), z.number()]).transform(val => typeof val === 'string' ? parseInt(val) : val).default(0)
});

// Category schemas (already exist but adding V1 versions)
export const createCategorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  slug: z.string().optional(),
  description: z.string().optional(),
  parentId: z.string().uuid().optional(),
  imageUrl: z.string().url().optional(),
  status: z.enum(['active', 'inactive']).default('active'),
  sortOrder: z.number().int().min(0).default(0)
});

export const updateCategorySchema = createCategorySchema.partial();

export const categorySearchSchema = z.object({
  search: z.string().optional(),
  parentId: z.string().uuid().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  sortBy: z.enum(['name', 'sortOrder', 'created']).default('sortOrder'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  limit: z.union([z.string(), z.number()]).transform(val => typeof val === 'string' ? parseInt(val) : val).default(50),
  offset: z.union([z.string(), z.number()]).transform(val => typeof val === 'string' ? parseInt(val) : val).default(0)
});

// Common schemas
export const uuidSchema = z.string().uuid("Invalid UUID format");
export const paginationSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0)
});

// Validation error formatter
export function formatValidationError(error: z.ZodError) {
  return {
    error: "Validation failed",
    details: error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code
    }))
  };
}