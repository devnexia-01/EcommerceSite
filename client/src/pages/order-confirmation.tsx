import { useEffect } from "react";
import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle, Package, Truck, CreditCard, MapPin, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export default function OrderConfirmation() {
  const [, params] = useRoute("/order-confirmation/:orderId");
  const orderId = params?.orderId;

  const { data: orderData, isLoading } = useQuery<any>({
    queryKey: ['/api/v1/orders', orderId],
    enabled: !!orderId
  });

  useEffect(() => {
    if (orderData?.success && orderData?.data) {
      document.title = `Order Confirmation - ${orderData.data.orderNumber} | EliteCommerce`;
    }
  }, [orderData]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!orderData?.success || !orderData?.data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Order Not Found</h2>
            <p className="text-muted-foreground mb-4">
              We couldn't find your order. Please check your orders page.
            </p>
            <Button asChild data-testid="button-view-orders">
              <Link href="/orders">View My Orders</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const order = orderData.data;

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full mb-4">
            <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" data-testid="icon-success" />
          </div>
          <h1 className="text-3xl font-bold mb-2" data-testid="text-title">Order Confirmed!</h1>
          <p className="text-muted-foreground" data-testid="text-order-number">
            Order #{order.orderNumber}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            We've sent a confirmation email to your inbox
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <Card data-testid="card-shipping-info">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Shipping Address
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-sm">
                <p className="font-medium" data-testid="text-shipping-name">
                  {order.shippingAddress?.firstName} {order.shippingAddress?.lastName}
                </p>
                <p data-testid="text-shipping-address">{order.shippingAddress?.streetAddress}</p>
                {order.shippingAddress?.streetAddress2 && (
                  <p>{order.shippingAddress.streetAddress2}</p>
                )}
                <p data-testid="text-shipping-city">
                  {order.shippingAddress?.city}, {order.shippingAddress?.state} {order.shippingAddress?.zipCode}
                </p>
                <p>{order.shippingAddress?.country}</p>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-payment-info">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Payment Method</span>
                  <span className="text-sm font-medium" data-testid="text-payment-method">
                    {order.paymentMethod === 'cod' ? 'Cash on Delivery' : order.paymentMethod}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Payment Status</span>
                  <span className="text-sm font-medium capitalize" data-testid="text-payment-status">
                    {order.paymentStatus}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Order Status</span>
                  <span className="text-sm font-medium capitalize" data-testid="text-order-status">
                    {order.status}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-8" data-testid="card-order-items">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Order Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {order.orderItems?.map((item: any) => (
                <div key={item.id} className="flex gap-4" data-testid={`order-item-${item.id}`}>
                  <div className="flex-1">
                    <h3 className="font-medium" data-testid={`text-item-name-${item.id}`}>{item.name}</h3>
                    {item.description && (
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {item.description}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground" data-testid={`text-item-quantity-${item.id}`}>
                      Quantity: {item.quantity}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium" data-testid={`text-item-price-${item.id}`}>
                      {order.currency === 'INR' ? '₹' : '$'}
                      {parseFloat(item.totalPrice).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <Separator className="my-4" />

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span data-testid="text-subtotal">
                  {order.currency === 'INR' ? '₹' : '$'}
                  {parseFloat(order.subtotal).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-lg font-semibold">
                <span>Total</span>
                <span data-testid="text-total">
                  {order.currency === 'INR' ? '₹' : '$'}
                  {parseFloat(order.total).toFixed(2)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-next-steps">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              What's Next?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-3">
                <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">Email Confirmation</p>
                  <p className="text-sm text-muted-foreground">
                    You'll receive an order confirmation email shortly
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Package className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">Order Processing</p>
                  <p className="text-sm text-muted-foreground">
                    We're preparing your items for shipment
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Truck className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">Shipping Updates</p>
                  <p className="text-sm text-muted-foreground">
                    Track your order status in your account
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4 justify-center mt-8">
          <Button asChild variant="outline" data-testid="button-continue-shopping">
            <Link href="/products">Continue Shopping</Link>
          </Button>
          <Button asChild data-testid="button-view-order">
            <Link href="/orders">View My Orders</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
