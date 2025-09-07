import { Request, Response, NextFunction } from 'express';
import { adminStorage } from './admin-storage';
import { AuthenticatedRequest } from './auth';

interface ActivityData {
  action: string;
  resource: string;
  resourceId?: string;
  method: string;
  path: string;
  userAgent?: string;
  ipAddress?: string;
  metadata?: Record<string, any>;
}

// Middleware to track user activity
export const trackActivity = (action?: string, resource?: string) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      if (!user) {
        return next();
      }

      const activityData: ActivityData = {
        action: action || inferActionFromMethod(req.method),
        resource: resource || inferResourceFromPath(req.path),
        resourceId: req.params.id || req.params.userId || req.params.contentId,
        method: req.method,
        path: req.path,
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip || req.connection.remoteAddress,
        metadata: {
          query: req.query,
          body: sanitizeRequestBody(req.body)
        }
      };

      // Track activity after response is sent
      res.on('finish', async () => {
        try {
          await adminStorage.createAuditLog({
            action: activityData.action,
            resource: activityData.resource,
            resourceId: activityData.resourceId,
            actorId: user.userId,
            actorName: user.username || user.email,
            actorType: user.isAdmin ? 'admin' : 'user',
            context: {
              method: activityData.method,
              path: activityData.path,
              userAgent: activityData.userAgent,
              ipAddress: activityData.ipAddress,
              statusCode: res.statusCode,
              metadata: activityData.metadata
            },
            severity: determineSeverity(activityData.action, res.statusCode),
            outcome: res.statusCode < 400 ? 'success' : 'failure'
          });
        } catch (error) {
          console.error('Failed to track activity:', error);
        }
      });

      next();
    } catch (error) {
      console.error('Activity tracker error:', error);
      next();
    }
  };
};

// Security monitoring middleware
export const securityMonitor = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const suspiciousPatterns = [
      { pattern: /\/api\/.*\/\.\./i, type: 'path_traversal', severity: 'high' },
      { pattern: /<script|javascript:|on\w+=/i, type: 'xss_attempt', severity: 'medium' },
      { pattern: /union\s+select|drop\s+table|delete\s+from/i, type: 'sql_injection', severity: 'high' },
      { pattern: /\.\.\//i, type: 'directory_traversal', severity: 'medium' }
    ];

    const url = req.originalUrl || req.url;
    const body = JSON.stringify(req.body);
    const query = JSON.stringify(req.query);
    const userAgent = req.get('User-Agent') || '';

    for (const { pattern, type, severity } of suspiciousPatterns) {
      if (pattern.test(url) || pattern.test(body) || pattern.test(query) || pattern.test(userAgent)) {
        await adminStorage.createSecurityLog({
          type,
          severity,
          description: `Suspicious ${type} detected`,
          context: {
            url,
            method: req.method,
            userAgent,
            ipAddress: req.ip || req.connection.remoteAddress,
            userId: req.user?.userId,
            body: sanitizeRequestBody(req.body),
            query: req.query
          },
          resolved: false
        });

        // Log high severity threats immediately
        if (severity === 'high') {
          console.warn(`SECURITY THREAT: ${type} detected from ${req.ip} - ${url}`);
        }
      }
    }

    next();
  } catch (error) {
    console.error('Security monitor error:', error);
    next();
  }
};

// Rate limiting monitor
export const rateLimitMonitor = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    if (res.statusCode === 429) {
      // Rate limit exceeded
      adminStorage.createSecurityLog({
        type: 'rate_limit_exceeded',
        severity: 'medium',
        description: 'Rate limit exceeded',
        context: {
          url: req.originalUrl,
          method: req.method,
          userAgent: req.get('User-Agent'),
          ipAddress: req.ip || req.connection.remoteAddress,
          userId: req.user?.userId
        },
        resolved: false
      }).catch(error => console.error('Failed to log rate limit:', error));
    }
    
    return originalSend.call(this, data);
  };
  
  next();
};

// Failed login monitor
export const loginAttemptMonitor = async (req: Request, res: Response, next: NextFunction) => {
  const originalJson = res.json;
  
  res.json = function(data) {
    if (req.path === '/api/v1/auth/login') {
      if (res.statusCode === 401) {
        // Failed login attempt
        adminStorage.createSecurityLog({
          type: 'failed_login',
          severity: 'low',
          description: 'Failed login attempt',
          context: {
            email: req.body.email,
            userAgent: req.get('User-Agent'),
            ipAddress: req.ip || req.connection.remoteAddress,
            timestamp: new Date()
          },
          resolved: false
        }).catch(error => console.error('Failed to log login attempt:', error));
      } else if (res.statusCode === 200) {
        // Successful login
        adminStorage.createSecurityLog({
          type: 'login_success',
          severity: 'info',
          description: 'Successful login',
          context: {
            email: req.body.email,
            userAgent: req.get('User-Agent'),
            ipAddress: req.ip || req.connection.remoteAddress,
            userId: (data as any)?.user?.id,
            timestamp: new Date()
          },
          resolved: true
        }).catch(error => console.error('Failed to log login success:', error));
      }
    }
    
    return originalJson.call(this, data);
  };
  
  next();
};

// Helper functions
function inferActionFromMethod(method: string): string {
  switch (method.toUpperCase()) {
    case 'GET': return 'read';
    case 'POST': return 'create';
    case 'PUT': 
    case 'PATCH': return 'update';
    case 'DELETE': return 'delete';
    default: return 'unknown';
  }
}

function inferResourceFromPath(path: string): string {
  const segments = path.split('/').filter(Boolean);
  if (segments.length > 2) {
    return segments[2]; // Usually /api/v1/resource
  }
  return 'unknown';
}

function sanitizeRequestBody(body: any): any {
  if (!body || typeof body !== 'object') return body;
  
  const sanitized = { ...body };
  const sensitiveFields = ['password', 'passwordHash', 'token', 'secret', 'key', 'apiKey'];
  
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  return sanitized;
}

function determineSeverity(action: string, statusCode: number): string {
  if (statusCode >= 500) return 'high';
  if (statusCode >= 400) return 'medium';
  if (['delete', 'ban', 'suspend'].includes(action)) return 'medium';
  return 'low';
}

// Real-time system metrics collector
export class SystemMetricsCollector {
  private static instance: SystemMetricsCollector;
  private metrics: Map<string, any> = new Map();
  private intervalId?: NodeJS.Timeout;

  static getInstance(): SystemMetricsCollector {
    if (!SystemMetricsCollector.instance) {
      SystemMetricsCollector.instance = new SystemMetricsCollector();
    }
    return SystemMetricsCollector.instance;
  }

  start() {
    // Collect metrics every 30 seconds
    this.intervalId = setInterval(() => {
      this.collectMetrics();
    }, 30000);
    
    // Initial collection
    this.collectMetrics();
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  private collectMetrics() {
    try {
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      this.metrics.set('timestamp', new Date());
      this.metrics.set('memoryUsage', {
        rss: memoryUsage.rss / 1024 / 1024, // MB
        heapUsed: memoryUsage.heapUsed / 1024 / 1024, // MB
        heapTotal: memoryUsage.heapTotal / 1024 / 1024, // MB
        external: memoryUsage.external / 1024 / 1024 // MB
      });
      this.metrics.set('cpuUsage', {
        user: cpuUsage.user,
        system: cpuUsage.system
      });
      this.metrics.set('uptime', process.uptime());
      this.metrics.set('nodeVersion', process.version);
      this.metrics.set('platform', process.platform);
    } catch (error) {
      console.error('Failed to collect system metrics:', error);
    }
  }

  getMetrics() {
    return Object.fromEntries(this.metrics);
  }

  getHealthStatus() {
    const memory = this.metrics.get('memoryUsage');
    const uptime = this.metrics.get('uptime');
    
    const status = {
      status: 'healthy',
      checks: {
        memory: memory?.heapUsed < 512 ? 'healthy' : 'warning', // 512MB threshold
        uptime: uptime > 0 ? 'healthy' : 'unhealthy',
        database: 'healthy' // Would check actual DB connection
      }
    };

    if (Object.values(status.checks).some(check => check === 'unhealthy')) {
      status.status = 'unhealthy';
    } else if (Object.values(status.checks).some(check => check === 'warning')) {
      status.status = 'warning';
    }

    return status;
  }
}