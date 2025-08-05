import { supabase } from '../config/database';
import { MealPlan, UserPreferences, FoodItem, DailyMeal } from '../types';

export class MealPlanningService {
  static async getMealPlan(userId: string, date: string): Promise<MealPlan | null> {
    try {
      const { data, error } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('user_id', userId)
        .eq('date', date)
        .single();

      if (error) {
        return null;
      }

      return data;
    } catch (error) {
      return null;
    }
  }

  static async saveMealPlan(mealPlan: Omit<MealPlan, 'id' | 'created_at' | 'updated_at'>): Promise<MealPlan | null> {
    try {
      const { data, error } = await supabase
        .from('meal_plans')
        .insert([mealPlan])
        .select()
        .single();

      if (error) {
        return null;
      }

      return data;
    } catch (error) {
      return null;
    }
  }

  static async updateMealPlan(mealPlanId: string, updates: Partial<MealPlan>): Promise<MealPlan | null> {
    try {
      const { data, error } = await supabase
        .from('meal_plans')
        .update(updates)
        .eq('id', mealPlanId)
        .select()
        .single();

      if (error) {
        return null;
      }

      return data;
    } catch (error) {
      return null;
    }
  }

  static async deleteMealPlan(mealPlanId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('meal_plans')
        .delete()
        .eq('id', mealPlanId);

      return !error;
    } catch (error) {
      return false;
    }
  }

  static async getUserPreferences(userId: string): Promise<UserPreferences | null> {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        return null;
      }

      return data;
    } catch (error) {
      return null;
    }
  }

  static async saveUserPreferences(preferences: Omit<UserPreferences, 'created_at' | 'updated_at'>): Promise<UserPreferences | null> {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .upsert([preferences])
        .select()
        .single();

      if (error) {
        return null;
      }

      return data;
    } catch (error) {
      return null;
    }
  }

  static async getFoodDatabase(): Promise<FoodItem[]> {
    // This would typically come from a food database API or local database
    // For now, returning mock data
    return [
      {
        id: '1',
        name: 'Greek Yogurt with Berries',
        carbsPer100g: 15,
        proteinPer100g: 10,
        fatPer100g: 5,
        fiberPer100g: 2,
        glycemicIndex: 35,
        categories: ['breakfast', 'protein', 'low-carb'],
        imageUrl: 'https://images.pexels.com/photos/1099680/pexels-photo-1099680.jpeg',
        recipeUrl: 'https://www.allrecipes.com/recipe/231015/greek-yogurt-with-mixed-berries/',
        portionSize: 200,
        userRating: 4.5,
        avgGlucoseImpact: 25
      },
      {
        id: '2',
        name: 'Grilled Chicken Salad',
        carbsPer100g: 8,
        proteinPer100g: 25,
        fatPer100g: 12,
        fiberPer100g: 4,
        glycemicIndex: 15,
        categories: ['lunch', 'protein', 'low-carb', 'vegetables'],
        imageUrl: 'https://images.pexels.com/photos/1059905/pexels-photo-1059905.jpeg',
        recipeUrl: 'https://www.foodnetwork.com/recipes/grilled-chicken-salad-recipe-1946783',
        portionSize: 300,
        userRating: 4.2,
        avgGlucoseImpact: 15
      }
    ];
  }

  static async searchFoods(query: string): Promise<FoodItem[]> {
    const allFoods = await this.getFoodDatabase();
    return allFoods.filter(food => 
      food.name.toLowerCase().includes(query.toLowerCase()) ||
      food.categories.some(category => 
        category.toLowerCase().includes(query.toLowerCase())
      )
    );
  }

  static async generateMealRecommendations(
    mealType: DailyMeal['type'],
    _targetCarbs: number,
    preferences: string[],
    restrictions: string[]
  ): Promise<FoodItem[]> {
    const allFoods = await this.getFoodDatabase();
    
    return allFoods.filter(food => {
      // Filter by meal type
      if (!food.categories.includes(mealType)) {
        return false;
      }

      // Filter by preferences
      if (preferences.length > 0 && !preferences.some(pref => 
        food.categories.includes(pref)
      )) {
        return false;
      }

      // Filter out restrictions
      if (restrictions.some(restriction => 
        food.categories.includes(restriction)
      )) {
        return false;
      }

      return true;
    }).sort((a, b) => (b.userRating || 0) - (a.userRating || 0));
  }
} 