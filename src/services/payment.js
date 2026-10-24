// src/services/payment.js
// Razorpay checkout + verify ka ek hi jagah. Screens sirf status dekhkar message dikhayenge.
import { paymentAPI, getApiError } from './api';
import { COLORS } from '../constants/theme';

let paymentInFlight = false; // double-tap / do jagah se ek saath payment na khule

// Lazy load: native module na ho (purana build) to baaki app crash na ho
const getCheckout = () => {
  try {
    const mod = require('react-native-razorpay');
    return mod?.default ?? mod;
  } catch (err) {
    console.log('Razorpay module load error:', err);
    return null;
  }
};

// Android SDK kabhi err.description mein poora JSON string deta hai. Parse karke saaf values nikalo.
const parseCheckoutError = (err) => {
  let desc = err?.description ?? err?.error?.description ?? '';
  let reason = err?.error?.reason || '';
  let step = err?.error?.step || '';
  let source = err?.error?.source || '';
  if (typeof desc === 'string' && desc.trim().startsWith('{')) {
    try {
      const inner = JSON.parse(desc)?.error || {};
      desc = inner.description || '';
      reason = inner.reason || reason;
      step = inner.step || step;
      source = inner.source || source;
    } catch (_) { desc = ''; }
  }
  if (typeof desc !== 'string' || desc === 'undefined') desc = '';
  return { desc, reason, step, source };
};

/**
 * Returns { status, message }
 * status: 'paid' | 'verify_pending' | 'cancelled' | 'failed' | 'expired' | 'slot_taken' | 'busy'
 * order: create-booking response ka payment object ({orderId, amount, currency, keyId}); null ho to create-order call hota hai.
 */
export const startPayment = async ({ booking, order = null, shopName, description, user }) => {
  if (paymentInFlight) return { status: 'busy', message: 'A payment is already in progress.' };
  paymentInFlight = true;
  try {
    let orderData = order;
    if (!orderData) {
      try {
        const res = await paymentAPI.createOrder(booking._id);
        orderData = res.data?.data;
      } catch (err) {
        console.log('createOrder error:', err);
        const e = getApiError(err, 'Could not start payment.');
        if (e.status === 410) return { status: 'expired', message: 'Payment time expired. Please book the slot again.' };
        if (e.status === 409) return { status: 'slot_taken', message: e.message || 'This slot was just secured by someone else.' };
        return { status: 'failed', message: e.message };
      }
    }

    if (!orderData?.orderId || !orderData?.keyId) {
      return { status: 'failed', message: 'Payment details are missing. Please try again.' };
    }

    const Checkout = getCheckout();
    if (!Checkout?.open) {
      return { status: 'failed', message: 'Online payment is not available in this app version. Please update the app.' };
    }

    let paymentData;
    try {
      paymentData = await Checkout.open({
        key: orderData.keyId,
        amount: orderData.amount, // paise, server se
        currency: orderData.currency || 'INR',
        name: shopName,
        description,
        order_id: orderData.orderId,
        prefill: { name: user?.name || '', email: user?.email || '', contact: user?.phone || '' },
        theme: { color: COLORS.accent },
      });
    } catch (err) {
      console.log('Razorpay checkout error:', err);
      const { desc, reason, step, source } = parseCheckoutError(err);
      const abandoned = source === 'customer' && step === 'payment_authentication' && !desc;
      const cancelled = err?.code === 0 || err?.code === 'PAYMENT_CANCELLED' || reason === 'payment_cancelled' || abandoned || /cancel/i.test(desc);
      if (cancelled) return { status: 'cancelled', message: 'Payment was not completed.' };
      return { status: 'failed', message: desc || 'Payment could not be completed. If any amount was debited, it will be refunded automatically. You can try again.' };
    }

    try {
      await paymentAPI.verify({
        bookingId: booking._id,
        razorpay_order_id: paymentData.razorpay_order_id,
        razorpay_payment_id: paymentData.razorpay_payment_id,
        razorpay_signature: paymentData.razorpay_signature,
      });
      return { status: 'paid', message: 'Payment successful!' };
    } catch (err) {
      console.log('verify error:', err);
      const e = getApiError(err, 'Could not verify your payment.');
      if (e.status === 409) {
        return { status: 'slot_taken', message: 'Someone else secured this slot first. Your payment will be refunded automatically.' };
      }
      // Network/server error: paise kat chuke ho sakte hain, webhook booking confirm kar dega. "failed" mat bolo.
      if (e.status === 0 || e.status >= 500) {
        return { status: 'verify_pending', message: 'Payment received. We are confirming it, please check My Bookings in a minute.' };
      }
      return { status: 'failed', message: e.message };
    }
  } finally {
    paymentInFlight = false;
  }
};