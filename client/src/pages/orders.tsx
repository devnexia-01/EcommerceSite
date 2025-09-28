import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatPrice } from "@/lib/utils";
import { useLocation } from "wouter";
import { Package, Calendar, CreditCard, MapPin } from "lucide-react";

interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  price: string;
  product: {
    name: string;
    imageUrl: string;
    slug: string;
  };
}

interface Order {
  id: string;
  orderNumber: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  total: string;
  createdAt: string;
  items: OrderItem[];
  shippingAddress: {
    fullName: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
}

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
  processing: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
  shipped: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100",
  delivered: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
};

export default function Orders() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: orders, isLoading } = useQuery<Order[]>({
    queryKey: ['/api/orders'],
    // Always fetch orders - backend handles both authenticated and guest users
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold" data-testid="heading-orders">Your Orders</h1>
        <p className="text-muted-foreground mt-2">View and track your order history</p>
      </div>

      {!orders || orders.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2" data-testid="text-no-orders">No orders yet</h3>
            <p className="text-muted-foreground mb-6">
              {user 
                ? "You haven't placed any orders yet. Start shopping to see your orders here."
                : "No orders found for your current session. You can still place orders as a guest, or log in to see your account orders."
              }
            </p>
            <div className="space-x-4">
              <Button onClick={() => setLocation('/products')} data-testid="button-shop-now">
                Start Shopping
              </Button>
              {!user && (
                <Button variant="outline" onClick={() => setLocation('/login')} data-testid="button-login">
                  Log In
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <Card key={order.id} className="overflow-hidden" data-testid={`card-order-${order.id}`}>
              <CardHeader className="bg-muted/50">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="space-y-1">
                    <CardTitle className="text-lg" data-testid={`text-order-number-${order.orderNumber}`}>
                      Order #{order.orderNumber}
                    </CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span data-testid={`text-order-date-${order.id}`}>
                        {new Date(order.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge 
                      className={statusColors[order.status]}
                      data-testid={`badge-status-${order.id}`}
                    >
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </Badge>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Total</div>
                      <div className="font-semibold" data-testid={`text-total-${order.id}`}>
                        {formatPrice(order.total)}
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Order Items */}
                  <div className="space-y-3">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex items-center gap-4" data-testid={`item-${item.id}`}>
                        <img
                          src={item.product.imageUrl}
                          alt={item.product.name}
                          className="w-16 h-16 object-cover rounded-md"
                          data-testid={`img-product-${item.productId}`}
                        />
                        <div className="flex-1">
                          <h4 className="font-medium" data-testid={`text-product-name-${item.productId}`}>
                            {item.product.name}
                          </h4>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span data-testid={`text-quantity-${item.id}`}>Qty: {item.quantity}</span>
                            <span data-testid={`text-price-${item.id}`}>{formatPrice(item.price)} each</span>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setLocation(`/product/${item.product.slug}`)}
                          data-testid={`button-view-product-${item.productId}`}
                        >
                          View Product
                        </Button>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  {/* Shipping Address */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <MapPin className="h-4 w-4" />
                      Shipping Address
                    </div>
                    <div className="text-sm text-muted-foreground pl-6" data-testid={`text-shipping-address-${order.id}`}>
                      <div>{order.shippingAddress.fullName}</div>
                      <div>{order.shippingAddress.addressLine1}</div>
                      {order.shippingAddress.addressLine2 && (
                        <div>{order.shippingAddress.addressLine2}</div>
                      )}
                      <div>
                        {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}
                      </div>
                      <div>{order.shippingAddress.country}</div>
                    </div>
                  </div>

                  {/* Order Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLocation(`/orders/${order.id}`)}
                      data-testid={`button-view-details-${order.id}`}
                    >
                      View Details
                    </Button>
                    {order.status === 'delivered' && (
                      <Button
                        variant="outline"
                        size="sm"
                        data-testid={`button-reorder-${order.id}`}
                      >
                        Reorder
                      </Button>
                    )}
                    {(order.status === 'pending' || order.status === 'processing') && (
                      <Button
                        variant="outline"
                        size="sm"
                        data-testid={`button-cancel-order-${order.id}`}
                      >
                        Cancel Order
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}