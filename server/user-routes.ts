import type { Express, Request, Response } from 'express';
import { z } from 'zod';
import { storage } from './storage';
import { authenticateToken, requireAdmin } from './auth-routes';

// Enhanced request interface with user data
interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    isAdmin?: boolean;
  };
}

// Validation schemas for user profile updates
const updateUserProfileSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  phoneNumber: z.string().min(10).max(20).optional(),
  dateOfBirth: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
  avatarUrl: z.string().url().optional()
});

const updateUserPreferencesSchema = z.object({
  language: z.string().min(2).max(5).optional(),
  currency: z.string().length(3).optional(),
  timezone: z.string().optional(),
  emailNotifications: z.boolean().optional(),
  smsNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional()
});

const uploadAvatarSchema = z.object({
  avatarUrl: z.string().url(),
  fileName: z.string().optional()
});

// Authorization middleware for user resource access
const authorizeUserAccess = async (req: AuthenticatedRequest, res: Response, next: any) => {
  const { userId } = req.params;
  
  // Admin can access any user, regular users can only access their own profile
  if (req.user?.isAdmin || req.user?.userId === userId) {
    return next();
  }
  
  return res.status(403).json({ message: 'Access denied' });
};

export function setupUserRoutes(app: Express) {
  
  // GET /api/v1/users/{userId}
  app.get('/api/v1/users/:userId', authenticateToken, authorizeUserAccess, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId } = req.params;
      
      const userWithPreferences = await storage.getUserWithPreferences(userId);
      if (!userWithPreferences) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Remove sensitive fields
      const { 
        passwordHash, 
        twoFactorSecret, 
        emailVerificationToken, 
        phoneVerificationToken,
        lockoutUntil,
        ...safeUser 
      } = userWithPreferences;
      
      res.json({
        user: safeUser
      });
      
    } catch (error: any) {
      console.error('Get user profile error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // PUT /api/v1/users/{userId}
  app.put('/api/v1/users/:userId', authenticateToken, authorizeUserAccess, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId } = req.params;
      const updateData = updateUserProfileSchema.parse(req.body);
      
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Convert date string to Date object if provided
      const processedUpdateData: any = { ...updateData };
      if (updateData.dateOfBirth) {
        processedUpdateData.dateOfBirth = new Date(updateData.dateOfBirth);
      }
      
      const updatedUser = await storage.updateUser(userId, processedUpdateData);
      
      // Remove sensitive fields from response
      const { 
        passwordHash, 
        twoFactorSecret, 
        emailVerificationToken, 
        phoneVerificationToken,
        lockoutUntil,
        ...safeUser 
      } = updatedUser;
      
      res.json({
        message: 'Profile updated successfully',
        user: safeUser
      });
      
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Validation error', 
          errors: error.errors 
        });
      }
      
      console.error('Update user profile error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // DELETE /api/v1/users/{userId}
  app.delete('/api/v1/users/:userId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId } = req.params;
      
      // Only allow users to delete their own account, or admin to delete any account
      if (!req.user?.isAdmin && req.user?.userId !== userId) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Prevent deletion of admin accounts by non-admins
      if (existingUser.isAdmin && !req.user?.isAdmin) {
        return res.status(403).json({ message: 'Cannot delete admin account' });
      }
      
      // Clean up all user-related data
      await storage.deleteUserRefreshTokens(userId);
      await storage.deleteUserSessions(userId);
      
      // Soft delete approach - mark account as deleted instead of hard delete
      // This preserves data integrity for orders, reviews, etc.
      await storage.updateUser(userId, { 
        email: `deleted_${Date.now()}_${existingUser.email}`,
        username: `deleted_${Date.now()}_${existingUser.username}`,
        accountLocked: true
      });
      
      res.json({ 
        message: 'Account deleted successfully' 
      });
      
    } catch (error: any) {
      console.error('Delete user account error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // POST /api/v1/users/{userId}/avatar
  app.post('/api/v1/users/:userId/avatar', authenticateToken, authorizeUserAccess, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId } = req.params;
      const { avatarUrl, fileName } = uploadAvatarSchema.parse(req.body);
      
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Update user avatar
      const updatedUser = await storage.updateUser(userId, { 
        avatarUrl 
      });
      
      res.json({
        message: 'Avatar updated successfully',
        avatarUrl: updatedUser.avatarUrl,
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          username: updatedUser.username,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          avatarUrl: updatedUser.avatarUrl
        }
      });
      
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Validation error', 
          errors: error.errors 
        });
      }
      
      console.error('Upload avatar error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // GET /api/v1/users/{userId}/preferences
  app.get('/api/v1/users/:userId/preferences', authenticateToken, authorizeUserAccess, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId } = req.params;
      
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      let preferences = await storage.getUserPreferences(userId);
      
      // Create default preferences if they don't exist
      if (!preferences) {
        preferences = await storage.createUserPreferences({
          userId,
          language: 'en',
          currency: 'USD',
          timezone: 'UTC',
          emailNotifications: true,
          smsNotifications: false,
          pushNotifications: true
        });
      }
      
      res.json({
        preferences
      });
      
    } catch (error: any) {
      console.error('Get user preferences error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // PUT /api/v1/users/{userId}/preferences
  app.put('/api/v1/users/:userId/preferences', authenticateToken, authorizeUserAccess, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId } = req.params;
      const updateData = updateUserPreferencesSchema.parse(req.body);
      
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      let preferences = await storage.getUserPreferences(userId);
      
      if (!preferences) {
        // Create new preferences if they don't exist
        preferences = await storage.createUserPreferences({
          userId,
          language: updateData.language || 'en',
          currency: updateData.currency || 'USD',
          timezone: updateData.timezone || 'UTC',
          emailNotifications: updateData.emailNotifications ?? true,
          smsNotifications: updateData.smsNotifications ?? false,
          pushNotifications: updateData.pushNotifications ?? true
        });
      } else {
        // Update existing preferences
        preferences = await storage.updateUserPreferences(userId, updateData);
      }
      
      res.json({
        message: 'Preferences updated successfully',
        preferences
      });
      
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Validation error', 
          errors: error.errors 
        });
      }
      
      console.error('Update user preferences error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // Admin-only routes
  
  // GET /api/v1/admin/users - List all users (admin only)
  app.get('/api/v1/admin/users', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { 
        page = '1', 
        limit = '20', 
        search, 
        status 
      } = req.query as Record<string, string>;
      
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const offset = (pageNum - 1) * limitNum;
      
      // This would need to be implemented in storage layer
      // For now, return a simple response
      res.json({
        message: 'User listing endpoint - to be implemented',
        pagination: {
          page: pageNum,
          limit: limitNum,
          offset
        },
        filters: {
          search,
          status
        }
      });
      
    } catch (error: any) {
      console.error('Admin list users error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // PUT /api/v1/admin/users/{userId}/status - Update user status (admin only)
  app.put('/api/v1/admin/users/:userId/status', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { status, reason } = req.body;
      
      const validStatuses = ['active', 'suspended', 'locked', 'deleted'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ 
          message: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
        });
      }
      
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Update user status based on the status type
      let updateData: any = {};
      
      switch (status) {
        case 'locked':
          updateData = {
            accountLocked: true,
            lockoutUntil: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
          };
          break;
        case 'active':
          updateData = {
            accountLocked: false,
            lockoutUntil: null,
            loginAttempts: 0
          };
          break;
        case 'suspended':
        case 'deleted':
          updateData = {
            accountLocked: true
          };
          break;
      }
      
      await storage.updateUser(userId, updateData);
      
      res.json({
        message: `User status updated to ${status}`,
        status,
        reason,
        updatedAt: new Date()
      });
      
    } catch (error: any) {
      console.error('Admin update user status error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
}