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
  
  // OTP verification for signup and forgot password
  verificationOTP: text("verification_otp"),
  otpExpiresAt: timestamp("otp_expires_at"),
  failedOtpAttempts: integer("failed_otp_attempts").default(0),
  
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

// Enhanced Cart table - Main cart entity
export const carts = pgTable("carts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`), // cartId
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  sessionId: text("session_id"), // For guest carts
  
  // Summary calculations
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).default("0"),
  tax: decimal("tax", { precision: 10, scale: 2 }).default("0"),
  shipping: decimal("shipping", { precision: 10, scale: 2 }).default("0"),
  discount: decimal("discount", { precision: 10, scale: 2 }).default("0"),
  total: decimal("total", { precision: 10, scale: 2 }).default("0"),
  
  // Metadata
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
  expiresAt: timestamp("expires_at"), // Cart expiration
  abandoned: boolean("abandoned").default(false),
  
  // Additional fields
  currency: text("currency").default("USD"),
  notes: text("notes")
});

// Enhanced Cart Items table
export const enhancedCartItems = pgTable("enhanced_cart_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`), // itemId
  cartId: uuid("cart_id").references(() => carts.id, { onDelete: "cascade" }).notNull(),
  productId: uuid("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
  variantId: uuid("variant_id"), // For product variants
  quantity: integer("quantity").notNull().default(1),
  
  // Pricing at time of adding to cart
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  discount: decimal("discount", { precision: 10, scale: 2 }).default("0"),
  
  // Customization options
  customization: jsonb("customization").$type<{
    engraving?: string;
    giftWrap?: boolean;
    giftMessage?: string;
    color?: string;
    size?: string;
    [key: string]: any;
  }>(),
  
  // Metadata
  addedAt: timestamp("added_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
  
  // Save for later functionality
  savedForLater: boolean("saved_for_later").default(false),
  savedAt: timestamp("saved_at")
});

// Coupons table
export const coupons = pgTable("coupons", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  
  // Discount configuration
  type: text("type").notNull(), // percentage, fixed, free_shipping
  value: decimal("value", { precision: 10, scale: 2 }).notNull(),
  minOrderAmount: decimal("min_order_amount", { precision: 10, scale: 2 }),
  maxDiscount: decimal("max_discount", { precision: 10, scale: 2 }),
  
  // Usage limits
  usageLimit: integer("usage_limit"), // null = unlimited
  usedCount: integer("used_count").default(0),
  userUsageLimit: integer("user_usage_limit"), // per user limit
  
  // Validity
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  active: boolean("active").default(true),
  
  // Restrictions
  applicableProducts: jsonb("applicable_products").$type<string[]>(),
  applicableCategories: jsonb("applicable_categories").$type<string[]>(),
  excludeProducts: jsonb("exclude_products").$type<string[]>(),
  
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`)
});

// Cart Coupons junction table
export const cartCoupons = pgTable("cart_coupons", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  cartId: uuid("cart_id").references(() => carts.id, { onDelete: "cascade" }).notNull(),
  couponId: uuid("coupon_id").references(() => coupons.id, { onDelete: "cascade" }).notNull(),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).notNull(),
  appliedAt: timestamp("applied_at").default(sql`now()`)
});

// Legacy Cart items table (keep for backward compatibility)
export const cartItems = pgTable("cart_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  productId: uuid("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
  quantity: integer("quantity").notNull().default(1),
  createdAt: timestamp("created_at").default(sql`now()`)
});

// Enhanced Orders table with comprehensive order management
export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  orderNumber: text("order_number").notNull().unique(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  
  // Order status and type
  status: text("status").default("pending"), // pending|confirmed|processing|shipped|delivered|cancelled|returned|refunded
  type: text("type").default("standard"), // standard|express|priority|subscription
  channel: text("channel").default("web"), // web|mobile|api|phone|store
  currency: text("currency").default("USD"),
  
  // Pricing breakdown
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  shipping: decimal("shipping", { precision: 10, scale: 2 }).default("0"),
  tax: decimal("tax", { precision: 10, scale: 2 }).default("0"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  
  // Tax breakdown
  taxBreakdown: jsonb("tax_breakdown").$type<Array<{
    type: string;
    rate: string;
    amount: string;
  }>>(),
  
  // Shipping details
  shippingMethod: text("shipping_method"),
  shippingCarrier: text("shipping_carrier"),
  estimatedDeliveryDays: integer("estimated_delivery_days"),
  
  // Addresses
  billingAddress: jsonb("billing_address").$type<{
    firstName: string;
    lastName: string;
    company?: string;
    streetAddress: string;
    streetAddress2?: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    phone?: string;
  }>().notNull(),
  
  shippingAddress: jsonb("shipping_address").$type<{
    firstName: string;
    lastName: string;
    company?: string;
    streetAddress: string;
    streetAddress2?: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    phone?: string;
    instructions?: string;
  }>().notNull(),
  
  // Payment information
  paymentMethod: text("payment_method"), // credit_card|debit_card|paypal|apple_pay|google_pay|bank_transfer|cash_on_delivery
  paymentStatus: text("payment_status").default("pending"), // pending|authorized|captured|failed|refunded|partially_refunded
  paymentTransactionId: text("payment_transaction_id"),
  paymentGateway: text("payment_gateway"),
  paymentLast4: text("payment_last4"),
  paymentCardType: text("payment_card_type"),
  paymentAuthCode: text("payment_auth_code"),
  capturedAmount: decimal("captured_amount", { precision: 10, scale: 2 }),
  refundedAmount: decimal("refunded_amount", { precision: 10, scale: 2 }).default("0"),
  
  // Fulfillment
  warehouseId: uuid("warehouse_id"),
  trackingNumber: text("tracking_number"),
  trackingCarrier: text("tracking_carrier"),
  trackingService: text("tracking_service"),
  estimatedDelivery: timestamp("estimated_delivery"),
  actualDelivery: timestamp("actual_delivery"),
  deliverySignature: text("delivery_signature"),
  specialInstructions: text("special_instructions"),
  
  // Discounts
  discounts: jsonb("discounts").$type<Array<{
    discountId: string;
    code: string;
    type: string;
    amount: string;
    description: string;
  }>>(),
  
  // Metadata and timeline
  priority: text("priority").default("normal"), // low|normal|high|urgent
  riskScore: decimal("risk_score", { precision: 3, scale: 2 }),
  fraudCheckStatus: text("fraud_check_status").default("pending"), // pending|passed|flagged|failed
  fraudCheckScore: decimal("fraud_check_score", { precision: 3, scale: 2 }),
  fraudCheckReasons: jsonb("fraud_check_reasons").$type<string[]>(),
  
  // Timestamps
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
  confirmedAt: timestamp("confirmed_at"),
  shippedAt: timestamp("shipped_at"),
  deliveredAt: timestamp("delivered_at"),
  cancelledAt: timestamp("cancelled_at"),
  
  // Additional fields
  source: text("source"), // Source that created the order
  notes: text("notes"),
  tags: jsonb("tags").$type<string[]>()
});

// Enhanced Order items table
export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: uuid("order_id").references(() => orders.id, { onDelete: "cascade" }).notNull(),
  productId: uuid("product_id").references(() => products.id).notNull(),
  variantId: uuid("variant_id"), // For product variants
  sku: text("sku").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  weight: decimal("weight", { precision: 8, scale: 3 }),
  
  // Item dimensions
  dimensions: jsonb("dimensions").$type<{
    length: number;
    width: number;
    height: number;
  }>(),
  
  // Customization options
  customization: jsonb("customization").$type<{
    options: Record<string, any>;
    instructions?: string;
  }>(),
  
  // Item status
  status: text("status").default("pending"), // pending|confirmed|cancelled|returned
  
  // Legacy compatibility
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull()
});

// Returns table
export const returns = pgTable("returns", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  returnNumber: text("return_number").notNull().unique(),
  orderId: uuid("order_id").references(() => orders.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  status: text("status").default("requested"), // requested|approved|rejected|received|processing|completed|cancelled
  type: text("type").default("return"), // return|exchange|refund
  reason: text("reason"), // defective|wrong_item|damaged|not_as_described|changed_mind|size_issue|quality_issue|other
  
  // Refund details
  refundAmount: decimal("refund_amount", { precision: 10, scale: 2 }),
  refundMethod: text("refund_method"), // original_payment|store_credit|bank_transfer|check
  refundStatus: text("refund_status").default("pending"), // pending|processed|failed|cancelled
  refundTransactionId: text("refund_transaction_id"),
  refundProcessedAt: timestamp("refund_processed_at"),
  
  // Fees
  restockingFee: decimal("restocking_fee", { precision: 10, scale: 2 }).default("0"),
  shippingFee: decimal("shipping_fee", { precision: 10, scale: 2 }).default("0"),
  processingFee: decimal("processing_fee", { precision: 10, scale: 2 }).default("0"),
  
  // Shipping info
  returnTrackingNumber: text("return_tracking_number"),
  returnCarrier: text("return_carrier"),
  returnShippingLabel: text("return_shipping_label"),
  returnShippingCost: decimal("return_shipping_cost", { precision: 10, scale: 2 }),
  shippingPaidBy: text("shipping_paid_by"), // customer|merchant
  
  // Customer notes and photos
  customerNotes: text("customer_notes"),
  internalNotes: text("internal_notes"),
  photos: jsonb("photos").$type<string[]>(),
  attachments: jsonb("attachments").$type<string[]>(),
  
  // Timestamps
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
  requestedAt: timestamp("requested_at").default(sql`now()`),
  approvedAt: timestamp("approved_at"),
  receivedAt: timestamp("received_at"),
  completedAt: timestamp("completed_at")
});

// Return items table
export const returnItems = pgTable("return_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  returnId: uuid("return_id").references(() => returns.id, { onDelete: "cascade" }).notNull(),
  orderItemId: uuid("order_item_id").references(() => orderItems.id).notNull(),
  productId: uuid("product_id").references(() => products.id).notNull(),
  sku: text("sku").notNull(),
  name: text("name").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  refundAmount: decimal("refund_amount", { precision: 10, scale: 2 }).notNull(),
  condition: text("condition"), // new|used|damaged|defective
  photos: jsonb("photos").$type<string[]>(),
  notes: text("notes")
});

// Invoices table
export const invoices = pgTable("invoices", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceNumber: text("invoice_number").notNull().unique(),
  orderId: uuid("order_id").references(() => orders.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  status: text("status").default("draft"), // draft|sent|paid|overdue|cancelled|void
  type: text("type").default("invoice"), // invoice|credit_note|proforma
  currency: text("currency").default("USD"),
  
  // Customer info
  customerInfo: jsonb("customer_info").$type<{
    name: string;
    email: string;
    phone?: string;
    address: {
      streetAddress: string;
      city: string;
      state: string;
      zipCode: string;
      country: string;
    };
    taxId?: string;
    vatNumber?: string;
  }>().notNull(),
  
  // Merchant info
  merchantInfo: jsonb("merchant_info").$type<{
    name: string;
    address: {
      streetAddress: string;
      city: string;
      state: string;
      zipCode: string;
      country: string;
    };
    taxId?: string;
    vatNumber?: string;
    phone?: string;
    email?: string;
    website?: string;
  }>().notNull(),
  
  // Summary
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  discountTotal: decimal("discount_total", { precision: 10, scale: 2 }).default("0"),
  taxTotal: decimal("tax_total", { precision: 10, scale: 2 }).default("0"),
  shippingTotal: decimal("shipping_total", { precision: 10, scale: 2 }).default("0"),
  grandTotal: decimal("grand_total", { precision: 10, scale: 2 }).notNull(),
  
  // Payment
  paymentTerms: text("payment_terms"),
  dueDate: date("due_date"),
  paidAmount: decimal("paid_amount", { precision: 10, scale: 2 }).default("0"),
  remainingAmount: decimal("remaining_amount", { precision: 10, scale: 2 }),
  paidAt: timestamp("paid_at"),
  
  // Metadata
  notes: text("notes"),
  terms: text("terms"),
  template: text("template"),
  language: text("language").default("en"),
  pdfUrl: text("pdf_url"),
  
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
  issuedAt: timestamp("issued_at"),
  sentAt: timestamp("sent_at")
});

// Invoice line items table
export const invoiceLineItems = pgTable("invoice_line_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: uuid("invoice_id").references(() => invoices.id, { onDelete: "cascade" }).notNull(),
  productId: uuid("product_id").references(() => products.id),
  sku: text("sku"),
  description: text("description").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  discount: decimal("discount", { precision: 10, scale: 2 }).default("0"),
  taxRate: decimal("tax_rate", { precision: 5, scale: 4 }).default("0"),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).default("0"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull()
});

// Tracking table
export const tracking = pgTable("tracking", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  trackingNumber: text("tracking_number").notNull().unique(),
  orderId: uuid("order_id").references(() => orders.id).notNull(),
  carrier: text("carrier").notNull(),
  service: text("service"),
  status: text("status").default("label_created"), // label_created|picked_up|in_transit|out_for_delivery|delivered|exception|returned|cancelled
  
  // Origin and destination
  origin: jsonb("origin").$type<{
    name: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  }>(),
  
  destination: jsonb("destination").$type<{
    name: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  }>(),
  
  // Package details
  packageDetails: jsonb("package_details").$type<{
    weight: number;
    dimensions: {
      length: number;
      width: number;
      height: number;
    };
    value: number;
    description: string;
  }>(),
  
  // Delivery details
  estimatedDeliveryDate: timestamp("estimated_delivery_date"),
  actualDeliveryDate: timestamp("actual_delivery_date"),
  signedBy: text("signed_by"),
  deliveryNote: text("delivery_note"),
  deliveryPhotoUrl: text("delivery_photo_url"),
  attemptCount: integer("attempt_count").default(0),
  lastAttempt: timestamp("last_attempt"),
  
  // Metadata
  webhookUrl: text("webhook_url"),
  externalTrackingUrl: text("external_tracking_url"),
  lastChecked: timestamp("last_checked"),
  
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`)
});

// Tracking events table
export const trackingEvents = pgTable("tracking_events", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  trackingId: uuid("tracking_id").references(() => tracking.id, { onDelete: "cascade" }).notNull(),
  status: text("status").notNull(),
  description: text("description").notNull(),
  
  // Location details
  location: jsonb("location").$type<{
    city?: string;
    state?: string;
    country?: string;
    facility?: string;
  }>(),
  
  timestamp: timestamp("timestamp").notNull(),
  details: text("details"),
  
  createdAt: timestamp("created_at").default(sql`now()`)
});

// Order status history table
export const orderStatusHistory = pgTable("order_status_history", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: uuid("order_id").references(() => orders.id, { onDelete: "cascade" }).notNull(),
  fromStatus: text("from_status"),
  toStatus: text("to_status").notNull(),
  reason: text("reason"),
  notes: text("notes"),
  
  // Actor information
  triggeredById: uuid("triggered_by_id"),
  triggeredByType: text("triggered_by_type"), // user|admin|system|webhook
  triggeredByName: text("triggered_by_name"),
  
  // Automation details
  isAutomated: boolean("is_automated").default(false),
  ruleId: uuid("rule_id"),
  ruleName: text("rule_name"),
  
  // Notifications
  customerNotified: boolean("customer_notified").default(false),
  merchantNotified: boolean("merchant_notified").default(false),
  notificationMethods: jsonb("notification_methods").$type<string[]>(),
  
  // Metadata
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  source: text("source"),
  
  timestamp: timestamp("timestamp").default(sql`now()`)
});

// Shipments table
export const shipments = pgTable("shipments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  shipmentNumber: text("shipment_number").notNull().unique(),
  orderId: uuid("order_id").references(() => orders.id).notNull(),
  status: text("status").default("created"), // created|picked|packed|shipped|in_transit|delivered|exception|returned
  type: text("type").default("standard"), // standard|expedited|overnight|international
  
  // Packaging details
  packagingType: text("packaging_type"), // envelope|box|tube|pallet
  packagingWeight: decimal("packaging_weight", { precision: 8, scale: 3 }),
  packagingDimensions: jsonb("packaging_dimensions").$type<{
    length: number;
    width: number;
    height: number;
  }>(),
  packagingMaterials: jsonb("packaging_materials").$type<string[]>(),
  
  // Carrier details
  carrierName: text("carrier_name"),
  carrierService: text("carrier_service"),
  carrierAccount: text("carrier_account"),
  trackingNumber: text("tracking_number"),
  labelUrl: text("label_url"),
  shippingCost: decimal("shipping_cost", { precision: 10, scale: 2 }),
  
  // Warehouse details
  warehouseId: uuid("warehouse_id"),
  warehouseName: text("warehouse_name"),
  warehouseAddress: text("warehouse_address"),
  
  // Processing details
  packedBy: uuid("packed_by"),
  specialInstructions: text("special_instructions"),
  
  // Timestamps
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
  packedAt: timestamp("packed_at"),
  shippedAt: timestamp("shipped_at"),
  deliveredAt: timestamp("delivered_at")
});

// Shipment items table
export const shipmentItems = pgTable("shipment_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  shipmentId: uuid("shipment_id").references(() => shipments.id, { onDelete: "cascade" }).notNull(),
  orderItemId: uuid("order_item_id").references(() => orderItems.id).notNull(),
  productId: uuid("product_id").references(() => products.id).notNull(),
  quantity: integer("quantity").notNull(),
  weight: decimal("weight", { precision: 8, scale: 3 })
});

// Enhanced Reviews table
export const reviews = pgTable("reviews", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: uuid("order_id").references(() => orders.id),
  orderItemId: uuid("order_item_id").references(() => orderItems.id),
  productId: uuid("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  rating: integer("rating").notNull(),
  title: text("title"),
  content: text("content"),
  photos: jsonb("photos").$type<string[]>(),
  videos: jsonb("videos").$type<string[]>(),
  verified: boolean("verified").default(false),
  
  // Helpful votes
  upvotes: integer("upvotes").default(0),
  downvotes: integer("downvotes").default(0),
  
  // Moderation
  moderationStatus: text("moderation_status").default("pending"), // pending|approved|rejected|flagged
  moderatedBy: uuid("moderated_by"),
  moderatedAt: timestamp("moderated_at"),
  moderationReason: text("moderation_reason"),
  
  // Merchant response
  merchantReply: text("merchant_reply"),
  repliedAt: timestamp("replied_at"),
  repliedBy: uuid("replied_by"),
  
  // Metadata
  source: text("source").default("web"), // web|mobile|email|sms
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  language: text("language").default("en"),
  
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
  
  // Legacy compatibility
  comment: text("comment")
});

// Wishlists table
export const wishlists = pgTable("wishlists", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull().default("My Wishlist"),
  description: text("description"),
  isDefault: boolean("is_default").default(true),
  isPublic: boolean("is_public").default(false),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`)
});

// Wishlist items table
export const wishlistItems = pgTable("wishlist_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  wishlistId: uuid("wishlist_id").references(() => wishlists.id, { onDelete: "cascade" }).notNull(),
  productId: uuid("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
  addedAt: timestamp("added_at").default(sql`now()`),
  notes: text("notes")
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  preferences: one(userPreferences),
  settings: one(userSettings),
  addresses: many(addresses),
  cartItems: many(cartItems),
  carts: many(carts),
  orders: many(orders),
  returns: many(returns),
  invoices: many(invoices),
  reviews: many(reviews),
  wishlists: many(wishlists),
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

// Enhanced Cart Relations
export const cartsRelations = relations(carts, ({ one, many }) => ({
  user: one(users, {
    fields: [carts.userId],
    references: [users.id]
  }),
  items: many(enhancedCartItems),
  coupons: many(cartCoupons)
}));

export const enhancedCartItemsRelations = relations(enhancedCartItems, ({ one }) => ({
  cart: one(carts, {
    fields: [enhancedCartItems.cartId],
    references: [carts.id]
  }),
  product: one(products, {
    fields: [enhancedCartItems.productId],
    references: [products.id]
  })
}));

export const couponsRelations = relations(coupons, ({ many }) => ({
  cartCoupons: many(cartCoupons)
}));

export const cartCouponsRelations = relations(cartCoupons, ({ one }) => ({
  cart: one(carts, {
    fields: [cartCoupons.cartId],
    references: [carts.id]
  }),
  coupon: one(coupons, {
    fields: [cartCoupons.couponId],
    references: [coupons.id]
  })
}));

// Legacy cart items relations
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

// Enhanced order relations
export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id]
  }),
  orderItems: many(orderItems),
  returns: many(returns),
  invoices: many(invoices),
  tracking: many(tracking),
  statusHistory: many(orderStatusHistory),
  shipments: many(shipments)
}));

export const orderItemsRelations = relations(orderItems, ({ one, many }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id]
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id]
  }),
  returnItems: many(returnItems),
  shipmentItems: many(shipmentItems),
  reviews: many(reviews)
}));

// Returns relations
export const returnsRelations = relations(returns, ({ one, many }) => ({
  order: one(orders, {
    fields: [returns.orderId],
    references: [orders.id]
  }),
  user: one(users, {
    fields: [returns.userId],
    references: [users.id]
  }),
  returnItems: many(returnItems)
}));

export const returnItemsRelations = relations(returnItems, ({ one }) => ({
  return: one(returns, {
    fields: [returnItems.returnId],
    references: [returns.id]
  }),
  orderItem: one(orderItems, {
    fields: [returnItems.orderItemId],
    references: [orderItems.id]
  }),
  product: one(products, {
    fields: [returnItems.productId],
    references: [products.id]
  })
}));

// Invoice relations
export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  order: one(orders, {
    fields: [invoices.orderId],
    references: [orders.id]
  }),
  user: one(users, {
    fields: [invoices.userId],
    references: [users.id]
  }),
  lineItems: many(invoiceLineItems)
}));

export const invoiceLineItemsRelations = relations(invoiceLineItems, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceLineItems.invoiceId],
    references: [invoices.id]
  }),
  product: one(products, {
    fields: [invoiceLineItems.productId],
    references: [products.id]
  })
}));

// Tracking relations
export const trackingRelations = relations(tracking, ({ one, many }) => ({
  order: one(orders, {
    fields: [tracking.orderId],
    references: [orders.id]
  }),
  events: many(trackingEvents)
}));

export const trackingEventsRelations = relations(trackingEvents, ({ one }) => ({
  tracking: one(tracking, {
    fields: [trackingEvents.trackingId],
    references: [tracking.id]
  })
}));

// Order status history relations
export const orderStatusHistoryRelations = relations(orderStatusHistory, ({ one }) => ({
  order: one(orders, {
    fields: [orderStatusHistory.orderId],
    references: [orders.id]
  })
}));

// Shipment relations
export const shipmentsRelations = relations(shipments, ({ one, many }) => ({
  order: one(orders, {
    fields: [shipments.orderId],
    references: [orders.id]
  }),
  items: many(shipmentItems)
}));

export const shipmentItemsRelations = relations(shipmentItems, ({ one }) => ({
  shipment: one(shipments, {
    fields: [shipmentItems.shipmentId],
    references: [shipments.id]
  }),
  orderItem: one(orderItems, {
    fields: [shipmentItems.orderItemId],
    references: [orderItems.id]
  }),
  product: one(products, {
    fields: [shipmentItems.productId],
    references: [products.id]
  })
}));

// Enhanced reviews relations
export const reviewsRelations = relations(reviews, ({ one }) => ({
  user: one(users, {
    fields: [reviews.userId],
    references: [users.id]
  }),
  product: one(products, {
    fields: [reviews.productId],
    references: [products.id]
  }),
  order: one(orders, {
    fields: [reviews.orderId],
    references: [orders.id]
  }),
  orderItem: one(orderItems, {
    fields: [reviews.orderItemId],
    references: [orderItems.id]
  })
}));

export const wishlistsRelations = relations(wishlists, ({ one, many }) => ({
  user: one(users, {
    fields: [wishlists.userId],
    references: [users.id]
  }),
  items: many(wishlistItems)
}));

export const wishlistItemsRelations = relations(wishlistItems, ({ one }) => ({
  wishlist: one(wishlists, {
    fields: [wishlistItems.wishlistId],
    references: [wishlists.id]
  }),
  product: one(products, {
    fields: [wishlistItems.productId],
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

// Enhanced Cart Insert Schemas
export const insertCartSchema = createInsertSchema(carts).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertEnhancedCartItemSchema = createInsertSchema(enhancedCartItems).omit({
  id: true,
  addedAt: true,
  updatedAt: true
});

export const insertCouponSchema = createInsertSchema(coupons).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  usedCount: true
});

export const insertCartCouponSchema = createInsertSchema(cartCoupons).omit({
  id: true,
  appliedAt: true
});

// Legacy cart item schema (backward compatibility)
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
  createdAt: true,
  updatedAt: true,
  upvotes: true,
  downvotes: true
});

export const insertWishlistSchema = createInsertSchema(wishlists).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertWishlistItemSchema = createInsertSchema(wishlistItems).omit({
  id: true,
  addedAt: true
});

// Order Management Schemas
export const insertReturnSchema = createInsertSchema(returns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  requestedAt: true
});

export const insertReturnItemSchema = createInsertSchema(returnItems).omit({
  id: true
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertInvoiceLineItemSchema = createInsertSchema(invoiceLineItems).omit({
  id: true
});

export const insertTrackingSchema = createInsertSchema(tracking).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastChecked: true,
  attemptCount: true
});

export const insertTrackingEventSchema = createInsertSchema(trackingEvents).omit({
  id: true,
  createdAt: true
});

export const insertOrderStatusHistorySchema = createInsertSchema(orderStatusHistory).omit({
  id: true,
  timestamp: true
});

export const insertShipmentSchema = createInsertSchema(shipments).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertShipmentItemSchema = createInsertSchema(shipmentItems).omit({
  id: true
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

export type Wishlist = typeof wishlists.$inferSelect;
export type InsertWishlist = z.infer<typeof insertWishlistSchema>;

export type WishlistItem = typeof wishlistItems.$inferSelect;
export type InsertWishlistItem = z.infer<typeof insertWishlistItemSchema>;

// Order Management Types
export type Return = typeof returns.$inferSelect;
export type InsertReturn = z.infer<typeof insertReturnSchema>;

export type ReturnItem = typeof returnItems.$inferSelect;
export type InsertReturnItem = z.infer<typeof insertReturnItemSchema>;

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;

export type InvoiceLineItem = typeof invoiceLineItems.$inferSelect;
export type InsertInvoiceLineItem = z.infer<typeof insertInvoiceLineItemSchema>;

export type Tracking = typeof tracking.$inferSelect;
export type InsertTracking = z.infer<typeof insertTrackingSchema>;

export type TrackingEvent = typeof trackingEvents.$inferSelect;
export type InsertTrackingEvent = z.infer<typeof insertTrackingEventSchema>;

export type OrderStatusHistory = typeof orderStatusHistory.$inferSelect;
export type InsertOrderStatusHistory = z.infer<typeof insertOrderStatusHistorySchema>;

export type Shipment = typeof shipments.$inferSelect;
export type InsertShipment = z.infer<typeof insertShipmentSchema>;

export type ShipmentItem = typeof shipmentItems.$inferSelect;
export type InsertShipmentItem = z.infer<typeof insertShipmentItemSchema>;

// ============ PAYMENT SYSTEM MODELS ============

// Payment Methods table
export const paymentMethods = pgTable("payment_methods", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  type: text("type").notNull(), // credit_card|debit_card|paypal|apple_pay|google_pay|bank_account
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
  
  // Card details
  card: jsonb("card").$type<{
    last4: string;
    brand: string; // visa|mastercard|amex|discover|jcb|diners
    expiryMonth: number;
    expiryYear: number;
    holderName: string;
    fingerprint?: string;
    issuer?: string;
    country?: string;
    fundingType?: string; // credit|debit|prepaid|unknown
  }>(),
  
  // Billing address
  billingAddress: jsonb("billing_address").$type<{
    firstName: string;
    lastName: string;
    streetAddress: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  }>(),
  
  // Gateway information
  gateway: jsonb("gateway").$type<{
    provider: string;
    customerId: string;
    tokenId: string;
  }>(),
  
  // Verification
  verification: jsonb("verification").$type<{
    verified: boolean;
    verifiedAt?: string;
    verificationMethod?: string;
  }>(),
  
  // Metadata
  lastUsed: timestamp("last_used"),
  usageCount: integer("usage_count").default(0),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`)
});

// Payment Transactions table
export const paymentTransactions = pgTable("payment_transactions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: uuid("order_id").references(() => orders.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  type: text("type").notNull(), // payment|refund|authorization|capture|void
  status: text("status").notNull(), // pending|processing|success|failed|cancelled|expired
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").default("USD"),
  gateway: text("gateway").notNull(), // stripe|paypal|square|authorize_net|braintree
  gatewayTransactionId: text("gateway_transaction_id"),
  
  // Payment method used
  paymentMethod: jsonb("payment_method").$type<{
    methodId: string;
    type: string;
    last4?: string;
    brand?: string;
    expiryMonth?: number;
    expiryYear?: number;
  }>(),
  
  // Fees
  fees: jsonb("fees").$type<{
    processingFee: string;
    gatewayFee: string;
    totalFee: string;
  }>(),
  
  // Fraud detection
  fraud: jsonb("fraud").$type<{
    riskScore: string;
    status: string; // passed|flagged|blocked
    checks: {
      cvv: string; // pass|fail|unavailable
      address: string; // pass|fail|unavailable
      postal: string; // pass|fail|unavailable
    };
  }>(),
  
  // Metadata
  failureReason: text("failure_reason"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`)
});

// Refunds table
export const refunds = pgTable("refunds", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  originalTransactionId: uuid("original_transaction_id").references(() => paymentTransactions.id).notNull(),
  orderId: uuid("order_id").references(() => orders.id, { onDelete: "cascade" }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").default("USD"),
  reason: text("reason").notNull(), // requested_by_customer|duplicate|fraudulent|subscription_cancellation|other
  status: text("status").notNull(), // pending|processing|succeeded|failed|cancelled
  type: text("type").notNull(), // full|partial
  
  // Gateway information
  gateway: jsonb("gateway").$type<{
    provider: string;
    refundId: string;
    fee: string;
  }>(),
  
  // Timeline
  timeline: jsonb("timeline").$type<Array<{
    status: string;
    timestamp: string;
    note?: string;
  }>>(),
  
  // Metadata
  requestedBy: uuid("requested_by").references(() => users.id),
  failureReason: text("failure_reason"),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`)
});

// 3D Secure Authentication table
export const threeDSecure = pgTable("three_d_secure", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  transactionId: uuid("transaction_id").references(() => paymentTransactions.id).notNull(),
  status: text("status").notNull(), // required|authenticated|failed|bypassed|unavailable
  version: text("version"), // 1.0|2.0|2.1|2.2
  authenticationValue: text("authentication_value"),
  cavv: text("cavv"),
  eci: text("eci"),
  dsTransId: text("ds_trans_id"),
  acsTransId: text("acs_trans_id"),
  challengeRequired: boolean("challenge_required").default(false),
  liabilityShift: boolean("liability_shift").default(false),
  enrollmentStatus: text("enrollment_status"), // Y|N|U
  authenticationStatus: text("authentication_status"), // Y|N|U|A|C|R
  redirectUrl: text("redirect_url"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").default(sql`now()`)
});

// Wallet Payments table
export const walletPayments = pgTable("wallet_payments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  transactionId: uuid("transaction_id").references(() => paymentTransactions.id).notNull(),
  walletType: text("wallet_type").notNull(), // apple_pay|google_pay|samsung_pay|paypal
  
  // Device data
  deviceData: jsonb("device_data").$type<{
    deviceId: string;
    merchantId: string;
    paymentData: string;
    signature: string;
  }>(),
  
  // Billing contact
  billingContact: jsonb("billing_contact").$type<{
    name: string;
    email: string;
    phone: string;
  }>(),
  
  // Shipping contact
  shippingContact: jsonb("shipping_contact").$type<{
    name: string;
    email: string;
    phone: string;
    address: any;
  }>(),
  
  // Verification
  verification: jsonb("verification").$type<{
    status: string; // verified|failed|pending
    method: string;
    timestamp: string;
  }>(),
  
  createdAt: timestamp("created_at").default(sql`now()`)
});

// Payment Gateway Configuration table
export const paymentGateways = pgTable("payment_gateways", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  provider: text("provider").notNull(), // stripe|paypal|square|authorize_net|braintree
  environment: text("environment").notNull(), // sandbox|production
  isActive: boolean("is_active").default(true),
  
  // Configuration
  configuration: jsonb("configuration").$type<{
    merchantId: string;
    publicKey: string;
    webhookUrl: string;
    supportedMethods: string[];
    supportedCurrencies: string[];
  }>(),
  
  // Limits
  limits: jsonb("limits").$type<{
    minAmount: string;
    maxAmount: string;
    dailyLimit: string;
    monthlyLimit: string;
  }>(),
  
  // Fees
  fees: jsonb("fees").$type<{
    percentage: string;
    fixed: string;
    internationalFee: string;
  }>(),
  
  lastHealthCheck: timestamp("last_health_check"),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`)
});

// ============ PAYMENT SYSTEM RELATIONS ============

export const paymentMethodsRelations = relations(paymentMethods, ({ one, many }) => ({
  user: one(users, {
    fields: [paymentMethods.userId],
    references: [users.id],
  }),
  transactions: many(paymentTransactions),
}));

export const paymentTransactionsRelations = relations(paymentTransactions, ({ one, many }) => ({
  order: one(orders, {
    fields: [paymentTransactions.orderId],
    references: [orders.id],
  }),
  user: one(users, {
    fields: [paymentTransactions.userId],
    references: [users.id],
  }),
  refunds: many(refunds),
  threeDSecure: one(threeDSecure),
  walletPayment: one(walletPayments),
}));

export const refundsRelations = relations(refunds, ({ one }) => ({
  originalTransaction: one(paymentTransactions, {
    fields: [refunds.originalTransactionId],
    references: [paymentTransactions.id],
  }),
  order: one(orders, {
    fields: [refunds.orderId],
    references: [orders.id],
  }),
  requestedByUser: one(users, {
    fields: [refunds.requestedBy],
    references: [users.id],
  }),
}));

export const threeDSecureRelations = relations(threeDSecure, ({ one }) => ({
  transaction: one(paymentTransactions, {
    fields: [threeDSecure.transactionId],
    references: [paymentTransactions.id],
  }),
}));

export const walletPaymentsRelations = relations(walletPayments, ({ one }) => ({
  transaction: one(paymentTransactions, {
    fields: [walletPayments.transactionId],
    references: [paymentTransactions.id],
  }),
}));

// Email subscriptions table
export const emailSubscriptions = pgTable("email_subscriptions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  status: text("status").default("pending"), // pending, active, unsubscribed
  subscriptionDate: timestamp("subscription_date").default(sql`now()`),
  unsubscribeDate: timestamp("unsubscribe_date"),
  verificationToken: text("verification_token"),
  verified: boolean("verified").default(false),
  verifiedAt: timestamp("verified_at"),
  source: text("source").default("website"), // website, checkout, popup
  preferences: jsonb("preferences").$type<{
    promotions?: boolean;
    newProducts?: boolean;
    weeklyDeals?: boolean;
  }>().default({
    promotions: true,
    newProducts: true,
    weeklyDeals: true
  }),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`)
});

// Purchase intents table for buy now functionality
export const purchaseIntents = pgTable("purchase_intents", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  sessionId: text("session_id"), // For guest purchases
  productId: uuid("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
  variantId: uuid("variant_id"), // For product variants
  quantity: integer("quantity").notNull().default(1),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  customization: jsonb("customization").$type<{
    color?: string;
    size?: string;
    engraving?: string;
    giftMessage?: string;
    [key: string]: any;
  }>(),
  status: text("status").default("pending"), // pending, completed, expired, cancelled
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").default(sql`now()`)
});

// ============ PAYMENT SYSTEM SCHEMAS ============

export const insertPaymentMethodSchema = createInsertSchema(paymentMethods).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastUsed: true,
  usageCount: true
});

export const insertPaymentTransactionSchema = createInsertSchema(paymentTransactions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  processedAt: true
});

export const insertRefundSchema = createInsertSchema(refunds).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  processedAt: true
});

export const insertThreeDSecureSchema = createInsertSchema(threeDSecure).omit({
  id: true,
  createdAt: true,
  completedAt: true
});

export const insertWalletPaymentSchema = createInsertSchema(walletPayments).omit({
  id: true,
  createdAt: true
});

export const insertPaymentGatewaySchema = createInsertSchema(paymentGateways).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastHealthCheck: true
});

// ============ PAYMENT SYSTEM TYPES ============

export type PaymentMethod = typeof paymentMethods.$inferSelect;
export type InsertPaymentMethod = z.infer<typeof insertPaymentMethodSchema>;

export type PaymentTransaction = typeof paymentTransactions.$inferSelect;
export type InsertPaymentTransaction = z.infer<typeof insertPaymentTransactionSchema>;

export type Refund = typeof refunds.$inferSelect;
export type InsertRefund = z.infer<typeof insertRefundSchema>;

export type ThreeDSecure = typeof threeDSecure.$inferSelect;
export type InsertThreeDSecure = z.infer<typeof insertThreeDSecureSchema>;

export type WalletPayment = typeof walletPayments.$inferSelect;
export type InsertWalletPayment = z.infer<typeof insertWalletPaymentSchema>;

export type PaymentGateway = typeof paymentGateways.$inferSelect;
export type InsertPaymentGateway = z.infer<typeof insertPaymentGatewaySchema>;

// ============ NEW FEATURE SCHEMAS ============

// Email subscriptions schemas
export const insertEmailSubscriptionSchema = createInsertSchema(emailSubscriptions).omit({
  id: true,
  subscriptionDate: true,
  verificationToken: true,
  verifiedAt: true,
  createdAt: true,
  updatedAt: true
});

export const insertPurchaseIntentSchema = createInsertSchema(purchaseIntents).omit({
  id: true,
  createdAt: true
});

// ============ NEW FEATURE TYPES ============

export type EmailSubscription = typeof emailSubscriptions.$inferSelect;
export type InsertEmailSubscription = z.infer<typeof insertEmailSubscriptionSchema>;

export type PurchaseIntent = typeof purchaseIntents.$inferSelect;
export type InsertPurchaseIntent = z.infer<typeof insertPurchaseIntentSchema>;
