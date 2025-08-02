import Stripe from 'stripe';
import { 
  SubscriptionPlan, 
  UserSubscription, 
  PaymentIntent, 
  CreateSubscriptionRequest,
  UpdateSubscriptionRequest,
  BetaUser} from '../types/payment';

// Initialize Stripe
const stripe = new Stripe(process.env['STRIPE_SECRET_KEY']!, {
  apiVersion: '2025-07-30.basil',
});

// Define subscription plans
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'beta-plan',
    name: 'Beta User Plan',
    price: 9.99,
    interval: 'month',
    stripePriceId: process.env['STRIPE_BETA_PRICE_ID']!,
    features: [
      'Unlimited food analysis',
      'AI meal planning',
      'Glucose tracking',
      'Priority support',
      'Early access to new features'
    ],
    isBeta: true,
    maxUsers: 100
  },
  {
    id: 'regular-plan',
    name: 'Regular Plan',
    price: 24.99,
    interval: 'month',
    stripePriceId: process.env['STRIPE_REGULAR_PRICE_ID']!,
    features: [
      'Unlimited food analysis',
      'AI meal planning',
      'Glucose tracking',
      'Email support',
      'All features included'
    ]
  }
];

// Beta user tracking
let betaUserCount = 0;
const betaUsers = new Map<string, BetaUser>();

export class PaymentService {
  // Get all available plans
  static getPlans(): SubscriptionPlan[] {
    return SUBSCRIPTION_PLANS;
  }

  // Get plan by ID
  static getPlan(planId: string): SubscriptionPlan | null {
    return SUBSCRIPTION_PLANS.find(plan => plan.id === planId) || null;
  }

  // Check if user can get beta pricing
  static canGetBetaPricing(userId: string, _email: string): boolean {
    if (betaUserCount >= 100) return false;
    if (betaUsers.has(userId)) return true;
    return true; // Allow new beta users if under limit
  }

  // Create or get Stripe customer
  static async createOrGetCustomer(userId: string, email: string): Promise<string> {
    try {
      // Check if customer already exists
      const existingCustomers = await stripe.customers.list({
        email: email,
        limit: 1
      });

      if (existingCustomers.data && existingCustomers.data.length > 0) {
        const customer = existingCustomers.data[0];
        if (customer) {
          return customer.id;
        }
      }

      // Create new customer
      const customer = await stripe.customers.create({
        email: email,
        metadata: {
          userId: userId
        }
      });

      return customer.id;
    } catch (error) {
      console.error('Error creating/getting customer:', error);
      throw new Error('Failed to create customer');
    }
  }

  // Create subscription with trial
  static async createSubscription(
    userId: string, 
    email: string, 
    request: CreateSubscriptionRequest
  ): Promise<UserSubscription> {
    try {
      const plan = this.getPlan(request.planId);
      if (!plan) {
        throw new Error('Invalid plan');
      }

      // Check beta eligibility
      const isBetaEligible = this.canGetBetaPricing(userId, email);
      const finalPlan = isBetaEligible && plan.isBeta ? plan : this.getPlan('regular-plan')!;

      // Create or get customer
      const customerId = await this.createOrGetCustomer(userId, email);

      // Create subscription with 14-day trial
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: finalPlan.stripePriceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
        trial_period_days: 14,
        metadata: {
          userId: userId,
          planId: finalPlan.id
        }
      });

      // Track beta user if applicable
      if (isBetaEligible && finalPlan.isBeta) {
        betaUsers.set(userId, {
          id: userId,
          userId: userId,
          email: email,
          createdAt: new Date(),
          isActive: true
        });
        betaUserCount++;
      }

      // Create subscription record
      const userSubscription: UserSubscription = {
        id: subscription.id,
        userId: userId,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription.id,
        planId: finalPlan.id,
        status: 'trial',
        currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
        currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
        trialEnd: new Date((subscription as any).trial_end! * 1000),
        cancelAtPeriodEnd: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      return userSubscription;
    } catch (error) {
      console.error('Error creating subscription:', error);
      throw new Error('Failed to create subscription');
    }
  }

  // Get user subscription
  static async getUserSubscription(_userId: string): Promise<UserSubscription | null> {
    try {
      // In a real app, you'd fetch this from your database
      // For now, we'll return null as placeholder
      return null;
    } catch (error) {
      console.error('Error getting user subscription:', error);
      throw new Error('Failed to get subscription');
    }
  }

  // Update subscription
  static async updateSubscription(
    userId: string,
    request: UpdateSubscriptionRequest
  ): Promise<UserSubscription> {
    try {
      const subscription = await this.getUserSubscription(userId);
      if (!subscription) {
        throw new Error('No subscription found');
      }

      if (subscription.stripeSubscriptionId) {
        const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);
        
        if (request.cancelAtPeriodEnd !== undefined) {
          await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
            cancel_at_period_end: request.cancelAtPeriodEnd
          });
        }

        if (request.planId) {
          const newPlan = this.getPlan(request.planId);
          if (!newPlan) {
            throw new Error('Invalid plan');
          }

          const firstItem = stripeSubscription.items?.data?.[0];
          if (!firstItem) {
            throw new Error('No subscription items found to update');
          }
          await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
            items: [{
              id: firstItem.id,
              price: newPlan.stripePriceId,
            }],
          });
        }
      }

      // Return updated subscription
      return await this.getUserSubscription(userId) || subscription;
    } catch (error) {
      console.error('Error updating subscription:', error);
      throw new Error('Failed to update subscription');
    }
  }

  // Cancel subscription
  static async cancelSubscription(userId: string): Promise<void> {
    try {
      const subscription = await this.getUserSubscription(userId);
      if (!subscription || !subscription.stripeSubscriptionId) {
        throw new Error('No subscription found');
      }

      await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
    } catch (error) {
      console.error('Error canceling subscription:', error);
      throw new Error('Failed to cancel subscription');
    }
  }

  // Create payment intent for one-time payments
  static async createPaymentIntent(amount: number, currency: string = 'usd'): Promise<PaymentIntent> {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return {
        id: paymentIntent.id,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        clientSecret: paymentIntent.client_secret!
      };
    } catch (error) {
      console.error('Error creating payment intent:', error);
      throw new Error('Failed to create payment intent');
    }
  }

  // Handle webhook events
  static async handleWebhook(event: Stripe.Event): Promise<void> {
    try {
      switch (event.type) {
        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(event.data.object as Stripe.Subscription);
          break;
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;
        case 'invoice.payment_succeeded':
          await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;
        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
          break;
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }
    } catch (error) {
      console.error('Error handling webhook:', error);
      throw error;
    }
  }

  // Webhook handlers
  private static async handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
    console.log('Subscription created:', subscription.id);
    // Update your database with subscription details
  }

  private static async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    console.log('Subscription updated:', subscription.id);
    // Update your database with subscription details
  }

  private static async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    console.log('Subscription deleted:', subscription.id);
    // Update your database to mark subscription as canceled
  }

  private static async handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    console.log('Payment succeeded for invoice:', invoice.id);
    // Update subscription status to active
  }

  private static async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    console.log('Payment failed for invoice:', invoice.id);
    // Update subscription status to past_due
  }

  // Get beta user count
  static getBetaUserCount(): number {
    return betaUserCount;
  }

  // Check if user is beta user
  static isBetaUser(userId: string): boolean {
    return betaUsers.has(userId);
  }
} 