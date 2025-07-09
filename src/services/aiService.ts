import Anthropic from '@anthropic-ai/sdk';
import { AIAnalysisRequest } from '../types';

const anthropic = new Anthropic({
  apiKey: process.env['CLAUDE_API_KEY'] || 'mock-claude-api-key',
});

export class AIService {
  static async analyzeMessage(request: AIAnalysisRequest): Promise<string> {
    try {
      const systemPrompt = `You are a diabetes management assistant for the Glucify app. Your role is to help users manage their diabetes through personalized advice, meal planning, and glucose monitoring.

Key responsibilities:
1. Provide evidence-based diabetes management advice
2. Help with meal planning and carb counting
3. Analyze glucose patterns and provide insights
4. Offer insulin dosing suggestions (but always remind users to consult healthcare providers)
5. Answer questions about diabetes management

Important guidelines:
- Always prioritize safety and recommend consulting healthcare providers for medical decisions
- Be empathetic and supportive
- Provide practical, actionable advice
- Consider the user's diabetes type, current glucose levels, and preferences
- Suggest healthy lifestyle modifications
- Help with meal timing and insulin timing

Current context:
${request.glucoseContext ? `
- Current glucose: ${request.glucoseContext.currentGlucose} mg/dL
- Target range: ${request.glucoseContext.targetRange?.[0]}-${request.glucoseContext.targetRange?.[1]} mg/dL
` : ''}
${request.userProfile ? `
- Diabetes type: ${request.userProfile.diabetes_type}
- Insulin to carb ratio: ${request.userProfile.insulin_to_carb_ratio}
- Correction factor: ${request.userProfile.correction_factor}
` : ''}

Respond in a helpful, conversational tone while maintaining medical accuracy.`;

      const message = await anthropic.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 1000,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: request.message
          }
        ]
      });

      const firstContent = message.content[0];
      if (firstContent && firstContent.type === 'text') {
        return firstContent.text || '';
      }
      return '';
    } catch (error) {
      console.error('Error in AI analysis:', error);
      return 'I apologize, but I\'m having trouble processing your request right now. Please try again later.';
    }
  }

  static async generateMealPlan(
    preferences: string[],
    restrictions: string[],
    targetCarbs: number,
    diabetesType: 'type1' | 'type2'
  ): Promise<string> {
    try {
      const systemPrompt = `You are a diabetes nutrition expert. Generate a personalized meal plan based on the user's preferences and diabetes management needs.

Guidelines:
- Focus on balanced meals with appropriate carb distribution
- Consider glycemic index and fiber content
- Include protein and healthy fats
- Provide specific portion sizes and carb counts
- Suggest appropriate timing for meals and insulin
- Consider the user's diabetes type and management goals

User preferences: ${preferences.join(', ')}
Dietary restrictions: ${restrictions.join(', ')}
Target carbs per meal: ${targetCarbs}g
Diabetes type: ${diabetesType}

Provide a detailed meal plan with:
1. Breakfast
2. Lunch  
3. Dinner
4. Snacks (if needed)

For each meal include:
- Food items with portions
- Total carbs
- Estimated calories
- Timing recommendations
- Any special notes`;

      const message = await anthropic.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 1500,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: 'Please generate a personalized meal plan for me.'
          }
        ]
      });

      const firstContent = message.content[0];
      if (firstContent && firstContent.type === 'text') {
        return firstContent.text || '';
      }
      return '';
    } catch (error) {
      console.error('Error generating meal plan:', error);
      return 'I apologize, but I\'m having trouble generating a meal plan right now. Please try again later.';
    }
  }

  static async analyzeGlucosePatterns(readings: any[]): Promise<string> {
    try {
      const systemPrompt = `You are a diabetes management expert analyzing glucose patterns. Review the provided glucose readings and provide insights about:

1. Overall glucose control
2. Patterns and trends
3. Potential causes of high/low readings
4. Recommendations for improvement
5. When to consult healthcare providers

Be specific, actionable, and supportive in your analysis.`;

      const readingsSummary = readings.map(r => 
        `${r.timestamp}: ${r.value} mg/dL`
      ).join('\n');

      const message = await anthropic.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 1000,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `Please analyze these glucose readings:\n\n${readingsSummary}`
          }
        ]
      });

      const firstContent = message.content[0];
      if (firstContent && firstContent.type === 'text') {
        return firstContent.text || '';
      }
      return '';
    } catch (error) {
      console.error('Error analyzing glucose patterns:', error);
      return 'I apologize, but I\'m having trouble analyzing your glucose patterns right now. Please try again later.';
    }
  }
} 