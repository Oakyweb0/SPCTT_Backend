import Razorpay from 'razorpay';
import crypto from 'crypto';
import { config } from '../config/env.js';

let razorpayInstance = null;

/**
 * Get or initialize the Razorpay SDK instance
 */
export function getRazorpayClient() {
  if (!razorpayInstance) {
    const key_id = config.RAZORPAY.KEY_ID || process.env.RAZORPAY_KEY_ID;
    const key_secret = config.RAZORPAY.KEY_SECRET || process.env.RAZORPAY_KEY_SECRET;

    if (!key_id || !key_secret || key_id.includes('YourKeyIdHere')) {
      console.warn('⚠️ Razorpay credentials not fully configured in environment. Using fallback mode.');
    }

    razorpayInstance = new Razorpay({
      key_id: key_id || 'rzp_test_placeholder',
      key_secret: key_secret || 'placeholder_secret'
    });
  }

  return razorpayInstance;
}

/**
 * Create a new Razorpay order
 * @param {Object} options
 * @param {number} options.amountInPaise - Amount in smallest currency unit (e.g. 50000 = ₹500.00)
 * @param {string} options.currency - Default 'INR'
 * @param {string} options.receipt - Unique internal receipt/registration code
 * @param {Object} options.notes - Metadata key-values
 */
export async function createRazorpayOrder({ amountInPaise, currency = 'INR', receipt, notes = {} }) {
  const key_id = config.RAZORPAY.KEY_ID || process.env.RAZORPAY_KEY_ID;
  const key_secret = config.RAZORPAY.KEY_SECRET || process.env.RAZORPAY_KEY_SECRET;

  // If live/test Razorpay keys are provided, invoke official Razorpay API
  if (key_id && key_secret && !key_id.includes('YourKeyIdHere')) {
    const rzp = getRazorpayClient();
    const order = await rzp.orders.create({
      amount: Math.round(amountInPaise),
      currency: currency.toUpperCase(),
      receipt: String(receipt || `REC_${Date.now()}`),
      notes: {
        ...notes,
        app: 'SPCTT_2026'
      }
    });
    return order;
  }

  // Fallback simulator for dev / unit testing before user pastes keys
  console.log('ℹ️ Generating simulated Razorpay Order (Configure RAZORPAY_KEY_ID & SECRET in .env for live gateway)');
  return {
    id: `order_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`,
    entity: 'order',
    amount: Math.round(amountInPaise),
    amount_paid: 0,
    amount_due: Math.round(amountInPaise),
    currency: currency.toUpperCase(),
    receipt: String(receipt || `REC_${Date.now()}`),
    status: 'created',
    attempts: 0,
    notes: {
      ...notes,
      app: 'SPCTT_2026',
      simulated: true
    },
    created_at: Math.floor(Date.now() / 1000)
  };
}

/**
 * Verify Razorpay payment signature
 * generated_signature = hmac_sha256(order_id + "|" + razorpay_payment_id, secret);
 */
export function verifyRazorpaySignature({ order_id, payment_id, signature }) {
  const secret = config.RAZORPAY.KEY_SECRET || process.env.RAZORPAY_KEY_SECRET;
  
  if (!secret || secret.includes('YourKeySecretHere')) {
    // In simulated dev mode, accept valid string signatures or test bypass
    return Boolean(order_id && payment_id);
  }

  const generatedSignature = crypto
    .createHmac('sha256', secret)
    .update(`${order_id}|${payment_id}`)
    .digest('hex');

  return generatedSignature === signature;
}

/**
 * Verify Razorpay Webhook signature
 */
export function verifyWebhookSignature({ rawBody, signature }) {
  const webhookSecret = config.RAZORPAY.WEBHOOK_SECRET || process.env.RAZORPAY_WEBHOOK_SECRET;
  
  if (!webhookSecret || webhookSecret.includes('YourWebhookSecretHere')) {
    console.warn('⚠️ Webhook received without RAZORPAY_WEBHOOK_SECRET configured.');
    return true;
  }

  if (!signature) return false;

  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody))
    .digest('hex');

  return expectedSignature === signature;
}

export default {
  getRazorpayClient,
  createRazorpayOrder,
  verifyRazorpaySignature,
  verifyWebhookSignature
};
