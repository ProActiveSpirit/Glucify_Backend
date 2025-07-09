import axios from 'axios';
import * as cheerio from 'cheerio';

export interface ScrapedRecipe {
  title: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  nutritionInfo: {
    calories?: number;
    carbs?: number;
    protein?: number;
    fat?: number;
    fiber?: number;
  };
  prepTime?: string | undefined;
  cookTime?: string | undefined;
  servings?: number | undefined;
  difficulty?: string | undefined;
  tags: string[];
  sourceUrl: string;
  imageUrl?: string | undefined;
}

export class WebScrapingService {
  private static async fetchPage(url: string): Promise<string> {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 10000
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching ${url}:`, error);
      throw new Error(`Failed to fetch ${url}`);
    }
  }

  private static async scrapeDiabetesFoodHubRecipes(): Promise<ScrapedRecipe[]> {
    try {
      const html = await this.fetchPage('https://diabetesfoodhub.org/recipes');
      const $ = cheerio.load(html);
      const recipes: ScrapedRecipe[] = [];

      // Look for recipe cards or links
      $('.recipe-card, .recipe-item, .recipe-link, article').each((_index: number, element: any) => {
        try {
          const $el = $(element);
          const title = $el.find('.recipe-title, .title, h2, h3').first().text().trim();
          const description = $el.find('.recipe-description, .description, .summary').first().text().trim();
          const imageUrl = $el.find('img').first().attr('src') || $el.find('img').first().attr('data-src');
          const recipeUrl = $el.find('a').first().attr('href');

          if (title && recipeUrl) {
            recipes.push({
              title,
              description: description || 'A diabetes-friendly recipe',
              ingredients: [],
              instructions: [],
              nutritionInfo: {},
              tags: ['diabetes-friendly', 'healthy'],
              sourceUrl: recipeUrl.startsWith('http') ? recipeUrl : `https://diabetesfoodhub.org${recipeUrl}`,
              imageUrl: imageUrl?.startsWith('http') ? imageUrl : imageUrl ? `https://diabetesfoodhub.org${imageUrl}` : undefined
            });
          }
        } catch (error) {
          console.error('Error parsing recipe element:', error);
        }
      });

      // Limit to first 20 recipes to avoid overwhelming the system
      return recipes.slice(0, 20);
    } catch (error) {
      console.error('Error scraping Diabetes Food Hub:', error);
      return [];
    }
  }

  private static async scrapeMayoClinicRecipes(): Promise<ScrapedRecipe[]> {
    try {
      const html = await this.fetchPage('https://www.mayoclinic.org/healthy-lifestyle/recipes/diabetes-meal-plan-recipes/rcs-20077150');
      const $ = cheerio.load(html);
      const recipes: ScrapedRecipe[] = [];

      // Look for recipe sections
      $('.recipe, .recipe-item, article, .content-item').each((_index: number, element: any) => {
        try {
          const $el = $(element);
          const title = $el.find('.recipe-title, .title, h2, h3, h4').first().text().trim();
          const description = $el.find('.recipe-description, .description, .summary, p').first().text().trim();
          const imageUrl = $el.find('img').first().attr('src') || $el.find('img').first().attr('data-src');
          const recipeUrl = $el.find('a').first().attr('href');

          if (title && recipeUrl) {
            recipes.push({
              title,
              description: description || 'A Mayo Clinic diabetes-friendly recipe',
              ingredients: [],
              instructions: [],
              nutritionInfo: {},
              tags: ['diabetes-friendly', 'mayo-clinic', 'healthy'],
              sourceUrl: recipeUrl.startsWith('http') ? recipeUrl : `https://www.mayoclinic.org${recipeUrl}`,
              imageUrl: imageUrl?.startsWith('http') ? imageUrl : imageUrl ? `https://www.mayoclinic.org${imageUrl}` : undefined
            });
          }
        } catch (error) {
          console.error('Error parsing Mayo Clinic recipe element:', error);
        }
      });

      // Limit to first 20 recipes
      return recipes.slice(0, 20);
    } catch (error) {
      console.error('Error scraping Mayo Clinic:', error);
      return [];
    }
  }

  private static async scrapeRecipeDetails(recipe: ScrapedRecipe): Promise<ScrapedRecipe> {
    try {
      const html = await this.fetchPage(recipe.sourceUrl);
      const $ = cheerio.load(html);

      // Extract ingredients
      const ingredients: string[] = [];
      $('.ingredients li, .ingredient, .recipe-ingredients li').each((_index: number, element: any) => {
        const ingredient = $(element).text().trim();
        if (ingredient) {
          ingredients.push(ingredient);
        }
      });

      // Extract instructions
      const instructions: string[] = [];
      $('.instructions li, .recipe-instructions li, .directions li').each((_index: number, element: any) => {
        const instruction = $(element).text().trim();
        if (instruction) {
          instructions.push(instruction);
        }
      });

      // Extract nutrition info
      const nutritionInfo: any = {};
      $('.nutrition-info, .nutrition-facts').each((_index: number, element: any) => {
        const $nutrition = $(element);
        const calories = $nutrition.find('.calories, [data-calories]').text().match(/\d+/);
        const carbs = $nutrition.find('.carbs, [data-carbs]').text().match(/\d+/);
        const protein = $nutrition.find('.protein, [data-protein]').text().match(/\d+/);
        const fat = $nutrition.find('.fat, [data-fat]').text().match(/\d+/);
        const fiber = $nutrition.find('.fiber, [data-fiber]').text().match(/\d+/);

        if (calories) nutritionInfo.calories = parseInt(calories[0]);
        if (carbs) nutritionInfo.carbs = parseInt(carbs[0]);
        if (protein) nutritionInfo.protein = parseInt(protein[0]);
        if (fat) nutritionInfo.fat = parseInt(fat[0]);
        if (fiber) nutritionInfo.fiber = parseInt(fiber[0]);
      });

      // Extract prep/cook time
      const prepTime = $('.prep-time, .preparation-time').text().trim();
      const cookTime = $('.cook-time, .cooking-time').text().trim();
      const servings = $('.servings, .yield').text().trim();

      return {
        ...recipe,
        ingredients,
        instructions,
        nutritionInfo,
        prepTime: prepTime || undefined,
        cookTime: cookTime || undefined,
        servings: servings ? parseInt(servings.match(/\d+/)?.[0] || '4') : undefined
      };
    } catch (error) {
      console.error(`Error scraping recipe details for ${recipe.title}:`, error);
      return recipe;
    }
  }

  static async scrapeDiabetesRecipes(): Promise<ScrapedRecipe[]> {
    try {
      console.log('Starting to scrape diabetes-friendly recipes...');
      
      // Scrape from both sources
      const [diabetesFoodHubRecipes, mayoClinicRecipes] = await Promise.all([
        this.scrapeDiabetesFoodHubRecipes(),
        this.scrapeMayoClinicRecipes()
      ]);

      // Combine and deduplicate recipes
      const allRecipes = [...diabetesFoodHubRecipes, ...mayoClinicRecipes];
      const uniqueRecipes = allRecipes.filter((recipe, index, self) => 
        index === self.findIndex(r => r.title === recipe.title)
      );

      console.log(`Found ${uniqueRecipes.length} unique recipes`);

      // Scrape detailed information for each recipe (limit to first 10 for performance)
      const detailedRecipes = await Promise.all(
        uniqueRecipes.slice(0, 10).map(recipe => this.scrapeRecipeDetails(recipe))
      );

      console.log(`Successfully scraped ${detailedRecipes.length} detailed recipes`);
      return detailedRecipes;
    } catch (error) {
      console.error('Error scraping diabetes recipes:', error);
      return [];
    }
  }

  static async getMockRecipes(): Promise<ScrapedRecipe[]> {
    // Fallback mock data if scraping fails
    return [
      {
        title: 'Grilled Salmon with Vegetables',
        description: 'A healthy, diabetes-friendly meal rich in omega-3 fatty acids and low in carbohydrates.',
        ingredients: [
          '4 salmon fillets (4 oz each)',
          '2 cups mixed vegetables (broccoli, carrots, bell peppers)',
          '2 tbsp olive oil',
          '1 lemon, sliced',
          'Salt and pepper to taste',
          '1 tsp dried herbs (oregano, thyme)'
        ],
        instructions: [
          'Preheat grill to medium-high heat',
          'Season salmon with salt, pepper, and herbs',
          'Brush vegetables with olive oil and season',
          'Grill salmon for 4-5 minutes per side',
          'Grill vegetables until tender',
          'Serve with lemon slices'
        ],
        nutritionInfo: {
          calories: 320,
          carbs: 8,
          protein: 35,
          fat: 18,
          fiber: 4
        },
        prepTime: '10 minutes',
        cookTime: '15 minutes',
        servings: 4,
        difficulty: 'Easy',
        tags: ['diabetes-friendly', 'low-carb', 'high-protein', 'grilled'],
        sourceUrl: 'https://diabetesfoodhub.org/recipes/grilled-salmon-vegetables'
      },
      {
        title: 'Greek Yogurt Parfait with Berries',
        description: 'A protein-rich breakfast option that helps maintain stable blood sugar levels.',
        ingredients: [
          '1 cup Greek yogurt (non-fat)',
          '1/2 cup mixed berries (strawberries, blueberries, raspberries)',
          '2 tbsp chopped nuts (almonds or walnuts)',
          '1 tbsp honey (optional)',
          '1/4 cup granola (low-sugar)'
        ],
        instructions: [
          'Layer half the Greek yogurt in a glass',
          'Add half the berries and granola',
          'Repeat layers',
          'Top with nuts and drizzle with honey if desired'
        ],
        nutritionInfo: {
          calories: 280,
          carbs: 25,
          protein: 20,
          fat: 12,
          fiber: 5
        },
        prepTime: '5 minutes',
        cookTime: '0 minutes',
        servings: 1,
        difficulty: 'Easy',
        tags: ['breakfast', 'diabetes-friendly', 'protein', 'berries'],
        sourceUrl: 'https://diabetesfoodhub.org/recipes/greek-yogurt-parfait'
      }
    ];
  }
} 