import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

// Create transporter for sending emails
let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (transporter) {
    return transporter;
  }

  const smtpConfig = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  };

  transporter = nodemailer.createTransport(smtpConfig);
  return transporter;
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: EmailOptions): Promise<boolean> {
  try {
    const transporter = getTransporter();
    const from = process.env.SMTP_FROM || 'DevNexia <devnexia02@gmail.com>';

    await transporter.sendMail({
      from,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML tags for text version
    });

    console.log(`✅ Email sent successfully to ${to}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending email:', error);
    return false;
  }
}

// Generate OTP
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP email for signup
export async function sendSignupOTP(email: string, otp: string): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #7c3aed; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
        .otp-box { background-color: #7c3aed; color: white; font-size: 32px; font-weight: bold; padding: 20px; text-align: center; border-radius: 5px; margin: 20px 0; letter-spacing: 5px; }
        .footer { margin-top: 20px; text-align: center; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>EliteCommerce</h1>
        </div>
        <div class="content">
          <h2>Welcome to EliteCommerce!</h2>
          <p>Thank you for signing up. To complete your registration, please verify your email address using the OTP below:</p>
          <div class="otp-box">${otp}</div>
          <p>This OTP will expire in 10 minutes.</p>
          <p>If you didn't request this, please ignore this email.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} EliteCommerce. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'Verify Your Email - EliteCommerce',
    html,
  });
}

// Send OTP email for forgot password
export async function sendForgotPasswordOTP(email: string, otp: string): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #7c3aed; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
        .otp-box { background-color: #7c3aed; color: white; font-size: 32px; font-weight: bold; padding: 20px; text-align: center; border-radius: 5px; margin: 20px 0; letter-spacing: 5px; }
        .footer { margin-top: 20px; text-align: center; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>EliteCommerce</h1>
        </div>
        <div class="content">
          <h2>Password Reset Request</h2>
          <p>We received a request to reset your password. Use the OTP below to reset your password:</p>
          <div class="otp-box">${otp}</div>
          <p>This OTP will expire in 10 minutes.</p>
          <p>If you didn't request this, please ignore this email and your password will remain unchanged.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} EliteCommerce. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'Reset Your Password - EliteCommerce',
    html,
  });
}

// Send order confirmation email
export async function sendOrderConfirmation(
  email: string,
  orderNumber: string,
  orderDetails: {
    items: Array<{ name: string; quantity: number; price: number }>;
    subtotal: number;
    shipping: number;
    tax: number;
    total: number;
    shippingAddress: any;
  }
): Promise<boolean> {
  const itemsHtml = orderDetails.items
    .map(
      (item) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${item.price.toFixed(2)}</td>
      </tr>
    `
    )
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #7c3aed; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
        .order-number { background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: center; }
        table { width: 100%; margin: 20px 0; border-collapse: collapse; }
        .total-row { font-weight: bold; background-color: #f3f4f6; }
        .footer { margin-top: 20px; text-align: center; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Order Confirmed!</h1>
        </div>
        <div class="content">
          <p>Thank you for your order! We're processing it now and will notify you when it ships.</p>
          <div class="order-number">
            <strong>Order Number:</strong> ${orderNumber}
          </div>
          
          <h3>Order Details:</h3>
          <table>
            <thead>
              <tr style="background-color: #f3f4f6;">
                <th style="padding: 10px; text-align: left;">Item</th>
                <th style="padding: 10px; text-align: center;">Quantity</th>
                <th style="padding: 10px; text-align: right;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="2" style="padding: 10px; text-align: right;">Subtotal:</td>
                <td style="padding: 10px; text-align: right;">$${orderDetails.subtotal.toFixed(2)}</td>
              </tr>
              <tr>
                <td colspan="2" style="padding: 10px; text-align: right;">Shipping:</td>
                <td style="padding: 10px; text-align: right;">$${orderDetails.shipping.toFixed(2)}</td>
              </tr>
              <tr>
                <td colspan="2" style="padding: 10px; text-align: right;">Tax:</td>
                <td style="padding: 10px; text-align: right;">$${orderDetails.tax.toFixed(2)}</td>
              </tr>
              <tr class="total-row">
                <td colspan="2" style="padding: 10px; text-align: right;">Total:</td>
                <td style="padding: 10px; text-align: right;">$${orderDetails.total.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
          
          <h3>Shipping Address:</h3>
          <p>
            ${orderDetails.shippingAddress.firstName} ${orderDetails.shippingAddress.lastName}<br>
            ${orderDetails.shippingAddress.streetAddress}<br>
            ${orderDetails.shippingAddress.city}, ${orderDetails.shippingAddress.state} ${orderDetails.shippingAddress.zipCode}<br>
            ${orderDetails.shippingAddress.country}
          </p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} EliteCommerce. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `Order Confirmation - ${orderNumber}`,
    html,
  });
}

// Send newsletter confirmation email
export async function sendNewsletterConfirmation(email: string, token: string): Promise<boolean> {
  const confirmUrl = `${process.env.VITE_API_URL || 'http://localhost:5000'}/api/newsletter/confirm/${token}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #7c3aed; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
        .button { display: inline-block; background-color: #7c3aed; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { margin-top: 20px; text-align: center; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Confirm Your Subscription</h1>
        </div>
        <div class="content">
          <p>Thank you for subscribing to the EliteCommerce newsletter!</p>
          <p>Click the button below to confirm your subscription and start receiving our latest updates, exclusive offers, and product announcements:</p>
          <div style="text-align: center;">
            <a href="${confirmUrl}" class="button">Confirm Subscription</a>
          </div>
          <p style="color: #666; font-size: 12px;">If the button doesn't work, copy and paste this link into your browser:<br>${confirmUrl}</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} EliteCommerce. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'Confirm Your Newsletter Subscription - EliteCommerce',
    html,
  });
}
