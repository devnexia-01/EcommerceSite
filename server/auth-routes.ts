import type { Express, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { storage } from './storage';
import { AuthUtils } from './auth-utils';
import { emailNotificationService } from './email-service';
import { 
  registerSchema, 
  loginSchema, 
  forgotPasswordSchema, 
  resetPasswordSchema,
  verifyEmailSchema,
  enable2FASchema
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
  return (req: Request, res: Response, next: NextFunction) => {
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

// JWT Authentication middleware
const authenticateToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  
  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }
  
  const payload = AuthUtils.verifyAccessToken(token);
  if (!payload) {
    return res.status(403).json({ message: 'Invalid or expired access token' });
  }
  
  // Verify user still exists and is not locked
  const user = await storage.getUser(payload.userId);
  if (!user) {
    return res.status(403).json({ message: 'User not found' });
  }
  
  if (user.accountLocked && user.lockoutUntil && new Date() < user.lockoutUntil) {
    return res.status(423).json({ 
      message: 'Account is locked',
      lockoutUntil: user.lockoutUntil 
    });
  }
  
  req.user = payload;
  next();
};

// Admin middleware
const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

export function setupAuthRoutes(app: Express) {
  
  // POST /api/v1/auth/register
  app.post('/api/v1/auth/register', rateLimit(5, 15), async (req: Request, res: Response) => {
    try {
      const userData = registerSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email) || 
                          await storage.getUserByUsername(userData.username);
      
      if (existingUser) {
        return res.status(409).json({ 
          message: 'User with this email or username already exists' 
        });
      }
      
      // Create user
      const user = await storage.createUser({
        ...userData,
        passwordHash: userData.password
      } as any);
      
      // Create default user preferences
      await storage.createUserPreferences({
        userId: user.id,
        language: 'en',
        currency: 'USD',
        timezone: 'UTC',
        emailNotifications: true,
        smsNotifications: false,
        pushNotifications: true
      });
      
      // Generate email verification token
      const verificationToken = AuthUtils.generateEmailVerificationToken();
      await storage.setEmailVerificationToken(user.id, verificationToken);
      
      // TODO: Send verification email here
      // await emailService.sendVerificationEmail(user.email, verificationToken);
      
      // Generate tokens
      const accessToken = AuthUtils.generateAccessToken({
        userId: user.id,
        email: user.email,
        isAdmin: user.isAdmin
      });
      
      const refreshTokenId = nanoid();
      const refreshToken = AuthUtils.generateRefreshToken({
        userId: user.id,
        tokenId: refreshTokenId
      });
      
      // Store refresh token
      await storage.createRefreshToken({
        userId: user.id,
        token: refreshToken,
        expiresAt: AuthUtils.getRefreshTokenExpiration(),
        deviceInfo: AuthUtils.extractDeviceInfo(req.headers['user-agent']),
        ipAddress: req.ip
      });
      
      res.status(201).json({
        message: 'User registered successfully. Please verify your email.',
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          emailVerified: user.emailVerified
        },
        tokens: {
          accessToken,
          refreshToken
        }
      });
      
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Validation error', 
          errors: error.errors 
        });
      }
      
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // POST /api/v1/auth/login
  app.post('/api/v1/auth/login', rateLimit(10, 15), async (req: Request, res: Response) => {
    try {
      const { email, password, twoFactorCode } = loginSchema.parse(req.body);
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        await storage.incrementLoginAttempts(email); // Still track for potential attacks
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      // Check if account is locked
      if (user.accountLocked && user.lockoutUntil && new Date() < user.lockoutUntil) {
        return res.status(423).json({ 
          message: 'Account is locked due to too many failed login attempts',
          lockoutUntil: user.lockoutUntil
        });
      }
      
      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        await storage.incrementLoginAttempts(email);
        
        // Lock account after 5 failed attempts
        if ((user.loginAttempts || 0) >= 4) {
          await storage.lockAccount(email, 30); // 30 minutes lockout
          return res.status(423).json({ 
            message: 'Account locked due to too many failed login attempts' 
          });
        }
        
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      // Check 2FA if enabled
      if (user.twoFactorEnabled && user.twoFactorSecret) {
        if (!twoFactorCode) {
          return res.status(200).json({ 
            message: 'Two-factor authentication required',
            requires2FA: true
          });
        }
        
        const is2FAValid = AuthUtils.verify2FAToken(twoFactorCode, user.twoFactorSecret);
        if (!is2FAValid) {
          await storage.incrementLoginAttempts(email);
          return res.status(401).json({ message: 'Invalid two-factor authentication code' });
        }
      }
      
      // Reset login attempts on successful login
      await storage.resetLoginAttempts(email);
      
      // Update last login
      await storage.updateUser(user.id, { lastLoginAt: new Date() } as any);
      
      // Send security alert for successful login (optional, based on user preferences)
      try {
        await emailNotificationService.notifySecurityAlert(
          user.id,
          `Successful login from ${req.ip || 'unknown IP'} at ${new Date().toLocaleString()}`
        );
      } catch (emailError) {
        console.error('Failed to send login security alert:', emailError);
        // Don't fail login if email fails
      }
      
      // Generate tokens
      const accessToken = AuthUtils.generateAccessToken({
        userId: user.id,
        email: user.email,
        isAdmin: user.isAdmin
      });
      
      const refreshTokenId = nanoid();
      const refreshToken = AuthUtils.generateRefreshToken({
        userId: user.id,
        tokenId: refreshTokenId
      });
      
      // Store refresh token
      await storage.createRefreshToken({
        userId: user.id,
        token: refreshToken,
        expiresAt: AuthUtils.getRefreshTokenExpiration(),
        deviceInfo: AuthUtils.extractDeviceInfo(req.headers['user-agent']),
        ipAddress: req.ip
      });
      
      // Create login session
      const sessionToken = AuthUtils.generateSessionToken();
      await storage.createLoginSession({
        userId: user.id,
        sessionToken,
        deviceInfo: AuthUtils.extractDeviceInfo(req.headers['user-agent']),
        ipAddress: req.ip,
        expiresAt: AuthUtils.getSessionExpiration()
      });
      
      res.json({
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          isAdmin: user.isAdmin,
          emailVerified: user.emailVerified,
          twoFactorEnabled: user.twoFactorEnabled
        },
        tokens: {
          accessToken,
          refreshToken
        },
        sessionToken
      });
      
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Validation error', 
          errors: error.errors 
        });
      }
      
      console.error('Login error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // POST /api/v1/auth/logout
  app.post('/api/v1/auth/logout', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { refreshToken, sessionToken } = req.body;
      
      if (refreshToken) {
        await storage.deleteRefreshToken(refreshToken);
      }
      
      if (sessionToken) {
        await storage.deleteLoginSession(sessionToken);
      }
      
      res.json({ message: 'Logout successful' });
      
    } catch (error: any) {
      console.error('Logout error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // POST /api/v1/auth/refresh
  app.post('/api/v1/auth/refresh', rateLimit(20, 15), async (req: Request, res: Response) => {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return res.status(401).json({ message: 'Refresh token required' });
      }
      
      // Verify refresh token
      const payload = AuthUtils.verifyRefreshToken(refreshToken);
      if (!payload) {
        return res.status(403).json({ message: 'Invalid refresh token' });
      }
      
      // Check if refresh token exists in database
      const storedToken = await storage.getRefreshToken(refreshToken);
      if (!storedToken) {
        return res.status(403).json({ message: 'Refresh token not found' });
      }
      
      // Get user
      const user = await storage.getUser(payload.userId);
      if (!user) {
        return res.status(403).json({ message: 'User not found' });
      }
      
      // Generate new tokens
      const newAccessToken = AuthUtils.generateAccessToken({
        userId: user.id,
        email: user.email,
        isAdmin: user.isAdmin
      });
      
      const newRefreshTokenId = nanoid();
      const newRefreshToken = AuthUtils.generateRefreshToken({
        userId: user.id,
        tokenId: newRefreshTokenId
      });
      
      // Delete old refresh token and create new one (token rotation)
      await storage.deleteRefreshToken(refreshToken);
      await storage.createRefreshToken({
        userId: user.id,
        token: newRefreshToken,
        expiresAt: AuthUtils.getRefreshTokenExpiration(),
        deviceInfo: storedToken.deviceInfo,
        ipAddress: storedToken.ipAddress
      });
      
      res.json({
        message: 'Tokens refreshed successfully',
        tokens: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken
        }
      });
      
    } catch (error: any) {
      console.error('Token refresh error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // POST /api/v1/auth/verify-email
  app.post('/api/v1/auth/verify-email', async (req: Request, res: Response) => {
    try {
      const { token } = verifyEmailSchema.parse(req.body);
      
      const user = await storage.verifyEmail(token);
      if (!user) {
        return res.status(400).json({ message: 'Invalid or expired verification token' });
      }
      
      res.json({
        message: 'Email verified successfully',
        user: {
          id: user.id,
          email: user.email,
          emailVerified: user.emailVerified
        }
      });
      
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Validation error', 
          errors: error.errors 
        });
      }
      
      console.error('Email verification error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // POST /api/v1/auth/forgot-password
  app.post('/api/v1/auth/forgot-password', rateLimit(3, 60), async (req: Request, res: Response) => {
    try {
      const { email } = forgotPasswordSchema.parse(req.body);
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Don't reveal if email exists or not
        return res.json({ 
          message: 'If the email exists, a password reset link will be sent.' 
        });
      }
      
      // Generate password reset token
      const resetToken = AuthUtils.generatePasswordResetToken();
      await storage.createPasswordResetToken({
        userId: user.id,
        token: resetToken,
        expiresAt: AuthUtils.getPasswordResetExpiration()
      });
      
      // TODO: Send password reset email
      // await emailService.sendPasswordResetEmail(user.email, resetToken);
      
      res.json({ 
        message: 'If the email exists, a password reset link will be sent.',
        // In development, return the token for testing
        ...(process.env.NODE_ENV === 'development' && { resetToken })
      });
      
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Validation error', 
          errors: error.errors 
        });
      }
      
      console.error('Password reset request error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // POST /api/v1/auth/reset-password
  app.post('/api/v1/auth/reset-password', rateLimit(5, 60), async (req: Request, res: Response) => {
    try {
      const { token, password } = resetPasswordSchema.parse(req.body);
      
      const resetToken = await storage.getPasswordResetToken(token);
      if (!resetToken) {
        return res.status(400).json({ message: 'Invalid or expired reset token' });
      }
      
      // Update user password
      await storage.updateUser(resetToken.userId, { 
        passwordHash: password,
        lastPasswordChange: new Date()
      });
      
      // Mark token as used
      await storage.markPasswordResetTokenUsed(token);
      
      // Invalidate all user sessions and refresh tokens for security
      await storage.deleteUserRefreshTokens(resetToken.userId);
      await storage.deleteUserSessions(resetToken.userId);
      
      res.json({ message: 'Password reset successfully' });
      
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Validation error', 
          errors: error.errors 
        });
      }
      
      console.error('Password reset error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // POST /api/v1/auth/2fa/enable
  app.post('/api/v1/auth/2fa/enable', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = await storage.getUser(req.user!.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      if (user.twoFactorEnabled) {
        return res.status(400).json({ message: 'Two-factor authentication is already enabled' });
      }
      
      // Generate 2FA secret
      const { secret, qrCodeUrl } = AuthUtils.generate2FASecret(
        'E-commerce Platform', 
        user.email
      );
      
      // Generate QR code as base64 image
      const qrCodeImage = await AuthUtils.generateQRCode(qrCodeUrl);
      
      // Store the secret (temporarily until verification)
      await storage.updateUser(user.id, { twoFactorSecret: secret } as any);
      
      res.json({
        message: 'Scan the QR code with your authenticator app',
        secret,
        qrCodeUrl: qrCodeImage,
        manualEntryKey: secret
      });
      
    } catch (error: any) {
      console.error('2FA setup error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // POST /api/v1/auth/2fa/verify
  app.post('/api/v1/auth/2fa/verify', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { code } = enable2FASchema.parse(req.body);
      
      const user = await storage.getUser(req.user!.userId);
      if (!user || !user.twoFactorSecret) {
        return res.status(400).json({ message: 'Two-factor setup not initiated' });
      }
      
      // Verify the code
      const isValid = AuthUtils.verify2FAToken(code, user.twoFactorSecret);
      if (!isValid) {
        return res.status(400).json({ message: 'Invalid verification code' });
      }
      
      // Enable 2FA for the user
      await storage.updateUser(user.id, { 
        twoFactorEnabled: true
      });
      
      res.json({ 
        message: 'Two-factor authentication enabled successfully' 
      });
      
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Validation error', 
          errors: error.errors 
        });
      }
      
      console.error('2FA verification error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // GET /api/v1/auth/me (enhanced)
  app.get('/api/v1/auth/me', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userWithPreferences = await storage.getUserWithPreferences(req.user!.userId);
      if (!userWithPreferences) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      const { passwordHash, twoFactorSecret, emailVerificationToken, phoneVerificationToken, ...safeUser } = userWithPreferences;
      
      res.json({
        user: safeUser
      });
      
    } catch (error: any) {
      console.error('Get user info error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
}

// Export middleware for use in other routes
export { authenticateToken, requireAdmin };