import { Router } from 'express';
import { LearningController } from '../controllers/learningController';

const router = Router();

router.get('/state', LearningController.getState);
router.post('/state', LearningController.upsertState);
router.get('/food-impacts', LearningController.getFoodImpacts);
router.post('/food-impacts', LearningController.upsertFoodImpact);

export default router;

