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
    <footer className="bg-primary text-primary-foreground" data-testid="footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Company Info */}
          <div>
            <h3 className="text-2xl font-serif font-semibold mb-6">FURNISH</h3>
            <p className="text-primary-foreground/90 leading-relaxed mb-6">
              Transforming homes with timeless furniture pieces. Each item in our collection is carefully curated to bring elegance and functionality to your living space.
            </p>
            <div className="flex space-x-3">
              <Button variant="ghost" size="icon" className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10 h-12 w-12 rounded-full" data-testid="social-facebook">
                <Facebook className="h-6 w-6" />
              </Button>
              <Button variant="ghost" size="icon" className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10 h-12 w-12 rounded-full" data-testid="social-twitter">
                <Twitter className="h-6 w-6" />
              </Button>
              <Button variant="ghost" size="icon" className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10 h-12 w-12 rounded-full" data-testid="social-instagram">
                <Instagram className="h-6 w-6" />
              </Button>
              <Button variant="ghost" size="icon" className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10 h-12 w-12 rounded-full" data-testid="social-linkedin">
                <Linkedin className="h-6 w-6" />
              </Button>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-serif text-lg font-medium mb-6">Collections</h4>
            <ul className="space-y-3">
              <li><Link href="/products?category=living-room" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors" data-testid="footer-living-room">Living Room</Link></li>
              <li><Link href="/products?category=bedroom" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors" data-testid="footer-bedroom">Bedroom</Link></li>
              <li><Link href="/products?category=dining-room" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors" data-testid="footer-dining">Dining Room</Link></li>
              <li><Link href="/products?category=office" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors" data-testid="footer-office">Home Office</Link></li>
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h4 className="font-serif text-lg font-medium mb-6">Customer Care</h4>
            <ul className="space-y-3">
              <li><Link href="/help" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors" data-testid="footer-help">Design Consultation</Link></li>
              <li><Link href="/returns" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors" data-testid="footer-returns">White Glove Delivery</Link></li>
              <li><Link href="/shipping" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors" data-testid="footer-shipping">Care & Maintenance</Link></li>
              <li><Link href="/size-guide" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors" data-testid="footer-size-guide">Returns & Exchanges</Link></li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="font-serif text-lg font-medium mb-6">Design Updates</h4>
            <p className="text-primary-foreground/80 mb-6 leading-relaxed">
              Get the latest in furniture trends, design tips, and exclusive previews of new collections.
            </p>
            <form onSubmit={handleNewsletterSubscribe} className="space-y-4">
              <Input
                type="email"
                placeholder="Your email address"
                className="border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground placeholder:text-primary-foreground/60 h-12 rounded-lg"
                data-testid="newsletter-email"
              />
              <Button 
                type="submit"
                className="w-full furniture-btn-secondary bg-accent hover:bg-accent text-accent-foreground h-12"
                data-testid="newsletter-subscribe"
              >
                Subscribe to Newsletter
              </Button>
            </form>
          </div>
        </div>

        <div className="border-t border-primary-foreground/20 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-primary-foreground/70">
            &copy; 2024 FURNISH. All rights reserved.
          </p>
          <div className="flex space-x-8 mt-4 md:mt-0">
            <Link href="/privacy" className="text-primary-foreground/70 hover:text-primary-foreground transition-colors" data-testid="footer-privacy">Privacy Policy</Link>
            <Link href="/terms" className="text-primary-foreground/70 hover:text-primary-foreground transition-colors" data-testid="footer-terms">Terms of Service</Link>
            <Link href="/cookies" className="text-primary-foreground/70 hover:text-primary-foreground transition-colors" data-testid="footer-cookies">Sustainability</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
