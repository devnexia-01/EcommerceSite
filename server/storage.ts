import { 
  users, categories, products, addresses, cartItems, orders, orderItems, reviews,
  type User, type InsertUser, type Category, type InsertCategory, 
  type Product, type InsertProduct, type Address, type InsertAddress,
  type CartItem, type InsertCartItem, type Order, type InsertOrder,
  type OrderItem, type InsertOrderItem, type Review, type InsertReview
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, ilike, and, sql } from "drizzle-orm";
import bcrypt from "bcrypt";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User>;
  
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
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    const [user] = await db
      .insert(users)
      .values({ ...insertUser, password: hashedPassword })
      .returning();
    return user;
  }

  async updateUser(id: string, userUpdate: Partial<InsertUser>): Promise<User> {
    const updates = { ...userUpdate };
    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: sql`now()` })
      .where(eq(users.id, id))
      .returning();
    return user;
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
}

export const storage = new DatabaseStorage();
