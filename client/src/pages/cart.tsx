import { Link } from "wouter";
import { Minus, Plus, Trash2, ShoppingCart, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";

export default function Cart() {
  const { items, isLoading, updateQuantity, removeItem, totalPrice } = useCart();
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" data-testid="cart-page">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Please Login</h2>
            <p className="text-muted-foreground mb-4">
              You need to be logged in to view your cart
            </p>
            <Button asChild data-testid="login-to-view-cart">
              <Link href="/login">Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleQuantityChange = async (itemId: string, currentQuantity: number, change: number) => {
    const newQuantity = currentQuantity + change;
    if (newQuantity > 0) {
      await updateQuantity(itemId, newQuantity);
    }
  };

  const subtotal = totalPrice;
  const shipping = subtotal > 50 ? 0 : 9.99;
  const tax = subtotal * 0.08; // 8% tax
  const total = subtotal + shipping + tax;

  return (
    <div className="min-h-screen bg-background" data-testid="cart-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground" data-testid="cart-title">
              Shopping Cart
            </h1>
            <p className="text-muted-foreground" data-testid="cart-item-count">
              {items.length} {items.length === 1 ? "item" : "items"} in your cart
            </p>
          </div>
          <Button asChild variant="outline" data-testid="continue-shopping">
            <Link href="/products" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Continue Shopping
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <LoadingSpinner className="mx-auto mb-4" data-testid="cart-loading" />
            <p className="text-muted-foreground">Loading your cart...</p>
          </div>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center py-12">
              <ShoppingCart className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">Your cart is empty</h2>
              <p className="text-muted-foreground mb-6">
                Looks like you haven't added any products to your cart yet.
              </p>
              <Button asChild data-testid="start-shopping">
                <Link href="/products">Start Shopping</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {items.map((item) => (
                <Card key={item.id} data-testid={`cart-item-${item.id}`}>
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <Link href={`/product/${item.product.slug || item.product.id}`}>
                        <img
                          src={item.product.imageUrl || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&h=150"}
                          alt={item.product.name}
                          className="w-24 h-24 object-cover rounded-lg cursor-pointer hover:opacity-75"
                          data-testid={`cart-item-image-${item.id}`}
                        />
                      </Link>
                      
                      <div className="flex-1 min-w-0">
                        <Link href={`/product/${item.product.slug || item.product.id}`}>
                          <h3 className="font-medium text-foreground hover:text-primary cursor-pointer" data-testid={`cart-item-name-${item.id}`}>
                            {item.product.name}
                          </h3>
                        </Link>
                        <p className="text-sm text-muted-foreground mt-1" data-testid={`cart-item-price-${item.id}`}>
                          ${parseFloat(item.product.price).toFixed(2)} each
                        </p>
                        
                        {item.product.stock < item.quantity && (
                          <p className="text-sm text-destructive mt-1">
                            Only {item.product.stock} left in stock
                          </p>
                        )}
                      </div>

                      <div className="flex items-center space-x-3">
                        {/* Quantity Controls */}
                        <div className="flex items-center border border-input rounded-lg">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleQuantityChange(item.id, item.quantity, -1)}
                            disabled={item.quantity <= 1}
                            data-testid={`decrease-quantity-${item.id}`}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="px-3 py-1 font-medium min-w-[3rem] text-center" data-testid={`quantity-${item.id}`}>
                            {item.quantity}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleQuantityChange(item.id, item.quantity, 1)}
                            disabled={item.quantity >= item.product.stock}
                            data-testid={`increase-quantity-${item.id}`}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>

                        {/* Item Total */}
                        <div className="text-right min-w-[5rem]">
                          <span className="font-semibold" data-testid={`item-total-${item.id}`}>
                            ${(parseFloat(item.product.price) * item.quantity).toFixed(2)}
                          </span>
                        </div>

                        {/* Remove Button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => removeItem(item.id)}
                          data-testid={`remove-item-${item.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <Card className="sticky top-6">
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span data-testid="cart-subtotal">${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Shipping</span>
                      <span className={shipping === 0 ? "text-accent" : ""} data-testid="cart-shipping">
                        {shipping === 0 ? "FREE" : `$${shipping.toFixed(2)}`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax</span>
                      <span data-testid="cart-tax">${tax.toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-semibold text-lg">
                      <span>Total</span>
                      <span data-testid="cart-total">${total.toFixed(2)}</span>
                    </div>
                  </div>

                  {subtotal < 50 && (
                    <div className="bg-muted p-3 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        Add <span className="font-medium text-accent">
                          ${(50 - subtotal).toFixed(2)}
                        </span> more for free shipping!
                      </p>
                    </div>
                  )}

                  <Button 
                    asChild 
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                    data-testid="proceed-to-checkout"
                  >
                    <Link href="/checkout">
                      Proceed to Checkout
                    </Link>
                  </Button>

                  <div className="space-y-2 pt-4 border-t">
                    <p className="text-xs text-muted-foreground text-center">
                      Secure checkout with SSL encryption
                    </p>
                    <p className="text-xs text-muted-foreground text-center">
                      Free returns within 30 days
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
