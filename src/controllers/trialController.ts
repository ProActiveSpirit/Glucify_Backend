import { Request, Response } from 'express';
import { TrialService } from '../services/trialService';

export class TrialController {
  // Get trial status for the current user
  static async getTrialStatus(req: Request, res: Response): Promise<void> {
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

      const trialStatus = await TrialService.getTrialStatus(userId);

      if (!trialStatus) {
        // No trial found for user
        res.status(404).json({
          success: false,
          error: 'No trial found for user'
        });
        return;
      }

      res.json({
        success: true,
        data: trialStatus
      });
    } catch (error) {
      console.error('Error getting trial status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get trial status'
      });
    }
  }

  // Create trial for a user (called during signup)
  static async createTrial(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;
      const userId = user?.id;
      const email = user?.email;

      if (!userId || !email) {
        res.status(401).json({
          success: false,
          error: 'User authentication required'
        });
        return;
      }

      // Check if user already has a trial
      const existingTrial = await TrialService.getUserTrial(userId);
      if (existingTrial) {
        res.status(400).json({
          success: false,
          error: 'User already has an active trial'
        });
        return;
      }

      const trial = await TrialService.createTrial(userId, email);

      res.json({
        success: true,
        data: trial
      });
    } catch (error) {
      console.error('Error creating trial:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create trial'
      });
    }
  }

  // End trial for a user (called when they subscribe)
  static async endTrial(req: Request, res: Response): Promise<void> {
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

      await TrialService.endTrial(userId);

      res.json({
        success: true,
        message: 'Trial ended successfully'
      });
    } catch (error) {
      console.error('Error ending trial:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to end trial'
      });
    }
  }

  // Get beta user count (public endpoint)
  static async getBetaUserCount(_req: Request, res: Response): Promise<void> {
    try {
      const betaUserCount = await TrialService.getBetaUserCount();

      res.json({
        success: true,
        data: {
          betaUserCount,
          maxBetaUsers: 100
        }
      });
    } catch (error) {
      console.error('Error getting beta user count:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get beta user count'
      });
    }
  }

  // Check if user can get beta pricing
  static async canGetBetaPricing(req: Request, res: Response): Promise<void> {
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

      const canGetBetaPricing = await TrialService.canGetBetaPricing(userId);
      const betaUserCount = await TrialService.getBetaUserCount();

      res.json({
        success: true,
        data: {
          canGetBetaPricing,
          betaUserCount,
          maxBetaUsers: 100
        }
      });
    } catch (error) {
      console.error('Error checking beta pricing eligibility:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check beta pricing eligibility'
      });
    }
  }

  // Admin endpoint: Get all active trials
  static async getActiveTrials(req: Request, res: Response): Promise<void> {
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

      // TODO: Add admin check here
      // For now, allow any authenticated user to access this endpoint
      const activeTrials = await TrialService.getActiveTrials();

      res.json({
        success: true,
        data: activeTrials
      });
    } catch (error) {
      console.error('Error getting active trials:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get active trials'
      });
    }
  }

  // Admin endpoint: Clean up expired trials
  static async cleanupExpiredTrials(req: Request, res: Response): Promise<void> {
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

      // TODO: Add admin check here
      // For now, allow any authenticated user to access this endpoint
      const cleanedCount = await TrialService.cleanupExpiredTrials();

      res.json({
        success: true,
        data: {
          cleanedCount,
          message: `Cleaned up ${cleanedCount} expired trials`
        }
      });
    } catch (error) {
      console.error('Error cleaning up expired trials:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cleanup expired trials'
      });
    }
  }
} 