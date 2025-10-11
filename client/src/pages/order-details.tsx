import { useEffect } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Package, Truck, CreditCard, MapPin, ArrowLeft, Calendar, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useAuth } from "@/hooks/use-auth";

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
  processing: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
  shipped: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100",
  delivered: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
};

export default function OrderDetails() {
  const [, params] = useRoute("/orders/:orderId");
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const orderId = params?.orderId;

  const { data: orderData, isLoading, error } = useQuery<any>({
    queryKey: ['/api/v1/orders', orderId],
    enabled: !!orderId && !!user
  });

  useEffect(() => {
    if (orderData?.success && orderData?.data) {
      document.title = `Order ${orderData.data.orderNumber} - Details | EliteCommerce`;
    }
  }, [orderData]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // Check if user is not logged in
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <LogIn className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2" data-testid="text-login-required">Login Required</h2>
            <p className="text-muted-foreground mb-4">
              Please log in to view your order details.
            </p>
            <div className="flex gap-2 justify-center">
              <Button 
                onClick={() => setLocation(`/login?redirect=/orders/${orderId}`)} 
                data-testid="button-login"
              >
                <LogIn className="h-4 w-4 mr-2" />
                Log In
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setLocation('/orders')} 
                data-testid="button-back"
              >
                Back to Orders
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!orderData?.success || !orderData?.data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2" data-testid="text-not-found">Order Not Found</h2>
            <p className="text-muted-foreground mb-4">
              {error 
                ? "There was an error loading your order. Please try again."
                : "We couldn't find this order. Please check your orders page."
              }
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
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Button
          variant="ghost"
          onClick={() => setLocation('/orders')}
          className="mb-6"
          data-testid="button-back-to-orders"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Orders
        </Button>

        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2" data-testid="text-page-title">Order Details</h1>
              <p className="text-muted-foreground" data-testid="text-order-number">
                Order #{order.orderNumber}
              </p>
            </div>
            <Badge 
              className={`${statusColors[order.status as keyof typeof statusColors]} text-base px-4 py-2`}
              data-testid="badge-order-status"
            >
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span data-testid="text-order-date">
              Placed on {new Date(order.createdAt).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </span>
          </div>
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
                {order.shippingAddress?.phone && (
                  <p className="pt-2 text-muted-foreground" data-testid="text-shipping-phone">
                    Phone: {order.shippingAddress.phone}
                  </p>
                )}
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
                {order.transactionId && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Transaction ID</span>
                    <span className="text-sm font-mono" data-testid="text-transaction-id">
                      {order.transactionId}
                    </span>
                  </div>
                )}
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
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {item.description}
                      </p>
                    )}
                    {item.sku && (
                      <p className="text-xs text-muted-foreground" data-testid={`text-item-sku-${item.id}`}>
                        SKU: {item.sku}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground mt-1" data-testid={`text-item-quantity-${item.id}`}>
                      Quantity: {item.quantity} × {order.currency === 'INR' ? '₹' : '$'}
                      {parseFloat(item.unitPrice).toFixed(2)}
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
              {order.taxAmount && parseFloat(order.taxAmount) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span data-testid="text-tax">
                    {order.currency === 'INR' ? '₹' : '$'}
                    {parseFloat(order.taxAmount).toFixed(2)}
                  </span>
                </div>
              )}
              {order.shippingCost && parseFloat(order.shippingCost) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span data-testid="text-shipping">
                    {order.currency === 'INR' ? '₹' : '$'}
                    {parseFloat(order.shippingCost).toFixed(2)}
                  </span>
                </div>
              )}
              {order.discount && parseFloat(order.discount) > 0 && (
                <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                  <span>Discount</span>
                  <span data-testid="text-discount">
                    -{order.currency === 'INR' ? '₹' : '$'}
                    {parseFloat(order.discount).toFixed(2)}
                  </span>
                </div>
              )}
              <Separator className="my-2" />
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

        <Card data-testid="card-tracking-info">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Shipping Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {order.trackingNumber ? (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Tracking Number</p>
                  <p className="font-mono font-medium" data-testid="text-tracking-number">
                    {order.trackingNumber}
                  </p>
                  {order.trackingUrl && (
                    <Button 
                      asChild 
                      variant="link" 
                      className="px-0 mt-2"
                      data-testid="button-track-shipment"
                    >
                      <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer">
                        Track Shipment
                      </a>
                    </Button>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {order.status === 'pending' && "Your order is being prepared for shipment."}
                  {order.status === 'processing' && "Your order is being processed. Tracking information will be available soon."}
                  {order.status === 'cancelled' && "This order has been cancelled."}
                  {order.status === 'delivered' && "Your order has been delivered!"}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4 justify-center mt-8">
          <Button asChild variant="outline" data-testid="button-continue-shopping">
            <Link href="/products">Continue Shopping</Link>
          </Button>
          {order.status === 'delivered' && (
            <Button variant="outline" data-testid="button-reorder">
              Reorder
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
