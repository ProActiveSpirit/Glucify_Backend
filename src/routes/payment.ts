import express from 'express';
import { PaymentController } from '../controllers/paymentController';

const router = express.Router();

// Get available subscription plans
router.get('/plans', PaymentController.getPlans);

// Get user's subscription status
router.get('/subscription', PaymentController.getUserSubscription);

// Get beta user status
router.get('/beta-status', PaymentController.getBetaStatus);

// Create new subscription
router.post('/subscription', PaymentController.createSubscription);

// Update subscription
router.put('/subscription', PaymentController.updateSubscription);

// Cancel subscription
router.delete('/subscription', PaymentController.cancelSubscription);

// Create payment intent
router.post('/payment-intent', PaymentController.createPaymentIntent);

// Stripe webhook endpoint
router.post('/webhook', express.raw({ type: 'application/json' }), PaymentController.handleWebhook);

export default router; 