import Anthropic from '@anthropic-ai/sdk';
import { AIAnalysisRequest } from '../types';
import { WebScrapingService, ScrapedRecipe } from './webScrapingService';

const anthropic = new Anthropic({
  apiKey: process.env['CLAUDE_API_KEY'] || 'mock-claude-api-key',
});

export class AIService {
  static async analyzeMessage(request: AIAnalysisRequest): Promise<string> {
    try {
      // Process context data if available
      let contextString = '';
      
      if (request.glucoseContext) {
        const { currentGlucose, recentFoodLogs, currentMealPlan, userProfile } = request.glucoseContext;
        
        // Process recent food logs for AI context
        const MAX_RECENT_FOOD_LOGS_FOR_AI = 10;
        const limitedFoodLogs = recentFoodLogs?.slice(0, MAX_RECENT_FOOD_LOGS_FOR_AI) || [];
        
        const foodContext = limitedFoodLogs.length > 0 
          ? `\n\nRECENT FOOD INTAKE:\n${limitedFoodLogs.map((food: any) => 
              `- ${food.description}: ${food.carbs}g carbs (${new Date(food.timestamp).toLocaleDateString()})`
            ).join('\n')}`
          : '\n\nNo recent food data available.';

        // Process current meal plan context
        const mealPlanContext = currentMealPlan 
          ? `\n\nTODAY'S MEAL PLAN:\n${currentMealPlan.meals.map((meal: any) => 
              `- ${meal.type.charAt(0).toUpperCase() + meal.type.slice(1)} (${meal.time}): ${meal.foods.map((f: any) => f.name).join(', ')} - ${meal.totalCarbs}g carbs, ${meal.recommendedInsulin} units insulin`
            ).join('\n')}\nTotal planned carbs: ${currentMealPlan.totalCarbs}g\nEstimated time in range: ${currentMealPlan.estimatedTimeInRange}%`
          : '\n\nNo meal plan for today yet.';

        contextString = `
CURRENT CONTEXT:
- Glucose: ${currentGlucose?.value || 'Unknown'} mg/dL (${currentGlucose?.trend || 'stable'})
- Profile: ${userProfile ? `Type ${userProfile.diabetesType}, I:C ratio ${userProfile.insulinToCarbRatio}` : 'Not available'}${foodContext}${mealPlanContext}`;
      }

      const systemPrompt = `You are Michelle, a diabetes management AI assistant. Your goals:
- Provide personalized diabetes management guidance
- Automatically extract and log health data from conversations
- Offer evidence-based recommendations while prioritizing safety
- Maintain an empathetic, supportive tone
- Analyze carbohydrate intake patterns
- Help with meal planning and nutrition guidance

SAFETY PROTOCOLS:
- For severe hypoglycemia (<54 mg/dL) or hyperglycemia (>400 mg/dL): advise emergency care
- Only provide general insulin guidance based on established ratios
- Always remind users to consult healthcare providers
- Include disclaimer: "This is guidance only - follow your doctor's instructions"

AUTO-LOGGING: Extract from user messages:
- Glucose readings: "my sugar is 150" → Log 150 mg/dL
- Food intake: "I ate pasta" → Log pasta, estimate carbs
- Exercise: "30-minute walk" → Log walking activity
- Insulin: "took 8 units" → Log insulin dose

CARB ANALYSIS:
- Analyze daily carb patterns from recent food logs
- Suggest balanced meal composition (45-60g per meal, 15-30g snacks)
- Recommend complex carbs over simple sugars
- Provide timing insights for glucose control

MEAL PLANNING INTEGRATION:
When users ask about meal planning, nutrition, or food choices:
- Reference their current meal plan if available
- Suggest visiting the "Meals" tab for AI-generated meal plans
- Provide quick meal suggestions based on their patterns
- Help modify existing meal plans
- Explain the reasoning behind meal recommendations

MEAL PLANNING QUERIES TO RECOGNIZE:
- "Plan my meals" / "What should I eat"
- "Meal ideas" / "Food suggestions"
- "Low carb options" / "High protein meals"
- "Breakfast/lunch/dinner ideas"
- "Meal prep" / "Weekly planning"
- "Carb counting help"
- Questions about specific foods and their glucose impact

MEAL PLANNING RESPONSES:
- For general meal planning: "I'd love to help you plan your meals! For a complete AI-generated meal plan optimized for your glucose levels, check out the 'Meals' tab where I can create personalized daily and weekly plans. In the meantime, here are some quick suggestions..."
- For specific food questions: Provide immediate guidance while mentioning the Meals tab for comprehensive planning
- For meal modifications: Help adjust current plans and suggest using the Meals tab for alternatives

COMMUNICATION:
- Be conversational and supportive
- Reference specific data patterns
- Explain recommendations clearly
- Celebrate successes and progress
- When discussing meals, always consider glucose impact and insulin timing

${contextString}

Respond as Michelle with personalized, contextual guidance while prioritizing safety and directing users to the Meals tab for comprehensive meal planning.`;

      const message = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        temperature: 0.7,
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
  ): Promise<{ mealPlan: string; recipes: ScrapedRecipe[] }> {
    try {
      console.log('Starting meal plan generation with web scraping...');
      
      // First, scrape recipes from diabetes-friendly websites
      let recipes: ScrapedRecipe[] = [];
      try {
        recipes = await WebScrapingService.scrapeDiabetesRecipes();
        console.log(`Successfully scraped ${recipes.length} recipes`);
      } catch (error) {
        console.error('Error scraping recipes, using mock data:', error);
        recipes = await WebScrapingService.getMockRecipes();
      }

      // If no recipes were scraped, use mock data
      if (recipes.length === 0) {
        recipes = await WebScrapingService.getMockRecipes();
      }

      // Shuffle recipes to ensure variety
      const shuffledRecipes = shuffleArray(recipes).slice(0, 8); // Use a random subset
      const recipesContext = shuffledRecipes.map(recipe => `
Recipe: ${recipe.title}
Description: ${recipe.description}
Nutrition: ${recipe.nutritionInfo.calories || 'Unknown'} calories, ${recipe.nutritionInfo.carbs || 'Unknown'}g carbs, ${recipe.nutritionInfo.protein || 'Unknown'}g protein
Ingredients: ${recipe.ingredients.slice(0, 5).join(', ')}${recipe.ingredients.length > 5 ? '...' : ''}
Tags: ${recipe.tags.join(', ')}
Source: ${recipe.sourceUrl}
      `).join('\n\n');

      const systemPrompt = `You are a diabetes nutrition expert. Generate a personalized meal plan based on the user's preferences, diabetes management needs, and available diabetes-friendly recipes.

AVAILABLE RECIPES:
${recipesContext}

Guidelines:
- Focus on balanced meals with appropriate carb distribution (30-45g per meal for most adults)
- Consider glycemic index and fiber content
- Include protein and healthy fats
- Provide specific portion sizes and carb counts
- Suggest appropriate timing for meals and insulin
- Consider the user's diabetes type and management goals
- Use recipes from the provided list when possible
- Ensure meals are diabetes-friendly and nutritionally balanced

User preferences: ${preferences.join(', ')}
Dietary restrictions: ${restrictions.join(', ')}
Target carbs per meal: ${targetCarbs}g
Diabetes type: ${diabetesType}

Provide a detailed meal plan with:
1. Breakfast (include recipe suggestions from the available recipes)
2. Lunch (include recipe suggestions from the available recipes)
3. Dinner (include recipe suggestions from the available recipes)
4. Snacks (if needed)

For each meal include:
- Food items with portions
- Total carbs
- Estimated calories
- Timing recommendations
- Recipe suggestions from the available diabetes-friendly recipes
- Any special notes for diabetes management

Format the response as a structured meal plan with clear sections for each meal.`;

      const message = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: 'Please generate a personalized meal plan using the available diabetes-friendly recipes.'
          }
        ]
      });

      const firstContent = message.content[0];
      if (firstContent && firstContent.type === 'text') {
        return {
          mealPlan: firstContent.text || '',
          recipes: recipes
        };
      }
      return {
        mealPlan: 'I apologize, but I\'m having trouble generating a meal plan right now. Please try again later.',
        recipes: recipes
      };
    } catch (error) {
      console.error('Error generating meal plan:', error);
      const mockRecipes = await WebScrapingService.getMockRecipes();
      return {
        mealPlan: 'I apologize, but I\'m having trouble generating a meal plan right now. Please try again later.',
        recipes: mockRecipes
      };
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
        model: 'claude-3-5-sonnet-20241022',
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

function shuffleArray<T>(array: T[]): T[] {
  return array
    .map(value => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);
} 