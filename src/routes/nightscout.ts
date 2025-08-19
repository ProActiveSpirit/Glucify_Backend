import { Router } from 'express';
import { NightscoutController } from '../controllers/nightscoutController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// POST /api/nightscout/profile - Proxy to fetch Nightscout profile.json with provided credentials
router.post('/profile', NightscoutController.fetchProfile);

// POST /api/nightscout/profile/set - Proxy to set Nightscout profile.json
router.post('/profile/set', NightscoutController.setProfile);

// GET /api/nightscout/data - Fetch entries, treatments, profile for the authenticated user
router.get('/data', authenticateToken, NightscoutController.fetchData);

export default router;

