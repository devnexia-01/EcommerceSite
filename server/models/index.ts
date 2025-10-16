import mongoose, { Schema, Document } from 'mongoose';

// User Model with OTP and profile enhancements
export interface IUser extends Document {
  email: string;
  username: string;
  passwordHash: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  dateOfBirth?: Date;
  gender?: string;
  avatarUrl?: string;
  isAdmin: boolean;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  lastPasswordChange?: Date;
  loginAttempts: number;
  accountLocked: boolean;
  lockoutUntil?: Date;
  emailVerified: boolean;
  phoneVerified: boolean;
  emailVerificationToken?: string;
  phoneVerificationToken?: string;
  verificationOTP?: string;
  otpExpiresAt?: Date;
  failedOtpAttempts: number;
  createdAt?: Date;
  updatedAt?: Date;
  lastLoginAt?: Date;
}

const userSchema = new Schema<IUser>({
  _id: { type: String, required: true },
  _id: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  firstName: String,
  lastName: String,
  phoneNumber: String,
  dateOfBirth: Date,
  gender: String,
  avatarUrl: String,
  isAdmin: { type: Boolean, default: false },
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorSecret: String,
  lastPasswordChange: { type: Date, default: Date.now },
  loginAttempts: { type: Number, default: 0 },
  accountLocked: { type: Boolean, default: false },
  lockoutUntil: Date,
  emailVerified: { type: Boolean, default: false },
  phoneVerified: { type: Boolean, default: false },
  emailVerificationToken: String,
  phoneVerificationToken: String,
  verificationOTP: String,
  otpExpiresAt: Date,
  failedOtpAttempts: { type: Number, default: 0 },
  lastLoginAt: Date
}, { _id: false, timestamps: true });

export const User = mongoose.model<IUser>('User', userSchema);

// Category Model
export interface ICategory extends Document {
  name: string;
  slug: string;
  description?: string;
  emoji?: string;
  parentId?: string;
  imageUrl?: string;
  status: string;
  sortOrder: number;
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
  };
  createdAt?: Date;
  updatedAt?: Date;
}

const categorySchema = new Schema<ICategory>({
  _id: { type: String, required: true },
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  description: String,
  emoji: String,
  parentId: { type: String, ref: 'Category' },
  imageUrl: String,
  status: { type: String, default: 'active' },
  sortOrder: { type: Number, default: 0 },
  seo: {
    metaTitle: String,
    metaDescription: String,
    keywords: [String]
  }
}, { _id: false, timestamps: true });

export const Category = mongoose.model<ICategory>('Category', categorySchema);

// Brand Model
export interface IBrand extends Document {
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  website?: string;
  status: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const brandSchema = new Schema<IBrand>({
  _id: { type: String, required: true },
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  description: String,
  logo: String,
  website: String,
  status: { type: String, default: 'active' }
}, { _id: false, timestamps: true });

export const Brand = mongoose.model<IBrand>('Brand', brandSchema);

// Product Model
export interface IProduct extends Document {
  sku: string;
  name: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  categories: string[];
  brandId?: string;
  basePrice?: number;
  salePrice?: number;
  currency: string;
  taxRate: number;
  price: number;
  comparePrice?: number;
  stock: number;
  categoryId?: string;
  imageUrl?: string;
  images: string[];
  attributes?: {
    weight?: number;
    dimensions?: {
      length: number;
      width: number;
      height: number;
    };
    materials?: string[];
    features?: string[];
    warranty?: string;
  };
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
  };
  rating: number;
  reviewCount: number;
  status: string;
  publishedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const productSchema = new Schema<IProduct>({
  _id: { type: String, required: true },
  sku: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  description: String,
  shortDescription: String,
  categories: [String],
  brandId: { type: String, ref: 'Brand' },
  basePrice: Number,
  salePrice: Number,
  currency: { type: String, default: 'USD' },
  taxRate: { type: Number, default: 0 },
  price: { type: Number, required: true },
  comparePrice: Number,
  stock: { type: Number, default: 0 },
  categoryId: { type: String, ref: 'Category' },
  imageUrl: String,
  images: [String],
  attributes: {
    weight: Number,
    dimensions: {
      length: Number,
      width: Number,
      height: Number
    },
    materials: [String],
    features: [String],
    warranty: String
  },
  seo: {
    metaTitle: String,
    metaDescription: String,
    keywords: [String]
  },
  rating: { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 },
  status: { type: String, default: 'active' },
  publishedAt: Date
}, { _id: false, timestamps: true });

export const Product = mongoose.model<IProduct>('Product', productSchema);

// Address Model with user profile support
export interface IAddress extends Document {
  userId: string;
  type: string;
  firstName: string;
  lastName: string;
  company?: string;
  streetAddress: string;
  streetAddress2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phoneNumber?: string;
  isDefault: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const addressSchema = new Schema<IAddress>({
  _id: { type: String, required: true },
  userId: { type: String, ref: 'User', required: true },
  type: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  company: String,
  streetAddress: { type: String, required: true },
  streetAddress2: String,
  city: { type: String, required: true },
  state: { type: String, required: true },
  zipCode: { type: String, required: true },
  country: { type: String, required: true, default: 'US' },
  phoneNumber: String,
  isDefault: { type: Boolean, default: false }
}, { _id: false, timestamps: true });

export const Address = mongoose.model<IAddress>('Address', addressSchema);

// Cart Model
export interface ICart extends Document {
  userId?: string;
  sessionId?: string;
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
  currency: string;
  notes?: string;
  expiresAt?: Date;
  abandoned: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const cartSchema = new Schema<ICart>({
  _id: { type: String, required: true },
  userId: { type: String, ref: 'User' },
  sessionId: String,
  subtotal: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  shipping: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  currency: { type: String, default: 'USD' },
  notes: String,
  expiresAt: Date,
  abandoned: { type: Boolean, default: false }
}, { _id: false, timestamps: true });

export const Cart = mongoose.model<ICart>('Cart', cartSchema);

// Cart Item Model
export interface ICartItem extends Document {
  cartId: string;
  productId: string;
  variantId?: string;
  quantity: number;
  price: number;
  discount: number;
  customization?: {
    engraving?: string;
    giftWrap?: boolean;
    giftMessage?: string;
    color?: string;
    size?: string;
    [key: string]: any;
  };
  savedForLater: boolean;
  savedAt?: Date;
  addedAt?: Date;
  updatedAt?: Date;
}

const cartItemSchema = new Schema<ICartItem>({
  _id: { type: String, required: true },
  cartId: { type: String, ref: 'Cart', required: true },
  productId: { type: String, ref: 'Product', required: true },
  variantId: String,
  quantity: { type: Number, required: true, default: 1 },
  price: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  customization: Schema.Types.Mixed,
  savedForLater: { type: Boolean, default: false },
  savedAt: Date,
  addedAt: { type: Date, default: Date.now }
}, { _id: false, timestamps: true });

export const CartItem = mongoose.model<ICartItem>('CartItem', cartItemSchema);

// Order Model
export interface IOrder extends Document {
  orderNumber: string;
  userId?: string;
  sessionId?: string;
  status: string;
  type: string;
  channel: string;
  currency: string;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  shippingMethod?: string;
  billingAddress: any;
  shippingAddress: any;
  paymentMethod?: string;
  paymentStatus: string;
  paymentTransactionId?: string;
  trackingNumber?: string;
  createdAt?: Date;
  updatedAt?: Date;
  confirmedAt?: Date;
  shippedAt?: Date;
  deliveredAt?: Date;
}

const orderSchema = new Schema<IOrder>({
  _id: { type: String, required: true },
  orderNumber: { type: String, required: true, unique: true },
  userId: { type: String, ref: 'User' },
  sessionId: String,
  status: { type: String, default: 'pending' },
  type: { type: String, default: 'standard' },
  channel: { type: String, default: 'web' },
  currency: { type: String, default: 'USD' },
  subtotal: { type: Number, required: true },
  shipping: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  total: { type: Number, required: true },
  shippingMethod: String,
  billingAddress: { type: Schema.Types.Mixed, required: true },
  shippingAddress: { type: Schema.Types.Mixed, required: true },
  paymentMethod: String,
  paymentStatus: { type: String, default: 'pending' },
  paymentTransactionId: String,
  trackingNumber: String,
  confirmedAt: Date,
  shippedAt: Date,
  deliveredAt: Date
}, { _id: false, timestamps: true });

export const Order = mongoose.model<IOrder>('Order', orderSchema);

// Order Item Model
export interface IOrderItem extends Document {
  orderId: string;
  productId: string;
  sku: string;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  price: number;
  total: number;
}

const orderItemSchema = new Schema<IOrderItem>({
  _id: { type: String, required: true },
  orderId: { type: String, ref: 'Order', required: true },
  productId: { type: String, ref: 'Product', required: true },
  sku: { type: String, required: true },
  name: { type: String, required: true },
  description: String,
  quantity: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  totalPrice: { type: Number, required: true },
  price: { type: Number, required: true },
  total: { type: Number, required: true }
});

export const OrderItem = mongoose.model<IOrderItem>('OrderItem', orderItemSchema);

// Review Model
export interface IReview extends Document {
  productId: string;
  userId: string;
  orderId?: string;
  rating: number;
  title?: string;
  content?: string;
  comment?: string;
  verified: boolean;
  moderationStatus: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const reviewSchema = new Schema<IReview>({
  _id: { type: String, required: true },
  productId: { type: String, ref: 'Product', required: true },
  userId: { type: String, ref: 'User', required: true },
  orderId: { type: String, ref: 'Order' },
  rating: { type: Number, required: true },
  title: String,
  content: String,
  comment: String,
  verified: { type: Boolean, default: false },
  moderationStatus: { type: String, default: 'pending' }
}, { _id: false, timestamps: true });

export const Review = mongoose.model<IReview>('Review', reviewSchema);

// Newsletter Subscription Model
export interface INewsletterSubscription extends Document {
  email: string;
  status: string;
  subscriptionToken?: string;
  confirmedAt?: Date;
  unsubscribedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const newsletterSubscriptionSchema = new Schema<INewsletterSubscription>({
  _id: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  status: { type: String, default: 'pending' }, // pending, confirmed, unsubscribed
  subscriptionToken: String,
  confirmedAt: Date,
  unsubscribedAt: Date
}, { _id: false, timestamps: true });

export const NewsletterSubscription = mongoose.model<INewsletterSubscription>('NewsletterSubscription', newsletterSubscriptionSchema);

// User Settings Model
export interface IUserSettings extends Document {
  userId: string;
  orderUpdates: boolean;
  promotionalEmails: boolean;
  productRecommendations: boolean;
  securityAlerts: boolean;
  newsletterSubscribed: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const userSettingsSchema = new Schema<IUserSettings>({
  _id: { type: String, required: true },
  userId: { type: String, ref: 'User', required: true, unique: true },
  orderUpdates: { type: Boolean, default: true },
  promotionalEmails: { type: Boolean, default: false },
  productRecommendations: { type: Boolean, default: true },
  securityAlerts: { type: Boolean, default: true },
  newsletterSubscribed: { type: Boolean, default: false }
}, { _id: false, timestamps: true });

export const UserSettings = mongoose.model<IUserSettings>('UserSettings', userSettingsSchema);

// User Preferences Model
export interface IUserPreferences extends Document {
  userId: string;
  language: string;
  currency: string;
  timezone: string;
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const userPreferencesSchema = new Schema<IUserPreferences>({
  _id: { type: String, required: true },
  userId: { type: String, ref: 'User', required: true, unique: true },
  language: { type: String, default: 'en' },
  currency: { type: String, default: 'USD' },
  timezone: { type: String, default: 'UTC' },
  emailNotifications: { type: Boolean, default: true },
  smsNotifications: { type: Boolean, default: false },
  pushNotifications: { type: Boolean, default: true }
}, { _id: false, timestamps: true });

export const UserPreferences = mongoose.model<IUserPreferences>('UserPreferences', userPreferencesSchema);

// Refresh Token Model
export interface IRefreshToken extends Document {
  userId: string;
  token: string;
  expiresAt: Date;
  deviceInfo?: string;
  ipAddress?: string;
  createdAt?: Date;
}

const refreshTokenSchema = new Schema<IRefreshToken>({
  _id: { type: String, required: true },
  userId: { type: String, ref: 'User', required: true },
  token: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
  deviceInfo: String,
  ipAddress: String
}, { _id: false, timestamps: true });

export const RefreshToken = mongoose.model<IRefreshToken>('RefreshToken', refreshTokenSchema);

// Password Reset Token Model
export interface IPasswordResetToken extends Document {
  userId: string;
  token: string;
  expiresAt: Date;
  used: boolean;
  createdAt?: Date;
}

const passwordResetTokenSchema = new Schema<IPasswordResetToken>({
  _id: { type: String, required: true },
  userId: { type: String, ref: 'User', required: true },
  token: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
  used: { type: Boolean, default: false }
}, { _id: false, timestamps: true });

export const PasswordResetToken = mongoose.model<IPasswordResetToken>('PasswordResetToken', passwordResetTokenSchema);

// Login Session Model
export interface ILoginSession extends Document {
  userId: string;
  sessionToken: string;
  deviceInfo?: string;
  ipAddress?: string;
  location?: string;
  expiresAt: Date;
  lastActiveAt?: Date;
  createdAt?: Date;
}

const loginSessionSchema = new Schema<ILoginSession>({
  _id: { type: String, required: true },
  userId: { type: String, ref: 'User', required: true },
  sessionToken: { type: String, required: true, unique: true },
  deviceInfo: String,
  ipAddress: String,
  location: String,
  expiresAt: { type: Date, required: true },
  lastActiveAt: { type: Date, default: Date.now }
}, { _id: false, timestamps: true });

export const LoginSession = mongoose.model<ILoginSession>('LoginSession', loginSessionSchema);

// Wishlist Model
export interface IWishlist extends Document {
  userId: string;
  name: string;
  description?: string;
  isDefault: boolean;
  isPublic: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const wishlistSchema = new Schema<IWishlist>({
  _id: { type: String, required: true },
  userId: { type: String, ref: 'User', required: true },
  name: { type: String, required: true, default: 'My Wishlist' },
  description: String,
  isDefault: { type: Boolean, default: true },
  isPublic: { type: Boolean, default: false }
}, { _id: false, timestamps: true });

export const Wishlist = mongoose.model<IWishlist>('Wishlist', wishlistSchema);

// Wishlist Item Model
export interface IWishlistItem extends Document {
  wishlistId: string;
  productId: string;
  addedAt?: Date;
  notes?: string;
}

const wishlistItemSchema = new Schema<IWishlistItem>({
  _id: { type: String, required: true },
  wishlistId: { type: String, ref: 'Wishlist', required: true },
  productId: { type: String, ref: 'Product', required: true },
  addedAt: { type: Date, default: Date.now },
  notes: String
});

export const WishlistItem = mongoose.model<IWishlistItem>('WishlistItem', wishlistItemSchema);

// Email Subscription Model
export interface IEmailSubscription extends Document {
  email: string;
  firstName?: string;
  lastName?: string;
  source?: string;
  subscriptionToken?: string;
  confirmed: boolean;
  confirmedAt?: Date;
  unsubscribed: boolean;
  unsubscribedAt?: Date;
  preferences: any;
  createdAt?: Date;
  updatedAt?: Date;
}

const emailSubscriptionSchema = new Schema<IEmailSubscription>({
  _id: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  firstName: String,
  lastName: String,
  source: String,
  subscriptionToken: String,
  confirmed: { type: Boolean, default: false },
  confirmedAt: Date,
  unsubscribed: { type: Boolean, default: false },
  unsubscribedAt: Date,
  preferences: Schema.Types.Mixed
}, { _id: false, timestamps: true });

export const EmailSubscription = mongoose.model<IEmailSubscription>('EmailSubscription', emailSubscriptionSchema);

// Purchase Intent Model
export interface IPurchaseIntent extends Document {
  productId: string;
  variantId?: string;
  quantity: number;
  price: number;
  sessionId?: string;
  userId?: string;
  email?: string;
  phone?: string;
  shippingAddress?: any;
  status: string;
  expiresAt?: Date;
  completedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const purchaseIntentSchema = new Schema<IPurchaseIntent>({
  _id: { type: String, required: true },
  productId: { type: String, ref: 'Product', required: true },
  variantId: String,
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  sessionId: String,
  userId: { type: String, ref: 'User' },
  email: String,
  phone: String,
  shippingAddress: Schema.Types.Mixed,
  status: { type: String, default: 'pending' },
  expiresAt: Date,
  completedAt: Date
}, { _id: false, timestamps: true });

export const PurchaseIntent = mongoose.model<IPurchaseIntent>('PurchaseIntent', purchaseIntentSchema);

// Admin User Model
export interface IAdminUser extends Document {
  userId: string;
  roleId?: string;
  permissions: string[];
  canAccessDashboard: boolean;
  canManageUsers: boolean;
  canManageProducts: boolean;
  canManageOrders: boolean;
  canManageContent: boolean;
  canManageSettings: boolean;
  canViewReports: boolean;
  canManageRoles: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const adminUserSchema = new Schema<IAdminUser>({
  _id: { type: String, required: true },
  userId: { type: String, ref: 'User', required: true, unique: true },
  roleId: String,
  permissions: [String],
  canAccessDashboard: { type: Boolean, default: true },
  canManageUsers: { type: Boolean, default: false },
  canManageProducts: { type: Boolean, default: false },
  canManageOrders: { type: Boolean, default: false },
  canManageContent: { type: Boolean, default: false },
  canManageSettings: { type: Boolean, default: false },
  canViewReports: { type: Boolean, default: false },
  canManageRoles: { type: Boolean, default: false }
}, { _id: false, timestamps: true });

export const AdminUser = mongoose.model<IAdminUser>('AdminUser', adminUserSchema);

// Admin Role Model
export interface IAdminRole extends Document {
  name: string;
  description?: string;
  permissions: string[];
  isSystem: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const adminRoleSchema = new Schema<IAdminRole>({
  _id: { type: String, required: true },
  name: { type: String, required: true, unique: true },
  description: String,
  permissions: [String],
  isSystem: { type: Boolean, default: false }
}, { _id: false, timestamps: true });

export const AdminRole = mongoose.model<IAdminRole>('AdminRole', adminRoleSchema);

// System Config Model
export interface ISystemConfig extends Document {
  category: string;
  key: string;
  value: any;
  description?: string;
  updatedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const systemConfigSchema = new Schema<ISystemConfig>({
  _id: { type: String, required: true },
  category: { type: String, required: true },
  key: { type: String, required: true },
  value: Schema.Types.Mixed,
  description: String,
  updatedBy: String
}, { _id: false, timestamps: true });

systemConfigSchema.index({ category: 1, key: 1 }, { unique: true });

export const SystemConfig = mongoose.model<ISystemConfig>('SystemConfig', systemConfigSchema);

// Audit Log Model
export interface IAuditLog extends Document {
  action: string;
  resource: string;
  resourceId?: string;
  actorId?: string;
  actorType?: string;
  ipAddress?: string;
  userAgent?: string;
  changes?: any;
  severity?: string;
  createdAt?: Date;
}

const auditLogSchema = new Schema<IAuditLog>({
  _id: { type: String, required: true },
  action: { type: String, required: true },
  resource: { type: String, required: true },
  resourceId: String,
  actorId: String,
  actorType: String,
  ipAddress: String,
  userAgent: String,
  changes: Schema.Types.Mixed,
  severity: { type: String, default: 'info' }
}, { _id: false, timestamps: true });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', auditLogSchema);

// Security Log Model
export interface ISecurityLog extends Document {
  type: string;
  severity: string;
  message: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: any;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
  createdAt?: Date;
}

const securityLogSchema = new Schema<ISecurityLog>({
  _id: { type: String, required: true },
  type: { type: String, required: true },
  severity: { type: String, required: true },
  message: { type: String, required: true },
  userId: String,
  ipAddress: String,
  userAgent: String,
  metadata: Schema.Types.Mixed,
  resolved: { type: Boolean, default: false },
  resolvedBy: String,
  resolvedAt: Date
}, { _id: false, timestamps: true });

export const SecurityLog = mongoose.model<ISecurityLog>('SecurityLog', securityLogSchema);

// IP Blacklist Model
export interface IIpBlacklist extends Document {
  ipAddress: string;
  reason?: string;
  createdBy?: string;
  createdAt?: Date;
}

const ipBlacklistSchema = new Schema<IIpBlacklist>({
  _id: { type: String, required: true },
  ipAddress: { type: String, required: true, unique: true },
  reason: String,
  createdBy: String
}, { _id: false, timestamps: true });

export const IpBlacklist = mongoose.model<IIpBlacklist>('IpBlacklist', ipBlacklistSchema);

// User Activity Model
export interface IUserActivity extends Document {
  userId: string;
  action: string;
  resource?: string;
  resourceId?: string;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt?: Date;
}

const userActivitySchema = new Schema<IUserActivity>({
  _id: { type: String, required: true },
  userId: { type: String, ref: 'User', required: true },
  action: { type: String, required: true },
  resource: String,
  resourceId: String,
  metadata: Schema.Types.Mixed,
  ipAddress: String,
  userAgent: String
}, { _id: false, timestamps: true });

export const UserActivity = mongoose.model<IUserActivity>('UserActivity', userActivitySchema);

// Content Model
export interface IContent extends Document {
  type: string;
  key: string;
  title: string;
  content: string;
  status: string;
  publishedAt?: Date;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const contentSchema = new Schema<IContent>({
  _id: { type: String, required: true },
  type: { type: String, required: true },
  key: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  status: { type: String, default: 'draft' },
  publishedAt: Date,
  createdBy: String,
  updatedBy: String
}, { _id: false, timestamps: true });

export const Content = mongoose.model<IContent>('Content', contentSchema);

// Media Model
export interface IMedia extends Document {
  filename: string;
  originalFilename: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  uploadedBy?: string;
  createdAt?: Date;
}

const mediaSchema = new Schema<IMedia>({
  _id: { type: String, required: true },
  filename: { type: String, required: true },
  originalFilename: { type: String, required: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },
  url: { type: String, required: true },
  thumbnailUrl: String,
  uploadedBy: String
}, { _id: false, timestamps: true });

export const Media = mongoose.model<IMedia>('Media', mediaSchema);

// Backup Log Model
export interface IBackupLog extends Document {
  type: string;
  status: string;
  size?: number;
  location?: string;
  error?: string;
  triggeredBy?: string;
  createdAt?: Date;
  completedAt?: Date;
}

const backupLogSchema = new Schema<IBackupLog>({
  _id: { type: String, required: true },
  type: { type: String, required: true },
  status: { type: String, required: true },
  size: Number,
  location: String,
  error: String,
  triggeredBy: String,
  completedAt: Date
}, { _id: false, timestamps: true });

export const BackupLog = mongoose.model<IBackupLog>('BackupLog', backupLogSchema);
