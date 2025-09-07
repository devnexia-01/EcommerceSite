import { X, Plus, Minus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useCart } from "@/hooks/use-enhanced-cart";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";

interface CartSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartSidebar({ isOpen, onClose }: CartSidebarProps) {
  const { items, isLoading, updateQuantity, removeItem, totalPrice } = useCart();
  const { isAuthenticated } = useAuth();

  const handleQuantityChange = async (itemId: string, currentQuantity: number, change: number) => {
    const newQuantity = currentQuantity + change;
    if (newQuantity > 0) {
      await updateQuantity(itemId, newQuantity);
    }
  };

  const handleRemove = async (itemId: string) => {
    await removeItem(itemId);
  };

  const subtotal = totalPrice;
  const shipping = subtotal > 50 ? 0 : 9.99;
  const tax = subtotal * 0.08; // 8% tax
  const total = subtotal + shipping + tax;

  if (!isAuthenticated) {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent className="w-full sm:w-96 max-w-md flex flex-col" data-testid="cart-sidebar">
          <SheetHeader>
            <SheetTitle className="flex items-center justify-between">
              Shopping Cart
              <Button variant="ghost" size="icon" onClick={onClose} data-testid="close-cart">
                <X className="h-4 w-4" />
              </Button>
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-muted-foreground mb-4">Please login to view your cart</p>
              <Button asChild data-testid="login-to-view-cart">
                <Link href="/login" onClick={onClose}>Login</Link>
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:w-96 max-w-md flex flex-col" data-testid="cart-sidebar">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            Shopping Cart ({items.length} items)
            <Button variant="ghost" size="icon" onClick={onClose} data-testid="close-cart">
              <X className="h-4 w-4" />
            </Button>
          </SheetTitle>
        </SheetHeader>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <LoadingSpinner data-testid="cart-loading" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-muted-foreground mb-4">Your cart is empty</p>
              <Button asChild data-testid="continue-shopping">
                <Link href="/products" onClick={onClose}>Continue Shopping</Link>
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              {items.map((item) => (
                <div key={item.id} className="flex items-start space-x-3" data-testid={`cart-item-${item.id}`}>
                  <img
                    src={item.product.imageUrl || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?ixlib=rb-4.0.3&auto=format&fit=crop&w=80&h=80"}
                    alt={item.product.name}
                    className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-md flex-shrink-0"
                    data-testid={`cart-item-image-${item.id}`}
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-xs sm:text-sm truncate" data-testid={`cart-item-name-${item.id}`}>
                      {item.product.name}
                    </h4>
                    <p className="text-xs sm:text-sm text-muted-foreground" data-testid={`cart-item-price-${item.id}`}>
                      ${parseFloat(item.product.price).toFixed(2)} each
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center space-x-1 sm:space-x-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6 sm:h-7 sm:w-7"
                          onClick={() => handleQuantityChange(item.id, item.quantity, -1)}
                          data-testid={`decrease-quantity-${item.id}`}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="text-xs sm:text-sm font-medium w-6 sm:w-8 text-center" data-testid={`quantity-${item.id}`}>
                          {item.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6 sm:h-7 sm:w-7"
                          onClick={() => handleQuantityChange(item.id, item.quantity, 1)}
                          disabled={item.quantity >= item.product.stock}
                          data-testid={`increase-quantity-${item.id}`}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <span className="font-medium text-xs sm:text-sm" data-testid={`item-total-${item.id}`}>
                        ${(parseFloat(item.product.price) * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive flex-shrink-0"
                    onClick={() => handleRemove(item.id)}
                    data-testid={`remove-item-${item.id}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>

            <Separator />

            {/* Cart Summary */}
            <div className="space-y-3 sm:space-y-4 py-3 sm:py-4">
              <div className="space-y-2 text-sm">
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
                <div className="flex justify-between font-semibold text-base sm:text-lg">
                  <span>Total</span>
                  <span data-testid="cart-total">${total.toFixed(2)}</span>
                </div>
              </div>

              {subtotal < 50 && (
                <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                  Add ${(50 - subtotal).toFixed(2)} more for free shipping!
                </div>
              )}

              <div className="space-y-2">
                <Button 
                  asChild 
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-10 sm:h-11"
                  data-testid="checkout-button"
                >
                  <Link href="/checkout" onClick={onClose}>
                    Proceed to Checkout
                  </Link>
                </Button>
                <Button 
                  variant="outline" 
                  asChild 
                  className="w-full h-9 sm:h-10"
                  data-testid="view-cart-button"
                >
                  <Link href="/cart" onClick={onClose}>
                    View Cart
                  </Link>
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
