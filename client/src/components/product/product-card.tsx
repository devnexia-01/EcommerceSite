import { Link } from "wouter";
import { Heart, ShoppingCart, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

interface Product {
  id: string;
  name: string;
  slug: string;
  price: string;
  comparePrice?: string | null;
  imageUrl: string | null;
  rating: string;
  reviewCount: number;
  stock: number;
}

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = useCart();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      toast({
        title: "Please login",
        description: "You need to be logged in to add items to cart",
        variant: "destructive"
      });
      return;
    }

    if (product.stock === 0) {
      toast({
        title: "Out of stock",
        description: "This product is currently out of stock",
        variant: "destructive"
      });
      return;
    }

    try {
      await addToCart(product.id);
    } catch (error) {
      // Error handled by useCart hook
    }
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // TODO: Implement wishlist functionality
    toast({
      title: "Coming soon",
      description: "Wishlist functionality coming soon!"
    });
  };

  const discountPercentage = product.comparePrice 
    ? Math.round(((parseFloat(product.comparePrice) - parseFloat(product.price)) / parseFloat(product.comparePrice)) * 100)
    : 0;

  return (
    <Card className="furniture-card group" data-testid={`product-card-${product.id}`}>
      <Link href={`/product/${product.slug}`}>
        <div className="relative aspect-[4/3] overflow-hidden rounded-t-lg">
          <img
            src={product.imageUrl || "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300"}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            data-testid={`product-image-${product.id}`}
          />
          
          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {discountPercentage > 0 && (
              <Badge className="bg-accent text-accent-foreground" data-testid={`discount-badge-${product.id}`}>
                {discountPercentage}% OFF
              </Badge>
            )}
            {product.stock === 0 && (
              <Badge variant="destructive" data-testid={`out-of-stock-badge-${product.id}`}>
                OUT OF STOCK
              </Badge>
            )}
            {product.stock > 0 && product.stock < 5 && (
              <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200" data-testid={`low-stock-badge-${product.id}`}>
                LOW STOCK
              </Badge>
            )}
          </div>

          {/* Wishlist Button */}
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="secondary"
              size="icon"
              className="h-8 w-8 rounded-full bg-white/90 hover:bg-white shadow-md"
              onClick={handleWishlist}
              data-testid={`wishlist-button-${product.id}`}
            >
              <Heart className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <CardContent className="p-6">
          <div className="space-y-3">
            <div>
              <h4 className="font-serif text-lg font-semibold text-foreground group-hover:text-primary transition-colors cursor-pointer leading-tight" data-testid={`product-name-${product.id}`}>
                {product.name}
              </h4>
              <div className="flex items-center mt-1">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star 
                      key={i}
                      className={`h-3 w-3 ${i < Math.floor(parseFloat(product.rating)) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                    />
                  ))}
                </div>
                <span className="text-sm text-muted-foreground ml-2" data-testid={`product-rating-${product.id}`}>
                  {parseFloat(product.rating).toFixed(1)}
                  {product.reviewCount > 0 && (
                    <span className="ml-1" data-testid={`review-count-${product.id}`}>
                      ({product.reviewCount})
                    </span>
                  )}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="text-2xl font-serif font-bold text-foreground" data-testid={`product-price-${product.id}`}>
                    ${parseFloat(product.price).toFixed(2)}
                  </span>
                  {product.comparePrice && (
                    <span className="text-sm text-muted-foreground line-through" data-testid={`compare-price-${product.id}`}>
                      ${parseFloat(product.comparePrice).toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
              <Button
                size="sm"
                onClick={handleAddToCart}
                disabled={product.stock === 0}
                className="furniture-btn-primary h-10 px-4"
                data-testid={`add-to-cart-${product.id}`}
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Add to Cart
              </Button>
            </div>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}
