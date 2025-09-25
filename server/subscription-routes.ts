import type { Express, Request, Response } from 'express';
import { z } from 'zod';
import { storage } from './storage';
import { emailNotificationService } from './email-service';

// Validation schemas
const subscribeEmailSchema = z.object({
  email: z.string().email("Invalid email format"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  source: z.string().optional()
});

const unsubscribeSchema = z.object({
  token: z.string().min(1, "Token is required")
});

const updatePreferencesSchema = z.object({
  email: z.string().email("Invalid email format"),
  preferences: z.object({
    promotions: z.boolean().optional(),
    newProducts: z.boolean().optional(),
    weeklyDeals: z.boolean().optional()
  })
});

export function setupSubscriptionRoutes(app: Express) {

  // Subscribe to email newsletter
  app.post('/api/subscriptions/subscribe', async (req: Request, res: Response) => {
    try {
      const { email, firstName, lastName, source } = subscribeEmailSchema.parse(req.body);

      // Check if already subscribed
      const existing = await storage.getEmailSubscription(email);
      if (existing && existing.status === 'active') {
        return res.status(400).json({ message: 'Email already subscribed' });
      }

      // Create or update subscription
      let subscription;
      if (existing) {
        // Reactivate if previously unsubscribed
        subscription = await storage.createEmailSubscription(email, firstName, lastName, source);
      } else {
        subscription = await storage.createEmailSubscription(email, firstName, lastName, source);
      }

      // Send confirmation email
      await emailNotificationService.sendSubscriptionConfirmation(
        email,
        firstName || 'Subscriber',
        subscription.verificationToken!
      );

      res.json({ 
        message: 'Subscription request received. Please check your email to confirm.',
        requiresConfirmation: true 
      });

    } catch (error) {
      console.error('Subscribe error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Verify email subscription
  app.get('/api/subscriptions/verify', async (req: Request, res: Response) => {
    try {
      const { token } = req.query;
      
      if (!token || typeof token !== 'string') {
        return res.status(400).json({ message: 'Invalid verification token' });
      }

      const subscription = await storage.verifyEmailSubscription(token);
      if (!subscription) {
        return res.status(404).json({ message: 'Invalid or expired verification token' });
      }

      res.json({ 
        message: 'Email subscription confirmed successfully!',
        subscription: {
          email: subscription.email,
          status: subscription.status
        }
      });

    } catch (error) {
      console.error('Verify subscription error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Unsubscribe from email list
  app.post('/api/subscriptions/unsubscribe', async (req: Request, res: Response) => {
    try {
      const { token } = unsubscribeSchema.parse(req.body);

      await storage.unsubscribeEmail(token);

      res.json({ message: 'Successfully unsubscribed from emails' });

    } catch (error) {
      console.error('Unsubscribe error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get unsubscribe page (for email links)
  app.get('/api/subscriptions/unsubscribe', async (req: Request, res: Response) => {
    try {
      const { token } = req.query;
      
      if (!token || typeof token !== 'string') {
        return res.status(400).json({ message: 'Invalid token' });
      }

      // Get subscription details
      const subscription = await storage.getEmailSubscription(''); // This needs to be updated to get by token
      
      res.json({
        message: 'Click confirm to unsubscribe',
        token
      });

    } catch (error) {
      console.error('Get unsubscribe error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Update subscription preferences
  app.post('/api/subscriptions/preferences', async (req: Request, res: Response) => {
    try {
      const { email, preferences } = updatePreferencesSchema.parse(req.body);

      const subscription = await storage.updateSubscriptionPreferences(email, preferences);
      if (!subscription) {
        return res.status(404).json({ message: 'Subscription not found' });
      }

      res.json({ 
        message: 'Preferences updated successfully',
        preferences: subscription.preferences
      });

    } catch (error) {
      console.error('Update preferences error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get subscription status
  app.get('/api/subscriptions/status', async (req: Request, res: Response) => {
    try {
      const { email } = req.query;
      
      if (!email || typeof email !== 'string') {
        return res.status(400).json({ message: 'Email parameter required' });
      }

      const subscription = await storage.getEmailSubscription(email);
      if (!subscription) {
        return res.status(404).json({ message: 'Subscription not found' });
      }

      res.json({
        status: subscription.status,
        verified: subscription.verified,
        preferences: subscription.preferences,
        subscribedAt: subscription.subscriptionDate
      });

    } catch (error) {
      console.error('Get subscription status error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
}