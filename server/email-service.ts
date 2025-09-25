import sgMail from '@sendgrid/mail';
import { storage } from './storage';

const isEmailEnabled = !!process.env.SENDGRID_API_KEY;

if (isEmailEnabled) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
} else {
  console.warn("SENDGRID_API_KEY not set. Email functionality will be disabled.");
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface NotificationContext {
  userName: string;
  userEmail: string;
  firstName?: string;
  orderId?: string;
  orderItems?: Array<{ name: string; quantity: number; price: number }>;
  orderTotal?: number;
  trackingNumber?: string;
  productName?: string;
  productPrice?: number;
  securityAction?: string;
  promotionTitle?: string;
  promotionDiscount?: string;
  promotionCode?: string;
  otp?: string;
  verificationLink?: string;
}

// Email Templates
export const emailTemplates = {
  orderConfirmation: (context: NotificationContext): EmailTemplate => ({
    subject: `Order Confirmation - Order #${context.orderId}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Order Confirmed!</h1>
        <p>Hi ${context.userName},</p>
        <p>Thank you for your order! We've received your order and are preparing it for shipment.</p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Order #${context.orderId}</h3>
          <div style="border-top: 1px solid #dee2e6; padding-top: 15px;">
            ${context.orderItems?.map(item => `
              <div style="display: flex; justify-content: space-between; margin: 10px 0;">
                <span>${item.name} x ${item.quantity}</span>
                <span>$${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            `).join('') || ''}
          </div>
          <div style="border-top: 2px solid #333; padding-top: 10px; font-weight: bold;">
            <div style="display: flex; justify-content: space-between;">
              <span>Total: $${context.orderTotal?.toFixed(2)}</span>
            </div>
          </div>
        </div>
        
        <p>You'll receive another email when your order ships with tracking information.</p>
        <p>Thank you for shopping with us!</p>
      </div>
    `,
    text: `Order Confirmed! Hi ${context.userName}, thank you for your order #${context.orderId}. Total: $${context.orderTotal?.toFixed(2)}. You'll receive tracking information when your order ships.`
  }),

  orderShipped: (context: NotificationContext): EmailTemplate => ({
    subject: `Your Order Has Shipped - Order #${context.orderId}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #28a745;">Your Order Has Shipped!</h1>
        <p>Hi ${context.userName},</p>
        <p>Great news! Your order #${context.orderId} has been shipped and is on its way to you.</p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Tracking Information</h3>
          <p><strong>Tracking Number:</strong> ${context.trackingNumber}</p>
          <p>You can track your package using the tracking number above.</p>
        </div>
        
        <p>Your order should arrive within 3-5 business days.</p>
        <p>Thank you for shopping with us!</p>
      </div>
    `,
    text: `Your order #${context.orderId} has shipped! Tracking number: ${context.trackingNumber}. Expected delivery: 3-5 business days.`
  }),

  securityAlert: (context: NotificationContext): EmailTemplate => ({
    subject: 'Security Alert - Account Activity',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #dc3545;">Security Alert</h1>
        <p>Hi ${context.userName},</p>
        <p>We detected an important security event on your account:</p>
        
        <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <strong>Action:</strong> ${context.securityAction}
        </div>
        
        <p>If this was you, no further action is needed. If you didn't perform this action, please:</p>
        <ul>
          <li>Change your password immediately</li>
          <li>Review your account settings</li>
          <li>Contact our support team if you need assistance</li>
        </ul>
        
        <p>Your account security is important to us.</p>
      </div>
    `,
    text: `Security Alert: ${context.securityAction}. If this wasn't you, please change your password and contact support.`
  }),

  promotionalEmail: (context: NotificationContext): EmailTemplate => ({
    subject: `Special Offer: ${context.promotionTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #007bff;">${context.promotionTitle}</h1>
        <p>Hi ${context.userName},</p>
        <p>We have an exciting offer just for you!</p>
        
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px; text-align: center; margin: 20px 0;">
          <h2 style="margin: 0; color: white;">Save ${context.promotionDiscount}!</h2>
          <p style="font-size: 18px; margin: 10px 0;">Use code: <strong style="background: rgba(255,255,255,0.2); padding: 5px 10px; border-radius: 4px;">${context.promotionCode}</strong></p>
        </div>
        
        <p>Don't miss out on this limited-time offer. Shop now and save on your favorite products!</p>
        <p style="font-size: 12px; color: #666;">You're receiving this email because you opted in to promotional communications. You can update your preferences in your account settings.</p>
      </div>
    `,
    text: `${context.promotionTitle}! Save ${context.promotionDiscount} with code ${context.promotionCode}. Limited time offer!`
  }),

  productRecommendation: (context: NotificationContext): EmailTemplate => ({
    subject: 'Product Recommendation Just For You',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">We Think You'll Love This</h1>
        <p>Hi ${context.userName},</p>
        <p>Based on your browsing and purchase history, we found something special for you:</p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <h3 style="color: #333;">${context.productName}</h3>
          <p style="font-size: 24px; color: #28a745; font-weight: bold;">$${context.productPrice?.toFixed(2)}</p>
          <a href="#" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">View Product</a>
        </div>
        
        <p>This recommendation is personalized based on your preferences and shopping history.</p>
        <p style="font-size: 12px; color: #666;">You can disable personalized recommendations in your account settings.</p>
      </div>
    `,
    text: `Product recommendation: ${context.productName} for $${context.productPrice?.toFixed(2)}. Personalized just for you!`
  }),

  otpVerification: (context: NotificationContext & { otp?: string }): EmailTemplate => ({
    subject: 'Your Verification Code',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Verification Code</h1>
        <p>Hi ${context.userName},</p>
        <p>Please use this verification code to complete your action:</p>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <h2 style="font-size: 32px; letter-spacing: 8px; color: #007bff; margin: 0; font-weight: bold;">${context.otp}</h2>
        </div>
        
        <p>This code will expire in 10 minutes. If you didn't request this code, please ignore this email.</p>
        <p>For security reasons, never share this code with anyone.</p>
      </div>
    `,
    text: `Your verification code is: ${context.otp}. This code expires in 10 minutes. Never share this code with anyone.`
  }),

  emailSubscriptionWelcome: (context: NotificationContext & { verificationLink?: string }): EmailTemplate => ({
    subject: 'Confirm Your Email Subscription',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Confirm Your Subscription</h1>
        <p>Hi ${context.firstName || 'there'},</p>
        <p>Thank you for subscribing to our newsletter! Please confirm your email address to start receiving updates.</p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <a href="${context.verificationLink}" style="background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">Confirm Subscription</a>
        </div>
        
        <p>If the button doesn't work, copy and paste this link in your browser:</p>
        <p style="background: #f1f1f1; padding: 10px; border-radius: 4px; word-break: break-all;">${context.verificationLink}</p>
        
        <p>If you didn't subscribe to our newsletter, you can safely ignore this email.</p>
      </div>
    `,
    text: `Confirm your subscription by visiting: ${context.verificationLink}. If you didn't subscribe, you can safely ignore this email.`
  })
};

export class EmailNotificationService {
  private fromEmail = 'noreply@yourstore.com'; // Replace with your verified sender email

  async sendNotification(
    type: keyof typeof emailTemplates,
    userEmail: string,
    context: NotificationContext,
    userPreferences?: any
  ): Promise<boolean> {
    try {
      if (!isEmailEnabled) {
        console.log(`Email notification ${type} skipped - SENDGRID_API_KEY not configured`);
        return true; // Not an error, email is just disabled
      }

      // Check if user has this notification type enabled
      if (userPreferences) {
        const canSend = this.checkUserPreferences(type, userPreferences);
        if (!canSend) {
          console.log(`Notification ${type} skipped for ${userEmail} due to user preferences`);
          return true; // Not an error, just user preference
        }
      }

      const template = emailTemplates[type](context);
      
      const msg = {
        to: userEmail,
        from: this.fromEmail,
        subject: template.subject,
        text: template.text,
        html: template.html,
      };

      await sgMail.send(msg);
      console.log(`Email notification sent: ${type} to ${userEmail}`);
      return true;
    } catch (error) {
      console.error(`Failed to send email notification ${type} to ${userEmail}:`, error);
      return false;
    }
  }

  private checkUserPreferences(type: keyof typeof emailTemplates, preferences: any): boolean {
    switch (type) {
      case 'orderConfirmation':
      case 'orderShipped':
        return preferences.orderUpdates ?? true;
      case 'securityAlert':
        return preferences.securityAlerts ?? true;
      case 'promotionalEmail':
        return preferences.promotionalEmails ?? false;
      case 'productRecommendation':
        return preferences.productRecommendations ?? true;
      case 'otpVerification':
        return true; // Always send OTP emails for security
      case 'emailSubscriptionWelcome':
        return true; // Always send subscription confirmation
      default:
        return true;
    }
  }

  // Helper methods for common notification scenarios
  async notifyOrderConfirmed(userId: string, orderId: string, orderItems: any[], orderTotal: number): Promise<void> {
    const user = await storage.getUser(userId);
    const settings = await storage.getUserSettings(userId);
    
    if (!user) return;

    const context: NotificationContext = {
      userName: user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.username,
      userEmail: user.email,
      orderId,
      orderItems,
      orderTotal
    };

    await this.sendNotification('orderConfirmation', user.email, context, settings);
  }

  async notifyOrderShipped(userId: string, orderId: string, trackingNumber: string): Promise<void> {
    const user = await storage.getUser(userId);
    const settings = await storage.getUserSettings(userId);
    
    if (!user) return;

    const context: NotificationContext = {
      userName: user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.username,
      userEmail: user.email,
      orderId,
      trackingNumber
    };

    await this.sendNotification('orderShipped', user.email, context, settings);
  }

  async notifySecurityAlert(userId: string, action: string): Promise<void> {
    const user = await storage.getUser(userId);
    const settings = await storage.getUserSettings(userId);
    
    if (!user) return;

    const context: NotificationContext = {
      userName: user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.username,
      userEmail: user.email,
      securityAction: action
    };

    await this.sendNotification('securityAlert', user.email, context, settings);
  }

  async sendPromotionalEmail(userId: string, promotionTitle: string, discount: string, code: string): Promise<void> {
    const user = await storage.getUser(userId);
    const settings = await storage.getUserSettings(userId);
    
    if (!user) return;

    const context: NotificationContext = {
      userName: user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.username,
      userEmail: user.email,
      promotionTitle,
      promotionDiscount: discount,
      promotionCode: code
    };

    await this.sendNotification('promotionalEmail', user.email, context, settings);
  }

  async sendProductRecommendation(userId: string, productName: string, productPrice: number): Promise<void> {
    const user = await storage.getUser(userId);
    const settings = await storage.getUserSettings(userId);
    
    if (!user) return;

    const context: NotificationContext = {
      userName: user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.username,
      userEmail: user.email,
      productName,
      productPrice
    };

    await this.sendNotification('productRecommendation', user.email, context, settings);
  }

  // Send contact form submission
  async sendContactForm(
    userEmail: string,
    userName: string,
    subject: string,
    message: string,
    category: string,
    phone?: string
  ): Promise<void> {
    if (!isEmailEnabled) {
      console.log(`Would send contact form email: ${subject} from ${userEmail}`);
      return;
    }

    try {
      const msg = {
        to: 'support@elitecommerce.com',
        from: process.env.FROM_EMAIL || 'noreply@elitecommerce.com',
        replyTo: userEmail,
        subject: `Contact Form: ${subject}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">New Contact Form Submission</h2>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>From:</strong> ${userName} (${userEmail})</p>
              ${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ''}
              <p><strong>Category:</strong> ${category}</p>
              <p><strong>Subject:</strong> ${subject}</p>
              <div style="margin-top: 15px;">
                <strong>Message:</strong>
                <div style="background: white; padding: 15px; margin-top: 5px; border-left: 4px solid #007bff;">
                  ${message.replace(/\n/g, '<br>')}
                </div>
              </div>
            </div>
          </div>
        `,
        text: `Contact Form Submission\nFrom: ${userName} (${userEmail})\n${phone ? `Phone: ${phone}\n` : ''}Category: ${category}\nSubject: ${subject}\n\nMessage:\n${message}`
      };

      await sgMail.send(msg);
    } catch (error) {
      console.error('Error sending contact form email:', error);
      throw error;
    }
  }

  // Send support ticket
  async sendSupportTicket(
    userEmail: string,
    userName: string,
    subject: string,
    message: string,
    category: string,
    priority: string,
    ticketId: string,
    orderNumber?: string
  ): Promise<void> {
    if (!isEmailEnabled) {
      console.log(`Would send support ticket email: ${ticketId}`);
      return;
    }

    try {
      const msg = {
        to: 'support@elitecommerce.com',
        from: process.env.FROM_EMAIL || 'noreply@elitecommerce.com',
        replyTo: userEmail,
        subject: `[${priority.toUpperCase()}] Support Ticket #${ticketId}: ${subject}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">New Support Ticket</h2>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Ticket ID:</strong> #${ticketId}</p>
              <p><strong>Priority:</strong> <span style="background: ${priority === 'urgent' ? '#dc3545' : priority === 'high' ? '#fd7e14' : priority === 'medium' ? '#ffc107' : '#28a745'}; color: white; padding: 2px 8px; border-radius: 4px;">${priority.toUpperCase()}</span></p>
              <p><strong>From:</strong> ${userName} (${userEmail})</p>
              <p><strong>Category:</strong> ${category}</p>
              ${orderNumber ? `<p><strong>Order Number:</strong> ${orderNumber}</p>` : ''}
              <p><strong>Subject:</strong> ${subject}</p>
              <div style="margin-top: 15px;">
                <strong>Message:</strong>
                <div style="background: white; padding: 15px; margin-top: 5px; border-left: 4px solid #007bff;">
                  ${message.replace(/\n/g, '<br>')}
                </div>
              </div>
            </div>
          </div>
        `,
        text: `Support Ticket #${ticketId}\nPriority: ${priority.toUpperCase()}\nFrom: ${userName} (${userEmail})\nCategory: ${category}\n${orderNumber ? `Order: ${orderNumber}\n` : ''}Subject: ${subject}\n\nMessage:\n${message}`
      };

      await sgMail.send(msg);
    } catch (error) {
      console.error('Error sending support ticket email:', error);
      throw error;
    }
  }

  // Send newsletter welcome email
  async sendNewsletterWelcome(userEmail: string, userName: string): Promise<void> {
    if (!isEmailEnabled) {
      console.log(`Would send newsletter welcome email to: ${userEmail}`);
      return;
    }

    try {
      const msg = {
        to: userEmail,
        from: process.env.FROM_EMAIL || 'noreply@elitecommerce.com',
        subject: 'Welcome to EliteCommerce Newsletter!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">Welcome to Our Newsletter!</h1>
            <p>Hi ${userName},</p>
            <p>Thank you for subscribing to the EliteCommerce newsletter! You're now part of our exclusive community.</p>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>What you can expect:</h3>
              <ul style="color: #666;">
                <li>🎉 Exclusive deals and early access to sales</li>
                <li>📦 New product announcements</li>
                <li>💡 Style tips and shopping guides</li>
                <li>🎁 Special birthday and anniversary offers</li>
              </ul>
            </div>
            
            <p>We promise to keep your inbox interesting and never spam you. You can unsubscribe at any time.</p>
            <p>Happy shopping!</p>
            <p>The EliteCommerce Team</p>
          </div>
        `,
        text: `Welcome to EliteCommerce Newsletter!\n\nHi ${userName},\n\nThank you for subscribing! You'll receive exclusive deals, new product announcements, style tips, and special offers.\n\nHappy shopping!\nThe EliteCommerce Team`
      };

      await sgMail.send(msg);
    } catch (error) {
      console.error('Error sending newsletter welcome email:', error);
      throw error;
    }
  }

  // Send OTP verification email
  async sendOTPEmail(userEmail: string, userName: string, otp: string): Promise<void> {
    try {
      const context: NotificationContext & { otp: string } = {
        userName,
        userEmail,
        otp
      };

      await this.sendNotification('otpVerification', userEmail, context);
    } catch (error) {
      console.error('Error sending OTP email:', error);
      throw error;
    }
  }

  // Send email subscription confirmation
  async sendSubscriptionConfirmation(
    email: string,
    firstName: string,
    verificationToken: string
  ): Promise<void> {
    try {
      const verificationLink = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/verify-subscription?token=${verificationToken}`;
      
      const context: NotificationContext & { verificationLink: string } = {
        userName: firstName,
        userEmail: email,
        firstName,
        verificationLink
      };

      await this.sendNotification('emailSubscriptionWelcome', email, context);
    } catch (error) {
      console.error('Error sending subscription confirmation email:', error);
      throw error;
    }
  }
}

export const emailNotificationService = new EmailNotificationService();