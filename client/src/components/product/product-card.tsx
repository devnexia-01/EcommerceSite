import { Link } from "wouter";
import { Heart, ShoppingCart, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useCart } from "@/hooks/use-enhanced-cart";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useWishlist } from "@/hooks/use-wishlist";

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
  const { toggleWishlist, isInWishlist } = useWishlist();

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

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
      toast({
        title: "Added to cart",
        description: `${product.name} has been added to your cart`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add item to cart. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await toggleWishlist(product.id);
  };

  const discountPercentage = product.comparePrice 
    ? Math.round(((parseFloat(product.comparePrice) - parseFloat(product.price)) / parseFloat(product.comparePrice)) * 100)
    : 0;

  return (
    <Card className="furniture-card group" data-testid={`product-card-${product.id}`}>
      <Link href={`/product/${product.slug}`}>
        <div className="relative aspect-square sm:aspect-[4/3] overflow-hidden rounded-t-lg">
          <img
            src={product.imageUrl || "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300"}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            data-testid={`product-image-${product.id}`}
          />
          
          {/* Badges */}
          <div className="absolute top-1 sm:top-2 left-1 sm:left-2 flex flex-col gap-1">
            {discountPercentage > 0 && (
              <Badge className="bg-accent text-accent-foreground text-xs" data-testid={`discount-badge-${product.id}`}>
                {discountPercentage}% OFF
              </Badge>
            )}
            {product.stock === 0 && (
              <Badge variant="destructive" className="text-xs" data-testid={`out-of-stock-badge-${product.id}`}>
                OUT OF STOCK
              </Badge>
            )}
            {product.stock > 0 && product.stock < 5 && (
              <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200 text-xs" data-testid={`low-stock-badge-${product.id}`}>
                LOW STOCK
              </Badge>
            )}
          </div>

          {/* Wishlist Button */}
          <div className="absolute top-1 sm:top-2 right-1 sm:right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="secondary"
              size="icon"
              className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-white/90 hover:bg-white shadow-md"
              onClick={handleWishlist}
              data-testid={`wishlist-button-${product.id}`}
            >
              <Heart className={`h-3 w-3 sm:h-4 sm:w-4 ${isInWishlist[product.id] ? 'fill-red-500 text-red-500' : ''}`} />
            </Button>
          </div>
        </div>

        <CardContent className="p-3 sm:p-4 lg:p-6">
          <div className="space-y-2 sm:space-y-3">
            <div>
              <h4 className="font-serif text-sm sm:text-base lg:text-lg font-semibold text-foreground group-hover:text-primary transition-colors cursor-pointer leading-tight line-clamp-2" data-testid={`product-name-${product.id}`}>
                {product.name}
              </h4>
              <div className="flex items-center mt-1">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star 
                      key={i}
                      className={`h-2.5 w-2.5 sm:h-3 sm:w-3 ${i < Math.floor(parseFloat(product.rating)) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                    />
                  ))}
                </div>
                <span className="text-xs sm:text-sm text-muted-foreground ml-2" data-testid={`product-rating-${product.id}`}>
                  {parseFloat(product.rating).toFixed(1)}
                  {product.reviewCount > 0 && (
                    <span className="ml-1" data-testid={`review-count-${product.id}`}>
                      ({product.reviewCount})
                    </span>
                  )}
                </span>
              </div>
            </div>

            <div className="flex flex-col space-y-3 pt-2">
              <div className="flex items-center space-x-2">
                <span className="text-lg sm:text-xl lg:text-2xl font-serif font-bold text-foreground" data-testid={`product-price-${product.id}`}>
                  ${parseFloat(product.price).toFixed(2)}
                </span>
                {product.comparePrice && (
                  <span className="text-xs sm:text-sm text-muted-foreground line-through" data-testid={`compare-price-${product.id}`}>
                    ${parseFloat(product.comparePrice).toFixed(2)}
                  </span>
                )}
              </div>
              <Button
                size="sm"
                onClick={handleAddToCart}
                disabled={product.stock === 0}
                className="furniture-btn-primary w-full h-9 sm:h-10 lg:h-11 text-xs sm:text-sm font-medium"
                data-testid={`add-to-cart-${product.id}`}
              >
                <ShoppingCart className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                <span>Add to Cart</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}
