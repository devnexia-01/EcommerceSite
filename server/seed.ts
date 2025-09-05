import { db } from "./db";
import { categories, products, users } from "@shared/schema";
import bcrypt from "bcrypt";

async function seed() {
  try {
    // Create admin user
    const hashedPassword = await bcrypt.hash("admin123", 10);
    await db.insert(users).values({
      email: "admin@example.com",
      username: "admin",
      passwordHash: hashedPassword,
      firstName: "Admin",
      lastName: "User",
      isAdmin: true,
      emailVerified: true
    }).onConflictDoNothing();

    // Create sample categories
    const sampleCategories = [
      { name: "Electronics", slug: "electronics", description: "Latest gadgets and electronics", emoji: "📱" },
      { name: "Fashion", slug: "fashion", description: "Trendy clothing and accessories", emoji: "👕" },
      { name: "Home & Garden", slug: "home-garden", description: "Everything for your home", emoji: "🏠" },
      { name: "Sports", slug: "sports", description: "Sports and fitness equipment", emoji: "🏃‍♂️" },
      { name: "Books", slug: "books", description: "Books and educational materials", emoji: "📚" }
    ];

    for (const category of sampleCategories) {
      await db.insert(categories).values(category).onConflictDoNothing();
    }

    // Get categories for product creation
    const createdCategories = await db.select().from(categories);
    const electronicsCategory = createdCategories.find(c => c.slug === "electronics");
    const fashionCategory = createdCategories.find(c => c.slug === "fashion");
    const homeCategory = createdCategories.find(c => c.slug === "home-garden");

    // Create sample products
    const sampleProducts = [
      {
        name: "Wireless Bluetooth Headphones",
        slug: "wireless-bluetooth-headphones",
        description: "Premium noise-cancelling wireless headphones with 30-hour battery life",
        price: "199.99",
        comparePrice: "249.99",
        stock: 50,
        categoryId: electronicsCategory?.id,
        sku: "WBH-001",
        rating: "4.5",
        reviewCount: 128,
        imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400"
      },
      {
        name: "Smart Watch Series X",
        slug: "smart-watch-series-x",
        description: "Advanced fitness tracking, heart rate monitoring, and smartphone connectivity",
        price: "299.99",
        comparePrice: "349.99",
        stock: 25,
        categoryId: electronicsCategory?.id,
        sku: "SW-001",
        rating: "4.7",
        reviewCount: 89,
        imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400"
      },
      {
        name: "Premium Cotton T-Shirt",
        slug: "premium-cotton-t-shirt",
        description: "Soft, comfortable 100% organic cotton t-shirt in multiple colors",
        price: "29.99",
        stock: 100,
        categoryId: fashionCategory?.id,
        sku: "PCT-001",
        rating: "4.2",
        reviewCount: 67,
        imageUrl: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400"
      },
      {
        name: "Modern Coffee Table",
        slug: "modern-coffee-table",
        description: "Sleek glass-top coffee table with wooden legs, perfect for modern living rooms",
        price: "199.99",
        stock: 15,
        categoryId: homeCategory?.id,
        sku: "MCT-001",
        rating: "4.4",
        reviewCount: 34,
        imageUrl: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400"
      },
      {
        name: "Wireless Phone Charger",
        slug: "wireless-phone-charger",
        description: "Fast wireless charging pad compatible with all Qi-enabled devices",
        price: "39.99",
        comparePrice: "59.99",
        stock: 75,
        categoryId: electronicsCategory?.id,
        sku: "WPC-001",
        rating: "4.1",
        reviewCount: 156,
        imageUrl: "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400"
      },
      {
        name: "Designer Sunglasses",
        slug: "designer-sunglasses",
        description: "Stylish UV-protection sunglasses with polarized lenses",
        price: "89.99",
        comparePrice: "129.99",
        stock: 40,
        categoryId: fashionCategory?.id,
        sku: "DS-001",
        rating: "4.6",
        reviewCount: 92,
        imageUrl: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400"
      }
    ];

    for (const product of sampleProducts) {
      await db.insert(products).values(product).onConflictDoNothing();
    }

    console.log("✅ Database seeded successfully!");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
  }
}

// Run seed function
seed().then(() => process.exit(0));

export { seed };