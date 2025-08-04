import { Router } from 'express';
import { TrialController } from '../controllers/trialController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Get trial status for current user
router.get('/status', authenticateToken, TrialController.getTrialStatus);

// Create trial for current user
router.post('/create', authenticateToken, TrialController.createTrial);

// End trial for current user
router.post('/end', authenticateToken, TrialController.endTrial);

// Get beta user count (public)
router.get('/beta-count', TrialController.getBetaUserCount);

// Check if user can get beta pricing
router.get('/beta-eligibility', authenticateToken, TrialController.canGetBetaPricing);

// Admin endpoints
router.get('/active', authenticateToken, TrialController.getActiveTrials);
router.post('/cleanup', authenticateToken, TrialController.cleanupExpiredTrials);

export default router; 