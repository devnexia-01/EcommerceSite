import type { Express, Request, Response } from 'express';
import { z } from 'zod';
import { authenticateToken, requireAdmin } from './auth-routes';
import { emailNotificationService } from './email-service';
import { storage } from './storage';

// Enhanced request interface with user data
interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    isAdmin?: boolean;
  };
}

// Validation schemas
const testNotificationSchema = z.object({
  type: z.enum(['orderConfirmation', 'orderShipped', 'securityAlert', 'promotionalEmail', 'productRecommendation']),
  data: z.object({
    orderId: z.string().optional(),
    orderItems: z.array(z.object({
      name: z.string(),
      quantity: z.number(),
      price: z.number()
    })).optional(),
    orderTotal: z.number().optional(),
    trackingNumber: z.string().optional(),
    securityAction: z.string().optional(),
    promotionTitle: z.string().optional(),
    promotionDiscount: z.string().optional(),
    promotionCode: z.string().optional(),
    productName: z.string().optional(),
    productPrice: z.number().optional()
  }).optional()
});

const bulkPromotionalEmailSchema = z.object({
  promotionTitle: z.string(),
  promotionDiscount: z.string(),
  promotionCode: z.string(),
  targetUsers: z.enum(['all', 'opt-in']).default('opt-in')
});

export function setupNotificationRoutes(app: Express) {
  
  // Test notification endpoint for development/admin use
  app.post('/api/notifications/test', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { type, data } = testNotificationSchema.parse(req.body);
      const userId = req.user!.userId;
      
      let success = false;
      
      switch (type) {
        case 'orderConfirmation':
          await emailNotificationService.notifyOrderConfirmed(
            userId,
            data?.orderId || 'TEST-ORDER-123',
            data?.orderItems || [{ name: 'Test Product', quantity: 1, price: 29.99 }],
            data?.orderTotal || 29.99
          );
          success = true;
          break;
          
        case 'orderShipped':
          await emailNotificationService.notifyOrderShipped(
            userId,
            data?.orderId || 'TEST-ORDER-123',
            data?.trackingNumber || 'TEST-TRACK-456'
          );
          success = true;
          break;
          
        case 'securityAlert':
          await emailNotificationService.notifySecurityAlert(
            userId,
            data?.securityAction || 'Test security action performed'
          );
          success = true;
          break;
          
        case 'promotionalEmail':
          await emailNotificationService.sendPromotionalEmail(
            userId,
            data?.promotionTitle || 'Test Sale',
            data?.promotionDiscount || '20% OFF',
            data?.promotionCode || 'TEST20'
          );
          success = true;
          break;
          
        case 'productRecommendation':
          await emailNotificationService.sendProductRecommendation(
            userId,
            data?.productName || 'Amazing Test Product',
            data?.productPrice || 49.99
          );
          success = true;
          break;
          
        default:
          return res.status(400).json({ message: 'Invalid notification type' });
      }
      
      if (success) {
        res.json({ 
          message: `Test ${type} notification sent successfully`,
          type,
          userId
        });
      }
      
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Validation error', 
          errors: error.errors 
        });
      }
      
      console.error('Test notification error:', error);
      res.status(500).json({ message: 'Failed to send test notification' });
    }
  });

  // Send promotional emails to all opted-in users (admin only)
  app.post('/api/notifications/promotional/bulk', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { promotionTitle, promotionDiscount, promotionCode, targetUsers } = bulkPromotionalEmailSchema.parse(req.body);
      
      // Get users based on target criteria - simplified for demo
      // In a real implementation, you would filter users by their notification preferences
      const users = []; // For demo purposes, we'll skip bulk emails
      
      let successCount = 0;
      let failureCount = 0;
      
      // Send emails in batches to avoid overwhelming the email service
      for (const user of users) {
        try {
          await emailNotificationService.sendPromotionalEmail(
            user.id,
            promotionTitle,
            promotionDiscount,
            promotionCode
          );
          successCount++;
        } catch (error) {
          console.error(`Failed to send promotional email to user ${user.id}:`, error);
          failureCount++;
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      res.json({
        message: 'Promotional email campaign completed',
        stats: {
          totalUsers: users.length,
          successCount,
          failureCount
        }
      });
      
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Validation error', 
          errors: error.errors 
        });
      }
      
      console.error('Bulk promotional email error:', error);
      res.status(500).json({ message: 'Failed to send promotional emails' });
    }
  });
  
  // Get notification stats (admin only)
  app.get('/api/notifications/stats', requireAdmin, async (req: Request, res: Response) => {
    try {
      // This would typically come from a proper analytics database
      // For now, we'll return mock stats
      const stats = {
        totalNotificationsSent: 0, // Would be tracked in database
        notificationTypes: {
          orderConfirmations: 0,
          orderShipped: 0,
          securityAlerts: 0,
          promotionalEmails: 0,
          productRecommendations: 0
        },
        userPreferences: {
          totalUsers: 0,
          orderUpdatesEnabled: 0,
          promotionalEmailsEnabled: 0,
          productRecommendationsEnabled: 0,
          securityAlertsEnabled: 0
        }
      };
      
      res.json(stats);
      
    } catch (error: any) {
      console.error('Notification stats error:', error);
      res.status(500).json({ message: 'Failed to get notification stats' });
    }
  });
}