import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const anthropic = new Anthropic({
  apiKey: process.env['CLAUDE_API_KEY'] || 'mock-claude-api-key',
});

const supabase = createClient(
  process.env['SUPABASE_URL'] || '',
  process.env['SUPABASE_ANON_KEY'] || ''
);

export interface FoodItem {
  name: string;
  carbs: number;
  protein?: number;
  fat?: number;
  calories?: number;
  servingSize?: string;
  confidence: number;
}

export interface FoodAnalysisResult {
  foods: FoodItem[];
  totalCarbs: number;
  totalProtein?: number;
  totalFat?: number;
  totalCalories?: number;
  overallConfidence: number;
  suggestions: string[];
  estimatedInsulin?: number;
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
}

export class FoodAnalysisService {
  static async analyzeFoodImage(imageData: string, userId?: string): Promise<FoodAnalysisResult> {
    try {
      console.log('Starting food analysis with Claude API...');
      
      // Handle different image data formats
      let base64Image: string;
      
      if (imageData.startsWith('data:image/')) {
        // Already a base64 data URL
        base64Image = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
      } else if (imageData.startsWith('file://')) {
        // File URI - we'll need to read the file
        // For now, we'll throw an error and suggest using base64
        throw new Error('File URIs are not supported. Please convert image to base64 format.');
      } else {
        // Assume it's already base64 without the data URL prefix
        base64Image = imageData;
      }

      // console.log('Base64 image:', base64Image);
      
      const systemPrompt = `You are a diabetes nutrition expert specializing in food analysis and carbohydrate counting. Your task is to analyze food images and provide accurate nutritional information.

ANALYSIS REQUIREMENTS:
1. Identify all visible foods in the image
2. Estimate portion sizes realistically
3. Provide accurate carbohydrate content for each food
4. Include protein, fat, and calorie information when possible
5. Assess confidence level for each identification
6. Provide diabetes management suggestions

RESPONSE FORMAT:
Return a JSON object with this exact structure:
{
  "foods": [
    {
      "name": "Food name",
      "carbs": number (grams),
      "protein": number (grams, optional),
      "fat": number (grams, optional),
      "calories": number (optional),
      "servingSize": "estimated portion description",
      "confidence": number (0.0-1.0)
    }
  ],
  "totalCarbs": number,
  "totalProtein": number (optional),
  "totalFat": number (optional),
  "totalCalories": number (optional),
  "overallConfidence": number (0.0-1.0),
  "suggestions": [
    "diabetes management suggestion 1",
    "diabetes management suggestion 2"
  ],
  "estimatedInsulin": number (optional, based on typical 1:15 ratio),
  "mealType": "breakfast|lunch|dinner|snack"
}

CARBOHYDRATE GUIDELINES:
- Be conservative with estimates when uncertain
- Common foods: bread (15g/slice), rice (45g/cup), pasta (45g/cup), potato (30g/medium)
- Fruits: apple (25g), banana (30g), orange (15g), berries (15g/cup)
- Vegetables: most non-starchy vegetables are 5-10g per serving
- Dairy: milk (12g/cup), yogurt (15g/cup), cheese (1g/oz)

CONFIDENCE LEVELS:
- 0.9-1.0: Clear, well-lit, common foods
- 0.7-0.8: Visible but some uncertainty about portion
- 0.5-0.6: Partially visible or unusual presentation
- 0.3-0.4: Poor lighting or unclear image
- Below 0.3: Very uncertain, should be excluded

DIABETES SUGGESTIONS:
- Timing recommendations for glucose testing
- Insulin dosing considerations
- Meal balance suggestions
- Portion control advice
- Glycemic index considerations

SAFETY NOTES:
- Always err on the side of caution with carb estimates
- Include disclaimers about consulting healthcare providers
- Remind users to verify portions and adjust insulin accordingly

Analyze the provided food image and return the JSON response.`;

      const message = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        temperature: 0.3,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Please analyze this food image and provide detailed nutritional information for diabetes management. Focus on accurate carbohydrate counting and portion estimation.'
              },
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: base64Image
                }
              }
            ]
          }
        ]
      });
      console.log('Claude response:', message);
      const firstContent = message.content[0];
      if (firstContent && firstContent.type === 'text') {
        const responseText = firstContent.text || '';
        console.log('Claude raw response:', responseText);

        // Try to extract JSON from a code block or plain text
        let jsonString: string | undefined;
        const codeBlockMatch = responseText.match(/```json\s*([\s\S]*?)```/i);
        if (codeBlockMatch && codeBlockMatch[1]) {
          jsonString = codeBlockMatch[1];
        } else {
          const plainJsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (plainJsonMatch && plainJsonMatch[0]) {
            jsonString = plainJsonMatch[0];
          }
        }

        if (jsonString) {
          try {
            const analysisResult: FoodAnalysisResult = JSON.parse(jsonString);
            
            // Validate and clean up the result
            const validatedResult = this.validateAndCleanResult(analysisResult);
            
            // Log the analysis for debugging
            console.log('Food analysis completed:', {
              foodsCount: validatedResult.foods.length,
              totalCarbs: validatedResult.totalCarbs,
              overallConfidence: validatedResult.overallConfidence
            });
            
            // Store the analysis in database if userId is provided
            if (userId) {
              await this.storeAnalysisResult(userId, validatedResult, base64Image);
            }
            
            return validatedResult;
          } catch (parseError) {
            console.error('Error parsing AI response:', parseError, 'Raw:', jsonString);
            // Fallback to default error result
          }
        }

        // Fallback: Return a default result if no valid JSON found
        return {
          foods: [],
          totalCarbs: 0,
          overallConfidence: 0,
          suggestions: [
            'No valid food detected in the image. Please try again with a clear, well-lit photo of your meal.',
            'Claude response: ' + responseText
          ]
        };
      }
      
      throw new Error('No text content in AI response');
    } catch (error) {
      console.error('Error in food analysis:', error);
      throw new Error(`Food analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private static validateAndCleanResult(result: any): FoodAnalysisResult {
    // Ensure all required fields exist
    const validated: FoodAnalysisResult = {
      foods: result.foods || [],
      totalCarbs: result.totalCarbs || 0,
      overallConfidence: Math.max(0, Math.min(1, result.overallConfidence || 0)),
      suggestions: result.suggestions || []
    };

    // Clean up foods array
    validated.foods = validated.foods
      .filter((food: any) => food && food.name && typeof food.carbs === 'number')
      .map((food: any) => {
        const mappedFood: FoodItem = {
          name: food.name,
          carbs: Math.max(0, food.carbs),
          servingSize: food.servingSize,
          confidence: Math.max(0, Math.min(1, food.confidence || 0.5))
        };
        
        if (food.protein !== undefined) {
          mappedFood.protein = Math.max(0, food.protein);
        }
        if (food.fat !== undefined) {
          mappedFood.fat = Math.max(0, food.fat);
        }
        if (food.calories !== undefined) {
          mappedFood.calories = Math.max(0, food.calories);
        }
        
        return mappedFood;
      });

    // Recalculate totals if needed
    if (validated.foods.length > 0) {
      validated.totalCarbs = validated.foods.reduce((sum, food) => sum + food.carbs, 0);
      validated.totalProtein = validated.foods.reduce((sum, food) => sum + (food.protein || 0), 0);
      validated.totalFat = validated.foods.reduce((sum, food) => sum + (food.fat || 0), 0);
      validated.totalCalories = validated.foods.reduce((sum, food) => sum + (food.calories || 0), 0);
    }

    // Add default suggestions if none provided
    if (validated.suggestions.length === 0) {
      validated.suggestions = [
        'Check your glucose 2 hours after this meal',
        'Consider testing your glucose before and after eating',
        'Consult with your healthcare provider about insulin dosing'
      ];
    }

    // Estimate insulin if not provided (using 1:15 ratio as default)
    if (!validated.estimatedInsulin && validated.totalCarbs > 0) {
      validated.estimatedInsulin = Math.round((validated.totalCarbs / 15) * 10) / 10;
    }

    return validated;
  }

  private static async storeAnalysisResult(userId: string, result: FoodAnalysisResult, imageBase64: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('food_analysis_logs')
        .insert({
          user_id: userId,
          analysis_result: result,
          image_data: imageBase64,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error storing food analysis:', error);
      } else {
        console.log('Food analysis stored successfully');
      }
    } catch (error) {
      console.error('Error storing food analysis result:', error);
    }
  }

  static async getAnalysisHistory(userId: string, limit: number = 10): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('food_analysis_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching analysis history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching analysis history:', error);
      return [];
    }
  }
} 