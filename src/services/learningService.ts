import { supabase } from '../config/database';

export class LearningService {
  static async getState(userId: string) {
    const { data, error } = await supabase
      .from('user_learning_state')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (error && error.code !== 'PGRST116') {
      throw new Error(error.message);
    }
    return data || null;
  }

  static async upsertState(userId: string, state: any) {
    const payload = { user_id: userId, ...state };
    const { data, error } = await supabase
      .from('user_learning_state')
      .upsert([payload], { onConflict: 'user_id' })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  static async getFoodImpacts(userId: string) {
    const { data, error } = await supabase
      .from('user_food_impacts')
      .select('*')
      .eq('user_id', userId)
      .order('avg_peak', { ascending: true });
    if (error) throw new Error(error.message);
    return data || [];
  }

  static async upsertFoodImpact(userId: string, foodKey: string, impact: { count: number; avg_peak: number; avg_duration_min: number }) {
    const payload = { user_id: userId, food_key: foodKey, ...impact };
    const { data, error } = await supabase
      .from('user_food_impacts')
      .upsert([payload], { onConflict: 'user_id,food_key' })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }
}

