import type { Express, Request, Response } from "express";
import bcrypt from "bcrypt";
import { User, Address, UserSettings } from "./models";
import { 
  generateOTP, 
  sendSignupOTP, 
  sendForgotPasswordOTP 
} from "./utils/email";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || 'default-jwt-secret-change-in-production';
const OTP_EXPIRY_MINUTES = 10;

// Request OTP for signup
export async function requestSignupOTP(req: Request, res: Response) {
  try {
    const { email, username } = req.body;

    if (!email || !username) {
      return res.status(400).json({ message: "Email and username are required" });
    }

    // Check if user already exists
    let existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });

    if (existingUser && existingUser.emailVerified) {
      return res.status(400).json({ 
        message: existingUser.email === email 
          ? "Email already registered" 
          : "Username already taken" 
      });
    }

    // Generate OTP
    const otp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // Reuse or create pending user record
    if (existingUser && !existingUser.emailVerified) {
      // Update existing pending user with new OTP
      existingUser.verificationOTP = otp;
      existingUser.otpExpiresAt = otpExpiresAt;
      existingUser.failedOtpAttempts = 0;
      await existingUser.save();
    } else {
      // Create new pending user
      await User.create({
        email,
        username,
        passwordHash: "", // Will be set after OTP verification
        verificationOTP: otp,
        otpExpiresAt,
        emailVerified: false,
        failedOtpAttempts: 0
      });
    }

    // Send OTP email
    const emailSent = await sendSignupOTP(email, otp);
    
    if (!emailSent) {
      return res.status(500).json({ 
        message: "Failed to send OTP email. Please check your email configuration." 
      });
    }

    res.json({ 
      message: "OTP sent to your email", 
      email 
    });
  } catch (error: any) {
    console.error("Error requesting signup OTP:", error);
    res.status(500).json({ message: "Failed to send OTP" });
  }
}

// Verify OTP and complete signup
export async function verifySignupOTP(req: Request, res: Response) {
  try {
    const { email, otp, password, firstName, lastName } = req.body;

    if (!email || !otp || !password) {
      return res.status(400).json({ message: "Email, OTP, and password are required" });
    }

    // Find user with OTP
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if OTP is expired
    if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      return res.status(400).json({ message: "OTP has expired" });
    }

    // Verify OTP
    if (user.verificationOTP !== otp) {
      // Increment failed attempts
      user.failedOtpAttempts += 1;
      
      if (user.failedOtpAttempts >= 5) {
        // Delete user after 5 failed attempts
        await User.deleteOne({ _id: user._id });
        return res.status(400).json({ message: "Too many failed attempts. Please start over." });
      }
      
      await user.save();
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // Hash password and update user
    const passwordHash = await bcrypt.hash(password, 10);
    user.passwordHash = passwordHash;
    user.emailVerified = true;
    user.verificationOTP = undefined;
    user.otpExpiresAt = undefined;
    user.failedOtpAttempts = 0;
    user.firstName = firstName;
    user.lastName = lastName;

    await user.save();

    // Create or update user settings (upsert to handle retries)
    await UserSettings.findOneAndUpdate(
      { userId: user._id.toString() },
      {
        userId: user._id.toString(),
        orderUpdates: true,
        promotionalEmails: false,
        productRecommendations: true,
        securityAlerts: true,
        newsletterSubscribed: false
      },
      { upsert: true, new: true }
    );

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ 
      message: "Signup successful", 
      token,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName
      }
    });
  } catch (error: any) {
    console.error("Error verifying signup OTP:", error);
    res.status(500).json({ message: "Failed to verify OTP" });
  }
}

// Request OTP for forgot password
export async function requestForgotPasswordOTP(req: Request, res: Response) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Find user
    const user = await User.findOne({ email });

    if (!user) {
      // Don't reveal if user exists or not for security
      return res.json({ message: "If the email exists, an OTP has been sent" });
    }

    // Generate OTP
    const otp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // Store OTP
    user.verificationOTP = otp;
    user.otpExpiresAt = otpExpiresAt;
    user.failedOtpAttempts = 0;
    await user.save();

    // Send OTP email
    const emailSent = await sendForgotPasswordOTP(email, otp);
    
    if (!emailSent) {
      console.error('Failed to send forgot password OTP email');
      // Still return success message for security (don't reveal if email exists)
    }

    res.json({ message: "If the email exists, an OTP has been sent" });
  } catch (error: any) {
    console.error("Error requesting forgot password OTP:", error);
    res.status(500).json({ message: "Failed to send OTP" });
  }
}

// Verify OTP and reset password
export async function verifyForgotPasswordOTP(req: Request, res: Response) {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: "Email, OTP, and new password are required" });
    }

    // Find user with OTP
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if OTP is expired
    if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      return res.status(400).json({ message: "OTP has expired" });
    }

    // Verify OTP
    if (user.verificationOTP !== otp) {
      // Increment failed attempts
      user.failedOtpAttempts += 1;
      
      if (user.failedOtpAttempts >= 5) {
        // Lock account temporarily
        user.accountLocked = true;
        user.lockoutUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
        await user.save();
        return res.status(400).json({ message: "Too many failed attempts. Account locked for 30 minutes." });
      }
      
      await user.save();
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // Hash new password and update user
    const passwordHash = await bcrypt.hash(newPassword, 10);
    user.passwordHash = passwordHash;
    user.verificationOTP = undefined;
    user.otpExpiresAt = undefined;
    user.failedOtpAttempts = 0;
    user.lastPasswordChange = new Date();

    await user.save();

    res.json({ message: "Password reset successful" });
  } catch (error: any) {
    console.error("Error verifying forgot password OTP:", error);
    res.status(500).json({ message: "Failed to reset password" });
  }
}

// Setup MongoDB auth routes
export function setupMongoAuthRoutes(app: Express) {
  app.post("/api/auth-mongo/signup/request-otp", requestSignupOTP);
  app.post("/api/auth-mongo/signup/verify-otp", verifySignupOTP);
  app.post("/api/auth-mongo/forgot-password/request-otp", requestForgotPasswordOTP);
  app.post("/api/auth-mongo/forgot-password/verify-otp", verifyForgotPasswordOTP);
}
