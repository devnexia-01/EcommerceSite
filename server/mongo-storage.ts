import bcrypt from "bcrypt";
import { nanoid } from 'nanoid';
import {
  User, Category, Brand, Product, Address, Cart, CartItem, Order, OrderItem, Review,
  UserPreferences, UserSettings, RefreshToken, PasswordResetToken, LoginSession,
  AdminRole, AdminUser, SystemConfig, AuditLog, SecurityLog, IpBlacklist,
  UserActivity, Content, Media, BackupLog, EmailSubscription, PurchaseIntent,
  Wishlist, WishlistItem, NewsletterSubscription
} from "./models";
import type { IStorage } from "./storage";
import type {
  User as UserType, Category as CategoryType, Product as ProductType,
  Address as AddressType, CartItem as CartItemType, Order as OrderType,
  OrderItem as OrderItemType, Review as ReviewType,
  UserPreferences as UserPreferencesType, UserSettings as UserSettingsType,
  RefreshToken as RefreshTokenType, PasswordResetToken as PasswordResetTokenType,
  LoginSession as LoginSessionType, AdminRole as AdminRoleType,
  AdminUser as AdminUserType, SystemConfig as SystemConfigType,
  AuditLog as AuditLogType, SecurityLog as SecurityLogType,
  IpBlacklist as IpBlacklistType, UserActivity as UserActivityType,
  Content as ContentType, Media as MediaType, BackupLog as BackupLogType,
  InsertUser, InsertCategory, InsertProduct, InsertAddress,
  InsertCartItem, InsertOrder, InsertOrderItem, InsertReview,
  InsertUserPreferences, InsertUserSettings, InsertRefreshToken,
  InsertPasswordResetToken, InsertLoginSession, InsertAdminRole,
  InsertAdminUser, InsertSystemConfig, InsertAuditLog,
  InsertSecurityLog, InsertIpBlacklist, InsertUserActivity,
  InsertContent, InsertMedia, InsertBackupLog, InsertEmailSubscription
} from "@shared/schema";

// Helper function to convert MongoDB document to plain object with id conversion
function toPlainObject(doc: any): any {
  if (!doc) return undefined;
  const obj = doc.toObject ? doc.toObject() : doc;
  if (obj._id) {
    obj.id = obj._id.toString();
    delete obj._id;
  }
  delete obj.__v;
  return obj;
}

export class MongoStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<UserType | undefined> {
    const user = await User.findById(id);
    return user ? toPlainObject(user) : undefined;
  }

  async getUserByEmail(email: string): Promise<UserType | undefined> {
    const user = await User.findOne({ email });
    return user ? toPlainObject(user) : undefined;
  }

  async getUserByUsername(username: string): Promise<UserType | undefined> {
    const user = await User.findOne({ username });
    return user ? toPlainObject(user) : undefined;
  }

  async createUser(insertUser: InsertUser): Promise<UserType> {
    // Password should already be hashed by calling code (auth routes handle hashing)
    const user = await User.create(insertUser);
    return toPlainObject(user);
  }

  async updateUser(id: string, userUpdate: Partial<InsertUser>): Promise<UserType> {
    // Password updates should already be hashed by calling code
    const user = await User.findByIdAndUpdate(id, userUpdate, { new: true });
    if (!user) throw new Error('User not found');
    return toPlainObject(user);
  }

  // Authentication methods
  async getUserWithPreferences(id: string): Promise<(UserType & { preferences?: UserPreferencesType }) | undefined> {
    const user = await User.findById(id);
    if (!user) return undefined;
    
    const preferences = await UserPreferences.findOne({ userId: id });
    const userObj = toPlainObject(user);
    
    return {
      ...userObj,
      preferences: preferences ? toPlainObject(preferences) : undefined
    };
  }

  async createRefreshToken(token: InsertRefreshToken): Promise<RefreshTokenType> {
    const refreshToken = await RefreshToken.create({ _id: nanoid(), ...token });
    return toPlainObject(refreshToken);
  }

  async getRefreshToken(token: string): Promise<RefreshTokenType | undefined> {
    const refreshToken = await RefreshToken.findOne({
      token,
      expiresAt: { $gt: new Date() }
    });
    return refreshToken ? toPlainObject(refreshToken) : undefined;
  }

  async deleteRefreshToken(token: string): Promise<void> {
    await RefreshToken.deleteOne({ token });
  }

  async deleteUserRefreshTokens(userId: string): Promise<void> {
    await RefreshToken.deleteMany({ userId });
  }

  // Password Reset methods
  async createPasswordResetToken(token: InsertPasswordResetToken): Promise<PasswordResetTokenType> {
    const resetToken = await PasswordResetToken.create({ _id: nanoid(), ...token });
    return toPlainObject(resetToken);
  }

  async getPasswordResetToken(token: string): Promise<PasswordResetTokenType | undefined> {
    const resetToken = await PasswordResetToken.findOne({
      token,
      used: false,
      expiresAt: { $gt: new Date() }
    });
    return resetToken ? toPlainObject(resetToken) : undefined;
  }

  async markPasswordResetTokenUsed(token: string): Promise<void> {
    await PasswordResetToken.updateOne({ token }, { used: true });
  }

  // User Preferences methods
  async getUserPreferences(userId: string): Promise<UserPreferencesType | undefined> {
    const preferences = await UserPreferences.findOne({ userId });
    return preferences ? toPlainObject(preferences) : undefined;
  }

  async createUserPreferences(preferences: InsertUserPreferences): Promise<UserPreferencesType> {
    const newPreferences = await UserPreferences.create({ _id: nanoid(), ...preferences });
    return toPlainObject(newPreferences);
  }

  async updateUserPreferences(userId: string, preferencesUpdate: Partial<InsertUserPreferences>): Promise<UserPreferencesType> {
    const preferences = await UserPreferences.findOneAndUpdate(
      { userId },
      preferencesUpdate,
      { new: true, upsert: true }
    );
    return toPlainObject(preferences);
  }

  // User Settings methods
  async getUserSettings(userId: string): Promise<UserSettingsType | undefined> {
    const settings = await UserSettings.findOne({ userId });
    return settings ? toPlainObject(settings) : undefined;
  }

  async createUserSettings(settings: InsertUserSettings): Promise<UserSettingsType> {
    const newSettings = await UserSettings.create({ _id: nanoid(), ...settings });
    return toPlainObject(newSettings);
  }

  async updateUserSettings(userId: string, settingsUpdate: Partial<InsertUserSettings>): Promise<UserSettingsType> {
    const settings = await UserSettings.findOneAndUpdate(
      { userId },
      settingsUpdate,
      { new: true, upsert: true }
    );
    return toPlainObject(settings);
  }

  // Password Management
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean> {
    const user = await User.findById(userId);
    if (!user) return false;

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) return false;

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.passwordHash = hashedPassword;
    user.lastPasswordChange = new Date();
    await user.save();

    return true;
  }

  // Data Export
  async exportUserData(userId: string): Promise<any> {
    const [user, preferences, settings, addresses, orders] = await Promise.all([
      User.findById(userId),
      UserPreferences.findOne({ userId }),
      UserSettings.findOne({ userId }),
      Address.find({ userId }),
      Order.find({ userId })
    ]);

    return {
      user: toPlainObject(user),
      preferences: toPlainObject(preferences),
      settings: toPlainObject(settings),
      addresses: addresses.map(toPlainObject),
      orders: orders.map(toPlainObject)
    };
  }

  // Email Verification methods
  async setEmailVerificationToken(userId: string, token: string): Promise<void> {
    await User.findByIdAndUpdate(userId, { emailVerificationToken: token });
  }

  async verifyEmail(token: string): Promise<UserType | undefined> {
    const user = await User.findOneAndUpdate(
      { emailVerificationToken: token },
      { emailVerified: true, emailVerificationToken: null },
      { new: true }
    );
    return user ? toPlainObject(user) : undefined;
  }

  // OTP Verification methods
  async setUserOTP(userId: string, otp: string, expiresAt: Date): Promise<void> {
    await User.findByIdAndUpdate(userId, { verificationOTP: otp, otpExpiresAt: expiresAt });
  }

  async verifyUserOTP(userId: string, otp: string): Promise<boolean> {
    const user = await User.findById(userId);
    if (!user || !user.verificationOTP || !user.otpExpiresAt) return false;
    if (user.otpExpiresAt < new Date()) return false;
    return user.verificationOTP === otp;
  }

  async clearUserOTP(userId: string): Promise<void> {
    await User.findByIdAndUpdate(userId, { verificationOTP: null, otpExpiresAt: null, failedOtpAttempts: 0 });
  }

  async incrementFailedOtpAttempts(userId: string): Promise<void> {
    await User.findByIdAndUpdate(userId, { $inc: { failedOtpAttempts: 1 } });
  }

  async resetFailedOtpAttempts(userId: string): Promise<void> {
    await User.findByIdAndUpdate(userId, { failedOtpAttempts: 0 });
  }

  // Email Subscriptions methods
  async createEmailSubscription(email: string, firstName?: string, lastName?: string, source?: string): Promise<any> {
    const subscription = await EmailSubscription.create({ email, firstName, lastName, source });
    return toPlainObject(subscription);
  }

  async getEmailSubscription(email: string): Promise<any> {
    const subscription = await EmailSubscription.findOne({ email });
    return subscription ? toPlainObject(subscription) : undefined;
  }

  async verifyEmailSubscription(token: string): Promise<any> {
    const subscription = await EmailSubscription.findOneAndUpdate(
      { subscriptionToken: token },
      { confirmed: true, confirmedAt: new Date() },
      { new: true }
    );
    return subscription ? toPlainObject(subscription) : undefined;
  }

  async unsubscribeEmail(token: string): Promise<void> {
    await EmailSubscription.updateOne(
      { subscriptionToken: token },
      { unsubscribed: true, unsubscribedAt: new Date() }
    );
  }

  async updateSubscriptionPreferences(email: string, preferences: any): Promise<any> {
    const subscription = await EmailSubscription.findOneAndUpdate(
      { email },
      { preferences },
      { new: true }
    );
    return subscription ? toPlainObject(subscription) : undefined;
  }

  // Purchase Intents methods
  async createPurchaseIntent(intent: any): Promise<any> {
    const purchaseIntent = await PurchaseIntent.create(intent);
    return toPlainObject(purchaseIntent);
  }

  async getPurchaseIntent(id: string): Promise<any> {
    const intent = await PurchaseIntent.findById(id);
    return intent ? toPlainObject(intent) : undefined;
  }

  async updatePurchaseIntentStatus(id: string, status: string): Promise<any> {
    const intent = await PurchaseIntent.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );
    return intent ? toPlainObject(intent) : undefined;
  }

  async updatePurchaseIntentAddress(id: string, shippingAddress: any, email: string, phone: string): Promise<any> {
    const intent = await PurchaseIntent.findByIdAndUpdate(
      id,
      { shippingAddress, email, phone },
      { new: true }
    );
    return intent ? toPlainObject(intent) : undefined;
  }

  async cleanupExpiredPurchaseIntents(): Promise<void> {
    await PurchaseIntent.deleteMany({
      expiresAt: { $lt: new Date() },
      status: { $ne: 'completed' }
    });
  }

  // Login Session methods
  async createLoginSession(session: InsertLoginSession): Promise<LoginSessionType> {
    const loginSession = await LoginSession.create({ _id: nanoid(), ...session });
    return toPlainObject(loginSession);
  }

  async getLoginSession(token: string): Promise<LoginSessionType | undefined> {
    const session = await LoginSession.findOne({
      sessionToken: token,
      expiresAt: { $gt: new Date() }
    });
    return session ? toPlainObject(session) : undefined;
  }

  async updateSessionActivity(token: string): Promise<void> {
    await LoginSession.updateOne({ sessionToken: token }, { lastActiveAt: new Date() });
  }

  async deleteLoginSession(token: string): Promise<void> {
    await LoginSession.deleteOne({ sessionToken: token });
  }

  async deleteUserSessions(userId: string): Promise<void> {
    await LoginSession.deleteMany({ userId });
  }

  // Account Security methods
  async incrementLoginAttempts(email: string): Promise<void> {
    await User.updateOne({ email }, { $inc: { loginAttempts: 1 } });
  }

  async resetLoginAttempts(email: string): Promise<void> {
    await User.updateOne({ email }, { loginAttempts: 0, accountLocked: false, lockoutUntil: null });
  }

  async lockAccount(email: string, lockoutMinutes: number = 30): Promise<void> {
    const lockoutUntil = new Date(Date.now() + lockoutMinutes * 60 * 1000);
    await User.updateOne({ email }, { accountLocked: true, lockoutUntil });
  }

  async unlockAccount(email: string): Promise<void> {
    await User.updateOne({ email }, { accountLocked: false, lockoutUntil: null, loginAttempts: 0 });
  }

  // Categories
  async getCategories(): Promise<CategoryType[]> {
    const categories = await Category.find().sort({ name: 1 });
    return categories.map(toPlainObject);
  }

  async getCategory(id: string): Promise<CategoryType | undefined> {
    const category = await Category.findById(id);
    return category ? toPlainObject(category) : undefined;
  }

  async getCategoryBySlug(slug: string): Promise<CategoryType | undefined> {
    const category = await Category.findOne({ slug });
    return category ? toPlainObject(category) : undefined;
  }

  async createCategory(category: InsertCategory): Promise<CategoryType> {
    const newCategory = await Category.create(category);
    return toPlainObject(newCategory);
  }

  async updateCategory(id: string, categoryUpdate: Partial<InsertCategory>): Promise<CategoryType> {
    const category = await Category.findByIdAndUpdate(id, categoryUpdate, { new: true });
    if (!category) throw new Error('Category not found');
    return toPlainObject(category);
  }

  async deleteCategory(id: string): Promise<void> {
    await Category.findByIdAndDelete(id);
  }

  // Products
  async getProducts(params: {
    categoryId?: string;
    search?: string;
    sortBy?: 'name' | 'price' | 'rating' | 'created';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  } = {}): Promise<{ products: ProductType[]; total: number }> {
    const {
      categoryId,
      search,
      sortBy = 'created',
      sortOrder = 'desc',
      limit = 20,
      offset = 0
    } = params;

    const filter: any = { status: 'active' };

    if (categoryId) {
      filter.categoryId = categoryId;
    }

    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }

    const sortField = sortBy === 'created' ? 'createdAt' : sortBy;
    const sortDir = sortOrder === 'asc' ? 1 : -1;

    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort({ [sortField]: sortDir })
        .limit(limit)
        .skip(offset),
      Product.countDocuments(filter)
    ]);

    return {
      products: products.map(toPlainObject),
      total
    };
  }

  async getProduct(id: string): Promise<ProductType | undefined> {
    const product = await Product.findById(id);
    return product ? toPlainObject(product) : undefined;
  }

  async getProductBySlug(slug: string): Promise<ProductType | undefined> {
    const product = await Product.findOne({ slug });
    return product ? toPlainObject(product) : undefined;
  }

  async createProduct(product: InsertProduct): Promise<ProductType> {
    const newProduct = await Product.create(product);
    return toPlainObject(newProduct);
  }

  async updateProduct(id: string, productUpdate: Partial<InsertProduct>): Promise<ProductType> {
    const product = await Product.findByIdAndUpdate(id, productUpdate, { new: true });
    if (!product) throw new Error('Product not found');
    return toPlainObject(product);
  }

  async deleteProduct(id: string): Promise<void> {
    await Product.findByIdAndDelete(id);
  }

  async updateProductStock(id: string, quantity: number): Promise<void> {
    await Product.findByIdAndUpdate(id, { $inc: { stock: quantity } });
  }

  // Addresses
  async getUserAddresses(userId: string): Promise<AddressType[]> {
    const addresses = await Address.find({ userId });
    return addresses.map(toPlainObject);
  }

  async getAddress(id: string): Promise<AddressType | undefined> {
    const address = await Address.findById(id);
    return address ? toPlainObject(address) : undefined;
  }

  async createAddress(address: InsertAddress): Promise<AddressType> {
    const newAddress = await Address.create(address);
    return toPlainObject(newAddress);
  }

  async updateAddress(id: string, addressUpdate: Partial<InsertAddress>): Promise<AddressType> {
    const address = await Address.findByIdAndUpdate(id, addressUpdate, { new: true });
    if (!address) throw new Error('Address not found');
    return toPlainObject(address);
  }

  async deleteAddress(id: string): Promise<void> {
    await Address.findByIdAndDelete(id);
  }

  // Cart methods
  async getCartItems(userId: string): Promise<(CartItemType & { product: ProductType })[]> {
    const cart = await Cart.findOne({ userId });
    if (!cart) return [];

    const items = await CartItem.find({ cartId: cart._id.toString() }).populate('productId');
    return items.map(item => {
      const itemObj = toPlainObject(item);
      const product = item.productId ? toPlainObject(item.productId) : null;
      return { ...itemObj, product };
    });
  }

  async getCartItem(userId: string, productId: string): Promise<CartItemType | undefined> {
    const cart = await Cart.findOne({ userId });
    if (!cart) return undefined;

    const item = await CartItem.findOne({ cartId: cart._id.toString(), productId });
    return item ? toPlainObject(item) : undefined;
  }

  async addToCart(cartItem: InsertCartItem): Promise<CartItemType> {
    const newItem = await CartItem.create(cartItem);
    return toPlainObject(newItem);
  }

  async updateCartItem(id: string, quantity: number): Promise<CartItemType> {
    const item = await CartItem.findByIdAndUpdate(id, { quantity }, { new: true });
    if (!item) throw new Error('Cart item not found');
    return toPlainObject(item);
  }

  async removeCartItem(id: string): Promise<void> {
    await CartItem.findByIdAndDelete(id);
  }

  async clearCart(userId: string): Promise<void> {
    const cart = await Cart.findOne({ userId });
    if (cart) {
      await CartItem.deleteMany({ cartId: cart._id.toString() });
    }
  }

  // Orders
  async getOrders(userId?: string): Promise<(OrderType & { orderItems: (OrderItemType & { product: ProductType })[] })[]> {
    const filter = userId ? { userId } : {};
    const orders = await Order.find(filter).sort({ createdAt: -1 });

    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const items = await OrderItem.find({ orderId: order._id.toString() }).populate('productId');
        const orderObj = toPlainObject(order);
        const itemsWithProducts = items.map(item => {
          const itemObj = toPlainObject(item);
          const product = item.productId ? toPlainObject(item.productId) : null;
          return { ...itemObj, product };
        });
        return { ...orderObj, orderItems: itemsWithProducts };
      })
    );

    return ordersWithItems;
  }

  async getOrdersBySession(sessionId: string): Promise<(OrderType & { orderItems: (OrderItemType & { product: ProductType })[] })[]> {
    return [];
  }

  async getOrder(id: string): Promise<(OrderType & { orderItems: (OrderItemType & { product: ProductType })[] }) | undefined> {
    const order = await Order.findById(id);
    if (!order) return undefined;

    const items = await OrderItem.find({ orderId: id }).populate('productId');
    const orderObj = toPlainObject(order);
    const itemsWithProducts = items.map(item => {
      const itemObj = toPlainObject(item);
      const product = item.productId ? toPlainObject(item.productId) : null;
      return { ...itemObj, product };
    });

    return { ...orderObj, orderItems: itemsWithProducts };
  }

  async createOrder(order: InsertOrder, items: InsertOrderItem[]): Promise<OrderType> {
    const newOrder = await Order.create(order);
    const orderId = newOrder._id.toString();

    await OrderItem.insertMany(items.map(item => ({ ...item, orderId })));

    return toPlainObject(newOrder);
  }

  async updateOrderStatus(id: string, status: string): Promise<OrderType> {
    const order = await Order.findByIdAndUpdate(id, { status }, { new: true });
    if (!order) throw new Error('Order not found');
    return toPlainObject(order);
  }

  // Reviews
  async getProductReviews(productId: string): Promise<(ReviewType & { user: { firstName: string | null; lastName: string | null } })[]> {
    const reviews = await Review.find({ productId }).populate('userId');
    return reviews.map(review => {
      const reviewObj = toPlainObject(review);
      const user = review.userId ? toPlainObject(review.userId) : null;
      return {
        ...reviewObj,
        user: {
          firstName: user?.firstName || null,
          lastName: user?.lastName || null
        }
      };
    });
  }

  async createReview(review: InsertReview): Promise<ReviewType> {
    const newReview = await Review.create(review);
    return toPlainObject(newReview);
  }

  async updateReview(id: string, reviewUpdate: Partial<InsertReview>): Promise<ReviewType> {
    const review = await Review.findByIdAndUpdate(id, reviewUpdate, { new: true });
    if (!review) throw new Error('Review not found');
    return toPlainObject(review);
  }

  async deleteReview(id: string): Promise<void> {
    await Review.findByIdAndDelete(id);
  }

  // Admin Management
  async createAdminUser(userId: string, adminData: InsertAdminUser): Promise<AdminUserType> {
    const admin = await AdminUser.create({ ...adminData, userId });
    return toPlainObject(admin);
  }

  async getAdminUser(userId: string): Promise<AdminUserType | undefined> {
    const admin = await AdminUser.findOne({ userId });
    return admin ? toPlainObject(admin) : undefined;
  }

  async updateAdminUser(userId: string, adminData: Partial<InsertAdminUser>): Promise<AdminUserType> {
    const admin = await AdminUser.findOneAndUpdate({ userId }, adminData, { new: true });
    if (!admin) throw new Error('Admin user not found');
    return toPlainObject(admin);
  }

  async deleteAdminUser(userId: string): Promise<void> {
    await AdminUser.deleteOne({ userId });
  }

  async getAdminUsers(): Promise<(AdminUserType & { user: UserType })[]> {
    const admins = await AdminUser.find().populate('userId');
    return admins.map(admin => {
      const adminObj = toPlainObject(admin);
      const user = admin.userId ? toPlainObject(admin.userId) : null;
      return { ...adminObj, user };
    });
  }

  // Roles & Permissions
  async createRole(role: InsertAdminRole): Promise<AdminRoleType> {
    const newRole = await AdminRole.create(role);
    return toPlainObject(newRole);
  }

  async getRoles(): Promise<AdminRoleType[]> {
    const roles = await AdminRole.find();
    return roles.map(toPlainObject);
  }

  async getRole(id: string): Promise<AdminRoleType | undefined> {
    const role = await AdminRole.findById(id);
    return role ? toPlainObject(role) : undefined;
  }

  async updateRole(id: string, roleUpdate: Partial<InsertAdminRole>): Promise<AdminRoleType> {
    const role = await AdminRole.findByIdAndUpdate(id, roleUpdate, { new: true });
    if (!role) throw new Error('Role not found');
    return toPlainObject(role);
  }

  async deleteRole(id: string): Promise<void> {
    await AdminRole.findByIdAndDelete(id);
  }

  async getPermissions(): Promise<any[]> {
    return [
      { id: 'users:read', name: 'View Users', category: 'users' },
      { id: 'users:write', name: 'Manage Users', category: 'users' },
      { id: 'products:read', name: 'View Products', category: 'products' },
      { id: 'products:write', name: 'Manage Products', category: 'products' },
      { id: 'orders:read', name: 'View Orders', category: 'orders' },
      { id: 'orders:write', name: 'Manage Orders', category: 'orders' },
      { id: 'content:read', name: 'View Content', category: 'content' },
      { id: 'content:write', name: 'Manage Content', category: 'content' },
      { id: 'settings:read', name: 'View Settings', category: 'settings' },
      { id: 'settings:write', name: 'Manage Settings', category: 'settings' }
    ];
  }

  async assignRoleToUser(userId: string, roleId: string): Promise<void> {
    await AdminUser.updateOne({ userId }, { roleId });
  }

  async removeRoleFromUser(userId: string, roleId: string): Promise<void> {
    await AdminUser.updateOne({ userId, roleId }, { roleId: null });
  }

  // User Management (Admin)
  async getAllUsers(params: {
    search?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  } = {}): Promise<{ users: UserType[]; total: number }> {
    const {
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      limit = 20,
      offset = 0
    } = params;

    const filter: any = {};

    if (search) {
      filter.$or = [
        { email: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } }
      ];
    }

    const sortDir = sortOrder === 'asc' ? 1 : -1;

    const [users, total] = await Promise.all([
      User.find(filter)
        .sort({ [sortBy]: sortDir })
        .limit(limit)
        .skip(offset),
      User.countDocuments(filter)
    ]);

    return {
      users: users.map(toPlainObject),
      total
    };
  }

  async suspendUser(userId: string, reason?: string, suspendedBy?: string): Promise<UserType> {
    const user = await User.findByIdAndUpdate(
      userId,
      { accountLocked: true },
      { new: true }
    );
    if (!user) throw new Error('User not found');
    return toPlainObject(user);
  }

  async unsuspendUser(userId: string): Promise<UserType> {
    const user = await User.findByIdAndUpdate(
      userId,
      { accountLocked: false, lockoutUntil: null },
      { new: true }
    );
    if (!user) throw new Error('User not found');
    return toPlainObject(user);
  }

  async banUser(userId: string, reason?: string, bannedBy?: string): Promise<UserType> {
    const user = await User.findByIdAndUpdate(
      userId,
      { accountLocked: true },
      { new: true }
    );
    if (!user) throw new Error('User not found');
    return toPlainObject(user);
  }

  async resetUserPassword(userId: string, newPassword: string): Promise<void> {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.findByIdAndUpdate(userId, { passwordHash: hashedPassword, lastPasswordChange: new Date() });
  }

  async getUserActivity(userId: string): Promise<UserActivityType[]> {
    const activities = await UserActivity.find({ userId }).sort({ createdAt: -1 }).limit(100);
    return activities.map(toPlainObject);
  }

  async getUserSessions(userId: string): Promise<LoginSessionType[]> {
    const sessions = await LoginSession.find({ userId });
    return sessions.map(toPlainObject);
  }

  async deleteUserSession(sessionId: string): Promise<void> {
    await LoginSession.findByIdAndDelete(sessionId);
  }

  // Content Management
  async getContent(params: {
    type?: string;
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ content: ContentType[]; total: number }> {
    const { type, status, search, limit = 20, offset = 0 } = params;
    const filter: any = {};

    if (type) filter.type = type;
    if (status) filter.status = status;
    if (search) filter.title = { $regex: search, $options: 'i' };

    const [content, total] = await Promise.all([
      Content.find(filter).limit(limit).skip(offset),
      Content.countDocuments(filter)
    ]);

    return {
      content: content.map(toPlainObject),
      total
    };
  }

  async getContentById(id: string): Promise<ContentType | undefined> {
    const content = await Content.findById(id);
    return content ? toPlainObject(content) : undefined;
  }

  async createContent(content: InsertContent): Promise<ContentType> {
    const newContent = await Content.create(content);
    return toPlainObject(newContent);
  }

  async updateContent(id: string, contentUpdate: Partial<InsertContent>): Promise<ContentType> {
    const content = await Content.findByIdAndUpdate(id, contentUpdate, { new: true });
    if (!content) throw new Error('Content not found');
    return toPlainObject(content);
  }

  async deleteContent(id: string): Promise<void> {
    await Content.findByIdAndDelete(id);
  }

  async publishContent(id: string): Promise<ContentType> {
    const content = await Content.findByIdAndUpdate(
      id,
      { status: 'published', publishedAt: new Date() },
      { new: true }
    );
    if (!content) throw new Error('Content not found');
    return toPlainObject(content);
  }

  async unpublishContent(id: string): Promise<ContentType> {
    const content = await Content.findByIdAndUpdate(
      id,
      { status: 'draft' },
      { new: true }
    );
    if (!content) throw new Error('Content not found');
    return toPlainObject(content);
  }

  // Media Management
  async getMedia(params: {
    search?: string;
    mimeType?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ media: MediaType[]; total: number }> {
    const { search, mimeType, limit = 20, offset = 0 } = params;
    const filter: any = {};

    if (search) filter.originalFilename = { $regex: search, $options: 'i' };
    if (mimeType) filter.mimeType = mimeType;

    const [media, total] = await Promise.all([
      Media.find(filter).limit(limit).skip(offset),
      Media.countDocuments(filter)
    ]);

    return {
      media: media.map(toPlainObject),
      total
    };
  }

  async getMediaById(id: string): Promise<MediaType | undefined> {
    const media = await Media.findById(id);
    return media ? toPlainObject(media) : undefined;
  }

  async createMedia(media: InsertMedia): Promise<MediaType> {
    const newMedia = await Media.create(media);
    return toPlainObject(newMedia);
  }

  async deleteMedia(id: string): Promise<void> {
    await Media.findByIdAndDelete(id);
  }

  async getStorageUsage(): Promise<{ totalSize: number; totalFiles: number }> {
    const result = await Media.aggregate([
      {
        $group: {
          _id: null,
          totalSize: { $sum: '$size' },
          totalFiles: { $sum: 1 }
        }
      }
    ]);

    return result.length > 0
      ? { totalSize: result[0].totalSize, totalFiles: result[0].totalFiles }
      : { totalSize: 0, totalFiles: 0 };
  }

  // System Configuration
  async getSystemConfig(): Promise<SystemConfigType[]> {
    const configs = await SystemConfig.find();
    return configs.map(toPlainObject);
  }

  async getSystemConfigByKey(category: string, key: string): Promise<SystemConfigType | undefined> {
    const config = await SystemConfig.findOne({ category, key });
    return config ? toPlainObject(config) : undefined;
  }

  async updateSystemConfig(category: string, key: string, value: any, updatedBy: string): Promise<SystemConfigType> {
    const config = await SystemConfig.findOneAndUpdate(
      { category, key },
      { value, updatedBy },
      { new: true, upsert: true }
    );
    return toPlainObject(config);
  }

  async clearCache(): Promise<void> {
    // No-op for MongoDB
  }

  // Audit Logs
  async createAuditLog(log: InsertAuditLog): Promise<AuditLogType> {
    const auditLog = await AuditLog.create(log);
    return toPlainObject(auditLog);
  }

  async getAuditLogs(params: {
    action?: string;
    resource?: string;
    actorId?: string;
    severity?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ logs: AuditLogType[]; total: number }> {
    const { action, resource, actorId, severity, startDate, endDate, limit = 20, offset = 0 } = params;
    const filter: any = {};

    if (action) filter.action = action;
    if (resource) filter.resource = resource;
    if (actorId) filter.actorId = actorId;
    if (severity) filter.severity = severity;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = startDate;
      if (endDate) filter.createdAt.$lte = endDate;
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filter).sort({ createdAt: -1 }).limit(limit).skip(offset),
      AuditLog.countDocuments(filter)
    ]);

    return {
      logs: logs.map(toPlainObject),
      total
    };
  }

  async getAuditLog(id: string): Promise<AuditLogType | undefined> {
    const log = await AuditLog.findById(id);
    return log ? toPlainObject(log) : undefined;
  }

  // Security Monitoring
  async createSecurityLog(log: InsertSecurityLog): Promise<SecurityLogType> {
    const securityLog = await SecurityLog.create(log);
    return toPlainObject(securityLog);
  }

  async getSecurityLogs(params: {
    type?: string;
    severity?: string;
    resolved?: boolean;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ logs: SecurityLogType[]; total: number }> {
    const { type, severity, resolved, limit = 20, offset = 0 } = params;
    const filter: any = {};

    if (type) filter.type = type;
    if (severity) filter.severity = severity;
    if (resolved !== undefined) filter.resolved = resolved;

    const [logs, total] = await Promise.all([
      SecurityLog.find(filter).sort({ createdAt: -1 }).limit(limit).skip(offset),
      SecurityLog.countDocuments(filter)
    ]);

    return {
      logs: logs.map(toPlainObject),
      total
    };
  }

  async getFailedLogins(params: {
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ logs: SecurityLogType[]; total: number }> {
    const { startDate, endDate, limit = 20, offset = 0 } = params;
    const filter: any = { type: 'failed_login' };

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = startDate;
      if (endDate) filter.createdAt.$lte = endDate;
    }

    const [logs, total] = await Promise.all([
      SecurityLog.find(filter).sort({ createdAt: -1 }).limit(limit).skip(offset),
      SecurityLog.countDocuments(filter)
    ]);

    return {
      logs: logs.map(toPlainObject),
      total
    };
  }

  async addToIpBlacklist(ipAddress: string, reason?: string, createdBy?: string): Promise<IpBlacklistType> {
    const blacklist = await IpBlacklist.create({ ipAddress, reason, createdBy });
    return toPlainObject(blacklist);
  }

  async removeFromIpBlacklist(ipAddress: string): Promise<void> {
    await IpBlacklist.deleteOne({ ipAddress });
  }

  async getIpBlacklist(): Promise<IpBlacklistType[]> {
    const blacklist = await IpBlacklist.find();
    return blacklist.map(toPlainObject);
  }

  async resolveSecurityThreat(id: string, resolvedBy: string): Promise<SecurityLogType> {
    const log = await SecurityLog.findByIdAndUpdate(
      id,
      { resolved: true, resolvedBy, resolvedAt: new Date() },
      { new: true }
    );
    if (!log) throw new Error('Security log not found');
    return toPlainObject(log);
  }

  // Analytics & Dashboard
  async getDashboardOverview(): Promise<{
    totalUsers: number;
    totalActiveUsers: number;
    totalOrders: number;
    totalRevenue: number;
    newUsersToday: number;
    ordersToday: number;
    revenueToday: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalUsers, totalOrders, newUsersToday, ordersToday, revenueData] = await Promise.all([
      User.countDocuments(),
      Order.countDocuments(),
      User.countDocuments({ createdAt: { $gte: today } }),
      Order.countDocuments({ createdAt: { $gte: today } }),
      Order.aggregate([
        { $group: { _id: null, total: { $sum: '$total' } } }
      ])
    ]);

    const revenueTodayData = await Order.aggregate([
      { $match: { createdAt: { $gte: today } } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);

    return {
      totalUsers,
      totalActiveUsers: totalUsers,
      totalOrders,
      totalRevenue: revenueData[0]?.total || 0,
      newUsersToday,
      ordersToday,
      revenueToday: revenueTodayData[0]?.total || 0
    };
  }

  async getUserMetrics(params: {
    startDate?: Date;
    endDate?: Date;
  } = {}): Promise<{
    newUsers: number;
    activeUsers: number;
    userGrowth: number;
  }> {
    const { startDate, endDate } = params;
    const filter: any = {};

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = startDate;
      if (endDate) filter.createdAt.$lte = endDate;
    }

    const newUsers = await User.countDocuments(filter);

    return {
      newUsers,
      activeUsers: newUsers,
      userGrowth: 0
    };
  }

  async getContentMetrics(): Promise<{
    totalContent: number;
    publishedContent: number;
    draftContent: number;
    totalViews: number;
  }> {
    const [totalContent, publishedContent, draftContent] = await Promise.all([
      Content.countDocuments(),
      Content.countDocuments({ status: 'published' }),
      Content.countDocuments({ status: 'draft' })
    ]);

    return {
      totalContent,
      publishedContent,
      draftContent,
      totalViews: 0
    };
  }

  async getSystemHealth(): Promise<{
    databaseConnections: number;
    serverUptime: number;
    memoryUsage: number;
    diskUsage: number;
  }> {
    return {
      databaseConnections: 1,
      serverUptime: process.uptime(),
      memoryUsage: process.memoryUsage().heapUsed,
      diskUsage: 0
    };
  }

  // Bulk Operations
  async bulkUpdateUsers(userIds: string[], operation: string, data?: any): Promise<void> {
    // Implement based on operation type
    if (operation === 'suspend') {
      await User.updateMany(
        { _id: { $in: userIds } },
        { accountLocked: true }
      );
    } else if (operation === 'unsuspend') {
      await User.updateMany(
        { _id: { $in: userIds } },
        { accountLocked: false, lockoutUntil: null }
      );
    }
  }

  async bulkDeleteUsers(userIds: string[]): Promise<void> {
    await User.deleteMany({ _id: { $in: userIds } });
  }

  async exportUsers(params?: any): Promise<any[]> {
    const users = await User.find();
    return users.map(toPlainObject);
  }

  // System Operations
  async createBackup(type: string, triggeredBy: string): Promise<BackupLogType> {
    const backup = await BackupLog.create({ type, status: 'in_progress', triggeredBy });
    return toPlainObject(backup);
  }

  async getBackups(): Promise<BackupLogType[]> {
    const backups = await BackupLog.find().sort({ createdAt: -1 });
    return backups.map(toPlainObject);
  }

  async getSystemLogs(params: {
    level?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  } = {}): Promise<any[]> {
    return [];
  }
}

export const mongoStorage = new MongoStorage();
