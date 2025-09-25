import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ShoppingCart, CreditCard, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";

export default function BuyNowCheckout() {
  const [, params] = useRoute("/checkout/buy-now/:intentId");
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      const fullPath = window.location.pathname + window.location.search + window.location.hash;
      navigate(`/login?redirect=${encodeURIComponent(fullPath)}`);
    }
  }, [isAuthenticated, navigate]);

  const { data: purchaseData, isLoading, error } = useQuery({
    queryKey: ["/api/buy-now/intent", params?.intentId],
    queryFn: () => apiRequest("GET", `/api/buy-now/intent/${params?.intentId}`),
    enabled: !!params?.intentId && isAuthenticated,
    retry: false
  });

  const completePurchaseMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/buy-now/complete", { intentId: params?.intentId }),
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/v1/cart"] });
      queryClient.invalidateQueries({ queryKey: ["/api/buy-now/intent", params?.intentId] });
      
      toast({
        title: "Purchase Successful!",
        description: "Your order has been processed successfully."
      });
      
      // Redirect to orders or success page
      navigate(data.redirectUrl || '/orders');
    },
    onError: (error: any) => {
      toast({
        title: "Purchase Failed",
        description: error.message || "Failed to complete purchase. Please try again.",
        variant: "destructive"
      });
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" data-testid="buy-now-loading" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Purchase Intent Not Found</h2>
            <p className="text-muted-foreground mb-4">
              This purchase intent may have expired or is invalid.
            </p>
            <Button asChild>
              <Link href="/products">Continue Shopping</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!purchaseData) {
    return null;
  }

  const { intent, product } = purchaseData;
  const totalPrice = parseFloat(intent.totalPrice);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center space-x-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            data-testid="back-button"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Buy Now Checkout</h1>
            <p className="text-muted-foreground">Complete your purchase</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Product Summary */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <ShoppingCart className="h-5 w-5" />
                  <span>Order Summary</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex space-x-4">
                  <img
                    src={product.imageUrl || "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300"}
                    alt={product.name}
                    className="w-20 h-20 object-cover rounded-lg"
                    data-testid="product-image"
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold" data-testid="product-name">
                      {product.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Quantity: {intent.quantity}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="font-medium" data-testid="product-price">
                        ${parseFloat(intent.price).toFixed(2)}
                      </span>
                      {product.salePrice && product.price !== product.salePrice && (
                        <span className="text-sm text-muted-foreground line-through">
                          ${parseFloat(product.price).toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span data-testid="subtotal">${totalPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping:</span>
                    <span data-testid="shipping">
                      {totalPrice >= 50 ? 'FREE' : '$9.99'}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total:</span>
                    <span data-testid="total">
                      ${(totalPrice + (totalPrice >= 50 ? 0 : 9.99)).toFixed(2)}
                    </span>
                  </div>
                </div>

                {totalPrice >= 50 && (
                  <div className="flex items-center space-x-2 text-sm text-accent">
                    <Truck className="h-4 w-4" />
                    <span>Free shipping included!</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Intent Expiry */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">Purchase Intent</Badge>
                  <span className="text-sm text-muted-foreground">
                    Expires: {new Date(intent.expiresAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Complete your purchase before this intent expires
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Payment Section */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CreditCard className="h-5 w-5" />
                  <span>Payment</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center py-8 border-2 border-dashed border-muted-foreground/25 rounded-lg">
                  <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">
                    Payment integration placeholder
                  </p>
                  <p className="text-xs text-muted-foreground mb-6">
                    In a real application, this would integrate with Stripe, PayPal, or other payment processors
                  </p>
                </div>

                <Button
                  onClick={() => completePurchaseMutation.mutate()}
                  disabled={completePurchaseMutation.isPending}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                  size="lg"
                  data-testid="complete-purchase"
                >
                  {completePurchaseMutation.isPending ? (
                    <LoadingSpinner size="sm" className="mr-2" />
                  ) : (
                    <CreditCard className="h-4 w-4 mr-2" />
                  )}
                  {completePurchaseMutation.isPending ? 'Processing...' : `Complete Purchase - $${(totalPrice + (totalPrice >= 50 ? 0 : 9.99)).toFixed(2)}`}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  By completing your purchase, you agree to our{" "}
                  <Link href="/terms" className="text-primary hover:underline">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="text-primary hover:underline">
                    Privacy Policy
                  </Link>
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}