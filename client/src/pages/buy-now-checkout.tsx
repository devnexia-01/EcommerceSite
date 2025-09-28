import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ShoppingCart, CreditCard, Truck, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";

export default function BuyNowCheckout() {
  const [, params] = useRoute("/checkout/buy-now/:intentId");
  const [, navigate] = useLocation();
  const [paymentMethod, setPaymentMethod] = useState("online"); // "online" or "cod"
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Allow guest checkout - no authentication required for buy now

  const { data: purchaseData, isLoading, error } = useQuery({
    queryKey: ["/api/buy-now/intent", params?.intentId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/buy-now/intent/${params?.intentId}`);
      return await response.json();
    },
    enabled: !!params?.intentId,
    retry: false
  });

  // Process COD payment for buy-now (simplified approach)
  const processCODPayment = async () => {
    try {
      // Complete the buy-now intent with COD payment method
      const response = await apiRequest("POST", "/api/buy-now/complete", { 
        intentId: params?.intentId,
        paymentMethod: "cod"
      });
      const data = await response.json();
      
      // Return with COD-specific response structure
      return {
        ...data,
        paymentMethod: "cod",
        paymentStatus: "pending", // COD payments are pending until delivery
        message: "Order confirmed! Payment will be collected upon delivery."
      };
    } catch (error) {
      console.error("COD payment processing error:", error);
      throw error;
    }
  };

  const completePurchaseMutation = useMutation({
    mutationFn: async () => {
      if (paymentMethod === "cod") {
        return await processCODPayment();
      } else {
        const response = await apiRequest("POST", "/api/buy-now/complete", { 
          intentId: params?.intentId,
          paymentMethod: "online"
        });
        return await response.json();
      }
    },
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/v1/cart"] });
      queryClient.invalidateQueries({ queryKey: ["/api/buy-now/intent", params?.intentId] });
      
      toast({
        title: paymentMethod === "cod" ? "Order Confirmed!" : "Purchase Successful!",
        description: paymentMethod === "cod" 
          ? "Your order has been confirmed. Payment will be collected on delivery."
          : "Your order has been processed successfully."
      });
      
      // Redirect to orders or success page  
      navigate(data.redirectUrl || '/orders');
    },
    onError: (error: any) => {
      toast({
        title: paymentMethod === "cod" ? "Order Confirmation Failed" : "Purchase Failed",
        description: error.message || "Failed to complete your order. Please try again.",
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
            onClick={() => window.history.back()}
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
                {/* Payment Method Selection */}
                <div className="space-y-4">
                  <RadioGroup
                    value={paymentMethod}
                    onValueChange={setPaymentMethod}
                    className="space-y-3"
                  >
                    {/* Online Payment Option */}
                    <div className="flex items-center justify-between p-4 border border-input rounded-lg">
                      <div className="flex items-center space-x-3">
                        <RadioGroupItem value="online" id="online-buy" data-testid="radio-payment-online" />
                        <Label htmlFor="online-buy" className="flex-1 cursor-pointer">
                          <div className="flex items-center space-x-3">
                            <CreditCard className="h-5 w-5 text-blue-600" />
                            <div>
                              <p className="font-medium">Online Payment</p>
                              <p className="text-sm text-muted-foreground">UPI, Cards, Wallets, Net Banking</p>
                            </div>
                          </div>
                        </Label>
                      </div>
                      <div className="text-sm text-green-600 font-medium">Secure</div>
                    </div>
                    
                    {/* Cash on Delivery Option */}
                    <div className="flex items-center justify-between p-4 border border-input rounded-lg">
                      <div className="flex items-center space-x-3">
                        <RadioGroupItem value="cod" id="cod-buy" data-testid="radio-payment-cod" />
                        <Label htmlFor="cod-buy" className="flex-1 cursor-pointer">
                          <div className="flex items-center space-x-3">
                            <Banknote className="h-5 w-5 text-green-600" />
                            <div>
                              <p className="font-medium">Cash on Delivery</p>
                              <p className="text-sm text-muted-foreground">Pay when your order arrives</p>
                            </div>
                          </div>
                        </Label>
                      </div>
                      <div className="text-sm text-blue-600 font-medium">No fees</div>
                    </div>
                  </RadioGroup>
                </div>

                {/* Payment Method Details */}
                {paymentMethod === "online" && (
                  <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-medium">Online Payment Options</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm text-muted-foreground">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>UPI Payments</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span>Credit/Debit Cards</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        <span>Digital Wallets</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                        <span>Net Banking</span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      You'll be redirected to our secure payment gateway to complete your purchase.
                    </p>
                  </div>
                )}
                
                {paymentMethod === "cod" && (
                  <div className="space-y-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h4 className="font-medium text-green-800">Cash on Delivery</h4>
                    <div className="text-sm text-green-700">
                      <p className="mb-2">✓ No online payment required</p>
                      <p className="mb-2">✓ Pay cash when your order is delivered</p>
                      <p className="mb-2">✓ No additional processing fees</p>
                      <p className="text-xs text-green-600 mt-3">
                        <strong>Note:</strong> Please have exact change ready for the delivery person.
                      </p>
                    </div>
                  </div>
                )}

                <Button
                  onClick={() => completePurchaseMutation.mutate()}
                  disabled={completePurchaseMutation.isPending}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                  size="lg"
                  data-testid={paymentMethod === "cod" ? "confirm-cod-order" : "complete-purchase"}
                >
                  {completePurchaseMutation.isPending ? (
                    <LoadingSpinner size="sm" className="mr-2" />
                  ) : paymentMethod === "cod" ? (
                    <Banknote className="h-4 w-4 mr-2" />
                  ) : (
                    <CreditCard className="h-4 w-4 mr-2" />
                  )}
                  {completePurchaseMutation.isPending 
                    ? 'Processing...' 
                    : paymentMethod === "cod" 
                      ? `Confirm Order - $${(totalPrice + (totalPrice >= 50 ? 0 : 9.99)).toFixed(2)}` 
                      : `Complete Purchase - $${(totalPrice + (totalPrice >= 50 ? 0 : 9.99)).toFixed(2)}`
                  }
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