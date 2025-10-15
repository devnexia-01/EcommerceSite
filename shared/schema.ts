import { z } from "zod";

// MongoDB-only schema - re-exporting types from MongoDB models
export type {
  IUser as User,
  ICategory as Category,
  IBrand as Brand,
  IProduct as Product,
  IAddress as Address,
  ICart as Cart,
  ICartItem as CartItem,
  IOrder as Order,
  IOrderItem as OrderItem,
  IReview as Review,
  IWishlist as Wishlist,
  IWishlistItem as WishlistItem,
  IUserSettings as UserSettings,
  IUserPreferences as UserPreferences,
  IRefreshToken as RefreshToken,
  IPasswordResetToken as PasswordResetToken,
  ILoginSession as LoginSession,
  IAdminUser as AdminUser,
  IAdminRole as AdminRole,
  ISystemConfig as SystemConfig,
  IAuditLog as AuditLog,
  ISecurityLog as SecurityLog,
  IUserActivity as UserActivity,
  IContent as Content,
  IMedia as Media,
  IIpBlacklist as IpBlacklist,
  IBackupLog as BackupLog,
  IPaymentTransaction as PaymentTransaction,
  ICoupon as Coupon,
  IEnhancedCartItem as EnhancedCartItem
} from '../server/models/index';

// Insert types (for backwards compatibility - these are just the model types)
export type InsertUser = Partial<import('../server/models/index').IUser>;
export type InsertCategory = Partial<import('../server/models/index').ICategory>;
export type InsertBrand = Partial<import('../server/models/index').IBrand>;
export type InsertProduct = Partial<import('../server/models/index').IProduct>;
export type InsertAddress = Partial<import('../server/models/index').IAddress>;
export type InsertCart = Partial<import('../server/models/index').ICart>;
export type InsertCartItem = Partial<import('../server/models/index').ICartItem>;
export type InsertOrder = Partial<import('../server/models/index').IOrder>;
export type InsertOrderItem = Partial<import('../server/models/index').IOrderItem>;
export type InsertReview = Partial<import('../server/models/index').IReview>;
export type InsertWishlist = Partial<import('../server/models/index').IWishlist>;
export type InsertWishlistItem = Partial<import('../server/models/index').IWishlistItem>;
export type InsertPaymentTransaction = Partial<import('../server/models/index').IPaymentTransaction>;

// Validation schemas for frontend forms
export const insertProductSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  price: z.number().min(0),
  stock: z.number().int().min(0).default(0),
  categoryId: z.string().optional(),
  brandId: z.string().optional(),
  imageUrl: z.string().optional(),
  images: z.array(z.string()).default([]),
  status: z.enum(["active", "inactive", "draft"]).default("active")
});

export const insertCategorySchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  emoji: z.string().optional(),
  parentId: z.string().optional(),
  imageUrl: z.string().optional(),
  status: z.enum(["active", "inactive"]).default("active")
});

export const createAdminUserSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(50),
  password: z.string().min(8).max(100),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  roles: z.array(z.string()).default([]),
  permissions: z.array(z.string()).default([])
});

export const insertContentSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  content: z.string(),
  type: z.enum(["page", "post", "faq"]),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  authorId: z.string().optional(),
  categories: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([])
});
