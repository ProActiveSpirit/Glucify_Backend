import { Router } from 'express';
import { MealPlanningController } from '../controllers/mealPlanningController';

const router = Router();

// GET /api/meal-planning - Get user's meal plan for a specific date
router.get('/', MealPlanningController.getMealPlan);

// POST /api/meal-planning - Create a new meal plan
router.post('/', MealPlanningController.createMealPlan);

// PUT /api/meal-planning/:id - Update existing meal plan
router.put('/:id', MealPlanningController.updateMealPlan);

// DELETE /api/meal-planning/:id - Delete meal plan
router.delete('/:id', MealPlanningController.deleteMealPlan);

// GET /api/meal-planning/preferences - Get user preferences
router.get('/preferences', MealPlanningController.getUserPreferences);

// POST /api/meal-planning/preferences - Save user preferences
router.post('/preferences', MealPlanningController.saveUserPreferences);

// GET /api/meal-planning/foods - Get food database
router.get('/foods', MealPlanningController.getFoodDatabase);

// GET /api/meal-planning/foods/search - Search foods
router.get('/foods/search', MealPlanningController.searchFoods);

// POST /api/meal-planning/recommendations - Get meal recommendations
router.post('/recommendations', MealPlanningController.getMealRecommendations);

// POST /api/meal-planning/ai-generate - Generate AI meal plan
router.post('/ai-generate', MealPlanningController.generateAIMealPlan);

export default router; 