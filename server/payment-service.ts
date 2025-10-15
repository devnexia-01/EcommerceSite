import { Request, Response } from "express";
import { AuthenticatedRequest } from "./auth-routes";
import { 
  paymentMethods, 
  paymentTransactions, 
  refunds, 
  threeDSecure, 
  walletPayments,
  orders,
  users
} from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { nanoid } from "nanoid";

// Mock Stripe service (in production, this would be the actual Stripe SDK)
class MockStripeService {
  async createPaymentIntent(params: any) {
    const paymentIntentId = `pi_${nanoid()}`;
    return {
      id: paymentIntentId,
      amount: params.amount,
      currency: params.currency,
      status: 'requires_payment_method',
      client_secret: `${paymentIntentId}_secret_${nanoid()}`
    };
  }

  async confirmPaymentIntent(paymentIntentId: string, params: any) {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Simulate some payment failures for testing
    const shouldFail = Math.random() < 0.1; // 10% failure rate
    
    return {
      id: paymentIntentId,
      status: shouldFail ? 'failed' : 'succeeded',
      charges: {
        data: [{
          id: `ch_${nanoid()}`,
          amount: params.amount,
          outcome: {
            risk_level: Math.random() < 0.05 ? 'elevated' : 'normal',
            risk_score: Math.floor(Math.random() * 100)
          }
        }]
      }
    };
  }

  async capturePaymentIntent(paymentIntentId: string) {
    return {
      id: paymentIntentId,
      status: 'succeeded',
      amount_received: Math.floor(Math.random() * 10000) + 1000
    };
  }

  async createRefund(params: any) {
    return {
      id: `re_${nanoid()}`,
      amount: params.amount,
      currency: params.currency,
      status: 'succeeded',
      charge: params.charge
    };
  }

  async createCustomer(params: any) {
    return {
      id: `cus_${nanoid()}`,
      email: params.email,
      name: params.name
    };
  }

  async createPaymentMethod(params: any) {
    return {
      id: `pm_${nanoid()}`,
      type: 'card',
      card: {
        brand: 'visa',
        last4: '4242',
        exp_month: 12,
        exp_year: 2025
      }
    };
  }
}

const stripeService = new MockStripeService();

// Payment Processing Endpoints

export async function processPayment(req: AuthenticatedRequest, res: Response) {
  try {
    const { orderId, paymentMethodId, amount, currency = "USD" } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Validate order exists and belongs to user
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (order.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Get payment method
    const [paymentMethod] = await db.select()
      .from(paymentMethods)
      .where(and(
        eq(paymentMethods.id, paymentMethodId),
        eq(paymentMethods.userId, userId)
      ));

    if (!paymentMethod) {
      return res.status(404).json({ error: "Payment method not found" });
    }

    // Create payment intent with Stripe
    const paymentIntent = await stripeService.createPaymentIntent({
      amount: Math.round(parseFloat(amount) * 100), // Convert to cents
      currency: currency.toLowerCase(),
      payment_method: paymentMethod.gateway?.tokenId,
      confirm: true,
      return_url: `${req.protocol}://${req.get('host')}/payment/complete`
    });

    // Confirm payment
    const confirmedPayment = await stripeService.confirmPaymentIntent(paymentIntent.id, {
      amount: Math.round(parseFloat(amount) * 100)
    });

    // Create transaction record
    const [transaction] = await db.insert(paymentTransactions).values({
      orderId,
      userId,
      type: "payment",
      status: confirmedPayment.status === 'succeeded' ? "success" : "failed",
      amount,
      currency,
      gateway: "stripe",
      gatewayTransactionId: confirmedPayment.id,
      paymentMethod: {
        methodId: paymentMethodId,
        type: paymentMethod.type,
        last4: paymentMethod.card?.last4,
        brand: paymentMethod.card?.brand
      },
      fees: {
        processingFee: "0.30",
        gatewayFee: (parseFloat(amount) * 0.029).toFixed(2),
        totalFee: (parseFloat(amount) * 0.029 + 0.30).toFixed(2)
      },
      fraud: {
        riskScore: confirmedPayment.charges?.data[0]?.outcome?.risk_score?.toString() || "0",
        status: confirmedPayment.charges?.data[0]?.outcome?.risk_level === 'elevated' ? "flagged" : "passed",
        checks: {
          cvv: "pass",
          address: "pass",
          postal: "pass"
        }
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') || "",
      processedAt: new Date()
    }).returning();

    // Update order status if payment successful
    if (confirmedPayment.status === 'succeeded') {
      await db.update(orders)
        .set({ 
          status: "paid",
          updatedAt: new Date()
        })
        .where(eq(orders.id, orderId));
    }

    res.json({
      transactionId: transaction.id,
      status: transaction.status,
      amount: transaction.amount,
      currency: transaction.currency,
      gatewayTransactionId: transaction.gatewayTransactionId
    });

  } catch (error: any) {
    console.error("Payment processing error:", error);
    res.status(500).json({ error: "Payment processing failed", details: error.message });
  }
}

export async function authorizePayment(req: AuthenticatedRequest, res: Response) {
  try {
    const { orderId, paymentMethodId, amount, currency = "USD" } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Validate order
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
    if (!order || order.userId !== userId) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Get payment method
    const [paymentMethod] = await db.select()
      .from(paymentMethods)
      .where(and(
        eq(paymentMethods.id, paymentMethodId),
        eq(paymentMethods.userId, userId)
      ));

    if (!paymentMethod) {
      return res.status(404).json({ error: "Payment method not found" });
    }

    // Create authorization with Stripe
    const paymentIntent = await stripeService.createPaymentIntent({
      amount: Math.round(parseFloat(amount) * 100),
      currency: currency.toLowerCase(),
      payment_method: paymentMethod.gateway?.tokenId,
      capture_method: 'manual' // Authorization only
    });

    // Create transaction record
    const [transaction] = await db.insert(paymentTransactions).values({
      orderId,
      userId,
      type: "authorization",
      status: "success",
      amount,
      currency,
      gateway: "stripe",
      gatewayTransactionId: paymentIntent.id,
      paymentMethod: {
        methodId: paymentMethodId,
        type: paymentMethod.type,
        last4: paymentMethod.card?.last4,
        brand: paymentMethod.card?.brand
      },
      fees: {
        processingFee: "0.00", // No fees for authorization
        gatewayFee: "0.00",
        totalFee: "0.00"
      },
      fraud: {
        riskScore: "0",
        status: "passed",
        checks: {
          cvv: "pass",
          address: "pass",
          postal: "pass"
        }
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') || "",
      processedAt: new Date()
    }).returning();

    res.json({
      transactionId: transaction.id,
      authorizationId: paymentIntent.id,
      status: "authorized",
      amount: transaction.amount,
      currency: transaction.currency
    });

  } catch (error: any) {
    console.error("Payment authorization error:", error);
    res.status(500).json({ error: "Payment authorization failed", details: error.message });
  }
}

export async function capturePayment(req: AuthenticatedRequest, res: Response) {
  try {
    const { transactionId } = req.params;
    const { amount } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Get original authorization transaction
    const [authTransaction] = await db.select()
      .from(paymentTransactions)
      .where(and(
        eq(paymentTransactions.id, transactionId),
        eq(paymentTransactions.userId, userId),
        eq(paymentTransactions.type, "authorization")
      ));

    if (!authTransaction) {
      return res.status(404).json({ error: "Authorization transaction not found" });
    }

    // Capture payment with Stripe
    const capturedPayment = await stripeService.capturePaymentIntent(
      authTransaction.gatewayTransactionId!
    );

    const captureAmount = amount || authTransaction.amount;

    // Create capture transaction record
    const [captureTransaction] = await db.insert(paymentTransactions).values({
      orderId: authTransaction.orderId,
      userId,
      type: "capture",
      status: "success",
      amount: captureAmount,
      currency: authTransaction.currency,
      gateway: authTransaction.gateway,
      gatewayTransactionId: capturedPayment.id,
      paymentMethod: authTransaction.paymentMethod,
      fees: {
        processingFee: "0.30",
        gatewayFee: (parseFloat(captureAmount) * 0.029).toFixed(2),
        totalFee: (parseFloat(captureAmount) * 0.029 + 0.30).toFixed(2)
      },
      fraud: authTransaction.fraud,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') || "",
      processedAt: new Date()
    }).returning();

    // Update order status
    await db.update(orders)
      .set({ 
        status: "paid",
        updatedAt: new Date()
      })
      .where(eq(orders.id, authTransaction.orderId));

    res.json({
      transactionId: captureTransaction.id,
      originalAuthorizationId: transactionId,
      status: "captured",
      amount: captureTransaction.amount,
      currency: captureTransaction.currency
    });

  } catch (error: any) {
    console.error("Payment capture error:", error);
    res.status(500).json({ error: "Payment capture failed", details: error.message });
  }
}

export async function refundPayment(req: AuthenticatedRequest, res: Response) {
  try {
    const { transactionId, amount, reason = "requested_by_customer" } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Get original transaction
    const [originalTransaction] = await db.select()
      .from(paymentTransactions)
      .where(eq(paymentTransactions.id, transactionId));

    if (!originalTransaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    // Check if user has access (either owns the transaction or is admin)
    const isAdmin = req.user?.isAdmin;
    if (!isAdmin && originalTransaction.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const refundAmount = amount || originalTransaction.amount;

    // Process refund with Stripe
    const stripeRefund = await stripeService.createRefund({
      charge: originalTransaction.gatewayTransactionId,
      amount: Math.round(parseFloat(refundAmount) * 100),
      currency: originalTransaction.currency
    });

    // Create refund record
    const [refund] = await db.insert(refunds).values({
      originalTransactionId: transactionId,
      orderId: originalTransaction.orderId,
      amount: refundAmount,
      currency: originalTransaction.currency,
      reason,
      status: "succeeded",
      type: parseFloat(refundAmount) === parseFloat(originalTransaction.amount) ? "full" : "partial",
      gateway: {
        provider: "stripe",
        refundId: stripeRefund.id,
        fee: "0.00"
      },
      timeline: [{
        status: "succeeded",
        timestamp: new Date().toISOString(),
        note: `Refund processed successfully`
      }],
      requestedBy: userId,
      processedAt: new Date()
    }).returning();

    // Create refund transaction record
    const [refundTransaction] = await db.insert(paymentTransactions).values({
      orderId: originalTransaction.orderId,
      userId: originalTransaction.userId,
      type: "refund",
      status: "success",
      amount: refundAmount,
      currency: originalTransaction.currency,
      gateway: originalTransaction.gateway,
      gatewayTransactionId: stripeRefund.id,
      paymentMethod: originalTransaction.paymentMethod,
      fees: {
        processingFee: "0.00",
        gatewayFee: "0.00", 
        totalFee: "0.00"
      },
      fraud: originalTransaction.fraud,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') || "",
      processedAt: new Date()
    }).returning();

    res.json({
      refundId: refund.id,
      transactionId: refundTransaction.id,
      status: "succeeded",
      amount: refund.amount,
      currency: refund.currency,
      reason: refund.reason
    });

  } catch (error: any) {
    console.error("Refund error:", error);
    res.status(500).json({ error: "Refund processing failed", details: error.message });
  }
}

export async function getTransaction(req: AuthenticatedRequest, res: Response) {
  try {
    const { transactionId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const [transaction] = await db.select()
      .from(paymentTransactions)
      .where(eq(paymentTransactions.id, transactionId));

    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    // Check access permissions
    const isAdmin = req.user?.isAdmin;
    if (!isAdmin && transaction.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json(transaction);

  } catch (error: any) {
    console.error("Get transaction error:", error);
    res.status(500).json({ error: "Failed to retrieve transaction", details: error.message });
  }
}

// Payment Methods Management

export async function createPaymentMethod(req: AuthenticatedRequest, res: Response) {
  try {
    const { 
      type, 
      card, 
      billingAddress, 
      isDefault = false 
    } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Create payment method with Stripe
    const stripePaymentMethod = await stripeService.createPaymentMethod({
      type: 'card',
      card: card
    });

    // Create customer if doesn't exist
    const stripeCustomer = await stripeService.createCustomer({
      email: req.user?.email,
      name: `${billingAddress.firstName} ${billingAddress.lastName}`
    });

    // If this is set as default, unset other default methods
    if (isDefault) {
      await db.update(paymentMethods)
        .set({ isDefault: false })
        .where(eq(paymentMethods.userId, userId));
    }

    // Create payment method record
    const [paymentMethod] = await db.insert(paymentMethods).values({
      userId,
      type,
      isDefault,
      isActive: true,
      card: {
        last4: stripePaymentMethod.card.last4,
        brand: stripePaymentMethod.card.brand,
        expiryMonth: stripePaymentMethod.card.exp_month,
        expiryYear: stripePaymentMethod.card.exp_year,
        holderName: card.holderName,
        fingerprint: `fp_${nanoid()}`,
        country: "US",
        fundingType: "credit"
      },
      billingAddress,
      gateway: {
        provider: "stripe",
        customerId: stripeCustomer.id,
        tokenId: stripePaymentMethod.id
      },
      verification: {
        verified: true,
        verifiedAt: new Date().toISOString(),
        verificationMethod: "stripe_validation"
      }
    }).returning();

    res.status(201).json({
      methodId: paymentMethod.id,
      type: paymentMethod.type,
      card: paymentMethod.card,
      isDefault: paymentMethod.isDefault,
      createdAt: paymentMethod.createdAt
    });

  } catch (error: any) {
    console.error("Create payment method error:", error);
    res.status(500).json({ error: "Failed to create payment method", details: error.message });
  }
}

export async function getUserPaymentMethods(req: AuthenticatedRequest, res: Response) {
  try {
    const { userId: requestedUserId } = req.params;
    const currentUserId = req.user?.userId;

    if (!currentUserId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Check if user can access requested user's payment methods
    const isAdmin = req.user?.isAdmin;
    if (!isAdmin && currentUserId !== requestedUserId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const userPaymentMethods = await db.select({
      id: paymentMethods.id,
      type: paymentMethods.type,
      isDefault: paymentMethods.isDefault,
      isActive: paymentMethods.isActive,
      card: paymentMethods.card,
      billingAddress: paymentMethods.billingAddress,
      verification: paymentMethods.verification,
      lastUsed: paymentMethods.lastUsed,
      usageCount: paymentMethods.usageCount,
      createdAt: paymentMethods.createdAt
    })
    .from(paymentMethods)
    .where(and(
      eq(paymentMethods.userId, requestedUserId),
      eq(paymentMethods.isActive, true)
    ))
    .orderBy(desc(paymentMethods.isDefault), desc(paymentMethods.lastUsed));

    res.json({
      paymentMethods: userPaymentMethods,
      total: userPaymentMethods.length
    });

  } catch (error: any) {
    console.error("Get payment methods error:", error);
    res.status(500).json({ error: "Failed to retrieve payment methods", details: error.message });
  }
}

export async function deletePaymentMethod(req: AuthenticatedRequest, res: Response) {
  try {
    const { methodId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Get payment method
    const [paymentMethod] = await db.select()
      .from(paymentMethods)
      .where(and(
        eq(paymentMethods.id, methodId),
        eq(paymentMethods.userId, userId)
      ));

    if (!paymentMethod) {
      return res.status(404).json({ error: "Payment method not found" });
    }

    // Soft delete by setting isActive to false
    await db.update(paymentMethods)
      .set({ 
        isActive: false,
        updatedAt: new Date()
      })
      .where(eq(paymentMethods.id, methodId));

    // If this was the default method, set another one as default
    if (paymentMethod.isDefault) {
      const [alternativeMethod] = await db.select()
        .from(paymentMethods)
        .where(and(
          eq(paymentMethods.userId, userId),
          eq(paymentMethods.isActive, true)
        ))
        .limit(1);

      if (alternativeMethod) {
        await db.update(paymentMethods)
          .set({ isDefault: true })
          .where(eq(paymentMethods.id, alternativeMethod.id));
      }
    }

    res.json({ message: "Payment method deleted successfully" });

  } catch (error: any) {
    console.error("Delete payment method error:", error);
    res.status(500).json({ error: "Failed to delete payment method", details: error.message });
  }
}

// 3D Secure Authentication

export async function process3DSecure(req: AuthenticatedRequest, res: Response) {
  try {
    const { transactionId, returnUrl } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Get transaction
    const [transaction] = await db.select()
      .from(paymentTransactions)
      .where(and(
        eq(paymentTransactions.id, transactionId),
        eq(paymentTransactions.userId, userId)
      ));

    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    // Create 3D Secure authentication record
    const [threeDSAuth] = await db.insert(threeDSecure).values({
      transactionId,
      status: "required",
      version: "2.1",
      authenticationValue: `3ds_${nanoid()}`,
      cavv: `cavv_${nanoid()}`,
      eci: "05",
      dsTransId: `ds_${nanoid()}`,
      acsTransId: `acs_${nanoid()}`,
      challengeRequired: true,
      liabilityShift: false,
      enrollmentStatus: "Y",
      authenticationStatus: "C",
      redirectUrl: returnUrl,
      createdAt: new Date()
    }).returning();

    // Simulate 3D Secure flow
    const challengeUrl = `${req.protocol}://${req.get('host')}/api/v1/payments/3d-secure/challenge/${threeDSAuth.id}`;

    res.json({
      authenticationId: threeDSAuth.id,
      status: "required",
      challengeRequired: true,
      challengeUrl,
      version: "2.1"
    });

  } catch (error: any) {
    console.error("3D Secure error:", error);
    res.status(500).json({ error: "3D Secure authentication failed", details: error.message });
  }
}

// Wallet Payments

export async function processApplePay(req: AuthenticatedRequest, res: Response) {
  try {
    const { 
      orderId, 
      paymentData, 
      billingContact, 
      shippingContact 
    } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Validate order
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
    if (!order || order.userId !== userId) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Create a temporary transaction record first to get ID
    const [tempTransaction] = await db.insert(paymentTransactions).values({
      orderId,
      userId,
      type: "payment",
      status: "pending",
      amount: order.total,
      currency: order.currency,
      gateway: "stripe",
      gatewayTransactionId: "temp_pending",
      paymentMethod: {
        methodId: "temp",
        type: "apple_pay",
        brand: "apple_pay"
      },
      fees: {
        processingFee: "0.30",
        gatewayFee: (parseFloat(order.total) * 0.029).toFixed(2),
        totalFee: (parseFloat(order.total) * 0.029 + 0.30).toFixed(2)
      },
      fraud: {
        riskScore: "10",
        status: "passed",
        checks: {
          cvv: "pass",
          address: "pass",
          postal: "pass"
        }
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') || ""
    }).returning();

    // Create wallet payment record
    const [walletPayment] = await db.insert(walletPayments).values({
      transactionId: tempTransaction.id,
      walletType: "apple_pay",
      deviceData: {
        deviceId: `device_${nanoid()}`,
        merchantId: "merchant.com.yourstore",
        paymentData: JSON.stringify(paymentData),
        signature: `sig_${nanoid()}`
      },
      billingContact,
      shippingContact,
      verification: {
        status: "verified",
        method: "apple_secure_enclave",
        timestamp: new Date().toISOString()
      }
    }).returning();

    // Process payment
    const paymentIntent = await stripeService.createPaymentIntent({
      amount: Math.round(parseFloat(order.total) * 100),
      currency: order.currency,
      confirm: true
    });

    const confirmedPayment = await stripeService.confirmPaymentIntent(paymentIntent.id, {
      amount: Math.round(parseFloat(order.total) * 100)
    });

    // Update the transaction record with real payment data
    const [transaction] = await db.update(paymentTransactions)
      .set({
        status: confirmedPayment.status === 'succeeded' ? "success" : "failed",
        gatewayTransactionId: confirmedPayment.id,
        paymentMethod: {
          methodId: walletPayment.id,
          type: "apple_pay",
          brand: "apple_pay"
        },
        processedAt: new Date()
      })
      .where(eq(paymentTransactions.id, tempTransaction.id))
      .returning();

    // Update order status
    if (confirmedPayment.status === 'succeeded') {
      await db.update(orders)
        .set({ 
          status: "paid",
          updatedAt: new Date()
        })
        .where(eq(orders.id, orderId));
    }

    res.json({
      transactionId: transaction.id,
      walletPaymentId: walletPayment.id,
      status: transaction.status,
      amount: transaction.amount,
      currency: transaction.currency
    });

  } catch (error: any) {
    console.error("Apple Pay error:", error);
    res.status(500).json({ error: "Apple Pay processing failed", details: error.message });
  }
}

export async function processGooglePay(req: AuthenticatedRequest, res: Response) {
  try {
    const { 
      orderId, 
      paymentData, 
      billingContact, 
      shippingContact 
    } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Validate order
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
    if (!order || order.userId !== userId) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Create a temporary transaction record first to get ID
    const [tempTransaction] = await db.insert(paymentTransactions).values({
      orderId,
      userId,
      type: "payment",
      status: "pending",
      amount: order.total,
      currency: order.currency,
      gateway: "stripe",
      gatewayTransactionId: "temp_pending",
      paymentMethod: {
        methodId: "temp",
        type: "google_pay",
        brand: "google_pay"
      },
      fees: {
        processingFee: "0.30",
        gatewayFee: (parseFloat(order.total) * 0.029).toFixed(2),
        totalFee: (parseFloat(order.total) * 0.029 + 0.30).toFixed(2)
      },
      fraud: {
        riskScore: "15",
        status: "passed",
        checks: {
          cvv: "pass",
          address: "pass",
          postal: "pass"
        }
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') || ""
    }).returning();

    // Create wallet payment record
    const [walletPayment] = await db.insert(walletPayments).values({
      transactionId: tempTransaction.id,
      walletType: "google_pay",
      deviceData: {
        deviceId: `device_${nanoid()}`,
        merchantId: "BCR2DN4T4K2KN3HD",
        paymentData: JSON.stringify(paymentData),
        signature: `sig_${nanoid()}`
      },
      billingContact,
      shippingContact,
      verification: {
        status: "verified",
        method: "google_hardware_attestation",
        timestamp: new Date().toISOString()
      }
    }).returning();

    // Process payment
    const paymentIntent = await stripeService.createPaymentIntent({
      amount: Math.round(parseFloat(order.total) * 100),
      currency: order.currency,
      confirm: true
    });

    const confirmedPayment = await stripeService.confirmPaymentIntent(paymentIntent.id, {
      amount: Math.round(parseFloat(order.total) * 100)
    });

    // Update the transaction record with real payment data
    const [transaction] = await db.update(paymentTransactions)
      .set({
        status: confirmedPayment.status === 'succeeded' ? "success" : "failed",
        gatewayTransactionId: confirmedPayment.id,
        paymentMethod: {
          methodId: walletPayment.id,
          type: "google_pay",
          brand: "google_pay"
        },
        processedAt: new Date()
      })
      .where(eq(paymentTransactions.id, tempTransaction.id))
      .returning();

    // Update order status
    if (confirmedPayment.status === 'succeeded') {
      await db.update(orders)
        .set({ 
          status: "paid",
          updatedAt: new Date()
        })
        .where(eq(orders.id, orderId));
    }

    res.json({
      transactionId: transaction.id,
      walletPaymentId: walletPayment.id,
      status: transaction.status,
      amount: transaction.amount,
      currency: transaction.currency
    });

  } catch (error: any) {
    console.error("Google Pay error:", error);
    res.status(500).json({ error: "Google Pay processing failed", details: error.message });
  }
}

// ============= CASH ON DELIVERY (COD) PAYMENT METHODS =============

// Process Cash on Delivery (COD) payment
export async function processCODPayment(req: AuthenticatedRequest, res: Response) {
  try {
    const { orderId, amount, currency = "USD", deliveryAddress } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Validate order exists and belongs to user
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (order.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Create COD transaction record
    const [transaction] = await db.insert(paymentTransactions).values({
      orderId,
      userId,
      type: "payment",
      status: "pending", // COD payments start as pending until delivery
      amount,
      currency,
      gateway: "cod", // Use 'cod' as the gateway
      gatewayTransactionId: `cod_${nanoid()}`,
      paymentMethod: {
        methodId: "cod",
        type: "cash_on_delivery",
      },
      fees: {
        processingFee: "0.00", // No processing fees for COD
        gatewayFee: "0.00",
        totalFee: "0.00"
      },
      fraud: {
        riskScore: "0",
        status: "passed", // COD has minimal fraud risk
        checks: {
          cvv: "n/a",
          address: "verified", // Address is verified through delivery
          postal: "verified"
        }
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') || "",
      processedAt: new Date()
    }).returning();

    // Update order status to indicate COD payment selected
    await db.update(orders)
      .set({ 
        status: "confirmed", // Order is confirmed, payment will be collected on delivery
        paymentStatus: "pending",
        updatedAt: new Date()
      })
      .where(eq(orders.id, orderId));

    res.json({
      transactionId: transaction.id,
      status: "confirmed",
      paymentMethod: "cash_on_delivery",
      message: "Order confirmed. Payment will be collected upon delivery.",
      amount: transaction.amount,
      currency: transaction.currency,
      deliveryInstructions: "Please have exact change ready for the delivery person."
    });

  } catch (error: any) {
    console.error("COD payment processing error:", error);
    res.status(500).json({ error: "Failed to process COD payment", details: error.message });
  }
}

// Confirm COD payment upon delivery
export async function confirmCODPayment(req: AuthenticatedRequest, res: Response) {
  try {
    const { transactionId, deliveredBy } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Get COD transaction
    const [transaction] = await db.select()
      .from(paymentTransactions)
      .where(and(
        eq(paymentTransactions.id, transactionId),
        eq(paymentTransactions.gateway, "cod"),
        eq(paymentTransactions.status, "pending")
      ));

    if (!transaction) {
      return res.status(404).json({ error: "COD transaction not found or already processed" });
    }

    // Update transaction status to success
    await db.update(paymentTransactions)
      .set({
        status: "success",
        processedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(paymentTransactions.id, transactionId));

    // Update order status to paid
    await db.update(orders)
      .set({ 
        status: "paid",
        paymentStatus: "paid",
        updatedAt: new Date()
      })
      .where(eq(orders.id, transaction.orderId));

    res.json({
      transactionId: transaction.id,
      status: "success",
      message: "COD payment confirmed successfully",
      paidAt: new Date().toISOString(),
      deliveredBy
    });

  } catch (error: any) {
    console.error("COD payment confirmation error:", error);
    res.status(500).json({ error: "Failed to confirm COD payment", details: error.message });
  }
}