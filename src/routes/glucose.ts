import { Router } from 'express';
import { GlucoseController } from '../controllers/glucoseController';

const router = Router();

// GET /api/glucose - Get glucose readings with optional pagination
router.get('/', GlucoseController.getReadings);

// POST /api/glucose - Add new glucose reading
router.post('/', GlucoseController.addReading);

// GET /api/glucose/range - Get readings by date range
router.get('/range', GlucoseController.getReadingsByDateRange);

// PUT /api/glucose/:id - Update glucose reading
router.put('/:id', GlucoseController.updateReading);

// DELETE /api/glucose/:id - Delete glucose reading
router.delete('/:id', GlucoseController.deleteReading);

// GET /api/glucose/stats - Get glucose statistics
router.get('/stats', GlucoseController.getStats);

// POST /api/glucose/analysis - Get AI analysis of glucose data
router.post('/analysis', GlucoseController.getGlucoseAnalysis);

export default router; 