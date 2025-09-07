import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, decimal, integer, boolean, timestamp, jsonb, uuid, date, bigint } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table - Enhanced with comprehensive profile data
export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  
  // Profile information
  firstName: text("first_name"),
  lastName: text("last_name"),
  phoneNumber: text("phone_number"),
  dateOfBirth: date("date_of_birth"),
  gender: text("gender"), // enum: male, female, other, prefer_not_to_say
  avatarUrl: text("avatar_url"),
  
  // System fields
  isAdmin: boolean("is_admin").default(false),
  
  // Security fields
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  twoFactorSecret: text("two_factor_secret"),
  lastPasswordChange: timestamp("last_password_change").default(sql`now()`),
  loginAttempts: integer("login_attempts").default(0),
  accountLocked: boolean("account_locked").default(false),
  lockoutUntil: timestamp("lockout_until"),
  
  // Verification status
  emailVerified: boolean("email_verified").default(false),
  phoneVerified: boolean("phone_verified").default(false),
  emailVerificationToken: text("email_verification_token"),
  phoneVerificationToken: text("phone_verification_token"),
  
  // Metadata
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
  lastLoginAt: timestamp("last_login_at")
});

// Categories table - Enhanced with parent-child relationship
export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  emoji: text("emoji"),
  parentId: uuid("parent_id"),
  imageUrl: text("image_url"),
  status: text("status").default("active"), // active, inactive
  sortOrder: integer("sort_order").default(0),
  seo: jsonb("seo").$type<{
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
  }>(),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`)
});

// Brands table
export const brands = pgTable("brands", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  logo: text("logo"),
  website: text("website"),
  status: text("status").default("active"),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`)
});

// Products table - Enhanced with comprehensive product model
export const products = pgTable("products", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  sku: text("sku").notNull().unique(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  shortDescription: text("short_description"),
  categories: jsonb("categories").$type<string[]>().default([]),
  brandId: uuid("brand_id").references(() => brands.id),
  
  // Pricing
  basePrice: decimal("base_price", { precision: 10, scale: 2 }),
  salePrice: decimal("sale_price", { precision: 10, scale: 2 }),
  currency: text("currency").default("USD"),
  taxRate: decimal("tax_rate", { precision: 5, scale: 4 }).default("0"),
  
  // Legacy fields for backward compatibility
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  comparePrice: decimal("compare_price", { precision: 10, scale: 2 }),
  stock: integer("stock").default(0),
  categoryId: uuid("category_id").references(() => categories.id),
  imageUrl: text("image_url"),
  images: jsonb("images").$type<string[]>().default([]),
  
  // Enhanced attributes
  attributes: jsonb("attributes").$type<{
    weight?: number;
    dimensions?: {
      length: number;
      width: number;
      height: number;
    };
    materials?: string[];
    features?: string[];
    warranty?: string;
  }>(),
  
  // SEO
  seo: jsonb("seo").$type<{
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
  }>(),
  
  // Ratings and reviews
  rating: decimal("rating", { precision: 2, scale: 1 }).default("0"),
  reviewCount: integer("review_count").default(0),
  
  // Status and metadata
  status: text("status").default("active"), // active, draft, archived
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`)
});

// Product variants table
export const productVariants = pgTable("product_variants", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: uuid("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
  sku: text("sku").notNull().unique(),
  
  // Variant attributes
  attributes: jsonb("attributes").$type<{
    color?: string;
    size?: string;
    material?: string;
    [key: string]: any;
  }>(),
  
  // Pricing
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  compareAtPrice: decimal("compare_at_price", { precision: 10, scale: 2 }),
  
  // Inventory
  quantity: integer("quantity").default(0),
  reserved: integer("reserved").default(0),
  
  // Media
  media: jsonb("media").$type<string[]>().default([]),
  
  status: text("status").default("active"),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`)
});

// Product media table
export const productMedia = pgTable("product_media", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: uuid("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
  type: text("type").notNull(), // image, video, 3d
  url: text("url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  alt: text("alt"),
  position: integer("position").default(0),
  createdAt: timestamp("created_at").default(sql`now()`)
});

// User preferences table
export const userPreferences = pgTable("user_preferences", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull().unique(),
  language: text("language").default("en"),
  currency: text("currency").default("USD"),
  timezone: text("timezone").default("UTC"),
  
  // Basic notification preferences
  emailNotifications: boolean("email_notifications").default(true),
  smsNotifications: boolean("sms_notifications").default(false),
  pushNotifications: boolean("push_notifications").default(true),
  
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`)
});

// User settings table for advanced preferences
export const userSettings = pgTable("user_settings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull().unique(),
  
  // Notification preferences
  orderUpdates: boolean("order_updates").default(true),
  promotionalEmails: boolean("promotional_emails").default(false),
  productRecommendations: boolean("product_recommendations").default(true),
  securityAlerts: boolean("security_alerts").default(true),
  
  // Privacy settings
  dataAnalytics: boolean("data_analytics").default(false),
  personalizedRecommendations: boolean("personalized_recommendations").default(true),
  marketingCommunications: boolean("marketing_communications").default(false),
  activityTracking: boolean("activity_tracking").default(false),
  
  // Preferences
  theme: text("theme").default("system"), // light, dark, system
  language: text("language").default("en"),
  
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`)
});

// Addresses table - Enhanced
export const addresses = pgTable("addresses", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  type: text("type").notNull(), // shipping, billing
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  streetAddress: text("street_address").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  zipCode: text("zip_code").notNull(),
  country: text("country").notNull().default("US"),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`)
});

// Refresh tokens table
export const refreshTokens = pgTable("refresh_tokens", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  deviceInfo: text("device_info"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").default(sql`now()`)
});

// Password reset tokens table
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false),
  createdAt: timestamp("created_at").default(sql`now()`)
});

// Login sessions table
export const loginSessions = pgTable("login_sessions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  sessionToken: text("session_token").notNull().unique(),
  deviceInfo: text("device_info"),
  ipAddress: text("ip_address"),
  location: text("location"),
  expiresAt: timestamp("expires_at").notNull(),
  lastActiveAt: timestamp("last_active_at").default(sql`now()`),
  createdAt: timestamp("created_at").default(sql`now()`)
});

// Cart items table
export const cartItems = pgTable("cart_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  productId: uuid("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
  quantity: integer("quantity").notNull().default(1),
  createdAt: timestamp("created_at").default(sql`now()`)
});

// Orders table
export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  orderNumber: text("order_number").notNull().unique(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  status: text("status").default("pending"), // pending, processing, shipped, delivered, cancelled
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  shipping: decimal("shipping", { precision: 10, scale: 2 }).default("0"),
  tax: decimal("tax", { precision: 10, scale: 2 }).default("0"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  shippingAddress: jsonb("shipping_address").$type<{
    firstName: string;
    lastName: string;
    streetAddress: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  }>().notNull(),
  createdAt: timestamp("created_at").default(sql`now()`)
});

// Order items table
export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: uuid("order_id").references(() => orders.id, { onDelete: "cascade" }).notNull(),
  productId: uuid("product_id").references(() => products.id).notNull(),
  quantity: integer("quantity").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull()
});

// Reviews table
export const reviews = pgTable("reviews", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  productId: uuid("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
  rating: integer("rating").notNull(),
  title: text("title"),
  comment: text("comment"),
  createdAt: timestamp("created_at").default(sql`now()`)
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  preferences: one(userPreferences),
  settings: one(userSettings),
  addresses: many(addresses),
  cartItems: many(cartItems),
  orders: many(orders),
  reviews: many(reviews),
  refreshTokens: many(refreshTokens),
  passwordResetTokens: many(passwordResetTokens),
  loginSessions: many(loginSessions)
}));

export const userPreferencesRelations = relations(userPreferences, ({ one }) => ({
  user: one(users, {
    fields: [userPreferences.userId],
    references: [users.id]
  })
}));

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
  user: one(users, {
    fields: [userSettings.userId],
    references: [users.id]
  })
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id]
  }),
  children: many(categories),
  products: many(products)
}));

export const brandsRelations = relations(brands, ({ many }) => ({
  products: many(products)
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id]
  }),
  brand: one(brands, {
    fields: [products.brandId],
    references: [brands.id]
  }),
  variants: many(productVariants),
  media: many(productMedia),
  cartItems: many(cartItems),
  orderItems: many(orderItems),
  reviews: many(reviews)
}));

export const productVariantsRelations = relations(productVariants, ({ one }) => ({
  product: one(products, {
    fields: [productVariants.productId],
    references: [products.id]
  })
}));

export const productMediaRelations = relations(productMedia, ({ one }) => ({
  product: one(products, {
    fields: [productMedia.productId],
    references: [products.id]
  })
}));

export const addressesRelations = relations(addresses, ({ one }) => ({
  user: one(users, {
    fields: [addresses.userId],
    references: [users.id]
  })
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id]
  })
}));

export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
  user: one(users, {
    fields: [passwordResetTokens.userId],
    references: [users.id]
  })
}));

export const loginSessionsRelations = relations(loginSessions, ({ one }) => ({
  user: one(users, {
    fields: [loginSessions.userId],
    references: [users.id]
  })
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  user: one(users, {
    fields: [cartItems.userId],
    references: [users.id]
  }),
  product: one(products, {
    fields: [cartItems.productId],
    references: [products.id]
  })
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id]
  }),
  orderItems: many(orderItems)
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id]
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id]
  })
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  user: one(users, {
    fields: [reviews.userId],
    references: [users.id]
  }),
  product: one(products, {
    fields: [reviews.productId],
    references: [products.id]
  })
}));

// Schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastLoginAt: true,
  twoFactorSecret: true,
  emailVerificationToken: true,
  phoneVerificationToken: true,
  lockoutUntil: true
});

export const insertUserPreferencesSchema = createInsertSchema(userPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertUserSettingsSchema = createInsertSchema(userSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertRefreshTokenSchema = createInsertSchema(refreshTokens).omit({
  id: true,
  createdAt: true
});

export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({
  id: true,
  createdAt: true
});

export const insertLoginSessionSchema = createInsertSchema(loginSessions).omit({
  id: true,
  createdAt: true,
  lastActiveAt: true
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true
});

export const insertBrandSchema = createInsertSchema(brands).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertProductVariantSchema = createInsertSchema(productVariants).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertProductMediaSchema = createInsertSchema(productMedia).omit({
  id: true,
  createdAt: true
});

export const insertAddressSchema = createInsertSchema(addresses).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertCartItemSchema = createInsertSchema(cartItems).omit({
  id: true,
  createdAt: true
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true
});

export const insertOrderItemSchema = createInsertSchema(orderItems).omit({
  id: true
});

export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  createdAt: true
});

// Auth validation schemas
export const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(50),
  password: z.string().min(8).max(100),
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional()
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  twoFactorCode: z.string().length(6).optional()
});

export const forgotPasswordSchema = z.object({
  email: z.string().email()
});

export const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8).max(100)
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password")
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const verifyEmailSchema = z.object({
  token: z.string()
});

export const enable2FASchema = z.object({
  code: z.string().length(6)
});

// Admin roles table
export const adminRoles = pgTable("admin_roles", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  description: text("description"),
  permissions: jsonb("permissions").$type<string[]>().default([]),
  isSystem: boolean("is_system").default(false),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`)
});

// Admin permissions table
export const adminPermissions = pgTable("admin_permissions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  resource: text("resource").notNull(), // users, products, orders, etc.
  action: text("action").notNull(), // create, read, update, delete, manage
  description: text("description")
});

// Admin users table (enhanced admins)
export const adminUsers = pgTable("admin_users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull().unique(),
  roles: jsonb("roles").$type<string[]>().default([]),
  permissions: jsonb("permissions").$type<string[]>().default([]),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`)
});

// System configuration table
export const systemConfig = pgTable("system_config", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  category: text("category").notNull(),
  key: text("key").notNull(),
  value: jsonb("value"),
  type: text("type").notNull(), // string, number, boolean, object, array
  description: text("description"),
  isPublic: boolean("is_public").default(false),
  validation: jsonb("validation").$type<{
    required?: boolean;
    pattern?: string;
    min?: number;
    max?: number;
  }>(),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
  updatedBy: uuid("updated_by").references(() => users.id)
});

// Audit logs table
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  action: text("action").notNull(),
  resource: text("resource").notNull(),
  resourceId: uuid("resource_id"),
  actorId: uuid("actor_id"),
  actorType: text("actor_type").notNull(), // admin, user, system
  actorName: text("actor_name"),
  changes: jsonb("changes").$type<{
    before?: any;
    after?: any;
  }>(),
  context: jsonb("context").$type<{
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
  }>(),
  severity: text("severity").default("low"), // low, medium, high, critical
  category: text("category"),
  timestamp: timestamp("timestamp").default(sql`now()`)
});

// Content management table (for CMS functionality)
export const content = pgTable("content", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  type: text("type").notNull(), // article, page, product, media
  status: text("status").default("draft"), // draft, published, archived
  body: text("body"),
  excerpt: text("excerpt"),
  featuredImage: text("featured_image"),
  metadata: jsonb("metadata"),
  seoMetaTitle: text("seo_meta_title"),
  seoMetaDescription: text("seo_meta_description"),
  seoKeywords: jsonb("seo_keywords").$type<string[]>().default([]),
  categories: jsonb("categories").$type<string[]>().default([]),
  tags: jsonb("tags").$type<string[]>().default([]),
  authorId: uuid("author_id").references(() => users.id),
  publishedAt: timestamp("published_at"),
  scheduledAt: timestamp("scheduled_at"),
  expiresAt: timestamp("expires_at"),
  viewCount: integer("view_count").default(0),
  version: integer("version").default(1),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`)
});

// Media management table
export const media = pgTable("media", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  filename: text("filename").notNull(),
  originalFilename: text("original_filename").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(), // in bytes
  url: text("url").notNull(),
  alt: text("alt"),
  caption: text("caption"),
  metadata: jsonb("metadata"),
  uploadedBy: uuid("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").default(sql`now()`)
});

// User activity/statistics tracking (for admin dashboard)
export const userActivity = pgTable("user_activity", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  action: text("action").notNull(), // login, logout, purchase, view_product, etc.
  resource: text("resource"), // product_id, page_url, etc.
  metadata: jsonb("metadata"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").default(sql`now()`)
});

// Security monitoring table
export const securityLogs = pgTable("security_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // failed_login, suspicious_activity, etc.
  severity: text("severity").notNull(), // low, medium, high, critical
  description: text("description").notNull(),
  userId: uuid("user_id").references(() => users.id),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  metadata: jsonb("metadata"),
  resolved: boolean("resolved").default(false),
  resolvedBy: uuid("resolved_by").references(() => users.id),
  resolvedAt: timestamp("resolved_at"),
  timestamp: timestamp("timestamp").default(sql`now()`)
});

// IP blacklist table
export const ipBlacklist = pgTable("ip_blacklist", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  ipAddress: text("ip_address").notNull().unique(),
  reason: text("reason"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").default(sql`now()`)
});

// System backup logs
export const backupLogs = pgTable("backup_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // full, incremental
  status: text("status").notNull(), // pending, running, completed, failed
  size: bigint("size", { mode: "number" }),
  location: text("location"),
  startedAt: timestamp("started_at").default(sql`now()`),
  completedAt: timestamp("completed_at"),
  error: text("error"),
  triggeredBy: uuid("triggered_by").references(() => users.id)
});

// Relations for new tables
export const adminRolesRelations = relations(adminRoles, ({ many }) => ({
  adminUsers: many(adminUsers)
}));

export const adminUsersRelations = relations(adminUsers, ({ one }) => ({
  user: one(users, {
    fields: [adminUsers.userId],
    references: [users.id]
  })
}));

export const contentRelations = relations(content, ({ one }) => ({
  author: one(users, {
    fields: [content.authorId],
    references: [users.id]
  })
}));

export const mediaRelations = relations(media, ({ one }) => ({
  uploadedBy: one(users, {
    fields: [media.uploadedBy],
    references: [users.id]
  })
}));

export const userActivityRelations = relations(userActivity, ({ one }) => ({
  user: one(users, {
    fields: [userActivity.userId],
    references: [users.id]
  })
}));

export const securityLogsRelations = relations(securityLogs, ({ one }) => ({
  user: one(users, {
    fields: [securityLogs.userId],
    references: [users.id]
  }),
  resolvedBy: one(users, {
    fields: [securityLogs.resolvedBy],
    references: [users.id]
  })
}));

// Schemas for new tables
export const insertAdminRoleSchema = createInsertSchema(adminRoles).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertAdminUserSchema = createInsertSchema(adminUsers).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertSystemConfigSchema = createInsertSchema(systemConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  timestamp: true
});

export const insertContentSchema = createInsertSchema(content).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertMediaSchema = createInsertSchema(media).omit({
  id: true,
  createdAt: true
});

export const insertUserActivitySchema = createInsertSchema(userActivity).omit({
  id: true,
  timestamp: true
});

export const insertSecurityLogSchema = createInsertSchema(securityLogs).omit({
  id: true,
  timestamp: true
});

export const insertIpBlacklistSchema = createInsertSchema(ipBlacklist).omit({
  id: true,
  createdAt: true
});

export const insertBackupLogSchema = createInsertSchema(backupLogs).omit({
  id: true,
  startedAt: true
});

// Admin validation schemas
export const adminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  twoFactorCode: z.string().length(6).optional()
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

export const updateUserStatusSchema = z.object({
  status: z.enum(["active", "suspended", "banned", "pending"]),
  reason: z.string().optional()
});

export const bulkUserOperationSchema = z.object({
  userIds: z.array(z.string()),
  operation: z.enum(["activate", "suspend", "delete", "export"]),
  reason: z.string().optional()
});

export const systemConfigUpdateSchema = z.object({
  category: z.string(),
  key: z.string(),
  value: z.any(),
  type: z.enum(["string", "number", "boolean", "object", "array"]),
  description: z.string().optional(),
  isPublic: z.boolean().default(false)
});

// Types for new tables
export type AdminRole = typeof adminRoles.$inferSelect;
export type InsertAdminRole = z.infer<typeof insertAdminRoleSchema>;

export type AdminUser = typeof adminUsers.$inferSelect;
export type InsertAdminUser = z.infer<typeof insertAdminUserSchema>;

export type SystemConfig = typeof systemConfig.$inferSelect;
export type InsertSystemConfig = z.infer<typeof insertSystemConfigSchema>;

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

export type Content = typeof content.$inferSelect;
export type InsertContent = z.infer<typeof insertContentSchema>;

export type Media = typeof media.$inferSelect;
export type InsertMedia = z.infer<typeof insertMediaSchema>;

export type UserActivity = typeof userActivity.$inferSelect;
export type InsertUserActivity = z.infer<typeof insertUserActivitySchema>;

export type SecurityLog = typeof securityLogs.$inferSelect;
export type InsertSecurityLog = z.infer<typeof insertSecurityLogSchema>;

export type IpBlacklist = typeof ipBlacklist.$inferSelect;
export type InsertIpBlacklist = z.infer<typeof insertIpBlacklistSchema>;

export type BackupLog = typeof backupLogs.$inferSelect;
export type InsertBackupLog = z.infer<typeof insertBackupLogSchema>;

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type UserPreferences = typeof userPreferences.$inferSelect;
export type InsertUserPreferences = z.infer<typeof insertUserPreferencesSchema>;

export type UserSettings = typeof userSettings.$inferSelect;
export type InsertUserSettings = z.infer<typeof insertUserSettingsSchema>;

export type RefreshToken = typeof refreshTokens.$inferSelect;
export type InsertRefreshToken = z.infer<typeof insertRefreshTokenSchema>;

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;

export type LoginSession = typeof loginSessions.$inferSelect;
export type InsertLoginSession = z.infer<typeof insertLoginSessionSchema>;

export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type Address = typeof addresses.$inferSelect;
export type InsertAddress = z.infer<typeof insertAddressSchema>;

export type CartItem = typeof cartItems.$inferSelect;
export type InsertCartItem = z.infer<typeof insertCartItemSchema>;

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;

export type Review = typeof reviews.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;
