import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Minus, Plus, ShoppingCart, Heart, Star, Share2, ChevronLeft, ChevronRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useCart } from "@/hooks/use-enhanced-cart";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";

export default function ProductDetail() {
  const [, params] = useRoute("/product/:slug");
  const [, navigate] = useLocation();
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [newReview, setNewReview] = useState({ rating: 5, title: "", comment: "" });
  const queryClient = useQueryClient();
  const { addToCart } = useCart();
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();

  const { data: product, isLoading } = useQuery({
    queryKey: ["/api/products/slug", params?.slug],
    enabled: !!params?.slug
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ["/api/products", product?.id, "reviews"],
    enabled: !!product?.id
  });

  const reviewMutation = useMutation({
    mutationFn: (reviewData: any) => apiRequest("POST", "/api/reviews", reviewData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products", product?.id, "reviews"] });
      setNewReview({ rating: 5, title: "", comment: "" });
      toast({
        title: "Success",
        description: "Review submitted successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit review",
        variant: "destructive"
      });
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" data-testid="product-detail-loading" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Product Not Found</h1>
          <p className="text-muted-foreground mb-4">The product you're looking for doesn't exist.</p>
          <Button asChild>
            <Link href="/products">Browse Products</Link>
          </Button>
        </div>
      </div>
    );
  }

  const handleAddToCart = async () => {
    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      const fullPath = window.location.pathname + window.location.search + window.location.hash;
      navigate(`/login?redirect=${encodeURIComponent(fullPath)}`);
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
      await addToCart(product.id, quantity);
    } catch (error) {
      // Error handled by useCart hook
    }
  };

  const handleBuyNow = async () => {
    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      const fullPath = window.location.pathname + window.location.search + window.location.hash;
      navigate(`/login?redirect=${encodeURIComponent(fullPath)}`);
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
      const response = await apiRequest("POST", "/api/buy-now/create-intent", {
        productId: product.id,
        quantity
      });

      // Redirect to buy now checkout
      navigate(response.redirectUrl);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create purchase intent. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast({
        title: "Please login",
        description: "You need to be logged in to submit a review",
        variant: "destructive"
      });
      return;
    }

    await reviewMutation.mutateAsync({
      productId: product.id,
      rating: newReview.rating,
      title: newReview.title,
      comment: newReview.comment
    });
  };

  const images = product.images && product.images.length > 0 ? product.images : [product.imageUrl];
  const averageRating = parseFloat(product.rating) || 0;
  const discountPercentage = product.comparePrice 
    ? Math.round(((parseFloat(product.comparePrice) - parseFloat(product.price)) / parseFloat(product.comparePrice)) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-background" data-testid="product-detail-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumbs */}
        <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-8">
          <Link href="/" className="hover:text-primary" data-testid="breadcrumb-home">Home</Link>
          <span>/</span>
          <Link href="/products" className="hover:text-primary" data-testid="breadcrumb-products">Products</Link>
          <span>/</span>
          <span className="text-foreground" data-testid="breadcrumb-current">{product.name}</span>
        </nav>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Product Images */}
          <div className="space-y-4">
            <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
              <img
                src={images[selectedImageIndex] || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=600"}
                alt={product.name}
                className="w-full h-full object-cover"
                data-testid="product-main-image"
              />
              {discountPercentage > 0 && (
                <Badge className="absolute top-4 left-4 bg-accent text-accent-foreground" data-testid="discount-badge">
                  {discountPercentage}% OFF
                </Badge>
              )}
              {images.length > 1 && (
                <>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 rounded-full"
                    onClick={() => setSelectedImageIndex(Math.max(0, selectedImageIndex - 1))}
                    disabled={selectedImageIndex === 0}
                    data-testid="prev-image"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 rounded-full"
                    onClick={() => setSelectedImageIndex(Math.min(images.length - 1, selectedImageIndex + 1))}
                    disabled={selectedImageIndex === images.length - 1}
                    data-testid="next-image"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>

            {/* Thumbnail Images */}
            {images.length > 1 && (
              <div className="flex space-x-2 overflow-x-auto">
                {images.map((image: string, index: number) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                      index === selectedImageIndex ? "border-primary" : "border-border"
                    }`}
                    data-testid={`thumbnail-${index}`}
                  >
                    <img
                      src={image}
                      alt={`${product.name} thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="product-title">
                {product.name}
              </h1>
              <div className="flex items-center space-x-4 mb-4">
                <div className="flex items-center">
                  <div className="flex items-center">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-5 w-5 ${
                          star <= averageRating ? "text-yellow-500 fill-current" : "text-muted-foreground"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="ml-2 text-sm text-muted-foreground" data-testid="rating-text">
                    {averageRating.toFixed(1)} ({product.reviewCount} reviews)
                  </span>
                </div>
                {product.sku && (
                  <span className="text-sm text-muted-foreground" data-testid="product-sku">
                    SKU: {product.sku}
                  </span>
                )}
              </div>
            </div>

            {/* Price */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <span className="text-3xl font-bold text-foreground" data-testid="product-price">
                  ${parseFloat(product.price).toFixed(2)}
                </span>
                {product.comparePrice && (
                  <span className="text-xl text-muted-foreground line-through" data-testid="compare-price">
                    ${parseFloat(product.comparePrice).toFixed(2)}
                  </span>
                )}
              </div>
              {discountPercentage > 0 && (
                <p className="text-accent font-medium" data-testid="savings">
                  You save ${(parseFloat(product.comparePrice || "0") - parseFloat(product.price)).toFixed(2)}
                </p>
              )}
            </div>

            {/* Stock Status */}
            <div>
              {product.stock > 0 ? (
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary" className="bg-accent/10 text-accent" data-testid="in-stock">
                    In Stock
                  </Badge>
                  {product.stock < 10 && (
                    <span className="text-sm text-orange-600" data-testid="low-stock">
                      Only {product.stock} left!
                    </span>
                  )}
                </div>
              ) : (
                <Badge variant="destructive" data-testid="out-of-stock">
                  Out of Stock
                </Badge>
              )}
            </div>

            {/* Description */}
            {product.description && (
              <div>
                <p className="text-muted-foreground" data-testid="product-description">
                  {product.description}
                </p>
              </div>
            )}

            {/* Quantity and Add to Cart */}
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="flex items-center border border-input rounded-lg">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                    data-testid="decrease-quantity"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="px-4 py-2 font-medium" data-testid="quantity-display">
                    {quantity}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                    disabled={quantity >= product.stock}
                    data-testid="increase-quantity"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <span className="text-sm text-muted-foreground">
                  {product.stock} available
                </span>
              </div>

              <div className="space-y-4">
                <div className="flex flex-col space-y-3">
                  <Button
                    onClick={handleAddToCart}
                    disabled={product.stock === 0}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                    data-testid="add-to-cart"
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Add to Cart
                  </Button>
                  <Button
                    onClick={handleBuyNow}
                    disabled={product.stock === 0}
                    variant="outline"
                    className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                    data-testid="buy-now-button"
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Buy Now
                  </Button>
                </div>
                
                <div className="flex space-x-2 justify-center">
                  <Button variant="outline" size="icon" data-testid="add-to-wishlist">
                    <Heart className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" data-testid="share-product">
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Product Details Tabs */}
        <div className="mt-16">
          <Tabs defaultValue="description" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="description" data-testid="tab-description">Description</TabsTrigger>
              <TabsTrigger value="reviews" data-testid="tab-reviews">Reviews ({reviews.length})</TabsTrigger>
              <TabsTrigger value="shipping" data-testid="tab-shipping">Shipping & Returns</TabsTrigger>
            </TabsList>

            <TabsContent value="description" className="space-y-4 mt-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="prose max-w-none">
                    <p>{product.description || "No detailed description available."}</p>
                    {product.sku && (
                      <div className="mt-4">
                        <h4 className="font-semibold">Product Details</h4>
                        <ul className="list-disc list-inside mt-2 space-y-1">
                          <li>SKU: {product.sku}</li>
                          <li>Category: {product.category?.name || "Uncategorized"}</li>
                          <li>Stock: {product.stock} units</li>
                        </ul>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reviews" className="space-y-6 mt-6">
              {/* Review Form */}
              {isAuthenticated && (
                <Card>
                  <CardHeader>
                    <CardTitle>Write a Review</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmitReview} className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Rating</label>
                        <Select value={newReview.rating.toString()} onValueChange={(value) => setNewReview({...newReview, rating: parseInt(value)})}>
                          <SelectTrigger data-testid="review-rating">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="5">5 - Excellent</SelectItem>
                            <SelectItem value="4">4 - Good</SelectItem>
                            <SelectItem value="3">3 - Average</SelectItem>
                            <SelectItem value="2">2 - Poor</SelectItem>
                            <SelectItem value="1">1 - Terrible</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Title</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border border-input rounded-lg"
                          value={newReview.title}
                          onChange={(e) => setNewReview({...newReview, title: e.target.value})}
                          placeholder="Review title..."
                          data-testid="review-title"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Comment</label>
                        <Textarea
                          value={newReview.comment}
                          onChange={(e) => setNewReview({...newReview, comment: e.target.value})}
                          placeholder="Share your thoughts about this product..."
                          rows={4}
                          data-testid="review-comment"
                        />
                      </div>
                      <Button type="submit" disabled={reviewMutation.isPending} data-testid="submit-review">
                        {reviewMutation.isPending ? "Submitting..." : "Submit Review"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              )}

              {/* Reviews List */}
              <div className="space-y-4">
                {reviews.length === 0 ? (
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <p className="text-muted-foreground">No reviews yet. Be the first to review this product!</p>
                    </CardContent>
                  </Card>
                ) : (
                  reviews.map((review: any) => (
                    <Card key={review.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="font-medium">
                                {review.user?.firstName || "Anonymous"} {review.user?.lastName || ""}
                              </span>
                              <div className="flex items-center">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`h-4 w-4 ${
                                      star <= review.rating ? "text-yellow-500 fill-current" : "text-muted-foreground"
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                            {review.title && (
                              <h4 className="font-medium text-sm">{review.title}</h4>
                            )}
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {new Date(review.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        {review.comment && (
                          <p className="text-muted-foreground text-sm">{review.comment}</p>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="shipping" className="mt-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Shipping Information</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>Free shipping on orders over $50</li>
                        <li>Standard shipping: 5-7 business days</li>
                        <li>Express shipping: 2-3 business days</li>
                        <li>Overnight shipping available</li>
                      </ul>
                    </div>
                    <Separator />
                    <div>
                      <h4 className="font-semibold mb-2">Return Policy</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>30-day return policy</li>
                        <li>Items must be in original condition</li>
                        <li>Return shipping costs may apply</li>
                        <li>Refunds processed within 5-10 business days</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
