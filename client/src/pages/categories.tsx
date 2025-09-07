import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, Package, TrendingUp } from "lucide-react";

export default function Categories() {
  const { data: categoriesData, isLoading } = useQuery({
    queryKey: ["/api/categories"]
  });

  const { data: productsData } = useQuery({
    queryKey: ["/api/products"]
  });

  const categories = (categoriesData as any[]) || [];
  const allProducts = (productsData as any)?.products || [];

  // Calculate product count per category
  const getCategoryProductCount = (categoryId: string) => {
    return allProducts.filter((product: any) => product.categoryId === categoryId).length;
  };

  const categoryEmojis: Record<string, string> = {
    electronics: "📱",
    fashion: "👕", 
    "home-garden": "🏠",
    sports: "🏃‍♂️",
    books: "📚",
    beauty: "💄",
    gaming: "🎮"
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background" data-testid="categories-page">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <LoadingSpinner className="mx-auto mb-4" data-testid="categories-loading" />
            <p className="text-muted-foreground">Loading categories...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" data-testid="categories-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-serif font-semibold text-foreground mb-6" data-testid="categories-title">
            Shop by Room
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Discover furniture collections tailored to every space in your home. From cozy living rooms to elegant dining spaces, find pieces that perfectly complement your lifestyle.
          </p>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card>
            <CardContent className="p-6 text-center">
              <div className="bg-primary text-primary-foreground rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                <Package className="h-6 w-6" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-2">{categories.length}</h3>
              <p className="text-muted-foreground">Categories</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <div className="bg-accent text-accent-foreground rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                <ShoppingBag className="h-6 w-6" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-2">{allProducts.length}</h3>
              <p className="text-muted-foreground">Total Products</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <div className="bg-green-500 text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="h-6 w-6" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-2">
                {categories.filter((cat: any) => getCategoryProductCount(cat.id) > 0).length}
              </h3>
              <p className="text-muted-foreground">Active Categories</p>
            </CardContent>
          </Card>
        </div>

        {/* Categories Grid */}
        {categories.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold mb-2">No categories found</h3>
            <p className="text-muted-foreground">
              Categories will appear here once they are added to the store.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {categories.map((category: any) => {
              const productCount = getCategoryProductCount(category.id);
              return (
                <Link key={category.id} href={`/products?category=${category.id}`}>
                  <Card className="group cursor-pointer hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/20" data-testid={`category-card-${category.slug}`}>
                    <CardHeader className="text-center pb-4">
                      <div className="text-6xl mb-4 group-hover:scale-110 transition-transform duration-300">
                        {category.emoji || categoryEmojis[category.slug] || "📦"}
                      </div>
                      <CardTitle className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                        {category.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-muted-foreground text-center mb-4 line-clamp-2">
                        {category.description || "Discover amazing products in this category"}
                      </p>
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="text-sm">
                          {productCount} {productCount === 1 ? 'Product' : 'Products'}
                        </Badge>
                        <div className="text-sm text-primary font-medium group-hover:underline">
                          Browse →
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}

        {/* Call to Action */}
        <div className="text-center mt-16">
          <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold text-foreground mb-4">
                Can't find what you're looking for?
              </h3>
              <p className="text-muted-foreground mb-6">
                Browse all our products or use our search feature to find exactly what you need.
              </p>
              <Link href="/products">
                <Badge className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 text-base cursor-pointer">
                  View All Products
                </Badge>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}