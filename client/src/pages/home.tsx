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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
            <div className="space-y-6 lg:space-y-8 text-center lg:text-left">
              <div className="space-y-3 lg:space-y-4">
                <p className="text-primary font-medium tracking-wider uppercase text-xs sm:text-sm">Premium Shopping</p>
                <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-foreground leading-tight" data-testid="hero-title">
                  Premium Products, Exceptional Quality
                </h2>
                <p className="text-base sm:text-lg lg:text-xl text-muted-foreground leading-relaxed max-w-lg mx-auto lg:mx-0" data-testid="hero-description">
                  Discover our curated collection of premium products with lightning-fast delivery and unmatched customer service.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center lg:justify-start">
                <Button 
                  asChild 
                  className="furniture-btn-primary text-base sm:text-lg h-12 sm:h-14 px-6 sm:px-8"
                  data-testid="hero-shop-now"
                >
                  <Link href="/products">Shop Now</Link>
                </Button>
                <Button 
                  variant="outline" 
                  className="furniture-btn-secondary text-base sm:text-lg h-12 sm:h-14 px-6 sm:px-8"
                  data-testid="hero-learn-more"
                >
                  Learn More
                </Button>
              </div>
            </div>
            <div className="relative order-first lg:order-last">
              <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl">
                <img
                  src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600"
                  alt="Premium electronics and lifestyle products showcase"
                  className="w-full h-full object-cover"
                  data-testid="hero-image"
                />
              </div>
              <div className="absolute -bottom-4 sm:-bottom-6 lg:-bottom-8 -left-4 sm:-left-6 lg:-left-8 bg-card rounded-xl lg:rounded-2xl p-3 sm:p-4 lg:p-6 shadow-xl border border-border">
                <div className="flex items-center space-x-2 lg:space-x-3">
                  <div className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-primary-foreground font-bold text-sm sm:text-base lg:text-lg">5.0</span>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm sm:text-base">Premium Quality</p>
                    <p className="text-muted-foreground text-xs sm:text-sm">Trusted by 10,000+ customers</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 sm:py-16 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12">
            <h3 className="text-2xl sm:text-3xl font-serif font-semibold text-foreground mb-3 sm:mb-4">Why Choose EliteCommerce</h3>
            <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">We're committed to bringing you the finest products with exceptional service at every step of your journey.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-12">
            <div className="text-center group" data-testid="feature-shipping">
              <div className="bg-secondary group-hover:bg-primary group-hover:text-primary-foreground text-secondary-foreground rounded-2xl w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center mx-auto mb-4 sm:mb-6 transition-all duration-300">
                <Truck className="h-8 w-8 sm:h-10 sm:w-10" />
              </div>
              <h3 className="text-lg sm:text-xl font-serif font-semibold mb-2 sm:mb-3">Free Shipping</h3>
              <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">Free shipping on orders over $50 with fast, reliable delivery</p>
            </div>
            <div className="text-center group" data-testid="feature-security">
              <div className="bg-secondary group-hover:bg-primary group-hover:text-primary-foreground text-secondary-foreground rounded-2xl w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center mx-auto mb-4 sm:mb-6 transition-all duration-300">
                <Shield className="h-8 w-8 sm:h-10 sm:w-10" />
              </div>
              <h3 className="text-lg sm:text-xl font-serif font-semibold mb-2 sm:mb-3">Secure Payments</h3>
              <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">Your payment information is safe and secure with our encrypted checkout</p>
            </div>
            <div className="text-center group sm:col-span-2 lg:col-span-1" data-testid="feature-support">
              <div className="bg-secondary group-hover:bg-primary group-hover:text-primary-foreground text-secondary-foreground rounded-2xl w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center mx-auto mb-4 sm:mb-6 transition-all duration-300">
                <Headphones className="h-8 w-8 sm:h-10 sm:w-10" />
              </div>
              <h3 className="text-lg sm:text-xl font-serif font-semibold mb-2 sm:mb-3">24/7 Support</h3>
              <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">Get help whenever you need it with our dedicated customer support team</p>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 sm:py-20 furniture-gradient">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-semibold text-foreground mb-3 sm:mb-4" data-testid="categories-title">
              Shop by Category
            </h3>
            <p className="text-muted-foreground text-base sm:text-lg lg:text-xl max-w-2xl mx-auto">
              Find exactly what you're looking for in our organized collections
            </p>
          </div>

          {categories.length === 0 ? (
            <div className="text-center py-12">
              <LoadingSpinner className="mx-auto mb-4" data-testid="categories-loading" />
              <p className="text-muted-foreground text-lg">Loading categories...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {categories.map((category: any) => (
                <Link key={category.id} href={`/products?category=${category.id}`}>
                  <Card className="furniture-card group cursor-pointer text-center h-full overflow-hidden" data-testid={`category-${category.slug}`}>
                    <div className="aspect-[3/2] bg-secondary/20">
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="text-6xl sm:text-7xl lg:text-8xl opacity-60">
                          {category.emoji || categoryEmojis[category.slug] || "🏠"}
                        </div>
                      </div>
                    </div>
                    <CardContent className="p-4 sm:p-6 lg:p-8">
                      <h4 className="font-serif text-lg sm:text-xl lg:text-2xl font-semibold text-foreground mb-2 sm:mb-3 group-hover:text-primary transition-colors">{category.name}</h4>
                      <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">
                        Explore our {category.name.toLowerCase()} collection
                      </p>
                      <div className="mt-3 sm:mt-4 text-primary font-medium group-hover:underline text-sm sm:text-base">
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
      <section className="py-16 sm:py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-8 sm:mb-12 space-y-4 sm:space-y-0">
            <div>
              <h3 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-semibold text-foreground mb-2 sm:mb-4" data-testid="featured-title">
                Featured Products
              </h3>
              <p className="text-muted-foreground text-base sm:text-lg lg:text-xl max-w-lg">
                Handpicked items just for you
              </p>
            </div>
            <Button asChild className="furniture-btn-secondary self-start sm:self-auto" data-testid="view-all-products">
              <Link href="/products" className="flex items-center gap-2">
                View All Products
                <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
              </Link>
            </Button>
          </div>

          {products.length === 0 ? (
            <div className="text-center py-16">
              <LoadingSpinner className="mx-auto mb-4" data-testid="products-loading" />
              <p className="text-muted-foreground text-lg">Loading featured products...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
              {products.slice(0, 8).map((product: any) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="bg-primary text-primary-foreground py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-semibold mb-4 sm:mb-6" data-testid="newsletter-title">
            Stay in the Loop
          </h3>
          <p className="text-base sm:text-lg lg:text-xl mb-8 sm:mb-10 text-primary-foreground/90 max-w-2xl mx-auto leading-relaxed">
            Subscribe to our newsletter for the latest updates and exclusive offers
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 max-w-lg mx-auto">
            <input
              type="email"
              placeholder="Your email address"
              className="flex-1 px-4 sm:px-6 py-3 sm:py-4 rounded-full border-0 focus:outline-none text-foreground text-base sm:text-lg"
              data-testid="newsletter-email-input"
            />
            <Button 
              className="furniture-btn-secondary bg-accent hover:bg-accent text-accent-foreground px-6 sm:px-8 py-3 sm:py-4 rounded-full text-base sm:text-lg font-medium"
              data-testid="newsletter-subscribe-button"
            >
              Subscribe
            </Button>
          </div>
          <p className="text-primary-foreground/70 text-xs sm:text-sm mt-3 sm:mt-4">
            No spam, unsubscribe anytime. Read our privacy policy.
          </p>
        </div>
      </section>
    </div>
  );
}
