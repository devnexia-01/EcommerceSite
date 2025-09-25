import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Facebook, Twitter, Instagram, Linkedin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export default function Footer() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNewsletterSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast({
        title: "Email required",
        description: "Please enter your email address",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/content/newsletter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: email.trim() })
      });

      if (response.ok) {
        toast({
          title: "Successfully subscribed!",
          description: "Thank you for subscribing to our newsletter"
        });
        setEmail("");
      } else {
        const errorData = await response.json();
        toast({
          title: "Subscription failed",
          description: errorData.message || "Please try again later",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to subscribe. Please try again later.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <footer className="bg-primary text-primary-foreground" data-testid="footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Company Info */}
          <div>
            <h3 className="text-2xl font-serif font-semibold mb-6">EliteCommerce</h3>
            <p className="text-primary-foreground/90 leading-relaxed mb-6">
              Premium e-commerce platform delivering exceptional shopping experiences with cutting-edge technology and unmatched customer service.
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
            <h4 className="font-serif text-lg font-medium mb-6">Quick Links</h4>
            <ul className="space-y-3">
              <li><Link href="/about" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors" data-testid="footer-about">About Us</Link></li>
              <li><Link href="/contact" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors" data-testid="footer-contact">Contact</Link></li>
              <li><Link href="/careers" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors" data-testid="footer-careers">Careers</Link></li>
              <li><Link href="/press" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors" data-testid="footer-press">Press</Link></li>
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h4 className="font-serif text-lg font-medium mb-6">Customer Service</h4>
            <ul className="space-y-3">
              <li><Link href="/help" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors" data-testid="footer-help">Help Center</Link></li>
              <li><Link href="/returns" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors" data-testid="footer-returns">Returns</Link></li>
              <li><Link href="/shipping" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors" data-testid="footer-shipping">Shipping Info</Link></li>
              <li><Link href="/size-guide" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors" data-testid="footer-size-guide">Size Guide</Link></li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="font-serif text-lg font-medium mb-6">Stay Updated</h4>
            <p className="text-primary-foreground/80 mb-6 leading-relaxed">
              Subscribe to get special offers, updates, and exclusive deals.
            </p>
            <form onSubmit={handleNewsletterSubscribe} className="space-y-4">
              <Input
                type="email"
                placeholder="Your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-primary-foreground/20 bg-white/90 text-black placeholder:text-gray-600 h-12 rounded-lg focus:bg-white focus:ring-2 focus:ring-primary-foreground/50"
                data-testid="newsletter-email"
                disabled={isSubmitting}
              />
              <Button 
                type="submit"
                className="w-full furniture-btn-secondary bg-accent hover:bg-accent text-accent-foreground h-12"
                data-testid="newsletter-subscribe"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Subscribing..." : "Subscribe"}
              </Button>
            </form>
          </div>
        </div>

        <div className="border-t border-primary-foreground/20 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-primary-foreground/70">
            &copy; 2024 EliteCommerce. All rights reserved.
          </p>
          <div className="flex space-x-8 mt-4 md:mt-0">
            <Link href="/privacy" className="text-primary-foreground/70 hover:text-primary-foreground transition-colors" data-testid="footer-privacy">Privacy Policy</Link>
            <Link href="/terms" className="text-primary-foreground/70 hover:text-primary-foreground transition-colors" data-testid="footer-terms">Terms of Service</Link>
            <Link href="/cookies" className="text-primary-foreground/70 hover:text-primary-foreground transition-colors" data-testid="footer-cookies">Cookie Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
