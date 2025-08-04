import { Request, Response } from 'express';
import { PaymentService } from '../services/paymentService';
import { CreateSubscriptionRequest, UpdateSubscriptionRequest } from '../types/payment';

export class PaymentController {
  // Get available subscription plans
  static async getPlans(_req: Request, res: Response): Promise<void> {
    try {
      const plans = PaymentService.getPlans();
      const betaUserCount = PaymentService.getBetaUserCount();
      
      res.json({
        success: true,
        data: {
          plans,
          betaUserCount,
          maxBetaUsers: 100
        }
      });
    } catch (error) {
      console.error('Error getting plans:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get subscription plans'
      });
    }
  }

  // Create subscription
  static async createSubscription(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;
      const { planId, paymentMethodId }: CreateSubscriptionRequest = req.body;
      const userId = user?.id;
      const email = user?.email;

      if (!userId || !email) {
        res.status(401).json({
          success: false,
          error: 'User authentication required'
        });
        return;
      }

      if (!planId || !paymentMethodId) {
        res.status(400).json({
          success: false,
          error: 'Plan ID and payment method ID are required'
        });
        return;
      }

      const subscription = await PaymentService.createSubscription(userId, email, {
        planId,
        paymentMethodId
      });

      res.json({
        success: true,
        data: subscription
      });
    } catch (error) {
      console.error('Error creating subscription:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create subscription'
      });
    }
  }

  // Get user subscription
  static async getUserSubscription(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;
      const userId = user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User authentication required'
        });
        return;
      }

      const subscription = await PaymentService.getUserSubscription(userId);
      const isBetaUser = PaymentService.isBetaUser(userId);

      res.json({
        success: true,
        data: {
          subscription,
          isBetaUser
        }
      });
    } catch (error) {
      console.error('Error getting user subscription:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get subscription'
      });
    }
  }

  // Update subscription
  static async updateSubscription(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;
      const userId = user?.id;
      const updateData: UpdateSubscriptionRequest = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User authentication required'
        });
        return;
      }

      const subscription = await PaymentService.updateSubscription(userId, updateData);

      res.json({
        success: true,
        data: subscription
      });
    } catch (error) {
      console.error('Error updating subscription:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update subscription'
      });
    }
  }

  // Cancel subscription
  static async cancelSubscription(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;
      const userId = user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User authentication required'
        });
        return;
      }

      await PaymentService.cancelSubscription(userId);

      res.json({
        success: true,
        message: 'Subscription canceled successfully'
      });
    } catch (error) {
      console.error('Error canceling subscription:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel subscription'
      });
    }
  }

  // Create payment intent
  static async createPaymentIntent(req: Request, res: Response): Promise<void> {
    try {
      const { amount, currency = 'usd' } = req.body;

      if (!amount || amount <= 0) {
        res.status(400).json({
          success: false,
          error: 'Valid amount is required'
        });
        return;
      }

      const paymentIntent = await PaymentService.createPaymentIntent(amount, currency);

      res.json({
        success: true,
        data: paymentIntent
      });
    } catch (error) {
      console.error('Error creating payment intent:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create payment intent'
      });
    }
  }

  // Handle Stripe webhooks
  static async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      const sig = req.headers['stripe-signature'];
      const endpointSecret = process.env['STRIPE_WEBHOOK_SECRET'];

      if (!sig || !endpointSecret) {
        res.status(400).json({
          success: false,
          error: 'Missing signature or webhook secret'
        });
        return;
      }

      // Verify webhook signature
      const stripe = require('stripe')(process.env['STRIPE_SECRET_KEY']);
      const event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);

      // Handle the event
      await PaymentService.handleWebhook(event);

      res.json({
        success: true,
        message: 'Webhook processed successfully'
      });
    } catch (error) {
      console.error('Error processing webhook:', error);
      res.status(400).json({
        success: false,
        error: 'Webhook processing failed'
      });
    }
  }

  // Get beta user status
  static async getBetaStatus(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;
      const userId = user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User authentication required'
        });
        return;
      }

      const isBetaUser = PaymentService.isBetaUser(userId);
      const betaUserCount = PaymentService.getBetaUserCount();

      res.json({
        success: true,
        data: {
          isBetaUser,
          betaUserCount,
          maxBetaUsers: 100,
          canGetBetaPricing: betaUserCount < 100
        }
      });
    } catch (error) {
      console.error('Error getting beta status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get beta status'
      });
    }
  }
} 