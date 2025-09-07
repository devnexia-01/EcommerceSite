import type { Express, Request, Response } from 'express';
import { z } from 'zod';
import { adminStorage } from './admin-storage';
import { storage } from './storage';
import { authenticateToken, requireAdmin } from './auth-routes';
import { 
  createAdminUserSchema,
  updateUserStatusSchema,
  bulkUserOperationSchema,
  systemConfigUpdateSchema,
  insertAdminRoleSchema,
  insertContentSchema,
  insertMediaSchema
} from '@shared/schema';

// Enhanced request interface with user data
interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    isAdmin?: boolean;
  };
}

// Rate limiting storage (in production use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Rate limiting middleware
const rateLimit = (maxAttempts: number, windowMinutes: number) => {
  return (req: Request, res: Response, next: any) => {
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    
    if (!rateLimitStore.has(key)) {
      rateLimitStore.set(key, { count: 1, resetTime: now + windowMinutes * 60000 });
      return next();
    }
    
    const record = rateLimitStore.get(key)!;
    
    if (now > record.resetTime) {
      record.count = 1;
      record.resetTime = now + windowMinutes * 60000;
      return next();
    }
    
    if (record.count >= maxAttempts) {
      return res.status(429).json({ 
        message: 'Too many attempts. Please try again later.',
        retryAfter: Math.ceil((record.resetTime - now) / 1000)
      });
    }
    
    record.count++;
    next();
  };
};

// Helper function to create audit log
async function createAuditLog(req: AuthenticatedRequest, action: string, resource: string, resourceId?: string, changes?: any) {
  await adminStorage.createAuditLog({
    action,
    resource,
    resourceId,
    actorId: req.user?.userId,
    actorType: 'admin',
    actorName: req.user?.email,
    changes,
    context: {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      sessionId: req.sessionID
    },
    severity: 'medium'
  });
}

export function setupAdminRoutes(app: Express) {
  
  // ============= DASHBOARD & ANALYTICS =============
  
  // GET /api/v1/admin/dashboard/overview
  app.get('/api/v1/admin/dashboard/overview', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const overview = await adminStorage.getDashboardOverview();
      res.json({
        success: true,
        data: overview
      });
    } catch (error: any) {
      console.error('Dashboard overview error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch dashboard overview' 
      });
    }
  });

  // GET /api/v1/admin/dashboard/user-metrics
  app.get('/api/v1/admin/dashboard/user-metrics', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { startDate, endDate } = req.query;
      const metrics = await adminStorage.getUserMetrics({
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined
      });
      res.json({
        success: true,
        data: metrics
      });
    } catch (error: any) {
      console.error('User metrics error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch user metrics' 
      });
    }
  });

  // GET /api/v1/admin/dashboard/content-metrics
  app.get('/api/v1/admin/dashboard/content-metrics', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const metrics = await adminStorage.getContentMetrics();
      res.json({
        success: true,
        data: metrics
      });
    } catch (error: any) {
      console.error('Content metrics error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch content metrics' 
      });
    }
  });

  // GET /api/v1/admin/dashboard/system-health
  app.get('/api/v1/admin/dashboard/system-health', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const health = await adminStorage.getSystemHealth();
      res.json({
        success: true,
        data: health
      });
    } catch (error: any) {
      console.error('System health error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch system health' 
      });
    }
  });

  // ============= USER MANAGEMENT =============
  
  // GET /api/v1/admin/users
  app.get('/api/v1/admin/users', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { 
        search, 
        status, 
        sortBy = 'createdAt', 
        sortOrder = 'desc', 
        limit = '50', 
        offset = '0' 
      } = req.query;

      const result = await adminStorage.getAllUsers({
        search: search as string,
        status: status as string,
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });

      res.json({
        success: true,
        data: result.users,
        meta: {
          total: result.total,
          page: Math.floor(parseInt(offset as string) / parseInt(limit as string)) + 1,
          limit: parseInt(limit as string),
          totalPages: Math.ceil(result.total / parseInt(limit as string))
        }
      });
    } catch (error: any) {
      console.error('Get users error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch users' 
      });
    }
  });

  // GET /api/v1/admin/users/:userId
  app.get('/api/v1/admin/users/:userId', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = await storage.getUser(req.params.userId);
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: 'User not found' 
        });
      }

      // Remove sensitive data
      const { passwordHash, twoFactorSecret, emailVerificationToken, phoneVerificationToken, ...safeUser } = user;
      
      res.json({
        success: true,
        data: safeUser
      });
    } catch (error: any) {
      console.error('Get user error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch user' 
      });
    }
  });

  // POST /api/v1/admin/users
  app.post('/api/v1/admin/users', authenticateToken, requireAdmin, rateLimit(10, 60), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userData = createAdminUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email) || 
                          await storage.getUserByUsername(userData.username);
      
      if (existingUser) {
        return res.status(409).json({ 
          success: false,
          message: 'User with this email or username already exists' 
        });
      }
      
      // Create user
      const user = await storage.createUser({
        ...userData,
        passwordHash: userData.password,
        isAdmin: true
      } as any);
      
      // Create admin user record
      await adminStorage.createAdminUser(user.id, {
        userId: user.id,
        roles: userData.roles,
        permissions: userData.permissions
      });

      await createAuditLog(req, 'create_admin_user', 'users', user.id, {
        after: { email: user.email, username: user.username, roles: userData.roles }
      });
      
      // Remove sensitive data
      const { passwordHash, twoFactorSecret, emailVerificationToken, phoneVerificationToken, ...safeUser } = user;
      
      res.status(201).json({
        success: true,
        data: safeUser,
        message: 'Admin user created successfully'
      });
      
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          success: false,
          message: 'Validation error', 
          errors: error.errors 
        });
      }
      
      console.error('Create admin user error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to create admin user' 
      });
    }
  });

  // PUT /api/v1/admin/users/:userId
  app.put('/api/v1/admin/users/:userId', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.params.userId;
      const updateData = req.body;

      // Get original user for audit log
      const originalUser = await storage.getUser(userId);
      if (!originalUser) {
        return res.status(404).json({ 
          success: false, 
          message: 'User not found' 
        });
      }

      const updatedUser = await storage.updateUser(userId, updateData);

      await createAuditLog(req, 'update_user', 'users', userId, {
        before: originalUser,
        after: updatedUser
      });

      // Remove sensitive data
      const { passwordHash, twoFactorSecret, emailVerificationToken, phoneVerificationToken, ...safeUser } = updatedUser;
      
      res.json({
        success: true,
        data: safeUser,
        message: 'User updated successfully'
      });
    } catch (error: any) {
      console.error('Update user error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to update user' 
      });
    }
  });

  // DELETE /api/v1/admin/users/:userId
  app.delete('/api/v1/admin/users/:userId', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.params.userId;

      // Prevent self-deletion
      if (userId === req.user?.userId) {
        return res.status(400).json({ 
          success: false, 
          message: 'Cannot delete your own account' 
        });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: 'User not found' 
        });
      }

      // Delete admin user record first if exists
      await adminStorage.deleteAdminUser(userId);
      
      // Note: We're not actually deleting the user record to preserve data integrity
      // Instead, we're marking them as banned/suspended
      await adminStorage.banUser(userId, 'Account deleted by admin', req.user?.userId);

      await createAuditLog(req, 'delete_user', 'users', userId, {
        before: { email: user.email, username: user.username, status: 'active' },
        after: { status: 'deleted' }
      });

      res.json({
        success: true,
        message: 'User deleted successfully'
      });
    } catch (error: any) {
      console.error('Delete user error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to delete user' 
      });
    }
  });

  // POST /api/v1/admin/users/:userId/suspend
  app.post('/api/v1/admin/users/:userId/suspend', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.params.userId;
      const { reason } = req.body;

      if (userId === req.user?.userId) {
        return res.status(400).json({ 
          success: false, 
          message: 'Cannot suspend your own account' 
        });
      }

      const user = await adminStorage.suspendUser(userId, reason, req.user?.userId);
      
      // Remove sensitive data
      const { passwordHash, twoFactorSecret, emailVerificationToken, phoneVerificationToken, ...safeUser } = user;
      
      res.json({
        success: true,
        data: safeUser,
        message: 'User suspended successfully'
      });
    } catch (error: any) {
      console.error('Suspend user error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to suspend user' 
      });
    }
  });

  // POST /api/v1/admin/users/:userId/unsuspend
  app.post('/api/v1/admin/users/:userId/unsuspend', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.params.userId;
      const user = await adminStorage.unsuspendUser(userId);

      await createAuditLog(req, 'unsuspend_user', 'users', userId, {
        before: { suspended: true },
        after: { suspended: false }
      });
      
      // Remove sensitive data
      const { passwordHash, twoFactorSecret, emailVerificationToken, phoneVerificationToken, ...safeUser } = user;
      
      res.json({
        success: true,
        data: safeUser,
        message: 'User unsuspended successfully'
      });
    } catch (error: any) {
      console.error('Unsuspend user error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to unsuspend user' 
      });
    }
  });

  // POST /api/v1/admin/users/:userId/reset-password
  app.post('/api/v1/admin/users/:userId/reset-password', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.params.userId;
      const { password } = req.body;

      if (!password || password.length < 8) {
        return res.status(400).json({ 
          success: false, 
          message: 'Password must be at least 8 characters long' 
        });
      }

      await adminStorage.resetUserPassword(userId, password);

      await createAuditLog(req, 'reset_password', 'users', userId, {
        action: 'password_reset_by_admin'
      });

      res.json({
        success: true,
        message: 'Password reset successfully'
      });
    } catch (error: any) {
      console.error('Reset password error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to reset password' 
      });
    }
  });

  // GET /api/v1/admin/users/:userId/activity
  app.get('/api/v1/admin/users/:userId/activity', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.params.userId;
      // For now, return empty array as we haven't implemented user activity tracking yet
      res.json({
        success: true,
        data: []
      });
    } catch (error: any) {
      console.error('Get user activity error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch user activity' 
      });
    }
  });

  // GET /api/v1/admin/users/:userId/sessions
  app.get('/api/v1/admin/users/:userId/sessions', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.params.userId;
      // For now, return empty array as we need to implement session tracking
      res.json({
        success: true,
        data: []
      });
    } catch (error: any) {
      console.error('Get user sessions error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch user sessions' 
      });
    }
  });

  // ============= ROLES & PERMISSIONS =============
  
  // GET /api/v1/admin/roles
  app.get('/api/v1/admin/roles', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const roles = await adminStorage.getRoles();
      res.json({
        success: true,
        data: roles
      });
    } catch (error: any) {
      console.error('Get roles error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch roles' 
      });
    }
  });

  // POST /api/v1/admin/roles
  app.post('/api/v1/admin/roles', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const roleData = insertAdminRoleSchema.parse(req.body);
      const role = await adminStorage.createRole(roleData);

      await createAuditLog(req, 'create_role', 'roles', role.id, {
        after: roleData
      });

      res.status(201).json({
        success: true,
        data: role,
        message: 'Role created successfully'
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          success: false,
          message: 'Validation error', 
          errors: error.errors 
        });
      }
      
      console.error('Create role error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to create role' 
      });
    }
  });

  // PUT /api/v1/admin/roles/:roleId
  app.put('/api/v1/admin/roles/:roleId', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const roleId = req.params.roleId;
      const updateData = insertAdminRoleSchema.partial().parse(req.body);

      const originalRole = await adminStorage.getRole(roleId);
      if (!originalRole) {
        return res.status(404).json({ 
          success: false, 
          message: 'Role not found' 
        });
      }

      const updatedRole = await adminStorage.updateRole(roleId, updateData);

      await createAuditLog(req, 'update_role', 'roles', roleId, {
        before: originalRole,
        after: updatedRole
      });

      res.json({
        success: true,
        data: updatedRole,
        message: 'Role updated successfully'
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          success: false,
          message: 'Validation error', 
          errors: error.errors 
        });
      }
      
      console.error('Update role error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to update role' 
      });
    }
  });

  // DELETE /api/v1/admin/roles/:roleId
  app.delete('/api/v1/admin/roles/:roleId', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const roleId = req.params.roleId;

      const role = await adminStorage.getRole(roleId);
      if (!role) {
        return res.status(404).json({ 
          success: false, 
          message: 'Role not found' 
        });
      }

      if (role.isSystem) {
        return res.status(400).json({ 
          success: false, 
          message: 'Cannot delete system roles' 
        });
      }

      await adminStorage.deleteRole(roleId);

      await createAuditLog(req, 'delete_role', 'roles', roleId, {
        before: role
      });

      res.json({
        success: true,
        message: 'Role deleted successfully'
      });
    } catch (error: any) {
      console.error('Delete role error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to delete role' 
      });
    }
  });

  // GET /api/v1/admin/permissions
  app.get('/api/v1/admin/permissions', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const permissions = await adminStorage.getPermissions();
      res.json({
        success: true,
        data: permissions
      });
    } catch (error: any) {
      console.error('Get permissions error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch permissions' 
      });
    }
  });

  // ============= AUDIT LOGS =============
  
  // GET /api/v1/admin/audit/logs
  app.get('/api/v1/admin/audit/logs', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { 
        action, 
        resource, 
        actorId, 
        severity, 
        startDate, 
        endDate, 
        limit = '50', 
        offset = '0' 
      } = req.query;

      const result = await adminStorage.getAuditLogs({
        action: action as string,
        resource: resource as string,
        actorId: actorId as string,
        severity: severity as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });

      res.json({
        success: true,
        data: result.logs,
        meta: {
          total: result.total,
          page: Math.floor(parseInt(offset as string) / parseInt(limit as string)) + 1,
          limit: parseInt(limit as string),
          totalPages: Math.ceil(result.total / parseInt(limit as string))
        }
      });
    } catch (error: any) {
      console.error('Get audit logs error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch audit logs' 
      });
    }
  });

  // GET /api/v1/admin/audit/logs/:logId
  app.get('/api/v1/admin/audit/logs/:logId', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const log = await adminStorage.getAuditLog(req.params.logId);
      if (!log) {
        return res.status(404).json({ 
          success: false, 
          message: 'Audit log not found' 
        });
      }

      res.json({
        success: true,
        data: log
      });
    } catch (error: any) {
      console.error('Get audit log error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch audit log' 
      });
    }
  });

  // ============= SYSTEM CONFIGURATION =============
  
  // GET /api/v1/admin/config
  app.get('/api/v1/admin/config', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const config = await adminStorage.getSystemConfig();
      res.json({
        success: true,
        data: config
      });
    } catch (error: any) {
      console.error('Get config error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch system configuration' 
      });
    }
  });

  // PUT /api/v1/admin/config
  app.put('/api/v1/admin/config', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const updates = req.body;
      const results = [];

      for (const update of updates) {
        const { category, key, value, type, description, isPublic } = systemConfigUpdateSchema.parse(update);
        
        const original = await adminStorage.getSystemConfigByKey(category, key);
        const updated = await adminStorage.updateSystemConfig(category, key, value, req.user!.userId);
        
        await createAuditLog(req, 'update_config', 'system_config', updated.id, {
          before: original,
          after: { category, key, value, type }
        });

        results.push(updated);
      }

      res.json({
        success: true,
        data: results,
        message: 'Configuration updated successfully'
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          success: false,
          message: 'Validation error', 
          errors: error.errors 
        });
      }
      
      console.error('Update config error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to update configuration' 
      });
    }
  });

  // POST /api/v1/admin/config/cache/clear
  app.post('/api/v1/admin/config/cache/clear', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      await adminStorage.clearCache();

      await createAuditLog(req, 'clear_cache', 'system', undefined, {
        action: 'cache_cleared'
      });

      res.json({
        success: true,
        message: 'Cache cleared successfully'
      });
    } catch (error: any) {
      console.error('Clear cache error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to clear cache' 
      });
    }
  });

  // ============= CONTENT MANAGEMENT =============
  
  // GET /api/v1/admin/content
  app.get('/api/v1/admin/content', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { 
        type, 
        status, 
        search, 
        limit = '50', 
        offset = '0' 
      } = req.query;

      const result = await adminStorage.getContent({
        type: type as string,
        status: status as string,
        search: search as string,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });

      res.json({
        success: true,
        data: result.content,
        meta: {
          total: result.total,
          page: Math.floor(parseInt(offset as string) / parseInt(limit as string)) + 1,
          limit: parseInt(limit as string),
          totalPages: Math.ceil(result.total / parseInt(limit as string))
        }
      });
    } catch (error: any) {
      console.error('Get content error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch content' 
      });
    }
  });

  // POST /api/v1/admin/content
  app.post('/api/v1/admin/content', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const contentData = insertContentSchema.parse({
        ...req.body,
        authorId: req.user!.userId
      });
      
      const newContent = await adminStorage.createContent(contentData);

      await createAuditLog(req, 'create_content', 'content', newContent.id, {
        after: contentData
      });

      res.status(201).json({
        success: true,
        data: newContent,
        message: 'Content created successfully'
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          success: false,
          message: 'Validation error', 
          errors: error.errors 
        });
      }
      
      console.error('Create content error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to create content' 
      });
    }
  });

  // GET /api/v1/admin/content/:contentId
  app.get('/api/v1/admin/content/:contentId', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const content = await adminStorage.getContentById(req.params.contentId);
      if (!content) {
        return res.status(404).json({ 
          success: false, 
          message: 'Content not found' 
        });
      }

      res.json({
        success: true,
        data: content
      });
    } catch (error: any) {
      console.error('Get content error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch content' 
      });
    }
  });

  // PUT /api/v1/admin/content/:contentId
  app.put('/api/v1/admin/content/:contentId', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const contentId = req.params.contentId;
      const updateData = insertContentSchema.partial().parse(req.body);

      const originalContent = await adminStorage.getContentById(contentId);
      if (!originalContent) {
        return res.status(404).json({ 
          success: false, 
          message: 'Content not found' 
        });
      }

      const updatedContent = await adminStorage.updateContent(contentId, updateData);

      await createAuditLog(req, 'update_content', 'content', contentId, {
        before: originalContent,
        after: updatedContent
      });

      res.json({
        success: true,
        data: updatedContent,
        message: 'Content updated successfully'
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          success: false,
          message: 'Validation error', 
          errors: error.errors 
        });
      }
      
      console.error('Update content error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to update content' 
      });
    }
  });

  // DELETE /api/v1/admin/content/:contentId
  app.delete('/api/v1/admin/content/:contentId', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const contentId = req.params.contentId;

      const content = await adminStorage.getContentById(contentId);
      if (!content) {
        return res.status(404).json({ 
          success: false, 
          message: 'Content not found' 
        });
      }

      await adminStorage.deleteContent(contentId);

      await createAuditLog(req, 'delete_content', 'content', contentId, {
        before: content
      });

      res.json({
        success: true,
        message: 'Content deleted successfully'
      });
    } catch (error: any) {
      console.error('Delete content error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to delete content' 
      });
    }
  });

  // POST /api/v1/admin/content/:contentId/publish
  app.post('/api/v1/admin/content/:contentId/publish', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const contentId = req.params.contentId;
      const publishedContent = await adminStorage.publishContent(contentId);

      await createAuditLog(req, 'publish_content', 'content', contentId, {
        before: { status: 'draft' },
        after: { status: 'published' }
      });

      res.json({
        success: true,
        data: publishedContent,
        message: 'Content published successfully'
      });
    } catch (error: any) {
      console.error('Publish content error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to publish content' 
      });
    }
  });

  // POST /api/v1/admin/content/:contentId/unpublish
  app.post('/api/v1/admin/content/:contentId/unpublish', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const contentId = req.params.contentId;
      const unpublishedContent = await adminStorage.unpublishContent(contentId);

      await createAuditLog(req, 'unpublish_content', 'content', contentId, {
        before: { status: 'published' },
        after: { status: 'draft' }
      });

      res.json({
        success: true,
        data: unpublishedContent,
        message: 'Content unpublished successfully'
      });
    } catch (error: any) {
      console.error('Unpublish content error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to unpublish content' 
      });
    }
  });

  // ============= MEDIA MANAGEMENT =============
  
  // GET /api/v1/admin/media
  app.get('/api/v1/admin/media', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { 
        search, 
        mimeType, 
        limit = '50', 
        offset = '0' 
      } = req.query;

      const result = await adminStorage.getMedia({
        search: search as string,
        mimeType: mimeType as string,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });

      res.json({
        success: true,
        data: result.media,
        meta: {
          total: result.total,
          page: Math.floor(parseInt(offset as string) / parseInt(limit as string)) + 1,
          limit: parseInt(limit as string),
          totalPages: Math.ceil(result.total / parseInt(limit as string))
        }
      });
    } catch (error: any) {
      console.error('Get media error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch media' 
      });
    }
  });

  // POST /api/v1/admin/media/upload
  app.post('/api/v1/admin/media/upload', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      // This is a placeholder - actual file upload implementation would need multer or similar
      const mediaData = insertMediaSchema.parse({
        ...req.body,
        uploadedBy: req.user!.userId
      });
      
      const newMedia = await adminStorage.createMedia(mediaData);

      await createAuditLog(req, 'upload_media', 'media', newMedia.id, {
        after: { filename: mediaData.filename, size: mediaData.size }
      });

      res.status(201).json({
        success: true,
        data: newMedia,
        message: 'Media uploaded successfully'
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          success: false,
          message: 'Validation error', 
          errors: error.errors 
        });
      }
      
      console.error('Upload media error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to upload media' 
      });
    }
  });

  // DELETE /api/v1/admin/media/:mediaId
  app.delete('/api/v1/admin/media/:mediaId', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const mediaId = req.params.mediaId;

      const media = await adminStorage.getMediaById(mediaId);
      if (!media) {
        return res.status(404).json({ 
          success: false, 
          message: 'Media not found' 
        });
      }

      await adminStorage.deleteMedia(mediaId);

      await createAuditLog(req, 'delete_media', 'media', mediaId, {
        before: { filename: media.filename, size: media.size }
      });

      res.json({
        success: true,
        message: 'Media deleted successfully'
      });
    } catch (error: any) {
      console.error('Delete media error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to delete media' 
      });
    }
  });

  // GET /api/v1/admin/media/storage-usage
  app.get('/api/v1/admin/media/storage-usage', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const usage = await adminStorage.getStorageUsage();
      res.json({
        success: true,
        data: usage
      });
    } catch (error: any) {
      console.error('Get storage usage error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch storage usage' 
      });
    }
  });

  // ============= SECURITY MONITORING =============
  
  // GET /api/v1/admin/security/threats
  app.get('/api/v1/admin/security/threats', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { 
        type, 
        severity, 
        resolved, 
        limit = '50', 
        offset = '0' 
      } = req.query;

      const result = await adminStorage.getSecurityLogs({
        type: type as string,
        severity: severity as string,
        resolved: resolved === 'true',
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });

      res.json({
        success: true,
        data: result.logs,
        meta: {
          total: result.total,
          page: Math.floor(parseInt(offset as string) / parseInt(limit as string)) + 1,
          limit: parseInt(limit as string),
          totalPages: Math.ceil(result.total / parseInt(limit as string))
        }
      });
    } catch (error: any) {
      console.error('Get security threats error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch security threats' 
      });
    }
  });

  // GET /api/v1/admin/security/failed-logins
  app.get('/api/v1/admin/security/failed-logins', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { 
        startDate, 
        endDate, 
        limit = '50', 
        offset = '0' 
      } = req.query;

      const result = await adminStorage.getFailedLogins({
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });

      res.json({
        success: true,
        data: result.logs,
        meta: {
          total: result.total,
          page: Math.floor(parseInt(offset as string) / parseInt(limit as string)) + 1,
          limit: parseInt(limit as string),
          totalPages: Math.ceil(result.total / parseInt(limit as string))
        }
      });
    } catch (error: any) {
      console.error('Get failed logins error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch failed logins' 
      });
    }
  });

  // POST /api/v1/admin/security/ip-blacklist
  app.post('/api/v1/admin/security/ip-blacklist', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { ipAddress, reason } = req.body;

      if (!ipAddress) {
        return res.status(400).json({ 
          success: false, 
          message: 'IP address is required' 
        });
      }

      const blacklistEntry = await adminStorage.addToIpBlacklist(ipAddress, reason, req.user!.userId);

      await createAuditLog(req, 'blacklist_ip', 'security', blacklistEntry.id, {
        after: { ipAddress, reason }
      });

      res.status(201).json({
        success: true,
        data: blacklistEntry,
        message: 'IP address blacklisted successfully'
      });
    } catch (error: any) {
      console.error('Blacklist IP error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to blacklist IP address' 
      });
    }
  });

  // DELETE /api/v1/admin/security/ip-blacklist/:ip
  app.delete('/api/v1/admin/security/ip-blacklist/:ip', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const ipAddress = req.params.ip;
      await adminStorage.removeFromIpBlacklist(ipAddress);

      await createAuditLog(req, 'remove_ip_blacklist', 'security', undefined, {
        before: { ipAddress }
      });

      res.json({
        success: true,
        message: 'IP address removed from blacklist successfully'
      });
    } catch (error: any) {
      console.error('Remove IP blacklist error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to remove IP from blacklist' 
      });
    }
  });

  // ============= SYSTEM OPERATIONS =============
  
  // GET /api/v1/admin/system/status
  app.get('/api/v1/admin/system/status', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const health = await adminStorage.getSystemHealth();
      res.json({
        success: true,
        data: {
          status: 'healthy',
          uptime: health.serverUptime,
          memory: health.memoryUsage,
          database: 'connected',
          timestamp: new Date()
        }
      });
    } catch (error: any) {
      console.error('Get system status error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch system status' 
      });
    }
  });

  // GET /api/v1/admin/system/logs
  app.get('/api/v1/admin/system/logs', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { 
        level, 
        startDate, 
        endDate, 
        limit = '100', 
        offset = '0' 
      } = req.query;

      const logs = await adminStorage.getSystemLogs({
        level: level as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });

      res.json({
        success: true,
        data: logs
      });
    } catch (error: any) {
      console.error('Get system logs error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch system logs' 
      });
    }
  });

  // GET /api/v1/admin/system/backups
  app.get('/api/v1/admin/system/backups', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const backups = await adminStorage.getBackups();
      res.json({
        success: true,
        data: backups
      });
    } catch (error: any) {
      console.error('Get backups error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch backups' 
      });
    }
  });

  // POST /api/v1/admin/system/backups
  app.post('/api/v1/admin/system/backups', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { type = 'full' } = req.body;
      
      const backup = await adminStorage.createBackup(type, req.user!.userId);

      await createAuditLog(req, 'create_backup', 'system', backup.id, {
        after: { type }
      });

      res.status(201).json({
        success: true,
        data: backup,
        message: 'Backup initiated successfully'
      });
    } catch (error: any) {
      console.error('Create backup error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to create backup' 
      });
    }
  });

}