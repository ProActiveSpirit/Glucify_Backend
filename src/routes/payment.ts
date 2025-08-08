import express from 'express';
import { PaymentController } from '../controllers/paymentController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Health check endpoint (no auth required)
router.get('/health', PaymentController.healthCheck);

// Get available subscription plans (no auth required)
router.get('/plans', PaymentController.getPlans);

// Get user's subscription status (requires auth)
router.get('/subscription', authenticateToken, PaymentController.getUserSubscription);

// Get beta user status (requires auth)
router.get('/beta-status', authenticateToken, PaymentController.getBetaStatus);

// Create new subscription (requires auth)
router.post('/subscription', authenticateToken, PaymentController.createSubscription);

// Update subscription (requires auth)
router.put('/subscription', authenticateToken, PaymentController.updateSubscription);

// Cancel subscription (requires auth)
router.delete('/subscription', authenticateToken, PaymentController.cancelSubscription);

// Create payment intent (requires auth)
router.post('/payment-intent', authenticateToken, PaymentController.createPaymentIntent);

// Stripe webhook endpoint (no auth required - uses webhook signature)
router.post('/webhook', express.raw({ type: 'application/json' }), PaymentController.handleWebhook);

export default router; 