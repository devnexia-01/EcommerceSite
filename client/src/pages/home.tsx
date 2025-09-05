import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import ProductCard from "@/components/product/product-card";
import { ArrowRight, Truck, Shield, Headphones } from "lucide-react";

export default function Home() {
  const { data: categoriesData } = useQuery({
    queryKey: ["/api/categories"]
  });

  const { data: featuredProducts } = useQuery({
    queryKey: ["/api/products", { limit: 8 }]
  });

  const categories = (categoriesData as any[]) || [];
  const products = (featuredProducts as any)?.products || [];

  const categoryEmojis: Record<string, string> = {
    electronics: "📱",
    fashion: "👕", 
    home: "🏠",
    gaming: "🎮",
    beauty: "💄",
    sports: "🏃‍♂️"
  };

  return (
    <div className="min-h-screen" data-testid="home-page">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary to-accent text-primary-foreground">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold mb-6" data-testid="hero-title">
                Premium Products, Exceptional Quality
              </h2>
              <p className="text-xl mb-8 text-primary-foreground/90" data-testid="hero-description">
                Discover our curated collection of premium products with lightning-fast delivery and unmatched customer service.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  asChild 
                  className="bg-accent hover:bg-accent/90 text-accent-foreground px-8 py-3 font-semibold"
                  data-testid="hero-shop-now"
                >
                  <Link href="/products">Shop Now</Link>
                </Button>
                <Button 
                  variant="outline" 
                  className="border-primary-foreground/30 hover:bg-primary-foreground/10 text-primary-foreground px-8 py-3 font-semibold"
                  data-testid="hero-learn-more"
                >
                  Learn More
                </Button>
              </div>
            </div>
            <div className="lg:text-right">
              <img
                src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600"
                alt="Premium electronics and lifestyle products showcase"
                className="rounded-lg shadow-2xl w-full h-auto"
                data-testid="hero-image"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 bg-muted">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center" data-testid="feature-shipping">
              <div className="bg-primary text-primary-foreground rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Truck className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Free Shipping</h3>
              <p className="text-muted-foreground">Free shipping on orders over $50</p>
            </div>
            <div className="text-center" data-testid="feature-security">
              <div className="bg-primary text-primary-foreground rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Secure Payments</h3>
              <p className="text-muted-foreground">Your payment information is safe and secure</p>
            </div>
            <div className="text-center" data-testid="feature-support">
              <div className="bg-primary text-primary-foreground rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Headphones className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-semibold mb-2">24/7 Support</h3>
              <p className="text-muted-foreground">Get help whenever you need it</p>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h3 className="text-2xl md:text-3xl font-bold mb-4" data-testid="categories-title">
              Shop by Category
            </h3>
            <p className="text-muted-foreground text-lg">
              Find exactly what you're looking for
            </p>
          </div>

          {categories.length === 0 ? (
            <div className="text-center py-8">
              <LoadingSpinner className="mx-auto mb-4" data-testid="categories-loading" />
              <p className="text-muted-foreground">Loading categories...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
              {categories.map((category: any) => (
                <Link key={category.id} href={`/products?category=${category.id}`}>
                  <Card className="text-center group cursor-pointer hover:shadow-md transition-shadow" data-testid={`category-${category.slug}`}>
                    <CardContent className="p-6">
                      <div className="text-4xl mb-3">
                        {category.emoji || categoryEmojis[category.slug] || "📦"}
                      </div>
                      <h4 className="font-semibold text-foreground mb-1">{category.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        Explore collection
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-12 bg-muted">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-2xl md:text-3xl font-bold mb-2" data-testid="featured-title">
                Featured Products
              </h3>
              <p className="text-muted-foreground">
                Handpicked items just for you
              </p>
            </div>
            <Button asChild variant="outline" data-testid="view-all-products">
              <Link href="/products" className="flex items-center gap-2">
                View All
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          {products.length === 0 ? (
            <div className="text-center py-8">
              <LoadingSpinner className="mx-auto mb-4" data-testid="products-loading" />
              <p className="text-muted-foreground">Loading featured products...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {products.slice(0, 8).map((product: any) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="bg-primary text-primary-foreground py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-2xl md:text-3xl font-bold mb-4" data-testid="newsletter-title">
            Stay in the Loop
          </h3>
          <p className="text-xl mb-8 text-primary-foreground/90">
            Subscribe to our newsletter for the latest updates and exclusive offers
          </p>
          <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 rounded-lg border-0 focus:outline-none text-foreground"
              data-testid="newsletter-email-input"
            />
            <Button 
              className="bg-accent hover:bg-accent/90 text-accent-foreground px-8 py-3 font-semibold"
              data-testid="newsletter-subscribe-button"
            >
              Subscribe
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
