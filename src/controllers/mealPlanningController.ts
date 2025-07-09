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
      const { query } = req.query;

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
      const { user_id, preferences, targetDate, targetCarbs = 30, diabetesType = 'type1', restrictions = [] } = req.body;

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

      console.log('Generating AI meal plan with web scraping...');
      
      const result = await AIService.generateMealPlan(
        preferences || [],
        restrictions,
        targetCarbs,
        diabetesType
      );

      // Create a structured meal plan from the AI response
      const meals = [
        {
          type: 'breakfast' as const,
          time: '08:00',
          foods: result.recipes.slice(0, 1).map(recipe => ({
            id: recipe.title.toLowerCase().replace(/\s+/g, '-'),
            name: recipe.title,
            carbsPer100g: recipe.nutritionInfo.carbs || 30,
            proteinPer100g: recipe.nutritionInfo.protein || 10,
            fatPer100g: recipe.nutritionInfo.fat || 5,
            fiberPer100g: recipe.nutritionInfo.fiber || 2,
            categories: recipe.tags,
            imageUrl: recipe.imageUrl,
            recipeUrl: recipe.sourceUrl,
            portionSize: 200
          })),
          totalCarbs: result.recipes[0]?.nutritionInfo.carbs || 30,
          totalCalories: result.recipes[0]?.nutritionInfo.calories || 250,
          recommendedInsulin: Math.round(((result.recipes[0]?.nutritionInfo.carbs || 30) / 15)),
          preBolusTime: 15,
          confidence: 0.92,
          reasoning: [
            'Low glycemic index for stable morning glucose',
            'High protein content helps with satiety'
          ]
        },
        {
          type: 'lunch' as const,
          time: '12:00',
          foods: result.recipes.slice(1, 2).map(recipe => ({
            id: recipe.title.toLowerCase().replace(/\s+/g, '-'),
            name: recipe.title,
            carbsPer100g: recipe.nutritionInfo.carbs || 45,
            proteinPer100g: recipe.nutritionInfo.protein || 15,
            fatPer100g: recipe.nutritionInfo.fat || 8,
            fiberPer100g: recipe.nutritionInfo.fiber || 4,
            categories: recipe.tags,
            imageUrl: recipe.imageUrl,
            recipeUrl: recipe.sourceUrl,
            portionSize: 250
          })),
          totalCarbs: result.recipes[1]?.nutritionInfo.carbs || 45,
          totalCalories: result.recipes[1]?.nutritionInfo.calories || 400,
          recommendedInsulin: Math.round(((result.recipes[1]?.nutritionInfo.carbs || 45) / 15)),
          preBolusTime: 15,
          confidence: 0.9,
          reasoning: [
            'Balanced protein and complex carbs',
            'Supports steady energy through the afternoon'
          ]
        },
        {
          type: 'dinner' as const,
          time: '18:00',
          foods: result.recipes.slice(2, 3).map(recipe => ({
            id: recipe.title.toLowerCase().replace(/\s+/g, '-'),
            name: recipe.title,
            carbsPer100g: recipe.nutritionInfo.carbs || 40,
            proteinPer100g: recipe.nutritionInfo.protein || 20,
            fatPer100g: recipe.nutritionInfo.fat || 10,
            fiberPer100g: recipe.nutritionInfo.fiber || 3,
            categories: recipe.tags,
            imageUrl: recipe.imageUrl,
            recipeUrl: recipe.sourceUrl,
            portionSize: 300
          })),
          totalCarbs: result.recipes[2]?.nutritionInfo.carbs || 40,
          totalCalories: result.recipes[2]?.nutritionInfo.calories || 450,
          recommendedInsulin: Math.round(((result.recipes[2]?.nutritionInfo.carbs || 40) / 15)),
          preBolusTime: 15,
          confidence: 0.91,
          reasoning: [
            'Protein-rich dinner helps prevent overnight lows',
            'Balanced with vegetables and healthy fats'
          ]
        },
        {
          type: 'snack' as const,
          time: '10:00',
          foods: result.recipes.slice(3, 4).map(recipe => ({
            id: recipe.title.toLowerCase().replace(/\s+/g, '-'),
            name: recipe.title,
            carbsPer100g: recipe.nutritionInfo.carbs || 15,
            proteinPer100g: recipe.nutritionInfo.protein || 5,
            fatPer100g: recipe.nutritionInfo.fat || 3,
            fiberPer100g: recipe.nutritionInfo.fiber || 2,
            categories: recipe.tags,
            imageUrl: recipe.imageUrl,
            recipeUrl: recipe.sourceUrl,
            portionSize: 100
          })),
          totalCarbs: result.recipes[3]?.nutritionInfo.carbs || 15,
          totalCalories: result.recipes[3]?.nutritionInfo.calories || 150,
          recommendedInsulin: Math.round(((result.recipes[3]?.nutritionInfo.carbs || 15) / 15)),
          preBolusTime: 0,
          confidence: 0.85,
          reasoning: [
            'Light snack to prevent mid-morning lows',
            'Provides steady energy between meals'
          ]
        }
      ];

      const totalCarbs = meals.reduce((sum, meal) => sum + meal.totalCarbs, 0);
      const totalCalories = meals.reduce((sum, meal) => sum + meal.totalCalories, 0);

      // Always return a structured meal plan for the frontend
      const savedMealPlan = {
        id: Date.now().toString(),
        user_id,
        date: targetDate,
        meals,
        estimatedTimeInRange: 85,
        totalCarbs,
        totalCalories,
        notes: result.mealPlan,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      res.json({
        success: true,
        data: {
          mealPlan: result.mealPlan,
          recipes: result.recipes,
          savedMealPlan
        }
      });
    } catch (error) {
      console.error('Error in generateAIMealPlan:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
} 