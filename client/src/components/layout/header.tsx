import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Search, ShoppingCart, User, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import CartSidebar from "../cart/cart-sidebar";

export default function Header() {
  const [location, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const { totalItems } = useCart();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const navigationItems = [
    { name: "Home", href: "/" },
    { name: "Products", href: "/products" },
    { name: "Categories", href: "/categories" },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 bg-white border-b border-border shadow-sm" data-testid="header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <div className="flex items-center">
              <Link href="/">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-serif font-semibold text-primary cursor-pointer tracking-tight" data-testid="logo">
                  EliteCommerce
                </h1>
              </Link>

              {/* Desktop Navigation */}
              <nav className="hidden md:ml-12 md:flex space-x-10">
                {navigationItems.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`font-medium text-sm uppercase tracking-wide transition-colors ${
                      location === item.href
                        ? "text-primary border-b-2 border-primary pb-1"
                        : "text-muted-foreground hover:text-primary"
                    }`}
                    data-testid={`nav-${item.name.toLowerCase()}`}
                  >
                    {item.name}
                  </Link>
                ))}
              </nav>
            </div>

            {/* Search Bar - Hidden on mobile, shown in mobile menu */}
            <div className="hidden md:flex flex-1 max-w-lg mx-6">
              <form onSubmit={handleSearch} className="relative w-full">
                <Input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-20 lg:pr-24 h-10 lg:h-12 bg-background border-border rounded-full focus:ring-2 focus:ring-primary/20 text-sm lg:text-base"
                  data-testid="search-input"
                />
                <Search className="absolute left-3 lg:left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 lg:h-5 lg:w-5 text-muted-foreground" />
                <Button 
                  type="submit" 
                  size="sm" 
                  className="absolute right-1 lg:right-2 top-1/2 transform -translate-y-1/2 h-7 lg:h-8 px-2 lg:px-4 rounded-full furniture-btn-primary text-xs lg:text-sm"
                  data-testid="search-button"
                >
                  <span className="hidden lg:inline">Search</span>
                  <Search className="h-3 w-3 lg:hidden" />
                </Button>
              </form>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center space-x-2 lg:space-x-3">
              {/* Cart */}
              <Button
                variant="ghost"
                size="icon"
                className="relative h-10 w-10 lg:h-12 lg:w-12 rounded-full hover:bg-secondary/50"
                onClick={() => setIsCartOpen(true)}
                data-testid="cart-button"
              >
                <ShoppingCart className="h-5 w-5 lg:h-6 lg:w-6" />
                {totalItems > 0 && (
                  <Badge 
                    className="absolute -top-1 -right-1 h-5 w-5 lg:h-6 lg:w-6 flex items-center justify-center p-0 text-xs bg-primary text-primary-foreground"
                    data-testid="cart-badge"
                  >
                    {totalItems}
                  </Badge>
                )}
              </Button>

              {/* User Menu - Hidden on mobile */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="hidden md:flex h-10 w-10 lg:h-12 lg:w-12 rounded-full hover:bg-secondary/50" data-testid="user-menu-button">
                    <User className="h-5 w-5 lg:h-6 lg:w-6" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {isAuthenticated ? (
                    <>
                      <div className="px-2 py-1.5 text-sm font-medium">
                        {user?.firstName || user?.username}
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/profile" data-testid="profile-link">Profile</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/orders" data-testid="orders-link">Orders</Link>
                      </DropdownMenuItem>
                      {user?.isAdmin && (
                        <DropdownMenuItem asChild>
                          <Link href="/admin" data-testid="admin-link">Admin</Link>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout} data-testid="logout-button">
                        Logout
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href="/login" data-testid="login-link">Login</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/register" data-testid="register-link">Register</Link>
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Mobile Menu Button */}
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden h-10 w-10 rounded-full hover:bg-secondary/50" data-testid="mobile-menu-button">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[300px] sm:w-[400px] bg-card">
                  <div className="mt-8 space-y-8">
                    <h2 className="text-2xl font-serif font-semibold text-primary mb-8">EliteCommerce</h2>
                    
                    {/* Mobile Search */}
                    <div className="">
                      <form onSubmit={handleSearch} className="relative">
                        <Input
                          type="text"
                          placeholder="Search products..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-12 pr-16 h-12 bg-background border-border rounded-full focus:ring-2 focus:ring-primary/20"
                          data-testid="mobile-search-input"
                        />
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Button 
                          type="submit" 
                          size="sm" 
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 px-3 rounded-full furniture-btn-primary"
                          data-testid="mobile-search-button"
                        >
                          <Search className="h-4 w-4" />
                        </Button>
                      </form>
                    </div>

                    {/* Navigation */}
                    <nav className="flex flex-col space-y-6">
                      {navigationItems.map((item) => (
                        <Link
                          key={item.name}
                          href={item.href}
                          className="text-lg font-medium text-foreground hover:text-primary transition-colors border-b border-border/30 pb-2"
                          onClick={() => setIsMobileMenuOpen(false)}
                          data-testid={`mobile-nav-${item.name.toLowerCase()}`}
                        >
                          {item.name}
                        </Link>
                      ))}
                    </nav>

                    {/* Mobile User Actions */}
                    <div className="border-t border-border pt-6 space-y-4">
                      {isAuthenticated ? (
                        <>
                          <div className="text-sm font-medium text-muted-foreground">
                            {user?.firstName || user?.username}
                          </div>
                          <div className="flex flex-col space-y-3">
                            <Link href="/profile" className="text-foreground hover:text-primary" onClick={() => setIsMobileMenuOpen(false)}>Profile</Link>
                            <Link href="/orders" className="text-foreground hover:text-primary" onClick={() => setIsMobileMenuOpen(false)}>Orders</Link>
                            {user?.isAdmin && (
                              <Link href="/admin" className="text-foreground hover:text-primary" onClick={() => setIsMobileMenuOpen(false)}>Admin</Link>
                            )}
                            <Button variant="ghost" onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }} className="justify-start p-0 h-auto text-foreground hover:text-primary">
                              Logout
                            </Button>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col space-y-3">
                          <Link href="/login" className="text-foreground hover:text-primary" onClick={() => setIsMobileMenuOpen(false)}>Login</Link>
                          <Link href="/register" className="text-foreground hover:text-primary" onClick={() => setIsMobileMenuOpen(false)}>Register</Link>
                        </div>
                      )}
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      {/* Cart Sidebar */}
      <CartSidebar isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
}
