import { Router } from 'express';
import { DexcomController } from '../controllers/dexcomController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// POST /api/dexcom/token - Exchange OAuth code for access token (CORS proxy)
router.post('/token', DexcomController.exchangeToken);

// POST /api/dexcom/refresh - Refresh access token (CORS proxy)
router.post('/refresh', DexcomController.refreshToken);

// GET /api/dexcom/glucose - Get glucose readings (CORS proxy)
router.get('/glucose', DexcomController.getGlucoseReadings);

// POST /api/dexcom/validate - Validate access token
router.post('/validate', DexcomController.validateToken);

// POST /api/dexcom/bridge/apply - Set Railway envs and redeploy Nightscout project
router.post('/bridge/apply', authenticateToken, DexcomController.applyBridgeEnvAndRedeploy);

// POST /api/dexcom/bridge/disconnect - Clear creds, mark disconnected, release domain, save status
router.post('/bridge/disconnect', authenticateToken, DexcomController.disconnectBridge);

export default router;
