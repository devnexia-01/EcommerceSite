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
      <section className="furniture-gradient">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <p className="text-primary font-medium tracking-wider uppercase text-sm">Premium Shopping</p>
                <h2 className="text-5xl md:text-6xl font-serif font-bold text-foreground leading-tight" data-testid="hero-title">
                  Premium Products, Exceptional Quality
                </h2>
                <p className="text-xl text-muted-foreground leading-relaxed max-w-lg" data-testid="hero-description">
                  Discover our curated collection of premium products with lightning-fast delivery and unmatched customer service.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-6">
                <Button 
                  asChild 
                  className="furniture-btn-primary text-lg h-14"
                  data-testid="hero-shop-now"
                >
                  <Link href="/products">Shop Now</Link>
                </Button>
                <Button 
                  variant="outline" 
                  className="furniture-btn-secondary text-lg h-14"
                  data-testid="hero-learn-more"
                >
                  Learn More
                </Button>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl">
                <img
                  src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600"
                  alt="Premium electronics and lifestyle products showcase"
                  className="w-full h-full object-cover"
                  data-testid="hero-image"
                />
              </div>
              <div className="absolute -bottom-8 -left-8 bg-card rounded-2xl p-6 shadow-xl border border-border">
                <div className="flex items-center space-x-3">
                  <div className="h-12 w-12 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-primary-foreground font-bold text-lg">5.0</span>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Premium Quality</p>
                    <p className="text-muted-foreground text-sm">Trusted by 10,000+ customers</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-serif font-semibold text-foreground mb-4">Why Choose EliteCommerce</h3>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">We're committed to bringing you the finest products with exceptional service at every step of your journey.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center group" data-testid="feature-shipping">
              <div className="bg-secondary group-hover:bg-primary group-hover:text-primary-foreground text-secondary-foreground rounded-2xl w-20 h-20 flex items-center justify-center mx-auto mb-6 transition-all duration-300">
                <Truck className="h-10 w-10" />
              </div>
              <h3 className="text-xl font-serif font-semibold mb-3">Free Shipping</h3>
              <p className="text-muted-foreground leading-relaxed">Free shipping on orders over $50 with fast, reliable delivery</p>
            </div>
            <div className="text-center group" data-testid="feature-security">
              <div className="bg-secondary group-hover:bg-primary group-hover:text-primary-foreground text-secondary-foreground rounded-2xl w-20 h-20 flex items-center justify-center mx-auto mb-6 transition-all duration-300">
                <Shield className="h-10 w-10" />
              </div>
              <h3 className="text-xl font-serif font-semibold mb-3">Secure Payments</h3>
              <p className="text-muted-foreground leading-relaxed">Your payment information is safe and secure with our encrypted checkout</p>
            </div>
            <div className="text-center group" data-testid="feature-support">
              <div className="bg-secondary group-hover:bg-primary group-hover:text-primary-foreground text-secondary-foreground rounded-2xl w-20 h-20 flex items-center justify-center mx-auto mb-6 transition-all duration-300">
                <Headphones className="h-10 w-10" />
              </div>
              <h3 className="text-xl font-serif font-semibold mb-3">24/7 Support</h3>
              <p className="text-muted-foreground leading-relaxed">Get help whenever you need it with our dedicated customer support team</p>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-20 furniture-gradient">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-4xl font-serif font-semibold text-foreground mb-4" data-testid="categories-title">
              Shop by Category
            </h3>
            <p className="text-muted-foreground text-xl max-w-2xl mx-auto">
              Find exactly what you're looking for in our organized collections
            </p>
          </div>

          {categories.length === 0 ? (
            <div className="text-center py-12">
              <LoadingSpinner className="mx-auto mb-4" data-testid="categories-loading" />
              <p className="text-muted-foreground text-lg">Loading categories...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {categories.map((category: any) => (
                <Link key={category.id} href={`/products?category=${category.id}`}>
                  <Card className="furniture-card group cursor-pointer text-center h-full overflow-hidden" data-testid={`category-${category.slug}`}>
                    <div className="aspect-[3/2] bg-secondary/20">
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="text-8xl opacity-60">
                          {category.emoji || categoryEmojis[category.slug] || "🏠"}
                        </div>
                      </div>
                    </div>
                    <CardContent className="p-8">
                      <h4 className="font-serif text-2xl font-semibold text-foreground mb-3 group-hover:text-primary transition-colors">{category.name}</h4>
                      <p className="text-muted-foreground leading-relaxed">
                        Explore our {category.name.toLowerCase()} collection
                      </p>
                      <div className="mt-4 text-primary font-medium group-hover:underline">
                        View Collection →
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h3 className="text-4xl font-serif font-semibold text-foreground mb-4" data-testid="featured-title">
                Featured Collection
              </h3>
              <p className="text-muted-foreground text-xl max-w-lg">
                Discover our most loved furniture pieces, handpicked by our design experts
              </p>
            </div>
            <Button asChild className="furniture-btn-secondary" data-testid="view-all-products">
              <Link href="/products" className="flex items-center gap-2">
                View All Products
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
          </div>

          {products.length === 0 ? (
            <div className="text-center py-16">
              <LoadingSpinner className="mx-auto mb-4" data-testid="products-loading" />
              <p className="text-muted-foreground text-lg">Loading featured collection...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {products.slice(0, 8).map((product: any) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="bg-primary text-primary-foreground py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-4xl font-serif font-semibold mb-6" data-testid="newsletter-title">
            Design Inspiration Delivered
          </h3>
          <p className="text-xl mb-10 text-primary-foreground/90 max-w-2xl mx-auto leading-relaxed">
            Get the latest trends, exclusive previews, and interior design tips straight to your inbox. Join our community of design enthusiasts.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto">
            <input
              type="email"
              placeholder="Your email address"
              className="flex-1 px-6 py-4 rounded-full border-0 focus:outline-none text-foreground text-lg"
              data-testid="newsletter-email-input"
            />
            <Button 
              className="furniture-btn-secondary bg-accent hover:bg-accent text-accent-foreground px-8 py-4 rounded-full text-lg font-medium"
              data-testid="newsletter-subscribe-button"
            >
              Subscribe
            </Button>
          </div>
          <p className="text-primary-foreground/70 text-sm mt-4">
            No spam, unsubscribe anytime. Read our privacy policy.
          </p>
        </div>
      </section>
    </div>
  );
}
