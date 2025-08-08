import Stripe from 'stripe';
import { 
  SubscriptionPlan, 
  UserSubscription, 
  PaymentIntent, 
  CreateSubscriptionRequest,
  UpdateSubscriptionRequest,
  BetaUser} from '../types/payment';
import { TrialService } from './trialService';
import { supabase } from '../config/database';

// Initialize Stripe
const stripe = new Stripe(process.env['STRIPE_SECRET_KEY']!, {
  apiVersion: '2025-07-30.basil',
});

// Define subscription plans with trial strategy
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'beta-monthly',
    name: 'Beta Monthly',
    price: 9.99,
    interval: 'month',
    stripePriceId: process.env['STRIPE_BETA_MONTHLY_PRICE_ID']!,
    features: [
      'Unlimited food analysis',
      'AI meal planning',
      'Glucose tracking',
      'Priority support',
      'Early access to new features',
      'Locked at $9.99 forever'
    ],
    isBeta: true,
    maxUsers: 100
  },
  {
    id: 'beta-yearly',
    name: 'Beta Yearly',
    price: 95.90, // 9.99 * 12 * 0.8 (20% discount)
    interval: 'year',
    stripePriceId: process.env['STRIPE_BETA_YEARLY_PRICE_ID']!,
    features: [
      'Unlimited food analysis',
      'AI meal planning',
      'Glucose tracking',
      'Priority support',
      'Early access to new features',
      '20% discount on yearly plan',
      'Locked at $9.99 forever'
    ],
    isBeta: true,
    maxUsers: 100
  },
  {
    id: 'regular-monthly',
    name: 'Regular Monthly',
    price: 24.99,
    interval: 'month',
    stripePriceId: process.env['STRIPE_REGULAR_MONTHLY_PRICE_ID']!,
    features: [
      'Unlimited food analysis',
      'AI meal planning',
      'Glucose tracking',
      'Email support',
      'All features included'
    ]
  },
  {
    id: 'regular-yearly',
    name: 'Regular Yearly',
    price: 239.90, // 24.99 * 12 * 0.8 (20% discount)
    interval: 'year',
    stripePriceId: process.env['STRIPE_REGULAR_YEARLY_PRICE_ID']!,
    features: [
      'Unlimited food analysis',
      'AI meal planning',
      'Glucose tracking',
      'Email support',
      'All features included',
      '20% discount on yearly plan'
    ]
  }
];

// Beta user tracking
let betaUserCount = 0;
const betaUsers = new Map<string, BetaUser>();

// In-memory subscription storage (replace with database in production)
const subscriptions = new Map<string, UserSubscription>();

export class PaymentService {
  // Get all available plans
  static getPlans(): SubscriptionPlan[] {
    return SUBSCRIPTION_PLANS;
  }

  // Get plan by ID
  static getPlan(planId: string): SubscriptionPlan | null {
    return SUBSCRIPTION_PLANS.find(plan => plan.id === planId) || null;
  }

  // Check if user can get beta pricing (deprecated - use TrialService)
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

  // Create subscription with automatic trial conversion
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

      // Check beta eligibility using TrialService
      const isBetaEligible = await TrialService.canGetBetaPricing(userId);
      
      // Determine the correct plan based on user eligibility and requested plan
      let finalPlan = plan;
      if (plan.isBeta && !isBetaEligible) {
        // If user requested beta plan but is not eligible, fall back to regular plan
        if (plan.interval === 'month') {
          finalPlan = this.getPlan('regular-monthly')!;
        } else {
          finalPlan = this.getPlan('regular-yearly')!;
        }
      } else if (!plan.isBeta && isBetaEligible) {
        // If user is eligible for beta but requested regular plan, upgrade to beta plan
        if (plan.interval === 'month') {
          finalPlan = this.getPlan('beta-monthly')!;
        } else {
          finalPlan = this.getPlan('beta-yearly')!;
        }
      }

      // Create or get customer
      const customerId = await this.createOrGetCustomer(userId, email);

      // End the trial when user subscribes
      await TrialService.endTrial(userId);

      // Create subscription with appropriate billing cycle
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: finalPlan.stripePriceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
        billing_cycle_anchor: Math.floor(Date.now() / 1000),
        collection_method: 'charge_automatically',
        metadata: {
          userId: userId,
          planId: finalPlan.id,
          isBetaUser: finalPlan.isBeta ? 'true' : 'false'
        }
      });

      // Track beta user if applicable
      if (finalPlan.isBeta) {
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
        status: 'active',
        currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
        currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
        cancelAtPeriodEnd: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Store subscription in memory (replace with database in production)
      subscriptions.set(userId, userSubscription);

      // Update user_trials table with subscription start and end dates
      try {
        const { error: trialUpdateError } = await supabase
          .from('user_trials')
          .update({
            trial_start_date: new Date().toISOString(),
            trial_end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
            is_active: true,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);

        if (trialUpdateError) {
          console.error('Error updating trial table:', trialUpdateError);
          // Don't fail the subscription creation for trial update error
        } else {
          console.log(`✅ Updated trial table for user ${userId}`);
        }
      } catch (error) {
        console.error('Error updating trial table:', error);
        // Don't fail the subscription creation for trial update error
      }

      console.log(`✅ Created subscription for user ${userId} with ${finalPlan.id} plan (trial converted)`);
      return userSubscription;
    } catch (error) {
      console.error('Error creating subscription:', error);
      throw new Error('Failed to create subscription');
    }
  }

  // Get user subscription
  static async getUserSubscription(userId: string): Promise<UserSubscription | null> {
    try {
      // Check in-memory storage first
      const subscription = subscriptions.get(userId);
      if (subscription) {
        return subscription;
      }

      // If not in memory, try to fetch from Stripe
      const customer = await this.findCustomerByUserId(userId);
      if (!customer) {
        return null;
      }

      const stripeSubscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        limit: 1,
        status: 'all'
      });

      if (stripeSubscriptions.data.length === 0) {
        return null;
      }

      const stripeSubscription = stripeSubscriptions.data[0];
      if (!stripeSubscription) {
        return null;
      }

      const plan = this.getPlan(stripeSubscription.metadata?.['planId'] || 'regular-plan')!;

      const userSubscription: UserSubscription = {
        id: stripeSubscription.id,
        userId: userId,
        stripeCustomerId: customer.id,
        stripeSubscriptionId: stripeSubscription.id,
        planId: plan.id,
        status: stripeSubscription.status as any,
        currentPeriodStart: new Date((stripeSubscription as any).current_period_start * 1000),
        currentPeriodEnd: new Date((stripeSubscription as any).current_period_end * 1000),
        ...((stripeSubscription as any).trial_end && { trialEnd: new Date((stripeSubscription as any).trial_end * 1000) }),
        cancelAtPeriodEnd: (stripeSubscription as any).cancel_at_period_end,
        createdAt: new Date(stripeSubscription.created * 1000),
        updatedAt: new Date()
      };

      // Store in memory for future access
      subscriptions.set(userId, userSubscription);
      return userSubscription;
    } catch (error) {
      console.error('Error getting user subscription:', error);
      throw new Error('Failed to get subscription');
    }
  }

  // Find customer by user ID
  private static async findCustomerByUserId(userId: string): Promise<Stripe.Customer | null> {
    try {
      const customers = await stripe.customers.list({
        limit: 100
      });

      return customers.data.find(customer => customer.metadata?.['userId'] === userId) || null;
    } catch (error) {
      console.error('Error finding customer:', error);
      return null;
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

        if (request.planId && request.planId !== subscription.planId) {
          const newPlan = this.getPlan(request.planId);
          if (!newPlan) {
            throw new Error('Invalid plan');
          }

          // Update subscription items
          if (stripeSubscription.items.data[0]) {
            await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
              items: [{
                id: stripeSubscription.items.data[0].id,
                price: newPlan.stripePriceId,
              }],
              metadata: {
                ...stripeSubscription.metadata,
                planId: newPlan.id
              }
            });
          }
        }
      }

      // Update local subscription
      const updatedSubscription = await this.getUserSubscription(userId);
      if (!updatedSubscription) {
        throw new Error('Failed to get updated subscription');
      }

      return updatedSubscription;
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
      
      // Update local subscription
      subscriptions.delete(userId);
      
      console.log(`✅ Cancelled subscription for user ${userId}`);
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

  // Handle Stripe webhooks
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

  private static async handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
    console.log('Subscription created:', subscription.id);
  }

  private static async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    console.log('Subscription updated:', subscription.id);
    
    // Update local subscription if it exists
    const userId = subscription.metadata?.['userId'];
    if (userId) {
      const existingSubscription = subscriptions.get(userId);
      if (existingSubscription) {
        existingSubscription.status = subscription.status as any;
        existingSubscription.currentPeriodStart = new Date((subscription as any).current_period_start * 1000);
        existingSubscription.currentPeriodEnd = new Date((subscription as any).current_period_end * 1000);
        if ((subscription as any).trial_end) {
          existingSubscription.trialEnd = new Date((subscription as any).trial_end * 1000);
        }
        existingSubscription.cancelAtPeriodEnd = (subscription as any).cancel_at_period_end;
        existingSubscription.updatedAt = new Date();
        subscriptions.set(userId, existingSubscription);
      }
    }
  }

  private static async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    console.log('Subscription deleted:', subscription.id);
    
    // Remove from local storage
    const userId = subscription.metadata?.['userId'];
    if (userId) {
      subscriptions.delete(userId);
    }
  }

  private static async handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    console.log('Payment succeeded for invoice:', invoice.id);
  }

  private static async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    console.log('Payment failed for invoice:', invoice.id);
  }

  // Beta user management (deprecated - use TrialService)
  static getBetaUserCount(): number {
    return betaUserCount;
  }

  static isBetaUser(userId: string): boolean {
    return betaUsers.has(userId);
  }
} 