import { brands, products } from "@shared/schema";
import { eq, desc, asc, ilike, and, sql } from "drizzle-orm";
import { db } from "./drizzle";

export class BrandService {

  async getAllBrands(params: {
    search?: string;
    status?: string;
    sortBy?: 'name' | 'created';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  } = {}) {
    const {
      search,
      status = 'active',
      sortBy = 'name',
      sortOrder = 'asc',
      limit = 50,
      offset = 0
    } = params;

    const conditions = [eq(brands.status, status)];

    if (search) {
      conditions.push(ilike(brands.name, `%${search}%`));
    }

    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

    const sortColumn = {
      name: brands.name,
      created: brands.createdAt
    }[sortBy];

    const [brandsResult, countResult] = await Promise.all([
      db.select()
        .from(brands)
        .where(whereClause)
        .orderBy(sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn))
        .limit(limit)
        .offset(offset),
      
      db.select({ count: sql<number>`count(*)` })
        .from(brands)
        .where(whereClause)
    ]);

    return {
      brands: brandsResult,
      total: countResult[0].count,
      pagination: {
        limit,
        offset,
        hasMore: countResult[0].count > offset + limit
      }
    };
  }

  async getBrandById(brandId: string) {
    const [brand] = await db.select()
      .from(brands)
      .where(eq(brands.id, brandId));

    if (!brand) {
      return null;
    }

    // Get product count for this brand
    const [productCount] = await db.select({ count: sql<number>`count(*)` })
      .from(products)
      .where(and(
        eq(products.brandId, brandId),
        eq(products.status, 'active')
      ));

    return {
      ...brand,
      productCount: productCount.count
    };
  }

  async createBrand(brandData: {
    name: string;
    slug?: string;
    description?: string;
    logo?: string;
    website?: string;
    status?: string;
  }) {
    // Validate required fields
    if (!brandData.name) {
      throw new Error('Brand name is required');
    }

    // Generate slug if not provided
    if (!brandData.slug) {
      brandData.slug = this.generateSlug(brandData.name);
    }

    // Check for duplicate slug
    const existingBrand = await db.select()
      .from(brands)
      .where(eq(brands.slug, brandData.slug))
      .limit(1);

    if (existingBrand.length > 0) {
      throw new Error('Brand with this slug already exists');
    }

    const [newBrand] = await db.insert(brands).values({
      name: brandData.name,
      slug: brandData.slug,
      description: brandData.description,
      logo: brandData.logo,
      website: brandData.website,
      status: brandData.status || 'active'
    } as any).returning();

    return newBrand;
  }

  async updateBrand(brandId: string, brandData: Partial<{
    name: string;
    slug: string;
    description: string;
    logo: string;
    website: string;
    status: string;
  }>) {
    const existingBrand = await db.select()
      .from(brands)
      .where(eq(brands.id, brandId))
      .limit(1);

    if (existingBrand.length === 0) {
      throw new Error('Brand not found');
    }

    // Check for duplicate slug if changing
    if (brandData.slug && brandData.slug !== existingBrand[0].slug) {
      const duplicateSlug = await db.select()
        .from(brands)
        .where(and(
          eq(brands.slug, brandData.slug),
          sql`${brands.id} != ${brandId}`
        ))
        .limit(1);

      if (duplicateSlug.length > 0) {
        throw new Error('Brand with this slug already exists');
      }
    }

    const updateData: any = {
      updatedAt: sql`now()`
    };

    // Only update provided fields
    const fields = ['name', 'slug', 'description', 'logo', 'website', 'status'];
    
    for (const field of fields) {
      if (brandData[field as keyof typeof brandData] !== undefined) {
        updateData[field] = brandData[field as keyof typeof brandData];
      }
    }

    const [updatedBrand] = await db.update(brands)
      .set(updateData)
      .where(eq(brands.id, brandId))
      .returning();

    return updatedBrand;
  }

  async deleteBrand(brandId: string) {
    // Check if brand has associated products
    const [productCount] = await db.select({ count: sql<number>`count(*)` })
      .from(products)
      .where(eq(products.brandId, brandId));

    if (productCount.count > 0) {
      throw new Error(`Cannot delete brand with ${productCount.count} associated products`);
    }

    await db.delete(brands).where(eq(brands.id, brandId));
  }

  async getBrandProducts(brandId: string, params: {
    limit?: number;
    offset?: number;
    sortBy?: 'name' | 'price' | 'created';
    sortOrder?: 'asc' | 'desc';
    status?: string;
  } = {}) {
    const {
      limit = 20,
      offset = 0,
      sortBy = 'created',
      sortOrder = 'desc',
      status = 'active'
    } = params;

    const conditions = [
      eq(products.brandId, brandId),
      eq(products.status, status)
    ];

    const sortColumn = {
      name: products.name,
      price: products.price,
      created: products.createdAt
    }[sortBy];

    const [productsResult, countResult] = await Promise.all([
      db.select()
        .from(products)
        .where(and(...conditions))
        .orderBy(sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn))
        .limit(limit)
        .offset(offset),
      
      db.select({ count: sql<number>`count(*)` })
        .from(products)
        .where(and(...conditions))
    ]);

    return {
      products: productsResult,
      total: countResult[0].count,
      pagination: {
        limit,
        offset,
        hasMore: countResult[0].count > offset + limit
      }
    };
  }

  // Generate URL-friendly slug
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}

export const brandService = new BrandService();