export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  interval: 'month' | 'year';
  stripePriceId: string;
  features: string[];
  isBeta?: boolean;
  maxUsers?: number;
}

export interface UserSubscription {
  id: string;
  userId: string;
  stripeCustomerId: string;
  stripeSubscriptionId?: string;
  planId: string;
  status: 'trial' | 'active' | 'canceled' | 'past_due' | 'unpaid';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialEnd?: Date;
  cancelAtPeriodEnd: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserTrial {
  id: string;
  userId: string;
  email: string;
  trialStartDate: Date;
  trialEndDate: Date;
  isActive: boolean;
  isBetaUser: boolean;
  betaUserNumber?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TrialStatus {
  isInTrial: boolean;
  trialDaysRemaining: number;
  trialEndDate: Date | null;
  isBetaUser: boolean;
  betaUserNumber?: number | undefined;
  shouldShowPayment: boolean;
}

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: string;
  clientSecret: string;
}

export interface CreateSubscriptionRequest {
  planId: string;
  paymentMethodId: string;
}

export interface UpdateSubscriptionRequest {
  planId?: string;
  cancelAtPeriodEnd?: boolean;
}

export interface BetaStatus {
  isBetaUser: boolean;
  betaUserCount: number;
  maxBetaUsers: number;
  canGetBetaPricing: boolean;
}

export interface PaymentError {
  code: string;
  message: string;
  details?: any;
}

export interface SubscriptionPlansResponse {
  plans: SubscriptionPlan[];
  betaUserCount: number;
  maxBetaUsers: number;
}

export interface UserSubscriptionResponse {
  subscription: UserSubscription | null;
  isBetaUser: boolean;
}

export interface BetaUser {
  id: string;
  userId: string;
  email: string;
  createdAt: Date;
  isActive: boolean;
} 