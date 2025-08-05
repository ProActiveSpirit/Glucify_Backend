import { supabase } from '../config/database';
import { ChatConversation } from '../types';
import { AIService } from './aiService';

export class ChatService {
  static async logConversation(conversation: Omit<ChatConversation, 'id' | 'created_at'>): Promise<ChatConversation | null> {
    try {
      const { data, error } = await supabase
        .from('chat_conversations')
        .insert([conversation])
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

  static async getConversations(userId: string, limit: number = 50): Promise<ChatConversation[]> {
    try {
      const { data, error } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        return [];
      }

      return data || [];
    } catch (error) {
      return [];
    }
  }

  static async analyzeMessage(
    userId: string,
    message: string,
    glucoseContext?: any
  ): Promise<string> {
    try {
      // Get AI response
      const aiResponse = await AIService.analyzeMessage({
        message,
        glucoseContext
      });

      // Log the conversation
      await this.logConversation({
        user_id: userId,
        message,
        ai_response: aiResponse,
        glucose_context: glucoseContext
      });

      return aiResponse;
    } catch (error) {
      return 'I apologize, but I\'m having trouble processing your request right now. Please try again later.';
    }
  }

  static async analyzeGlucosePatterns(_userId: string, readings: any[]): Promise<string> {
    try {
      return await AIService.analyzeGlucosePatterns(readings);
    } catch (error) {
      return 'I apologize, but I\'m having trouble analyzing your glucose patterns right now. Please try again later.';
    }
  }

  static async generateMealPlan(
    _userId: string,
    preferences: string[],
    restrictions: string[],
    targetCarbs: number,
    diabetesType: 'type1' | 'type2'
  ): Promise<{ mealPlan: string; recipes: any[] }> {
    try {
      return await AIService.generateMealPlan(
        preferences,
        restrictions,
        targetCarbs,
        diabetesType
      );
    } catch (error) {
      return {
        mealPlan: 'I apologize, but I\'m having trouble generating a meal plan right now. Please try again later.',
        recipes: []
      };
    }
  }
} 