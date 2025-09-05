import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { nanoid } from 'nanoid';

export interface JWTPayload {
  userId: string;
  email: string;
  isAdmin?: boolean;
}

export interface RefreshTokenPayload {
  userId: string;
  tokenId: string;
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'your-refresh-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const REFRESH_EXPIRES_IN = process.env.REFRESH_EXPIRES_IN || '7d';

export class AuthUtils {
  // JWT Token methods
  static generateAccessToken(payload: JWTPayload): string {
    return jwt.sign(payload, JWT_SECRET as any, {
      expiresIn: JWT_EXPIRES_IN
    } as any);
  }

  static generateRefreshToken(payload: RefreshTokenPayload): string {
    return jwt.sign(payload, REFRESH_SECRET as any, {
      expiresIn: REFRESH_EXPIRES_IN
    } as any);
  }

  static verifyAccessToken(token: string): JWTPayload | null {
    try {
      return jwt.verify(token, JWT_SECRET) as JWTPayload;
    } catch (error) {
      return null;
    }
  }

  static verifyRefreshToken(token: string): RefreshTokenPayload | null {
    try {
      return jwt.verify(token, REFRESH_SECRET) as RefreshTokenPayload;
    } catch (error) {
      return null;
    }
  }

  // Token generation utilities
  static generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  static generateEmailVerificationToken(): string {
    return this.generateSecureToken(32);
  }

  static generatePasswordResetToken(): string {
    return this.generateSecureToken(32);
  }

  static generateSessionToken(): string {
    return nanoid(64);
  }

  // 2FA methods
  static generate2FASecret(serviceName: string = 'E-commerce Platform', accountName: string): {
    secret: string;
    qrCodeUrl: string;
    otpauthUrl: string;
  } {
    const secret = speakeasy.generateSecret({
      name: accountName,
      issuer: serviceName,
      length: 32
    });

    return {
      secret: secret.base32,
      qrCodeUrl: secret.otpauth_url!,
      otpauthUrl: secret.otpauth_url!
    };
  }

  static async generateQRCode(otpauthUrl: string): Promise<string> {
    try {
      return await QRCode.toDataURL(otpauthUrl);
    } catch (error) {
      throw new Error('Failed to generate QR code');
    }
  }

  static verify2FAToken(token: string, secret: string): boolean {
    return speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: 2 // Allow 2 time steps of variance (30 seconds before/after)
    });
  }

  // Password utilities
  static generateStrongPassword(length: number = 12): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  }

  // Date utilities
  static addMinutes(date: Date, minutes: number): Date {
    return new Date(date.getTime() + minutes * 60000);
  }

  static addDays(date: Date, days: number): Date {
    return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
  }

  // Device/IP utilities
  static extractDeviceInfo(userAgent?: string): string {
    if (!userAgent) return 'Unknown Device';
    
    // Simple device detection logic
    if (userAgent.includes('Mobile')) {
      return 'Mobile Device';
    } else if (userAgent.includes('Tablet')) {
      return 'Tablet';
    } else {
      return 'Desktop';
    }
  }

  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static isValidPassword(password: string): boolean {
    // At least 8 characters, one uppercase, one lowercase, one number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
  }

  // Rate limiting utilities
  static generateRateLimitKey(identifier: string, action: string): string {
    return `rate_limit:${action}:${identifier}`;
  }

  // Session utilities
  static getSessionExpiration(): Date {
    return this.addDays(new Date(), 30); // 30 days
  }

  static getRefreshTokenExpiration(): Date {
    return this.addDays(new Date(), 7); // 7 days
  }

  static getPasswordResetExpiration(): Date {
    return this.addMinutes(new Date(), 60); // 1 hour
  }

  static getEmailVerificationExpiration(): Date {
    return this.addDays(new Date(), 1); // 24 hours
  }
}