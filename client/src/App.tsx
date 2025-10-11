import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./hooks/use-auth";
import { EnhancedCartProvider } from "./hooks/use-enhanced-cart";
import Header from "./components/layout/header";
import Footer from "./components/layout/footer";
import ScrollToTop from "./components/scroll-to-top";
import Home from "./pages/home";
import Products from "./pages/products";
import Categories from "./pages/categories";
import ProductDetail from "./pages/product-detail";
import Cart from "./pages/cart";
import Checkout from "./pages/checkout";
import BuyNowCheckout from "./pages/buy-now-checkout";
import Profile from "./pages/profile";
import Admin from "./pages/admin";
import Login from "./pages/login";
import Register from "./pages/register";
import About from "./pages/about";
import Contact from "./pages/contact";
import Careers from "./pages/careers";
import Press from "./pages/press";
import Help from "./pages/help";
import Returns from "./pages/returns";
import Shipping from "./pages/shipping";
import SizeGuide from "./pages/size-guide";
import Orders from "./pages/orders";
import OrderConfirmation from "./pages/order-confirmation";
import ForgotPassword from "./pages/forgot-password";
import ResetPassword from "./pages/reset-password";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/products" component={Products} />
      <Route path="/categories" component={Categories} />
      <Route path="/product/:slug" component={ProductDetail} />
      <Route path="/cart" component={Cart} />
      <Route path="/checkout" component={Checkout} />
      <Route path="/checkout/buy-now/:intentId" component={BuyNowCheckout} />
      <Route path="/profile" component={Profile} />
      <Route path="/admin" component={Admin} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/about" component={About} />
      <Route path="/contact" component={Contact} />
      <Route path="/careers" component={Careers} />
      <Route path="/press" component={Press} />
      <Route path="/help" component={Help} />
      <Route path="/returns" component={Returns} />
      <Route path="/shipping" component={Shipping} />
      <Route path="/size-guide" component={SizeGuide} />
      <Route path="/orders" component={Orders} />
      <Route path="/order-confirmation/:orderId" component={OrderConfirmation} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <EnhancedCartProvider>
            <div className="min-h-screen flex flex-col">
              <ScrollToTop />
              <Header />
              <main className="flex-1">
                <Router />
              </main>
              <Footer />
            </div>
            <Toaster />
          </EnhancedCartProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
