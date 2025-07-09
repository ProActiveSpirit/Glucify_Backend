import { Request, Response } from 'express';
import { MealPlanningService } from '../services/mealPlanningService';
import { AIService } from '../services/aiService';

export class MealPlanningController {
  static async getMealPlan(req: Request, res: Response): Promise<void> {
    try {
      const { date } = req.params;
      const { user_id } = req.query;
      
      if (!user_id) {
        res.status(400).json({
          success: false,
          error: 'user_id parameter is required'
        });
        return;
      }

      if (!date) {
        res.status(400).json({
          success: false,
          error: 'Date parameter is required'
        });
        return;
      }
      
      const mealPlan = await MealPlanningService.getMealPlan(user_id as string, date);

      if (!mealPlan) {
        res.status(404).json({
          success: false,
          error: 'Meal plan not found'
        });
        return;
      }

      res.json({
        success: true,
        data: mealPlan
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  static async createMealPlan(req: Request, res: Response): Promise<void> {
    try {
      const mealPlanData = req.body;

      if (!mealPlanData.user_id) {
        res.status(400).json({
          success: false,
          error: 'user_id is required in request body'
        });
        return;
      }

      const mealPlan = await MealPlanningService.saveMealPlan(mealPlanData);

      if (!mealPlan) {
        res.status(400).json({
          success: false,
          error: 'Failed to create meal plan'
        });
        return;
      }

      res.status(201).json({
        success: true,
        data: mealPlan
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  static async updateMealPlan(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Meal plan ID is required'
        });
        return;
      }
      
      const mealPlan = await MealPlanningService.updateMealPlan(id, req.body);

      if (!mealPlan) {
        res.status(404).json({
          success: false,
          error: 'Meal plan not found or update failed'
        });
        return;
      }

      res.json({
        success: true,
        data: mealPlan
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  static async deleteMealPlan(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Meal plan ID is required'
        });
        return;
      }
      
      const success = await MealPlanningService.deleteMealPlan(id);

      if (!success) {
        res.status(404).json({
          success: false,
          error: 'Meal plan not found or delete failed'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Meal plan deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  static async getUserPreferences(req: Request, res: Response): Promise<void> {
    try {
      const { user_id } = req.query;
      
      if (!user_id) {
        res.status(400).json({
          success: false,
          error: 'user_id parameter is required'
        });
        return;
      }

      const preferences = await MealPlanningService.getUserPreferences(user_id as string);

      if (!preferences) {
        res.status(404).json({
          success: false,
          error: 'User preferences not found'
        });
        return;
      }

      res.json({
        success: true,
        data: preferences
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  static async saveUserPreferences(req: Request, res: Response): Promise<void> {
    try {
      const preferencesData = req.body;

      if (!preferencesData.user_id) {
        res.status(400).json({
          success: false,
          error: 'user_id is required in request body'
        });
        return;
      }

      const preferences = await MealPlanningService.saveUserPreferences(preferencesData);

      if (!preferences) {
        res.status(400).json({
          success: false,
          error: 'Failed to save preferences'
        });
        return;
      }

      res.status(201).json({
        success: true,
        data: preferences
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  static async getFoodDatabase(_req: Request, res: Response): Promise<void> {
    try {
      const foods = await MealPlanningService.getFoodDatabase();

      res.json({
        success: true,
        data: foods
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  static async searchFoods(req: Request, res: Response): Promise<void> {
    try {
      const { query, category } = req.query;

      if (!query) {
        res.status(400).json({
          success: false,
          error: 'Search query is required'
        });
        return;
      }

      const foods = await MealPlanningService.searchFoods(query as string);

      res.json({
        success: true,
        data: foods
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  static async getMealRecommendations(req: Request, res: Response): Promise<void> {
    try {
      const { user_id, preferences, restrictions } = req.body;

      if (!user_id) {
        res.status(400).json({
          success: false,
          error: 'user_id is required in request body'
        });
        return;
      }

      const recommendations = await MealPlanningService.generateMealRecommendations(
        'breakfast', // default meal type
        30, // default target carbs
        preferences || [],
        restrictions || []
      );

      res.json({
        success: true,
        data: recommendations
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  static async generateAIMealPlan(req: Request, res: Response): Promise<void> {
    try {
      const { user_id, preferences, targetDate, duration } = req.body;

      if (!user_id) {
        res.status(400).json({
          success: false,
          error: 'user_id is required in request body'
        });
        return;
      }

      if (!targetDate) {
        res.status(400).json({
          success: false,
          error: 'Target date is required'
        });
        return;
      }

      const mealPlan = await AIService.generateMealPlan(
        preferences || [],
        [], // restrictions
        30, // target carbs
        'type1' // diabetes type
      );

      res.json({
        success: true,
        data: mealPlan
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
} 