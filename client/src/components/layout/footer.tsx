import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Facebook, Twitter, Instagram, Linkedin } from "lucide-react";

export default function Footer() {
  const handleNewsletterSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement newsletter subscription
  };

  return (
    <footer className="bg-foreground text-background" data-testid="footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div>
            <h3 className="text-lg font-bold mb-4">EliteCommerce</h3>
            <p className="text-background/80 text-sm mb-4">
              Premium e-commerce platform delivering exceptional shopping experiences with cutting-edge technology.
            </p>
            <div className="flex space-x-4">
              <Button variant="ghost" size="icon" className="text-background/60 hover:text-background" data-testid="social-facebook">
                <Facebook className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-background/60 hover:text-background" data-testid="social-twitter">
                <Twitter className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-background/60 hover:text-background" data-testid="social-instagram">
                <Instagram className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-background/60 hover:text-background" data-testid="social-linkedin">
                <Linkedin className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/about" className="text-background/80 hover:text-background" data-testid="footer-about">About Us</Link></li>
              <li><Link href="/contact" className="text-background/80 hover:text-background" data-testid="footer-contact">Contact</Link></li>
              <li><Link href="/careers" className="text-background/80 hover:text-background" data-testid="footer-careers">Careers</Link></li>
              <li><Link href="/press" className="text-background/80 hover:text-background" data-testid="footer-press">Press</Link></li>
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h4 className="font-semibold mb-4">Customer Service</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/help" className="text-background/80 hover:text-background" data-testid="footer-help">Help Center</Link></li>
              <li><Link href="/returns" className="text-background/80 hover:text-background" data-testid="footer-returns">Returns</Link></li>
              <li><Link href="/shipping" className="text-background/80 hover:text-background" data-testid="footer-shipping">Shipping Info</Link></li>
              <li><Link href="/size-guide" className="text-background/80 hover:text-background" data-testid="footer-size-guide">Size Guide</Link></li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="font-semibold mb-4">Stay Updated</h4>
            <p className="text-background/80 text-sm mb-4">
              Subscribe to get special offers, updates, and exclusive deals.
            </p>
            <form onSubmit={handleNewsletterSubscribe} className="flex">
              <Input
                type="email"
                placeholder="Enter email"
                className="flex-1 rounded-r-none border-background/20 bg-background/10 text-background placeholder:text-background/60"
                data-testid="newsletter-email"
              />
              <Button 
                type="submit"
                className="rounded-l-none bg-primary hover:bg-primary/90 text-primary-foreground"
                data-testid="newsletter-subscribe"
              >
                Subscribe
              </Button>
            </form>
          </div>
        </div>

        <div className="border-t border-background/20 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-background/60 text-sm">
            &copy; 2024 EliteCommerce. All rights reserved.
          </p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <Link href="/privacy" className="text-background/60 hover:text-background text-sm" data-testid="footer-privacy">Privacy Policy</Link>
            <Link href="/terms" className="text-background/60 hover:text-background text-sm" data-testid="footer-terms">Terms of Service</Link>
            <Link href="/cookies" className="text-background/60 hover:text-background text-sm" data-testid="footer-cookies">Cookie Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
