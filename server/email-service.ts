import sgMail from '@sendgrid/mail';
import { storage } from './storage';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface NotificationContext {
  userName: string;
  userEmail: string;
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
}

export const emailNotificationService = new EmailNotificationService();