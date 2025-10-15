import type { Express, Request, Response } from "express";
import { NewsletterSubscription, UserSettings, User } from "./models";
import { sendNewsletterConfirmation } from "./utils/email";
import { nanoid } from "nanoid";

// Subscribe to newsletter
export async function subscribeToNewsletter(req: Request, res: Response) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Check if already subscribed
    const existing = await NewsletterSubscription.findOne({ email });

    if (existing) {
      if (existing.status === "confirmed") {
        return res.status(400).json({ message: "Email is already subscribed" });
      } else if (existing.status === "pending") {
        return res.status(400).json({ message: "Confirmation email already sent. Please check your inbox." });
      }
    }

    // Generate confirmation token
    const token = nanoid(32);

    // Create or update subscription
    const subscription = await NewsletterSubscription.findOneAndUpdate(
      { email },
      {
        email,
        status: "pending",
        subscriptionToken: token
      },
      { upsert: true, new: true }
    );

    // Send confirmation email
    await sendNewsletterConfirmation(email, token);

    res.json({ message: "Confirmation email sent. Please check your inbox." });
  } catch (error) {
    console.error("Error subscribing to newsletter:", error);
    res.status(500).json({ message: "Failed to subscribe" });
  }
}

// Confirm newsletter subscription
export async function confirmNewsletterSubscription(req: Request, res: Response) {
  try {
    const { token } = req.params;

    const subscription = await NewsletterSubscription.findOne({ subscriptionToken: token });

    if (!subscription) {
      return res.status(404).json({ message: "Invalid confirmation token" });
    }

    if (subscription.status === "confirmed") {
      return res.status(400).json({ message: "Email is already confirmed" });
    }

    // Update subscription status
    subscription.status = "confirmed";
    subscription.confirmedAt = new Date();
    subscription.subscriptionToken = undefined;
    await subscription.save();

    // If user exists, update their settings by looking up user first
    const user = await User.findOne({ email: subscription.email });
    if (user) {
      const userSettings = await UserSettings.findOneAndUpdate(
        { userId: user._id.toString() },
        { newsletterSubscribed: true },
        { upsert: true, new: true }
      );
    }

    res.json({ message: "Newsletter subscription confirmed successfully!" });
  } catch (error) {
    console.error("Error confirming newsletter subscription:", error);
    res.status(500).json({ message: "Failed to confirm subscription" });
  }
}

// Unsubscribe from newsletter
export async function unsubscribeFromNewsletter(req: Request, res: Response) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const subscription = await NewsletterSubscription.findOne({ email });

    if (!subscription) {
      return res.status(404).json({ message: "Email not found in newsletter list" });
    }

    // Update subscription status
    subscription.status = "unsubscribed";
    subscription.unsubscribedAt = new Date();
    await subscription.save();

    // If user exists, update their settings by looking up user first
    const user = await User.findOne({ email });
    if (user) {
      await UserSettings.findOneAndUpdate(
        { userId: user._id.toString() },
        { newsletterSubscribed: false },
        { upsert: true }
      );
    }

    res.json({ message: "Successfully unsubscribed from newsletter" });
  } catch (error) {
    console.error("Error unsubscribing from newsletter:", error);
    res.status(500).json({ message: "Failed to unsubscribe" });
  }
}

// Get newsletter subscription status
export async function getNewsletterStatus(req: Request, res: Response) {
  try {
    const { email } = req.params;

    const subscription = await NewsletterSubscription.findOne({ email });

    if (!subscription) {
      return res.json({ subscribed: false, status: "not_subscribed" });
    }

    res.json({ 
      subscribed: subscription.status === "confirmed",
      status: subscription.status 
    });
  } catch (error) {
    console.error("Error getting newsletter status:", error);
    res.status(500).json({ message: "Failed to get subscription status" });
  }
}

// Setup newsletter routes
export function setupNewsletterRoutes(app: Express) {
  app.post("/api/newsletter/subscribe", subscribeToNewsletter);
  app.get("/api/newsletter/confirm/:token", confirmNewsletterSubscription);
  app.post("/api/newsletter/unsubscribe", unsubscribeFromNewsletter);
  app.get("/api/newsletter/status/:email", getNewsletterStatus);
}
