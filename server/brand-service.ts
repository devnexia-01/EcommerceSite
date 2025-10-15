import { Brand, Product } from "./models/index";
import { nanoid } from "nanoid";

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

    const query: any = { status };

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const sortField = sortBy === 'created' ? 'createdAt' : 'name';
    const sortDirection = sortOrder === 'asc' ? 1 : -1;

    const [brandsResult, total] = await Promise.all([
      Brand.find(query)
        .sort({ [sortField]: sortDirection })
        .limit(limit)
        .skip(offset)
        .lean(),
      Brand.countDocuments(query)
    ]);

    return {
      brands: brandsResult.map(b => ({ id: b._id.toString(), ...b })),
      total,
      pagination: {
        limit,
        offset,
        hasMore: total > offset + limit
      }
    };
  }

  async getBrandById(brandId: string) {
    const brand = await Brand.findById(brandId).lean();

    if (!brand) {
      return null;
    }

    // Get product count for this brand
    const productCount = await Product.countDocuments({ 
      brandId, 
      status: 'active' 
    });

    return {
      id: brand._id.toString(),
      ...brand,
      productCount
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
    const existingBrand = await Brand.findOne({ slug: brandData.slug });

    if (existingBrand) {
      throw new Error('Brand with this slug already exists');
    }

    const newBrand = await Brand.create({
      _id: `brand_${nanoid()}`,
      name: brandData.name,
      slug: brandData.slug,
      description: brandData.description,
      logo: brandData.logo,
      website: brandData.website,
      status: brandData.status || 'active'
    });

    return {
      id: newBrand._id.toString(),
      ...newBrand.toObject()
    };
  }

  async updateBrand(brandId: string, brandData: Partial<{
    name: string;
    slug: string;
    description: string;
    logo: string;
    website: string;
    status: string;
  }>) {
    const existingBrand = await Brand.findById(brandId);

    if (!existingBrand) {
      throw new Error('Brand not found');
    }

    // Check for duplicate slug if changing
    if (brandData.slug && brandData.slug !== existingBrand.slug) {
      const duplicateSlug = await Brand.findOne({ 
        slug: brandData.slug,
        _id: { $ne: brandId }
      });

      if (duplicateSlug) {
        throw new Error('Brand with this slug already exists');
      }
    }

    const updateData: any = {};

    // Only update provided fields
    const fields = ['name', 'slug', 'description', 'logo', 'website', 'status'];
    
    for (const field of fields) {
      if (brandData[field as keyof typeof brandData] !== undefined) {
        updateData[field] = brandData[field as keyof typeof brandData];
      }
    }

    const updatedBrand = await Brand.findByIdAndUpdate(
      brandId,
      { $set: updateData },
      { new: true }
    );

    return {
      id: updatedBrand!._id.toString(),
      ...updatedBrand!.toObject()
    };
  }

  async deleteBrand(brandId: string) {
    // Check if brand has associated products
    const productCount = await Product.countDocuments({ brandId });

    if (productCount > 0) {
      throw new Error(`Cannot delete brand with ${productCount} associated products`);
    }

    await Brand.findByIdAndDelete(brandId);
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

    const query = {
      brandId,
      status
    };

    const sortField = {
      name: 'name',
      price: 'price',
      created: 'createdAt'
    }[sortBy];

    const sortDirection = sortOrder === 'asc' ? 1 : -1;

    const [productsResult, total] = await Promise.all([
      Product.find(query)
        .sort({ [sortField]: sortDirection })
        .limit(limit)
        .skip(offset)
        .lean(),
      Product.countDocuments(query)
    ]);

    return {
      products: productsResult.map(p => ({ id: p._id.toString(), ...p })),
      total,
      pagination: {
        limit,
        offset,
        hasMore: total > offset + limit
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
