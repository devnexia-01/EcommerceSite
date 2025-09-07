import { Router } from "express";
import { z } from "zod";
import { emailNotificationService } from "./email-service";

const router = Router();

// Contact form schema
const contactFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email address"),
  subject: z.string().min(1, "Subject is required").max(200),
  message: z.string().min(10, "Message must be at least 10 characters").max(2000),
  phone: z.string().optional(),
  category: z.enum(["general", "support", "sales", "feedback", "bug_report"]).default("general")
});

// Newsletter subscription schema
const newsletterSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().optional()
});

// Support ticket schema
const supportTicketSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email address"),
  subject: z.string().min(1, "Subject is required").max(200),
  message: z.string().min(10, "Message must be at least 10 characters").max(2000),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  category: z.enum(["account", "orders", "payments", "technical", "returns", "general"]).default("general"),
  orderNumber: z.string().optional()
});

// GET /api/content/about
router.get("/about", async (req, res) => {
  try {
    const aboutContent = {
      company: {
        name: "EliteCommerce",
        founded: "2024",
        mission: "To deliver exceptional shopping experiences with cutting-edge technology and unmatched customer service.",
        vision: "To be the leading premium e-commerce platform that connects customers with high-quality products worldwide.",
        values: [
          "Customer First: We prioritize customer satisfaction above all else",
          "Quality: We maintain the highest standards in everything we do",
          "Innovation: We continuously evolve with the latest technology",
          "Integrity: We conduct business with honesty and transparency",
          "Sustainability: We are committed to environmental responsibility"
        ]
      },
      team: {
        size: "50+ dedicated professionals",
        locations: ["San Francisco, CA", "New York, NY", "Austin, TX"],
        expertise: ["E-commerce Technology", "Customer Experience", "Supply Chain Management", "Digital Marketing"]
      },
      achievements: [
        "Over 1 million satisfied customers",
        "99.9% uptime reliability",
        "24/7 customer support",
        "ISO 27001 certified for security",
        "Carbon neutral shipping"
      ],
      stats: {
        customers: "1,000,000+",
        products: "50,000+",
        countries: "25+",
        satisfaction: "98.5%"
      }
    };

    res.json(aboutContent);
  } catch (error) {
    console.error("Error fetching about content:", error);
    res.status(500).json({ error: "Failed to fetch about information" });
  }
});

// GET /api/content/privacy
router.get("/privacy", async (req, res) => {
  try {
    const privacyPolicy = {
      lastUpdated: "2024-01-15",
      sections: [
        {
          title: "Information We Collect",
          content: [
            "Personal Information: Name, email address, phone number, billing and shipping addresses",
            "Account Information: Username, password, purchase history, preferences",
            "Payment Information: Credit card details, billing address (processed securely through our payment partners)",
            "Technical Information: IP address, browser type, device information, cookies",
            "Usage Data: Pages visited, time spent on site, click patterns, search queries"
          ]
        },
        {
          title: "How We Use Your Information",
          content: [
            "Process and fulfill your orders",
            "Provide customer support and respond to inquiries",
            "Send important account and order updates",
            "Improve our products and services",
            "Personalize your shopping experience",
            "Prevent fraud and ensure security",
            "Comply with legal obligations"
          ]
        },
        {
          title: "Information Sharing",
          content: [
            "We do not sell your personal information to third parties",
            "We may share information with trusted service providers who help us operate our business",
            "We may disclose information when required by law or to protect our rights",
            "Anonymous, aggregated data may be shared for business purposes"
          ]
        },
        {
          title: "Data Security",
          content: [
            "We use industry-standard encryption to protect your data",
            "Secure servers and firewalls protect against unauthorized access",
            "Regular security audits and monitoring",
            "PCI DSS compliance for payment processing",
            "Employee access is limited and monitored"
          ]
        },
        {
          title: "Your Rights",
          content: [
            "Access and update your personal information",
            "Request deletion of your account and data",
            "Opt-out of marketing communications",
            "Request data portability",
            "Lodge complaints with data protection authorities"
          ]
        },
        {
          title: "Cookies and Tracking",
          content: [
            "We use cookies to enhance your experience",
            "Essential cookies for site functionality",
            "Analytics cookies to understand usage patterns",
            "Marketing cookies for personalized content",
            "You can manage cookie preferences in your browser"
          ]
        }
      ],
      contact: {
        email: "privacy@elitecommerce.com",
        phone: "1-800-555-0123",
        address: "123 Commerce Street, San Francisco, CA 94105"
      }
    };

    res.json(privacyPolicy);
  } catch (error) {
    console.error("Error fetching privacy policy:", error);
    res.status(500).json({ error: "Failed to fetch privacy policy" });
  }
});

// GET /api/content/terms
router.get("/terms", async (req, res) => {
  try {
    const termsOfService = {
      lastUpdated: "2024-01-15",
      sections: [
        {
          title: "Acceptance of Terms",
          content: [
            "By using our website and services, you agree to these Terms of Service",
            "These terms may be updated periodically with notice",
            "Continued use constitutes acceptance of updated terms"
          ]
        },
        {
          title: "Account Responsibilities",
          content: [
            "You must provide accurate and complete information",
            "You are responsible for maintaining account security",
            "You must be at least 18 years old to create an account",
            "One account per person or business entity",
            "Notify us immediately of any unauthorized access"
          ]
        },
        {
          title: "Orders and Payments",
          content: [
            "All orders are subject to acceptance and availability",
            "Prices are subject to change without notice",
            "Payment is required at time of order",
            "We accept major credit cards and approved payment methods",
            "Orders may be cancelled for various reasons including fraud prevention"
          ]
        },
        {
          title: "Shipping and Delivery",
          content: [
            "Shipping costs and timeframes vary by location and method",
            "Risk of loss transfers upon delivery",
            "We are not responsible for delays caused by shipping carriers",
            "Address accuracy is customer's responsibility"
          ]
        },
        {
          title: "Returns and Refunds",
          content: [
            "Returns accepted within 30 days of delivery",
            "Items must be in original condition",
            "Some items may not be eligible for return",
            "Return shipping costs may apply",
            "Refunds processed within 5-10 business days"
          ]
        },
        {
          title: "Prohibited Uses",
          content: [
            "No illegal or unauthorized use of our services",
            "No interference with website operation or security",
            "No transmission of harmful code or content",
            "No violation of intellectual property rights",
            "No harassment or abuse of other users or staff"
          ]
        },
        {
          title: "Limitation of Liability",
          content: [
            "Our liability is limited to the maximum extent allowed by law",
            "We are not liable for indirect or consequential damages",
            "Total liability limited to amount paid for products or services",
            "Some jurisdictions may not allow these limitations"
          ]
        }
      ],
      contact: {
        email: "legal@elitecommerce.com",
        phone: "1-800-555-0123",
        address: "123 Commerce Street, San Francisco, CA 94105"
      }
    };

    res.json(termsOfService);
  } catch (error) {
    console.error("Error fetching terms of service:", error);
    res.status(500).json({ error: "Failed to fetch terms of service" });
  }
});

// GET /api/content/help
router.get("/help", async (req, res) => {
  try {
    const helpContent = {
      categories: [
        {
          id: "orders",
          title: "Orders & Shipping",
          faqs: [
            {
              question: "How do I track my order?",
              answer: "You can track your order by logging into your account and viewing your order history. You'll also receive email updates with tracking information once your order ships."
            },
            {
              question: "What are your shipping options?",
              answer: "We offer standard shipping (5-7 business days), expedited shipping (2-3 business days), and overnight shipping. Shipping costs vary by location and method."
            },
            {
              question: "Can I change or cancel my order?",
              answer: "Orders can be modified or cancelled within 1 hour of placement. After that, please contact customer service for assistance."
            },
            {
              question: "Do you ship internationally?",
              answer: "Yes, we ship to over 25 countries worldwide. International shipping times and costs vary by destination."
            }
          ]
        },
        {
          id: "returns",
          title: "Returns & Exchanges",
          faqs: [
            {
              question: "What is your return policy?",
              answer: "We accept returns within 30 days of delivery. Items must be in original condition with tags attached. Some items like intimate apparel and personalized items cannot be returned."
            },
            {
              question: "How do I start a return?",
              answer: "Log into your account, go to order history, and select 'Return Items' next to your order. Follow the prompts to print your return label."
            },
            {
              question: "When will I receive my refund?",
              answer: "Refunds are processed within 3-5 business days after we receive your returned item. It may take an additional 3-5 business days to appear on your statement."
            }
          ]
        },
        {
          id: "account",
          title: "Account & Profile",
          faqs: [
            {
              question: "How do I reset my password?",
              answer: "Click 'Forgot Password' on the login page and enter your email address. You'll receive a reset link within a few minutes."
            },
            {
              question: "How do I update my account information?",
              answer: "Log into your account and go to 'Profile Settings' to update your personal information, addresses, and preferences."
            },
            {
              question: "Can I delete my account?",
              answer: "Yes, you can delete your account by contacting customer service. Note that this action cannot be undone and you'll lose your order history."
            }
          ]
        },
        {
          id: "payments",
          title: "Payments & Billing",
          faqs: [
            {
              question: "What payment methods do you accept?",
              answer: "We accept all major credit cards (Visa, MasterCard, American Express, Discover), PayPal, Apple Pay, and Google Pay."
            },
            {
              question: "Is my payment information secure?",
              answer: "Yes, we use industry-standard encryption and are PCI DSS compliant. We never store your full credit card information on our servers."
            },
            {
              question: "Why was my payment declined?",
              answer: "Payment declines can happen for various reasons including insufficient funds, incorrect billing information, or bank security measures. Please verify your information and try again."
            }
          ]
        }
      ],
      contact: {
        phone: "1-800-555-0123",
        email: "support@elitecommerce.com",
        hours: "Monday-Friday: 9 AM - 9 PM EST, Weekend: 10 AM - 6 PM EST",
        chat: "Available 24/7 on our website"
      }
    };

    res.json(helpContent);
  } catch (error) {
    console.error("Error fetching help content:", error);
    res.status(500).json({ error: "Failed to fetch help information" });
  }
});

// POST /api/content/contact
router.post("/contact", async (req, res) => {
  try {
    const contactData = contactFormSchema.parse(req.body);
    
    // Send contact form email to support team
    try {
      await emailNotificationService.sendContactForm(
        contactData.email,
        contactData.name,
        contactData.subject,
        contactData.message,
        contactData.category,
        contactData.phone
      );
    } catch (emailError) {
      console.error('Failed to send contact form email:', emailError);
      // Continue processing even if email fails
    }

    res.status(201).json({ 
      message: "Contact form submitted successfully. We'll get back to you within 24 hours.",
      ticketId: `CONT-${Date.now()}`
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Validation error", 
        errors: error.errors 
      });
    }
    console.error("Error processing contact form:", error);
    res.status(500).json({ error: "Failed to submit contact form" });
  }
});

// POST /api/content/support
router.post("/support", async (req, res) => {
  try {
    const supportData = supportTicketSchema.parse(req.body);
    
    const ticketId = `SUP-${Date.now()}`;
    
    // Send support ticket email
    try {
      await emailNotificationService.sendSupportTicket(
        supportData.email,
        supportData.name,
        supportData.subject,
        supportData.message,
        supportData.category,
        supportData.priority,
        ticketId,
        supportData.orderNumber
      );
    } catch (emailError) {
      console.error('Failed to send support ticket email:', emailError);
      // Continue processing even if email fails
    }

    res.status(201).json({ 
      message: "Support ticket created successfully.",
      ticketId,
      priority: supportData.priority,
      estimatedResponse: supportData.priority === 'urgent' ? '2 hours' : 
                        supportData.priority === 'high' ? '4 hours' :
                        supportData.priority === 'medium' ? '24 hours' : '48 hours'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Validation error", 
        errors: error.errors 
      });
    }
    console.error("Error creating support ticket:", error);
    res.status(500).json({ error: "Failed to create support ticket" });
  }
});

// POST /api/content/newsletter
router.post("/newsletter", async (req, res) => {
  try {
    const newsletterData = newsletterSchema.parse(req.body);
    
    // Send welcome email for newsletter subscription
    try {
      await emailNotificationService.sendNewsletterWelcome(
        newsletterData.email,
        newsletterData.name || 'Valued Customer'
      );
    } catch (emailError) {
      console.error('Failed to send newsletter welcome email:', emailError);
      // Continue processing even if email fails
    }

    res.status(201).json({ 
      message: "Successfully subscribed to newsletter!"
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Validation error", 
        errors: error.errors 
      });
    }
    console.error("Error subscribing to newsletter:", error);
    res.status(500).json({ error: "Failed to subscribe to newsletter" });
  }
});

// GET /api/content/shipping
router.get("/shipping", async (req, res) => {
  try {
    const shippingInfo = {
      methods: [
        {
          name: "Standard Shipping",
          cost: "Free on orders over $50, otherwise $5.99",
          time: "5-7 business days",
          description: "Reliable delivery for everyday orders"
        },
        {
          name: "Expedited Shipping",
          cost: "$12.99",
          time: "2-3 business days",
          description: "Faster delivery for urgent orders"
        },
        {
          name: "Overnight Shipping",
          cost: "$24.99",
          time: "1 business day",
          description: "Next day delivery for time-sensitive items"
        },
        {
          name: "International Shipping",
          cost: "Varies by destination",
          time: "7-14 business days",
          description: "Worldwide delivery to 25+ countries"
        }
      ],
      policies: [
        "Orders placed before 2 PM EST ship the same business day",
        "Weekend and holiday orders ship the next business day",
        "Tracking information provided for all shipments",
        "Signature required for orders over $200",
        "We are not responsible for delays caused by weather or carrier issues"
      ],
      restrictions: [
        "Some items cannot be shipped to PO boxes",
        "Hazardous materials have shipping restrictions",
        "International orders may be subject to customs duties",
        "Address corrections may delay shipment"
      ]
    };

    res.json(shippingInfo);
  } catch (error) {
    console.error("Error fetching shipping info:", error);
    res.status(500).json({ error: "Failed to fetch shipping information" });
  }
});

// GET /api/content/size-guide
router.get("/size-guide", async (req, res) => {
  try {
    const sizeGuide = {
      clothing: {
        women: {
          tops: [
            { size: "XS", chest: "32-34", waist: "26-28", hips: "36-38" },
            { size: "S", chest: "34-36", waist: "28-30", hips: "38-40" },
            { size: "M", chest: "36-38", waist: "30-32", hips: "40-42" },
            { size: "L", chest: "38-40", waist: "32-34", hips: "42-44" },
            { size: "XL", chest: "40-42", waist: "34-36", hips: "44-46" }
          ],
          bottoms: [
            { size: "XS", waist: "26", hips: "36", inseam: "30" },
            { size: "S", waist: "28", hips: "38", inseam: "30" },
            { size: "M", waist: "30", hips: "40", inseam: "30" },
            { size: "L", waist: "32", hips: "42", inseam: "30" },
            { size: "XL", waist: "34", hips: "44", inseam: "30" }
          ]
        },
        men: {
          tops: [
            { size: "S", chest: "36-38", waist: "30-32", neck: "14-14.5" },
            { size: "M", chest: "38-40", waist: "32-34", neck: "15-15.5" },
            { size: "L", chest: "40-42", waist: "34-36", neck: "16-16.5" },
            { size: "XL", chest: "42-44", waist: "36-38", neck: "17-17.5" },
            { size: "XXL", chest: "44-46", waist: "38-40", neck: "18-18.5" }
          ],
          bottoms: [
            { size: "30", waist: "30", hips: "40", inseam: "32" },
            { size: "32", waist: "32", hips: "42", inseam: "32" },
            { size: "34", waist: "34", hips: "44", inseam: "32" },
            { size: "36", waist: "36", hips: "46", inseam: "32" },
            { size: "38", waist: "38", hips: "48", inseam: "32" }
          ]
        }
      },
      shoes: {
        conversion: [
          { us: "6", uk: "3.5", eu: "36", cm: "22.5" },
          { us: "7", uk: "4.5", eu: "37", cm: "23" },
          { us: "8", uk: "5.5", eu: "38", cm: "24" },
          { us: "9", uk: "6.5", eu: "39", cm: "25" },
          { us: "10", uk: "7.5", eu: "40", cm: "26" },
          { us: "11", uk: "8.5", eu: "41", cm: "27" },
          { us: "12", uk: "9.5", eu: "42", cm: "28" }
        ]
      },
      measuring_tips: [
        "Use a flexible measuring tape for best results",
        "Measure over your undergarments, not over clothing",
        "Keep the tape measure level and snug but not tight",
        "Take measurements at the fullest part of each area",
        "If between sizes, size up for a more comfortable fit"
      ]
    };

    res.json(sizeGuide);
  } catch (error) {
    console.error("Error fetching size guide:", error);
    res.status(500).json({ error: "Failed to fetch size guide" });
  }
});

export default router;