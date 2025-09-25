import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, CreditCard, Truck, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useCart } from "@/hooks/use-enhanced-cart";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";

// Step-based validation schemas
const shippingSchema = z.object({
  email: z.string().email("Invalid email address"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  streetAddress: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zipCode: z.string().min(1, "ZIP code is required"),
  country: z.string().default("US"),
  shippingMethod: z.string().min(1, "Please select a shipping method"),
  sameAsBilling: z.boolean().default(true),
});

// Removed card fields since we're using Razorpay
const checkoutSchema = shippingSchema;

type CheckoutFormData = z.infer<typeof checkoutSchema>;

export default function Checkout() {
  const [, navigate] = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [useNewAddress, setUseNewAddress] = useState(false);
  const { items, totalPrice, clearCart } = useCart();
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();

  // Fetch user's saved addresses
  const { data: addresses = [] } = useQuery<any[]>({
    queryKey: ['/api/addresses'],
    enabled: isAuthenticated
  });

  // Use shipping schema for all steps (Razorpay handles payment)
  const getCurrentSchema = () => {
    return shippingSchema;
  };

  const form = useForm<CheckoutFormData>({
    resolver: zodResolver(getCurrentSchema()),
    mode: "onChange",
    defaultValues: {
      email: user?.email || "",
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      streetAddress: "",
      city: "",
      state: "",
      zipCode: "",
      country: "US",
      shippingMethod: "standard",
      sameAsBilling: true
    }
  });

  // Function to populate form with selected address
  const populateAddressForm = (address: any) => {
    form.setValue("firstName", address.firstName);
    form.setValue("lastName", address.lastName);
    form.setValue("streetAddress", address.streetAddress);
    form.setValue("city", address.city);
    form.setValue("state", address.state);
    form.setValue("zipCode", address.zipCode);
    form.setValue("country", address.country || "US");
    setUseNewAddress(false);
  };

  const orderMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/v1/orders", data);
      return response.json();
    },
    onSuccess: (order) => {
      clearCart();
      navigate(`/order-confirmation/${order.id}`);
      toast({
        title: "Order placed successfully!",
        description: `Your order #${order.orderNumber} has been confirmed.`
      });
    },
    onError: (error: any) => {
      toast({
        title: "Order failed",
        description: error.message || "Failed to place order. Please try again.",
        variant: "destructive"
      });
    }
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Please Login</h2>
            <p className="text-muted-foreground mb-4">
              You need to be logged in to checkout
            </p>
            <Button asChild>
              <a href="/login">Login</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Your cart is empty</h2>
            <p className="text-muted-foreground mb-4">
              Add some products to your cart before checking out
            </p>
            <Button asChild>
              <a href="/products">Browse Products</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const subtotal = totalPrice;
  const shipping = form.watch("shippingMethod") === "express" ? 1500 : // ₹15.00  
                  form.watch("shippingMethod") === "overnight" ? 3000 : // ₹30.00
                  subtotal > 4000 ? 0 : 800; // Free shipping over ₹40
  const tax = subtotal * 0.18; // 18% GST for India
  const total = subtotal + shipping + tax;

  const initiateRazorpayPayment = async (orderData: any) => {
    try {
      // Create Razorpay order with server-calculated amount
      const response = await apiRequest("POST", "/api/v1/create-razorpay-order", orderData);
      const order = await response.json();

      if (!order.success) {
        throw new Error(order.error || "Failed to create payment order");
      }

      // Load Razorpay script dynamically
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onerror = () => {
        toast({
          title: "Payment system unavailable",
          description: "Please try again later",
          variant: "destructive"
        });
      };
      script.onload = () => {
        const options = {
          key: import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_dummy_key_id",
          amount: order.data.amount,
          currency: order.data.currency,
          name: "Furniture Store",
          description: "Purchase from Furniture Store",
          order_id: order.data.id,
          handler: async (response: any) => {
            // Verify payment first, then create order
            try {
              const verifyResponse = await apiRequest("POST", "/api/v1/verify-razorpay-payment", {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                orderData: orderData
              });
              const verifyResult = await verifyResponse.json();
              
              if (verifyResult.success) {
                // Payment verified, redirect to success page
                clearCart();
                navigate(`/order-confirmation/${verifyResult.orderId}`);
                toast({
                  title: "Payment successful!",
                  description: "Your order has been confirmed."
                });
              } else {
                throw new Error("Payment verification failed");
              }
            } catch (err) {
              toast({
                title: "Payment verification failed",
                description: "Please contact support",
                variant: "destructive"
              });
            }
          },
          modal: {
            ondismiss: () => {
              toast({
                title: "Payment cancelled",
                description: "You can retry payment anytime",
                variant: "default"
              });
            }
          },
          prefill: {
            name: `${orderData.shippingAddress.firstName} ${orderData.shippingAddress.lastName}`,
            email: orderData.email,
          },
          theme: {
            color: "#3399cc"
          }
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      };
      document.head.appendChild(script);
    } catch (error: any) {
      toast({
        title: "Payment initialization failed",
        description: error.message || "Please try again",
        variant: "destructive"
      });
    }
  };

  const onSubmit = async (data: CheckoutFormData) => {
    try {
      if (currentStep === 1) {
        // Validate shipping fields only
        const validData = shippingSchema.parse(data);
        // Move from Shipping to Payment
        setCurrentStep(2);
        form.clearErrors();
      } else if (currentStep === 2) {
        // Initiate Razorpay payment
        const validData = checkoutSchema.parse(data);
        
        const addressData = {
          firstName: validData.firstName,
          lastName: validData.lastName,
          streetAddress: validData.streetAddress,
          city: validData.city,
          state: validData.state,
          zipCode: validData.zipCode,
          country: validData.country
        };

        const orderData = {
          items: items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.product.price
          })),
          shippingAddress: addressData,
          billingAddress: validData.sameAsBilling ? addressData : addressData,
          shippingMethod: validData.shippingMethod,
          currency: "INR",
          subtotal: subtotal.toFixed(2),
          shipping: shipping.toFixed(2),
          tax: tax.toFixed(2),
          total: total.toFixed(2),
          status: "pending",
          email: validData.email
        };

        await initiateRazorpayPayment(orderData);
      }
    } catch (error) {
      // Handle validation errors
      if (error instanceof z.ZodError) {
        error.errors.forEach((err) => {
          form.setError(err.path[0] as any, {
            type: "manual",
            message: err.message,
          });
        });
      }
    }
  };

  const steps = [
    { id: 1, name: "Shipping", icon: Truck },
    { id: 2, name: "Payment", icon: CreditCard }
  ];

  return (
    <div className="min-h-screen bg-background" data-testid="checkout-page">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                  currentStep >= step.id 
                    ? "bg-primary text-primary-foreground border-primary" 
                    : "border-muted-foreground text-muted-foreground"
                }`}>
                  {currentStep > step.id ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <step.icon className="h-5 w-5" />
                  )}
                </div>
                <span className={`ml-2 font-medium ${
                  currentStep >= step.id ? "text-primary" : "text-muted-foreground"
                }`}>
                  {step.name}
                </span>
                {index < steps.length - 1 && (
                  <div className={`w-16 h-px mx-4 ${
                    currentStep > step.id ? "bg-primary" : "bg-muted-foreground"
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid lg:grid-cols-3 gap-8">
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-8">
              {/* Shipping Information */}
              {currentStep >= 1 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Truck className="h-5 w-5" />
                      Shipping Information
                    </CardTitle>
                  </CardHeader>
                <CardContent className="space-y-4">
                  {/* Saved Address Selection */}
                  {addresses.length > 0 && (
                    <div className="space-y-3 mb-6">
                      <h4 className="font-medium">Select from saved addresses</h4>
                      <div className="space-y-2">
                        {addresses.map((address: any) => (
                          <Card 
                            key={address.id} 
                            className={`cursor-pointer transition-colors ${
                              !useNewAddress ? "border-primary bg-primary/5" : "hover:border-muted-foreground"
                            }`}
                            onClick={() => populateAddressForm(address)}
                            data-testid={`saved-address-${address.id}`}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="font-medium">
                                    {address.firstName} {address.lastName}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {address.streetAddress}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {address.city}, {address.state} {address.zipCode}
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setUseNewAddress(true)}
                        data-testid="use-new-address"
                      >
                        Use Different Address
                      </Button>
                    </div>
                  )}
                  
                  {/* Address Form (show if no saved addresses or user wants new address) */}
                  {(addresses.length === 0 || useNewAddress) && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="first-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="last-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} data-testid="email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="streetAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Street Address</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="street-address" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="city" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>State</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="state" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="zipCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ZIP Code</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="zip-code" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </>
                  )}
                </CardContent>
              </Card>
              )}

              {/* Shipping Method */}
              {currentStep >= 1 && (
              <Card>
                <CardHeader>
                  <CardTitle>Shipping Method</CardTitle>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="shippingMethod"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="space-y-3"
                          >
                            <div className="flex items-center justify-between p-4 border border-input rounded-lg">
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="standard" id="standard" />
                                <Label htmlFor="standard" className="flex-1">
                                  <div>
                                    <p className="font-medium">Standard Shipping</p>
                                    <p className="text-sm text-muted-foreground">5-7 business days</p>
                                  </div>
                                </Label>
                              </div>
                              <span className="font-medium">
                                {subtotal > 4000 ? "FREE" : "₹8.00"}
                              </span>
                            </div>
                            <div className="flex items-center justify-between p-4 border border-input rounded-lg">
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="express" id="express" />
                                <Label htmlFor="express" className="flex-1">
                                  <div>
                                    <p className="font-medium">Express Shipping</p>
                                    <p className="text-sm text-muted-foreground">2-3 business days</p>
                                  </div>
                                </Label>
                              </div>
                              <span className="font-medium">₹15.00</span>
                            </div>
                            <div className="flex items-center justify-between p-4 border border-input rounded-lg">
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="overnight" id="overnight" />
                                <Label htmlFor="overnight" className="flex-1">
                                  <div>
                                    <p className="font-medium">Overnight Shipping</p>
                                    <p className="text-sm text-muted-foreground">Next business day</p>
                                  </div>
                                </Label>
                              </div>
                              <span className="font-medium">₹30.00</span>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
              )}

              {/* Payment Information */}
              {currentStep >= 2 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Payment Options
                    </CardTitle>
                  </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-medium">Multiple Payment Methods Available</h4>
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
                      No card details needed upfront!
                    </p>
                  </div>
                </CardContent>
              </Card>
              )}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <Card className="sticky top-6">
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Order Items */}
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {items.map((item) => (
                      <div key={item.id} className="flex items-center space-x-3">
                        <img
                          src={item.product.imageUrl || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?ixlib=rb-4.0.3&auto=format&fit=crop&w=60&h=60"}
                          alt={item.product.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{item.product.name}</p>
                          <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                        </div>
                        <span className="font-medium text-sm">
                          ₹{(parseFloat(item.product.price) * item.quantity / 100).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  {/* Pricing Breakdown */}
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span data-testid="checkout-subtotal">₹{(subtotal / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Shipping</span>
                      <span className={shipping === 0 ? "text-accent" : ""} data-testid="checkout-shipping">
                        {shipping === 0 ? "FREE" : `₹${(shipping / 100).toFixed(2)}`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax (GST 18%)</span>
                      <span data-testid="checkout-tax">₹{(tax / 100).toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-semibold text-lg">
                      <span>Total</span>
                      <span data-testid="checkout-total">₹{(total / 100).toFixed(2)}</span>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                    disabled={orderMutation.isPending}
                    data-testid={currentStep === 3 ? "place-order" : "continue-checkout"}
                  >
                    {orderMutation.isPending ? (
                      <LoadingSpinner size="sm" className="mr-2" />
                    ) : null}
                    {orderMutation.isPending 
                      ? "Processing..." 
                      : currentStep === 1 
                        ? "Continue to Payment" 
                        : `Pay Now - ₹${(total / 100).toFixed(2)}`
                    }
                  </Button>

                  <p className="text-xs text-muted-foreground text-center mt-4">
                    By placing your order, you agree to our Terms of Service and Privacy Policy.
                  </p>
                </CardContent>
              </Card>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
