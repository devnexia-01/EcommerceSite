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
}, { timestamps: true });

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
}, { timestamps: true });

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
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  description: String,
  logo: String,
  website: String,
  status: { type: String, default: 'active' }
}, { timestamps: true });

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
}, { timestamps: true });

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
}, { timestamps: true });

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
}, { timestamps: true });

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
}, { timestamps: true });

export const CartItem = mongoose.model<ICartItem>('CartItem', cartItemSchema);

// Order Model
export interface IOrder extends Document {
  orderNumber: string;
  userId: string;
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
  orderNumber: { type: String, required: true, unique: true },
  userId: { type: String, ref: 'User', required: true },
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
}, { timestamps: true });

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
  productId: { type: String, ref: 'Product', required: true },
  userId: { type: String, ref: 'User', required: true },
  orderId: { type: String, ref: 'Order' },
  rating: { type: Number, required: true },
  title: String,
  content: String,
  comment: String,
  verified: { type: Boolean, default: false },
  moderationStatus: { type: String, default: 'pending' }
}, { timestamps: true });

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
  email: { type: String, required: true, unique: true },
  status: { type: String, default: 'pending' }, // pending, confirmed, unsubscribed
  subscriptionToken: String,
  confirmedAt: Date,
  unsubscribedAt: Date
}, { timestamps: true });

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
  userId: { type: String, ref: 'User', required: true, unique: true },
  orderUpdates: { type: Boolean, default: true },
  promotionalEmails: { type: Boolean, default: false },
  productRecommendations: { type: Boolean, default: true },
  securityAlerts: { type: Boolean, default: true },
  newsletterSubscribed: { type: Boolean, default: false }
}, { timestamps: true });

export const UserSettings = mongoose.model<IUserSettings>('UserSettings', userSettingsSchema);
