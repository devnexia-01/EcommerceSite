import { 
  users, categories, products, addresses, cartItems, orders, orderItems, reviews,
  userPreferences, userSettings, refreshTokens, passwordResetTokens, loginSessions,
  adminRoles, adminUsers, adminPermissions, systemConfig, auditLogs, content,
  media, userActivity, securityLogs, ipBlacklist, backupLogs,
  type User, type InsertUser, type Category, type InsertCategory, 
  type Product, type InsertProduct, type Address, type InsertAddress,
  type CartItem, type InsertCartItem, type Order, type InsertOrder,
  type OrderItem, type InsertOrderItem, type Review, type InsertReview,
  type UserPreferences, type InsertUserPreferences,
  type UserSettings, type InsertUserSettings,
  type RefreshToken, type InsertRefreshToken,
  type PasswordResetToken, type InsertPasswordResetToken,
  type LoginSession, type InsertLoginSession,
  type AdminRole, type InsertAdminRole,
  type AdminUser, type InsertAdminUser,
  type SystemConfig, type InsertSystemConfig,
  type AuditLog, type InsertAuditLog,
  type Content, type InsertContent,
  type Media, type InsertMedia,
  type UserActivity, type InsertUserActivity,
  type SecurityLog, type InsertSecurityLog,
  type IpBlacklist, type InsertIpBlacklist,
  type BackupLog, type InsertBackupLog
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, ilike, and, sql, count, or, gte, lte } from "drizzle-orm";
import bcrypt from "bcrypt";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User>;
  
  // Authentication
  getUserWithPreferences(id: string): Promise<(User & { preferences?: UserPreferences }) | undefined>;
  createRefreshToken(token: InsertRefreshToken): Promise<RefreshToken>;
  getRefreshToken(token: string): Promise<RefreshToken | undefined>;
  deleteRefreshToken(token: string): Promise<void>;
  deleteUserRefreshTokens(userId: string): Promise<void>;
  
  // Password Reset
  createPasswordResetToken(token: InsertPasswordResetToken): Promise<PasswordResetToken>;
  getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  markPasswordResetTokenUsed(token: string): Promise<void>;
  
  // User Preferences
  getUserPreferences(userId: string): Promise<UserPreferences | undefined>;
  createUserPreferences(preferences: InsertUserPreferences): Promise<UserPreferences>;
  updateUserPreferences(userId: string, preferences: Partial<InsertUserPreferences>): Promise<UserPreferences>;

  // User Settings
  getUserSettings(userId: string): Promise<UserSettings | undefined>;
  createUserSettings(settings: InsertUserSettings): Promise<UserSettings>;
  updateUserSettings(userId: string, settings: Partial<InsertUserSettings>): Promise<UserSettings>;

  // Password Management
  changePassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean>;

  // Data Export
  exportUserData(userId: string): Promise<any>;
  
  // Email Verification
  setEmailVerificationToken(userId: string, token: string): Promise<void>;
  verifyEmail(token: string): Promise<User | undefined>;
  
  // Login Sessions
  createLoginSession(session: InsertLoginSession): Promise<LoginSession>;
  getLoginSession(token: string): Promise<LoginSession | undefined>;
  updateSessionActivity(token: string): Promise<void>;
  deleteLoginSession(token: string): Promise<void>;
  deleteUserSessions(userId: string): Promise<void>;
  
  // Account Security
  incrementLoginAttempts(email: string): Promise<void>;
  resetLoginAttempts(email: string): Promise<void>;
  lockAccount(email: string, lockoutMinutes?: number): Promise<void>;
  unlockAccount(email: string): Promise<void>;
  
  // Categories
  getCategories(): Promise<Category[]>;
  getCategory(id: string): Promise<Category | undefined>;
  getCategoryBySlug(slug: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: string, category: Partial<InsertCategory>): Promise<Category>;
  deleteCategory(id: string): Promise<void>;
  
  // Products
  getProducts(params?: {
    categoryId?: string;
    search?: string;
    sortBy?: 'name' | 'price' | 'rating' | 'created';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  }): Promise<{ products: Product[]; total: number }>;
  getProduct(id: string): Promise<Product | undefined>;
  getProductBySlug(slug: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product>;
  deleteProduct(id: string): Promise<void>;
  updateProductStock(id: string, quantity: number): Promise<void>;
  
  // Addresses
  getUserAddresses(userId: string): Promise<Address[]>;
  getAddress(id: string): Promise<Address | undefined>;
  createAddress(address: InsertAddress): Promise<Address>;
  updateAddress(id: string, address: Partial<InsertAddress>): Promise<Address>;
  deleteAddress(id: string): Promise<void>;
  
  // Cart
  getCartItems(userId: string): Promise<(CartItem & { product: Product })[]>;
  getCartItem(userId: string, productId: string): Promise<CartItem | undefined>;
  addToCart(cartItem: InsertCartItem): Promise<CartItem>;
  updateCartItem(id: string, quantity: number): Promise<CartItem>;
  removeCartItem(id: string): Promise<void>;
  clearCart(userId: string): Promise<void>;
  
  // Orders
  getOrders(userId?: string): Promise<(Order & { orderItems: (OrderItem & { product: Product })[] })[]>;
  getOrder(id: string): Promise<(Order & { orderItems: (OrderItem & { product: Product })[] }) | undefined>;
  createOrder(order: InsertOrder, items: InsertOrderItem[]): Promise<Order>;
  updateOrderStatus(id: string, status: string): Promise<Order>;
  
  // Reviews
  getProductReviews(productId: string): Promise<(Review & { user: { firstName: string | null; lastName: string | null } })[]>;
  createReview(review: InsertReview): Promise<Review>;
  updateReview(id: string, review: Partial<InsertReview>): Promise<Review>;
  deleteReview(id: string): Promise<void>;

  // Admin Management
  createAdminUser(userId: string, adminData: InsertAdminUser): Promise<AdminUser>;
  getAdminUser(userId: string): Promise<AdminUser | undefined>;
  updateAdminUser(userId: string, adminData: Partial<InsertAdminUser>): Promise<AdminUser>;
  deleteAdminUser(userId: string): Promise<void>;
  getAdminUsers(): Promise<(AdminUser & { user: User })[]>;

  // Roles & Permissions
  createRole(role: InsertAdminRole): Promise<AdminRole>;
  getRoles(): Promise<AdminRole[]>;
  getRole(id: string): Promise<AdminRole | undefined>;
  updateRole(id: string, role: Partial<InsertAdminRole>): Promise<AdminRole>;
  deleteRole(id: string): Promise<void>;
  getPermissions(): Promise<any[]>;
  assignRoleToUser(userId: string, roleId: string): Promise<void>;
  removeRoleFromUser(userId: string, roleId: string): Promise<void>;

  // User Management (Admin)
  getAllUsers(params?: {
    search?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  }): Promise<{ users: User[]; total: number }>;
  suspendUser(userId: string, reason?: string, suspendedBy?: string): Promise<User>;
  unsuspendUser(userId: string): Promise<User>;
  banUser(userId: string, reason?: string, bannedBy?: string): Promise<User>;
  resetUserPassword(userId: string, newPassword: string): Promise<void>;
  getUserActivity(userId: string): Promise<UserActivity[]>;
  getUserSessions(userId: string): Promise<LoginSession[]>;
  deleteUserSession(sessionId: string): Promise<void>;

  // Content Management
  getContent(params?: {
    type?: string;
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ content: Content[]; total: number }>;
  getContentById(id: string): Promise<Content | undefined>;
  createContent(content: InsertContent): Promise<Content>;
  updateContent(id: string, content: Partial<InsertContent>): Promise<Content>;
  deleteContent(id: string): Promise<void>;
  publishContent(id: string): Promise<Content>;
  unpublishContent(id: string): Promise<Content>;

  // Media Management
  getMedia(params?: {
    search?: string;
    mimeType?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ media: Media[]; total: number }>;
  getMediaById(id: string): Promise<Media | undefined>;
  createMedia(media: InsertMedia): Promise<Media>;
  deleteMedia(id: string): Promise<void>;
  getStorageUsage(): Promise<{ totalSize: number; totalFiles: number }>;

  // System Configuration
  getSystemConfig(): Promise<SystemConfig[]>;
  getSystemConfigByKey(category: string, key: string): Promise<SystemConfig | undefined>;
  updateSystemConfig(category: string, key: string, value: any, updatedBy: string): Promise<SystemConfig>;
  clearCache(): Promise<void>;

  // Audit Logs
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(params?: {
    action?: string;
    resource?: string;
    actorId?: string;
    severity?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: AuditLog[]; total: number }>;
  getAuditLog(id: string): Promise<AuditLog | undefined>;

  // Security Monitoring
  createSecurityLog(log: InsertSecurityLog): Promise<SecurityLog>;
  getSecurityLogs(params?: {
    type?: string;
    severity?: string;
    resolved?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: SecurityLog[]; total: number }>;
  getFailedLogins(params?: {
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: SecurityLog[]; total: number }>;
  addToIpBlacklist(ipAddress: string, reason?: string, createdBy?: string): Promise<IpBlacklist>;
  removeFromIpBlacklist(ipAddress: string): Promise<void>;
  getIpBlacklist(): Promise<IpBlacklist[]>;
  resolveSecurityThreat(id: string, resolvedBy: string): Promise<SecurityLog>;

  // Analytics & Dashboard
  getDashboardOverview(): Promise<{
    totalUsers: number;
    totalActiveUsers: number;
    totalOrders: number;
    totalRevenue: number;
    newUsersToday: number;
    ordersToday: number;
    revenueToday: number;
  }>;
  getUserMetrics(params?: {
    startDate?: Date;
    endDate?: Date;
  }): Promise<{
    newUsers: number;
    activeUsers: number;
    userGrowth: number;
  }>;
  getContentMetrics(): Promise<{
    totalContent: number;
    publishedContent: number;
    draftContent: number;
    totalViews: number;
  }>;
  getSystemHealth(): Promise<{
    databaseConnections: number;
    serverUptime: number;
    memoryUsage: number;
    diskUsage: number;
  }>;

  // Bulk Operations
  bulkUpdateUsers(userIds: string[], operation: string, data?: any): Promise<void>;
  bulkDeleteUsers(userIds: string[]): Promise<void>;
  exportUsers(params?: any): Promise<any[]>;

  // System Operations
  createBackup(type: string, triggeredBy: string): Promise<BackupLog>;
  getBackups(): Promise<BackupLog[]>;
  getSystemLogs(params?: {
    level?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<any[]>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(insertUser.passwordHash, 10);
    const [user] = await db
      .insert(users)
      .values({ ...insertUser, passwordHash: hashedPassword })
      .returning();
    return user;
  }

  async updateUser(id: string, userUpdate: Partial<InsertUser>): Promise<User> {
    const updates = { ...userUpdate };
    if (updates.passwordHash) {
      updates.passwordHash = await bcrypt.hash(updates.passwordHash, 10);
    }
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: sql`now()` })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // Authentication methods
  async getUserWithPreferences(id: string): Promise<(User & { preferences?: UserPreferences }) | undefined> {
    const results = await db
      .select()
      .from(users)
      .leftJoin(userPreferences, eq(users.id, userPreferences.userId))
      .where(eq(users.id, id));
    
    if (results.length === 0) return undefined;
    
    const result = results[0];
    return {
      ...result.users,
      preferences: result.user_preferences || undefined
    };
  }

  async createRefreshToken(token: InsertRefreshToken): Promise<RefreshToken> {
    const [newToken] = await db.insert(refreshTokens).values(token).returning();
    return newToken;
  }

  async getRefreshToken(token: string): Promise<RefreshToken | undefined> {
    const [refreshToken] = await db
      .select()
      .from(refreshTokens)
      .where(and(
        eq(refreshTokens.token, token),
        sql`expires_at > NOW()`
      ));
    return refreshToken || undefined;
  }

  async deleteRefreshToken(token: string): Promise<void> {
    await db.delete(refreshTokens).where(eq(refreshTokens.token, token));
  }

  async deleteUserRefreshTokens(userId: string): Promise<void> {
    await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId));
  }

  // Password Reset methods
  async createPasswordResetToken(token: InsertPasswordResetToken): Promise<PasswordResetToken> {
    const [newToken] = await db.insert(passwordResetTokens).values(token).returning();
    return newToken;
  }

  async getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    const [resetToken] = await db
      .select()
      .from(passwordResetTokens)
      .where(and(
        eq(passwordResetTokens.token, token),
        eq(passwordResetTokens.used, false),
        sql`expires_at > NOW()`
      ));
    return resetToken || undefined;
  }

  async markPasswordResetTokenUsed(token: string): Promise<void> {
    await db
      .update(passwordResetTokens)
      .set({ used: true })
      .where(eq(passwordResetTokens.token, token));
  }

  // User Preferences methods
  async getUserPreferences(userId: string): Promise<UserPreferences | undefined> {
    const [preferences] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId));
    return preferences || undefined;
  }

  async createUserPreferences(preferences: InsertUserPreferences): Promise<UserPreferences> {
    const [newPreferences] = await db.insert(userPreferences).values(preferences).returning();
    return newPreferences;
  }

  async updateUserPreferences(userId: string, preferencesUpdate: Partial<InsertUserPreferences>): Promise<UserPreferences> {
    const [preferences] = await db
      .update(userPreferences)
      .set({ ...preferencesUpdate, updatedAt: sql`now()` })
      .where(eq(userPreferences.userId, userId))
      .returning();
    return preferences;
  }

  // Email Verification methods
  async setEmailVerificationToken(userId: string, token: string): Promise<void> {
    await db
      .update(users)
      .set({ 
        emailVerificationToken: token,
        updatedAt: sql`now()` 
      })
      .where(eq(users.id, userId));
  }

  async verifyEmail(token: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ 
        emailVerified: true, 
        emailVerificationToken: null,
        updatedAt: sql`now()` 
      })
      .where(eq(users.emailVerificationToken, token))
      .returning();
    return user || undefined;
  }

  // Login Session methods
  async createLoginSession(session: InsertLoginSession): Promise<LoginSession> {
    const [newSession] = await db.insert(loginSessions).values(session).returning();
    return newSession;
  }

  async getLoginSession(token: string): Promise<LoginSession | undefined> {
    const [session] = await db
      .select()
      .from(loginSessions)
      .where(and(
        eq(loginSessions.sessionToken, token),
        sql`expires_at > NOW()`
      ));
    return session || undefined;
  }

  async updateSessionActivity(token: string): Promise<void> {
    await db
      .update(loginSessions)
      .set({ lastActiveAt: sql`now()` })
      .where(eq(loginSessions.sessionToken, token));
  }

  async deleteLoginSession(token: string): Promise<void> {
    await db.delete(loginSessions).where(eq(loginSessions.sessionToken, token));
  }

  async deleteUserSessions(userId: string): Promise<void> {
    await db.delete(loginSessions).where(eq(loginSessions.userId, userId));
  }

  // Account Security methods
  async incrementLoginAttempts(email: string): Promise<void> {
    await db
      .update(users)
      .set({ 
        loginAttempts: sql`login_attempts + 1`,
        updatedAt: sql`now()` 
      })
      .where(eq(users.email, email));
  }

  async resetLoginAttempts(email: string): Promise<void> {
    await db
      .update(users)
      .set({ 
        loginAttempts: 0,
        accountLocked: false,
        lockoutUntil: null,
        updatedAt: sql`now()` 
      })
      .where(eq(users.email, email));
  }

  async lockAccount(email: string, lockoutMinutes: number = 30): Promise<void> {
    await db
      .update(users)
      .set({ 
        accountLocked: true,
        lockoutUntil: sql`NOW() + INTERVAL '${lockoutMinutes} minutes'`,
        updatedAt: sql`now()` 
      })
      .where(eq(users.email, email));
  }

  async unlockAccount(email: string): Promise<void> {
    await db
      .update(users)
      .set({ 
        accountLocked: false,
        lockoutUntil: null,
        loginAttempts: 0,
        updatedAt: sql`now()` 
      })
      .where(eq(users.email, email));
  }

  // Categories
  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories).orderBy(asc(categories.name));
  }

  async getCategory(id: string): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category || undefined;
  }

  async getCategoryBySlug(slug: string): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.slug, slug));
    return category || undefined;
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await db.insert(categories).values(category).returning();
    return newCategory;
  }

  async updateCategory(id: string, categoryUpdate: Partial<InsertCategory>): Promise<Category> {
    const [category] = await db
      .update(categories)
      .set(categoryUpdate)
      .where(eq(categories.id, id))
      .returning();
    return category;
  }

  async deleteCategory(id: string): Promise<void> {
    await db.delete(categories).where(eq(categories.id, id));
  }

  // Products
  async getProducts(params: {
    categoryId?: string;
    search?: string;
    sortBy?: 'name' | 'price' | 'rating' | 'created';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  } = {}): Promise<{ products: Product[]; total: number }> {
    const {
      categoryId,
      search,
      sortBy = 'created',
      sortOrder = 'desc',
      limit = 20,
      offset = 0
    } = params;

    const conditions = [eq(products.status, 'active')];

    if (categoryId) {
      conditions.push(eq(products.categoryId, categoryId));
    }

    if (search) {
      conditions.push(ilike(products.name, `%${search}%`));
    }

    // Build where clause
    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

    // Apply sorting
    const sortColumn = {
      name: products.name,
      price: products.price,
      rating: products.rating,
      created: products.createdAt
    }[sortBy];

    const [productsResult, countResult] = await Promise.all([
      db.select().from(products)
        .where(whereClause)
        .orderBy(sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(products)
        .where(whereClause)
    ]);

    return {
      products: productsResult,
      total: countResult[0].count
    };
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product || undefined;
  }

  async getProductBySlug(slug: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.slug, slug));
    return product || undefined;
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await db.insert(products).values(product as any).returning();
    return newProduct;
  }

  async updateProduct(id: string, productUpdate: Partial<InsertProduct>): Promise<Product> {
    const updateData = {
      ...productUpdate,
      updatedAt: sql`now()`
    };
    const [product] = await db
      .update(products)
      .set(updateData as any)
      .where(eq(products.id, id))
      .returning();
    return product;
  }

  async deleteProduct(id: string): Promise<void> {
    await db.delete(products).where(eq(products.id, id));
  }

  async updateProductStock(id: string, quantity: number): Promise<void> {
    await db
      .update(products)
      .set({ stock: sql`${products.stock} - ${quantity}` })
      .where(eq(products.id, id));
  }

  // Addresses
  async getUserAddresses(userId: string): Promise<Address[]> {
    return await db.select().from(addresses).where(eq(addresses.userId, userId));
  }

  async getAddress(id: string): Promise<Address | undefined> {
    const [address] = await db.select().from(addresses).where(eq(addresses.id, id));
    return address || undefined;
  }

  async createAddress(address: InsertAddress): Promise<Address> {
    const [newAddress] = await db.insert(addresses).values(address).returning();
    return newAddress;
  }

  async updateAddress(id: string, addressUpdate: Partial<InsertAddress>): Promise<Address> {
    const [address] = await db
      .update(addresses)
      .set(addressUpdate)
      .where(eq(addresses.id, id))
      .returning();
    return address;
  }

  async deleteAddress(id: string): Promise<void> {
    await db.delete(addresses).where(eq(addresses.id, id));
  }

  // Cart
  async getCartItems(userId: string): Promise<(CartItem & { product: Product })[]> {
    return await db
      .select()
      .from(cartItems)
      .leftJoin(products, eq(cartItems.productId, products.id))
      .where(eq(cartItems.userId, userId))
      .then(results => results.map(result => ({
        ...result.cart_items,
        product: result.products!
      })));
  }

  async getCartItem(userId: string, productId: string): Promise<CartItem | undefined> {
    const [item] = await db
      .select()
      .from(cartItems)
      .where(and(eq(cartItems.userId, userId), eq(cartItems.productId, productId)));
    return item || undefined;
  }

  async addToCart(cartItem: InsertCartItem): Promise<CartItem> {
    const existing = await this.getCartItem(cartItem.userId, cartItem.productId);
    
    if (existing) {
      const [updated] = await db
        .update(cartItems)
        .set({ quantity: sql`${cartItems.quantity} + ${cartItem.quantity}` })
        .where(eq(cartItems.id, existing.id))
        .returning();
      return updated;
    } else {
      const [newItem] = await db.insert(cartItems).values(cartItem).returning();
      return newItem;
    }
  }

  async updateCartItem(id: string, quantity: number): Promise<CartItem> {
    const [item] = await db
      .update(cartItems)
      .set({ quantity })
      .where(eq(cartItems.id, id))
      .returning();
    return item;
  }

  async removeCartItem(id: string): Promise<void> {
    await db.delete(cartItems).where(eq(cartItems.id, id));
  }

  async clearCart(userId: string): Promise<void> {
    await db.delete(cartItems).where(eq(cartItems.userId, userId));
  }

  // Orders
  async getOrders(userId?: string): Promise<(Order & { orderItems: (OrderItem & { product: Product })[] })[]> {
    let baseQuery = db
      .select()
      .from(orders)
      .leftJoin(orderItems, eq(orders.id, orderItems.orderId))
      .leftJoin(products, eq(orderItems.productId, products.id));

    let query = userId 
      ? baseQuery.where(eq(orders.userId, userId))
      : baseQuery;

    const results = await query.orderBy(desc(orders.createdAt));

    // Group by order
    const orderMap = new Map<string, Order & { orderItems: (OrderItem & { product: Product })[] }>();

    results.forEach(result => {
      const order = result.orders;
      if (!orderMap.has(order.id)) {
        orderMap.set(order.id, { ...order, orderItems: [] });
      }

      if (result.order_items && result.products) {
        orderMap.get(order.id)!.orderItems.push({
          ...result.order_items,
          product: result.products
        });
      }
    });

    return Array.from(orderMap.values());
  }

  async getOrder(id: string): Promise<(Order & { orderItems: (OrderItem & { product: Product })[] }) | undefined> {
    const results = await db
      .select()
      .from(orders)
      .leftJoin(orderItems, eq(orders.id, orderItems.orderId))
      .leftJoin(products, eq(orderItems.productId, products.id))
      .where(eq(orders.id, id));

    if (results.length === 0) {
      return undefined;
    }

    const order = results[0].orders;
    const items: (OrderItem & { product: Product })[] = [];

    results.forEach(result => {
      if (result.order_items && result.products) {
        items.push({
          ...result.order_items,
          product: result.products
        });
      }
    });

    return { ...order, orderItems: items };
  }

  async createOrder(order: InsertOrder, items: InsertOrderItem[]): Promise<Order> {
    const [newOrder] = await db.insert(orders).values(order).returning();
    
    if (items.length > 0) {
      await db.insert(orderItems).values(
        items.map(item => ({ ...item, orderId: newOrder.id }))
      );
    }

    return newOrder;
  }

  async updateOrderStatus(id: string, status: string): Promise<Order> {
    const [order] = await db
      .update(orders)
      .set({ status })
      .where(eq(orders.id, id))
      .returning();
    return order;
  }

  // Reviews
  async getProductReviews(productId: string): Promise<(Review & { user: { firstName: string | null; lastName: string | null } })[]> {
    const reviewsWithUsers = await db
      .select({
        id: reviews.id,
        userId: reviews.userId,
        productId: reviews.productId,
        rating: reviews.rating,
        title: reviews.title,
        comment: reviews.comment,
        createdAt: reviews.createdAt,
        user: {
          firstName: users.firstName,
          lastName: users.lastName
        }
      })
      .from(reviews)
      .leftJoin(users, eq(reviews.userId, users.id))
      .where(eq(reviews.productId, productId))
      .orderBy(desc(reviews.createdAt));

    return reviewsWithUsers.map(review => ({
      ...review,
      user: review.user || { firstName: null, lastName: null }
    }));
  }

  async createReview(review: InsertReview): Promise<Review> {
    const [newReview] = await db.insert(reviews).values(review).returning();
    return newReview;
  }

  async updateReview(id: string, reviewUpdate: Partial<InsertReview>): Promise<Review> {
    const [review] = await db
      .update(reviews)
      .set(reviewUpdate)
      .where(eq(reviews.id, id))
      .returning();
    return review;
  }

  async deleteReview(id: string): Promise<void> {
    await db.delete(reviews).where(eq(reviews.id, id));
  }

  // User Settings
  async getUserSettings(userId: string): Promise<UserSettings | undefined> {
    const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
    return settings || undefined;
  }

  async createUserSettings(settings: InsertUserSettings): Promise<UserSettings> {
    const [newSettings] = await db.insert(userSettings).values(settings).returning();
    return newSettings;
  }

  async updateUserSettings(userId: string, settingsUpdate: Partial<InsertUserSettings>): Promise<UserSettings> {
    const existingSettings = await this.getUserSettings(userId);
    
    if (!existingSettings) {
      // Create new settings if they don't exist
      const defaultSettings: InsertUserSettings = {
        userId,
        orderUpdates: true,
        promotionalEmails: false,
        productRecommendations: true,
        securityAlerts: true,
        dataAnalytics: false,
        personalizedRecommendations: true,
        marketingCommunications: false,
        activityTracking: false,
        theme: "system",
        language: "en",
        ...settingsUpdate
      };
      return await this.createUserSettings(defaultSettings);
    }

    const [updatedSettings] = await db
      .update(userSettings)
      .set({ ...settingsUpdate, updatedAt: sql`now()` })
      .where(eq(userSettings.userId, userId))
      .returning();
    return updatedSettings;
  }

  // Password Management
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user) {
      return false;
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      return false;
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update password and last password change timestamp
    await db
      .update(users)
      .set({ 
        passwordHash: hashedNewPassword,
        lastPasswordChange: sql`now()`,
        updatedAt: sql`now()`
      })
      .where(eq(users.id, userId));

    return true;
  }

  // Data Export
  async exportUserData(userId: string): Promise<any> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Get all user-related data
    const [userPrefs, userSettingsData, userAddresses, userOrders, userReviews, userCartItems] = await Promise.all([
      this.getUserPreferences(userId),
      this.getUserSettings(userId),
      this.getUserAddresses(userId),
      this.getOrders(userId),
      db.select().from(reviews).where(eq(reviews.userId, userId)),
      this.getCartItems(userId)
    ]);

    // Remove sensitive data
    const { passwordHash, twoFactorSecret, emailVerificationToken, phoneVerificationToken, ...safeUserData } = user;

    return {
      user: safeUserData,
      preferences: userPrefs,
      settings: userSettingsData,
      addresses: userAddresses,
      orders: userOrders.map(order => ({
        ...order,
        orderItems: order.orderItems.map(item => ({
          ...item,
          product: {
            name: item.product.name,
            price: item.product.price,
            imageUrl: item.product.imageUrl
          }
        }))
      })),
      reviews: userReviews,
      cart: userCartItems.map(item => ({
        quantity: item.quantity,
        product: {
          name: item.product.name,
          price: item.product.price,
          imageUrl: item.product.imageUrl
        },
        addedAt: item.createdAt
      })),
      exportedAt: new Date(),
      dataRetentionInfo: {
        description: "This export contains all your personal data stored in our system.",
        retentionPeriod: "Data is retained for account management and order history purposes.",
        deletionRights: "You can request account deletion at any time through your account settings."
      }
    };
  }

  // ===== V1 API Methods =====
  
  // Products V1
  async getProductsV1(params: {
    categoryId?: string;
    search?: string;
    sortBy?: 'name' | 'price' | 'rating' | 'created';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
    brand?: string;
    minPrice?: number;
    maxPrice?: number;
    status?: string;
  } = {}): Promise<{ products: any[]; total: number }> {
    const {
      categoryId,
      search,
      sortBy = 'created',
      sortOrder = 'desc',
      limit = 20,
      offset = 0,
      brand,
      minPrice,
      maxPrice,
      status = 'active'
    } = params;

    const conditions = [eq(products.status, status)];

    if (categoryId) {
      conditions.push(eq(products.categoryId, categoryId));
    }

    if (search) {
      conditions.push(ilike(products.name, `%${search}%`));
    }

    if (minPrice !== undefined) {
      conditions.push(gte(products.price, minPrice.toString()));
    }

    if (maxPrice !== undefined) {
      conditions.push(lte(products.price, maxPrice.toString()));
    }

    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

    const sortColumn = {
      name: products.name,
      price: products.price,
      rating: products.rating,
      created: products.createdAt
    }[sortBy];

    const [productsResult, countResult] = await Promise.all([
      db.select().from(products)
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .where(whereClause)
        .orderBy(sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(products)
        .where(whereClause)
    ]);

    return {
      products: productsResult.map(row => ({
        productId: row.products.id,
        sku: row.products.sku,
        name: row.products.name,
        slug: row.products.slug,
        description: row.products.description,
        shortDescription: row.products.shortDescription,
        categories: row.products.categories || [],
        pricing: {
          basePrice: row.products.basePrice || row.products.price,
          salePrice: row.products.salePrice,
          currency: row.products.currency || "USD",
          taxRate: row.products.taxRate || "0"
        },
        media: row.products.images?.map((url: string, index: number) => ({
          mediaId: `${row.products.id}-${index}`,
          type: "image",
          url,
          position: index
        })) || [],
        attributes: row.products.attributes || {},
        seo: row.products.seo || {},
        status: row.products.status,
        metadata: {
          createdAt: row.products.createdAt,
          updatedAt: row.products.updatedAt,
          publishedAt: row.products.publishedAt
        },
        category: row.categories ? {
          id: row.categories.id,
          name: row.categories.name,
          slug: row.categories.slug
        } : null
      })),
      total: countResult[0].count
    };
  }

  async getProductByIdV1(productId: string): Promise<any> {
    const [result] = await db.select().from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(eq(products.id, productId));

    if (!result) return null;

    return {
      productId: result.products.id,
      sku: result.products.sku,
      name: result.products.name,
      slug: result.products.slug,
      description: result.products.description,
      shortDescription: result.products.shortDescription,
      categories: result.products.categories || [],
      pricing: {
        basePrice: result.products.basePrice || result.products.price,
        salePrice: result.products.salePrice,
        currency: result.products.currency || "USD",
        taxRate: result.products.taxRate || "0"
      },
      media: result.products.images?.map((url: string, index: number) => ({
        mediaId: `${result.products.id}-${index}`,
        type: "image",
        url,
        position: index
      })) || [],
      attributes: result.products.attributes || {},
      seo: result.products.seo || {},
      status: result.products.status,
      metadata: {
        createdAt: result.products.createdAt,
        updatedAt: result.products.updatedAt,
        publishedAt: result.products.publishedAt
      },
      category: result.categories ? {
        id: result.categories.id,
        name: result.categories.name,
        slug: result.categories.slug
      } : null
    };
  }

  async createProductV1(productData: any): Promise<any> {
    const newProduct = await db.insert(products).values({
      sku: productData.sku,
      name: productData.name,
      slug: productData.slug,
      description: productData.description,
      shortDescription: productData.shortDescription,
      price: productData.pricing?.basePrice || productData.price,
      basePrice: productData.pricing?.basePrice,
      salePrice: productData.pricing?.salePrice,
      currency: productData.pricing?.currency || "USD",
      taxRate: productData.pricing?.taxRate || "0",
      categoryId: productData.categoryId,
      imageUrl: productData.media?.[0]?.url,
      images: productData.media?.map((m: any) => m.url) || [],
      attributes: productData.attributes || {},
      seo: productData.seo || {},
      status: productData.status || "active",
      stock: productData.inventory?.quantity || 0
    } as any).returning();

    return newProduct[0];
  }

  async updateProductV1(productId: string, productData: any): Promise<any> {
    const updateData: any = {
      updatedAt: sql`now()`
    };

    if (productData.name) updateData.name = productData.name;
    if (productData.description) updateData.description = productData.description;
    if (productData.pricing?.basePrice) {
      updateData.basePrice = productData.pricing.basePrice;
      updateData.price = productData.pricing.basePrice;
    }
    if (productData.pricing?.salePrice) updateData.salePrice = productData.pricing.salePrice;
    if (productData.attributes) updateData.attributes = productData.attributes;
    if (productData.seo) updateData.seo = productData.seo;
    if (productData.status) updateData.status = productData.status;

    const [updatedProduct] = await db
      .update(products)
      .set(updateData)
      .where(eq(products.id, productId))
      .returning();

    return updatedProduct;
  }

  async deleteProductV1(productId: string): Promise<void> {
    await db.delete(products).where(eq(products.id, productId));
  }

  async getProductVariants(productId: string): Promise<any[]> {
    // For now, return empty array as we'll implement variants later
    return [];
  }

  async addProductMedia(productId: string, mediaData: any): Promise<any> {
    // For now, add to the images array
    const product = await this.getProduct(productId);
    if (!product) throw new Error("Product not found");

    const updatedImages = [...(product.images || []), mediaData.url];
    await db.update(products)
      .set({ images: updatedImages })
      .where(eq(products.id, productId));

    return {
      mediaId: `${productId}-${updatedImages.length - 1}`,
      type: mediaData.type || "image",
      url: mediaData.url,
      position: updatedImages.length - 1
    };
  }

  async searchProductsV1(params: {
    query?: string;
    category?: string;
    brand?: string;
    minPrice?: number;
    maxPrice?: number;
    limit?: number;
  }): Promise<{ products: any[]; total: number }> {
    return this.getProductsV1(params);
  }

  async getProductFilters(): Promise<any> {
    const [categoriesResult, priceRange] = await Promise.all([
      db.select().from(categories),
      db.select({
        min: sql<number>`MIN(${products.price}::numeric)`,
        max: sql<number>`MAX(${products.price}::numeric)`
      }).from(products)
    ]);

    return {
      categories: categoriesResult,
      priceRange: {
        min: priceRange[0]?.min || 0,
        max: priceRange[0]?.max || 1000
      },
      brands: [] // Will implement when brands table is used
    };
  }

  // Categories V1
  async getCategoriesV1(params: { includeChildren?: boolean } = {}): Promise<any[]> {
    const categoriesResult = await db.select().from(categories);
    
    return categoriesResult.map(category => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      emoji: category.emoji,
      parentId: category.parentId,
      imageUrl: category.imageUrl,
      status: category.status,
      sortOrder: category.sortOrder,
      seo: category.seo,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt
    }));
  }

  async getCategoryByIdV1(categoryId: string): Promise<any> {
    const [category] = await db.select().from(categories).where(eq(categories.id, categoryId));
    if (!category) return null;

    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      emoji: category.emoji,
      parentId: category.parentId,
      imageUrl: category.imageUrl,
      status: category.status,
      sortOrder: category.sortOrder,
      seo: category.seo,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt
    };
  }

  async createCategoryV1(categoryData: any): Promise<any> {
    const [newCategory] = await db.insert(categories).values({
      name: categoryData.name,
      slug: categoryData.slug,
      description: categoryData.description,
      emoji: categoryData.emoji,
      parentId: categoryData.parentId,
      imageUrl: categoryData.imageUrl,
      status: categoryData.status || "active",
      sortOrder: categoryData.sortOrder || 0,
      seo: categoryData.seo || {}
    } as any).returning();

    return newCategory;
  }

  async updateCategoryV1(categoryId: string, categoryData: any): Promise<any> {
    const updateData = {
      ...categoryData,
      updatedAt: sql`now()`
    };

    const [updatedCategory] = await db
      .update(categories)
      .set(updateData)
      .where(eq(categories.id, categoryId))
      .returning();

    return updatedCategory;
  }

  async deleteCategoryV1(categoryId: string): Promise<void> {
    await db.delete(categories).where(eq(categories.id, categoryId));
  }

  async getProductsByCategoryV1(categoryId: string, params: {
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<{ products: any[]; total: number }> {
    return this.getProductsV1({ ...params, categoryId });
  }
}

export const storage = new DatabaseStorage();
