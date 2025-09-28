import type { Express, Request, Response } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { storage } from './storage';
import { emailNotificationService } from './email-service';
import bcrypt from 'bcrypt';

// Generate a cryptographically secure random 6-digit OTP using rejection sampling
function generateOTP(): string {
  while (true) {
    const randomBytes = crypto.randomBytes(4);
    const randomNum = randomBytes.readUInt32BE(0);
    const maxValidValue = Math.floor(0xFFFFFFFF / 900000) * 900000;
    if (randomNum < maxValidValue) {
      return ((randomNum % 900000) + 100000).toString();
    }
  }
}

// Validation schemas
const sendOTPSchema = z.object({
  email: z.string().email("Invalid email format"),
  firstName: z.string().optional(),
  lastName: z.string().optional()
});

const verifyOTPSchema = z.object({
  email: z.string().email("Invalid email format"),
  otp: z.string().length(6, "OTP must be 6 digits")
});

const forgotPasswordOTPSchema = z.object({
  email: z.string().email("Invalid email format")
});

const resetPasswordWithOTPSchema = z.object({
  email: z.string().email("Invalid email format"),
  otp: z.string().length(6, "OTP must be 6 digits"),
  newPassword: z.string().min(8, "Password must be at least 8 characters")
});

export function setupOTPRoutes(app: Express) {
  
  // Send OTP for email verification during signup
  app.post('/api/auth/send-verification-otp', async (req: Request, res: Response) => {
    try {
      const { email, firstName, lastName } = sendOTPSchema.parse(req.body);

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser && existingUser.emailVerified) {
        return res.status(400).json({ message: 'Email already verified' });
      }

      // Find or create user
      let user;
      if (existingUser) {
        user = existingUser;
      } else {
        // Create a temporary user record for email verification
        const tempPassword = await bcrypt.hash(nanoid(), 12);
        user = await storage.createUser({
          email,
          username: email.split('@')[0] + nanoid(4),
          passwordHash: tempPassword,
          firstName,
          lastName,
          emailVerified: false
        });
      }

      const otp = generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Store OTP
      await storage.setUserOTP(user.id, otp, expiresAt);

      // Send OTP email
      const displayName = firstName || user.firstName || user.username;
      await emailNotificationService.sendOTPEmail(email, displayName, otp);

      res.json({ 
        message: 'Verification code sent to your email',
        expiresIn: 600 // 10 minutes in seconds
      });

    } catch (error) {
      console.error('Send OTP error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Verify OTP for email verification
  app.post('/api/auth/verify-email-otp', async (req: Request, res: Response) => {
    try {
      const { email, otp } = verifyOTPSchema.parse(req.body);

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const isValidOTP = await storage.verifyUserOTP(user.id, otp);
      if (!isValidOTP) {
        return res.status(400).json({ message: 'Invalid or expired OTP' });
      }

      // Mark email as verified
      await storage.updateUser(user.id, { 
        emailVerified: true
      });

      res.json({ message: 'Email verified successfully' });

    } catch (error) {
      console.error('Verify OTP error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Send OTP for forgot password
  app.post('/api/auth/forgot-password-otp', async (req: Request, res: Response) => {
    try {
      const { email } = forgotPasswordOTPSchema.parse(req.body);

      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Don't reveal that the email doesn't exist for security
        return res.json({ message: 'If the email exists, you will receive a verification code' });
      }

      const otp = generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Store OTP
      await storage.setUserOTP(user.id, otp, expiresAt);

      // Send OTP email
      const displayName = user.firstName || user.username;
      await emailNotificationService.sendOTPEmail(email, displayName, otp);

      res.json({ 
        message: 'If the email exists, you will receive a verification code',
        expiresIn: 600
      });

    } catch (error) {
      console.error('Forgot password OTP error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Reset password with OTP
  app.post('/api/auth/reset-password-otp', async (req: Request, res: Response) => {
    try {
      const { email, otp, newPassword } = resetPasswordWithOTPSchema.parse(req.body);

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const isValidOTP = await storage.verifyUserOTP(user.id, otp);
      if (!isValidOTP) {
        return res.status(400).json({ message: 'Invalid or expired OTP' });
      }

      // Hash and update password
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      await storage.updateUser(user.id, { 
        passwordHash: hashedPassword,
        lastPasswordChange: new Date()
      });

      // Clear any existing refresh tokens for security
      await storage.deleteUserRefreshTokens(user.id);

      res.json({ message: 'Password reset successfully' });

    } catch (error) {
      console.error('Reset password OTP error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Resend OTP
  app.post('/api/auth/resend-otp', async (req: Request, res: Response) => {
    try {
      const { email } = z.object({ email: z.string().email() }).parse(req.body);

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const otp = generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Store new OTP
      await storage.setUserOTP(user.id, otp, expiresAt);

      // Send OTP email
      const displayName = user.firstName || user.username;
      await emailNotificationService.sendOTPEmail(email, displayName, otp);

      res.json({ 
        message: 'New verification code sent',
        expiresIn: 600
      });

    } catch (error) {
      console.error('Resend OTP error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  });
}