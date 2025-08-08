import { supabase } from '../config/database';
import { UserTrial, TrialStatus } from '../types/payment';

export class TrialService {
  private static readonly TRIAL_DURATION_DAYS = 14;
  private static readonly MAX_BETA_USERS = 100;

  // Create a new trial for a user
  static async createTrial(userId: string, email: string): Promise<UserTrial> {
    try {
      const trialStartDate = new Date();
      const trialEndDate = new Date(trialStartDate.getTime() + (this.TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000));
      
      // Check if user can be a beta user
      const betaUserCount = await this.getBetaUserCount();
      const isBetaUser = betaUserCount < this.MAX_BETA_USERS;
      const betaUserNumber = isBetaUser ? await this.getNextBetaUserNumber() : undefined;
      
      console.log('🔐 Creating trial for user:', userId);
      console.log('🔐 Is beta user:', isBetaUser);
      console.log('🔐 Beta user number:', betaUserNumber);
      console.log('🔐 Trial start date:', trialStartDate.toISOString());
      console.log('🔐 Trial end date:', trialEndDate.toISOString());
      console.log('🔐 Email:', email);
      console.log('🔐 Beta user count:', betaUserCount);
      console.log('🔐 Max beta users:', this.MAX_BETA_USERS);

      const { data, error } = await supabase
        .from('user_trials')
        .insert({
          user_id: userId,
          email: email,
          trial_start_date: trialStartDate.toISOString(),
          trial_end_date: trialEndDate.toISOString(),
          is_active: true,
          is_beta_user: isBetaUser,
          beta_user_number: betaUserNumber || null
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating trial:', error);
        throw new Error('Failed to create trial');
      }

      console.log(`✅ Created trial for user ${userId} (${isBetaUser ? 'Beta' : 'Regular'} user)`);
      return this.mapDatabaseRecordToUserTrial(data);
    } catch (error) {
      console.error('Error in createTrial:', error);
      throw error;
    }
  }

  // Get trial status for a user
  static async getTrialStatus(userId: string): Promise<TrialStatus | null> {
    try {
      const { data, error } = await supabase
        .from('user_trials')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        // No trial found for user
        return null;
      }

      const trial = this.mapDatabaseRecordToUserTrial(data);
      const now = new Date();
      const isInTrial = trial.isActive && now < trial.trialEndDate;
      const trialDaysRemaining = isInTrial 
        ? Math.ceil((trial.trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      return {
        isInTrial,
        trialDaysRemaining,
        trialEndDate: trial.trialEndDate,
        isBetaUser: trial.isBetaUser,
        betaUserNumber: trial.betaUserNumber || undefined,
        shouldShowPayment: !isInTrial
      };
    } catch (error) {
      console.error('Error getting trial status:', error);
      throw error;
    }
  }

  // Get user trial record
  static async getUserTrial(userId: string): Promise<UserTrial | null> {
    try {
      const { data, error } = await supabase
        .from('user_trials')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        return null;
      }

      return this.mapDatabaseRecordToUserTrial(data);
    } catch (error) {
      console.error('Error getting user trial:', error);
      throw error;
    }
  }

  // End trial for a user (when they subscribe)
  static async endTrial(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_trials')
        .update({ is_active: false })
        .eq('user_id', userId)
        // .eq('is_active', true);

      if (error) {
        console.error('Error ending trial:', error);
        throw new Error('Failed to end trial');
      }

      console.log(`✅ Ended trial for user ${userId}`);
    } catch (error) {
      console.error('Error in endTrial:', error);
      throw error;
    }
  }

  // Get beta user count
  static async getBetaUserCount(): Promise<number> {
    try {
      const { data, error } = await supabase
        .rpc('get_beta_user_count');

      if (error) {
        console.error('Error getting beta user count:', error);
        return 0;
      }

      return data || 0;
    } catch (error) {
      console.error('Error in getBetaUserCount:', error);
      return 0;
    }
  }

  // Get next beta user number
  static async getNextBetaUserNumber(): Promise<number> {
    try {
      const { data, error } = await supabase
        .rpc('get_next_beta_user_number');

      if (error) {
        console.error('Error getting next beta user number:', error);
        return 1;
      }

      return data || 1;
    } catch (error) {
      console.error('Error in getNextBetaUserNumber:', error);
      return 1;
    }
  }

  // Check if user is a beta user
  static async isBetaUser(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('user_trials')
        .select('is_beta_user')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        return false;
      }

      return data.is_beta_user;
    } catch (error) {
      console.error('Error checking beta user status:', error);
      return false;
    }
  }

  // Check if user can get beta pricing
  static async canGetBetaPricing(userId: string): Promise<boolean> {
    try {
      const betaUserCount = await this.getBetaUserCount();
      if (betaUserCount >= this.MAX_BETA_USERS) {
        return false;
      }

      // Check if user is already a beta user
      const isBetaUser = await this.isBetaUser(userId);
      return isBetaUser || betaUserCount < this.MAX_BETA_USERS;
    } catch (error) {
      console.error('Error checking beta pricing eligibility:', error);
      return false;
    }
  }

  // Get all active trials (for admin purposes)
  static async getActiveTrials(): Promise<UserTrial[]> {
    try {
      const { data, error } = await supabase
        .from('user_trials')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error getting active trials:', error);
        throw new Error('Failed to get active trials');
      }

      return data.map(record => this.mapDatabaseRecordToUserTrial(record));
    } catch (error) {
      console.error('Error in getActiveTrials:', error);
      throw error;
    }
  }

  // Clean up expired trials (should be run by a cron job)
  static async cleanupExpiredTrials(): Promise<number> {
    try {
      const now = new Date();
      const { data, error } = await supabase
        .from('user_trials')
        .update({ is_active: false })
        .lt('trial_end_date', now.toISOString())
        .eq('is_active', true)
        .select('id');

      if (error) {
        console.error('Error cleaning up expired trials:', error);
        throw new Error('Failed to cleanup expired trials');
      }

      const cleanedCount = data?.length || 0;
      console.log(`🧹 Cleaned up ${cleanedCount} expired trials`);
      return cleanedCount;
    } catch (error) {
      console.error('Error in cleanupExpiredTrials:', error);
      throw error;
    }
  }

  // Map database record to UserTrial interface
  private static mapDatabaseRecordToUserTrial(record: any): UserTrial {
    return {
      id: record.id,
      userId: record.user_id,
      email: record.email,
      trialStartDate: new Date(record.trial_start_date),
      trialEndDate: new Date(record.trial_end_date),
      isActive: record.is_active,
      isBetaUser: record.is_beta_user,
      betaUserNumber: record.beta_user_number || undefined,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at)
    };
  }
} 