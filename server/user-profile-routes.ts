import type { Express, Request, Response } from "express";
import { User, Address, UserSettings } from "./models";
import { authenticateToken } from "./auth-routes";

// Get user profile
export async function getUserProfile(req: any, res: Response) {
  try {
    const userId = req.user?.userId;

    const user = await User.findById(userId).select("-passwordHash -verificationOTP -otpExpiresAt -twoFactorSecret");
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const addresses = await Address.find({ userId });
    const settings = await UserSettings.findOne({ userId });

    res.json({
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
        dateOfBirth: user.dateOfBirth,
        gender: user.gender,
        avatarUrl: user.avatarUrl,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified
      },
      addresses,
      settings
    });
  } catch (error) {
    console.error("Error getting user profile:", error);
    res.status(500).json({ message: "Failed to get user profile" });
  }
}

// Update user profile
export async function updateUserProfile(req: any, res: Response) {
  try {
    const userId = req.user?.userId;
    const { firstName, lastName, phoneNumber, dateOfBirth, gender, avatarUrl } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      {
        firstName,
        lastName,
        phoneNumber,
        dateOfBirth,
        gender,
        avatarUrl
      },
      { new: true, runValidators: true }
    ).select("-passwordHash -verificationOTP -otpExpiresAt -twoFactorSecret");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "Profile updated successfully", user });
  } catch (error) {
    console.error("Error updating user profile:", error);
    res.status(500).json({ message: "Failed to update profile" });
  }
}

// Get user addresses
export async function getUserAddresses(req: any, res: Response) {
  try {
    const userId = req.user?.userId;
    const addresses = await Address.find({ userId });
    res.json(addresses);
  } catch (error) {
    console.error("Error getting addresses:", error);
    res.status(500).json({ message: "Failed to get addresses" });
  }
}

// Add new address
export async function addUserAddress(req: any, res: Response) {
  try {
    const userId = req.user?.userId;
    const addressData = { ...req.body, userId };

    // If this is set as default, unset other default addresses
    if (addressData.isDefault) {
      await Address.updateMany({ userId, type: addressData.type }, { isDefault: false });
    }

    const address = await Address.create(addressData);
    res.status(201).json(address);
  } catch (error) {
    console.error("Error adding address:", error);
    res.status(500).json({ message: "Failed to add address" });
  }
}

// Update address
export async function updateUserAddress(req: any, res: Response) {
  try {
    const userId = req.user?.userId;
    const { addressId } = req.params;
    const addressData = req.body;

    // If this is set as default, unset other default addresses
    if (addressData.isDefault) {
      await Address.updateMany(
        { userId, type: addressData.type, _id: { $ne: addressId } }, 
        { isDefault: false }
      );
    }

    const address = await Address.findOneAndUpdate(
      { _id: addressId, userId },
      addressData,
      { new: true, runValidators: true }
    );

    if (!address) {
      return res.status(404).json({ message: "Address not found" });
    }

    res.json(address);
  } catch (error) {
    console.error("Error updating address:", error);
    res.status(500).json({ message: "Failed to update address" });
  }
}

// Delete address
export async function deleteUserAddress(req: any, res: Response) {
  try {
    const userId = req.user?.userId;
    const { addressId } = req.params;

    const address = await Address.findOneAndDelete({ _id: addressId, userId });

    if (!address) {
      return res.status(404).json({ message: "Address not found" });
    }

    res.json({ message: "Address deleted successfully" });
  } catch (error) {
    console.error("Error deleting address:", error);
    res.status(500).json({ message: "Failed to delete address" });
  }
}

// Get user settings
export async function getUserSettings(req: any, res: Response) {
  try {
    const userId = req.user?.userId;
    let settings = await UserSettings.findOne({ userId });

    if (!settings) {
      // Create default settings if they don't exist
      settings = await UserSettings.create({
        userId,
        orderUpdates: true,
        promotionalEmails: false,
        productRecommendations: true,
        securityAlerts: true,
        newsletterSubscribed: false
      });
    }

    res.json(settings);
  } catch (error) {
    console.error("Error getting user settings:", error);
    res.status(500).json({ message: "Failed to get user settings" });
  }
}

// Update user settings
export async function updateUserSettings(req: any, res: Response) {
  try {
    const userId = req.user?.userId;
    const settingsData = req.body;

    const settings = await UserSettings.findOneAndUpdate(
      { userId },
      settingsData,
      { new: true, upsert: true, runValidators: true }
    );

    res.json({ message: "Settings updated successfully", settings });
  } catch (error) {
    console.error("Error updating user settings:", error);
    res.status(500).json({ message: "Failed to update settings" });
  }
}

// Setup user profile routes
export function setupUserProfileRoutes(app: Express) {
  app.get("/api/user-profile", authenticateToken, getUserProfile);
  app.put("/api/user-profile", authenticateToken, updateUserProfile);
  
  app.get("/api/user-profile/addresses", authenticateToken, getUserAddresses);
  app.post("/api/user-profile/addresses", authenticateToken, addUserAddress);
  app.put("/api/user-profile/addresses/:addressId", authenticateToken, updateUserAddress);
  app.delete("/api/user-profile/addresses/:addressId", authenticateToken, deleteUserAddress);
  
  app.get("/api/user-profile/settings", authenticateToken, getUserSettings);
  app.put("/api/user-profile/settings", authenticateToken, updateUserSettings);
}
