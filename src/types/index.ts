import { Request } from 'express';

// Food and Meal Types
export interface FoodItem {
  id: string;
  name: string;
  carbsPer100g: number;
  proteinPer100g?: number;
  fatPer100g?: number;
  fiberPer100g?: number;
  glycemicIndex?: number;
  categories: string[];
  imageUrl?: string;
  recipeUrl?: string;
  userRating?: number;
  avgGlucoseImpact?: number;
  portionSize: number;
}

export interface DailyMeal {
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  time: string;
  foods: FoodItem[];
  totalCarbs: number;
  totalCalories: number;
  recommendedInsulin: number;
  preBolusTime: number;
  confidence: number;
  reasoning: string[];
}

export interface MealPlan {
  id: string;
  user_id: string;
  date: string;
  meals: DailyMeal[];
  estimatedTimeInRange: number;
  totalCarbs: number;
  totalCalories: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface UserPreferences {
  user_id: string;
  targetCarbs: number;
  preferences: string[];
  restrictions: string[];
  insulinToCarbRatio?: string;
  targetGlucoseRange?: [number, number];
  created_at: string;
  updated_at: string;
}

// Glucose Data Types
export interface GlucoseReading {
  id: string;
  user_id: string;
  value: number;
  timestamp: string;
  source: 'manual' | 'dexcom' | 'other';
  notes?: string;
  created_at: string;
}

export interface GlucoseStats {
  average: number;
  min: number;
  max: number;
  timeInRange: number;
  readings: number;
  period: 'day' | 'week' | 'month';
}

// Chat and AI Types
export interface ChatConversation {
  id: string;
  user_id: string;
  message: string;
  ai_response: string;
  auto_logged_data?: any;
  glucose_context?: any;
  created_at: string;
}

export interface AIAnalysisRequest {
  message: string;
  glucoseContext?: {
    currentGlucose?: number;
    recentReadings?: GlucoseReading[];
    targetRange?: [number, number];
  };
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Dexcom Integration Types
export interface DexcomAuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

export interface DexcomGlucoseData {
  value: number;
  trend: string;
  time: string;
  displayTime: string;
}

// Error Types
export interface AppError extends Error {
  statusCode: number;
  isOperational: boolean;
}

// File Upload Types
export interface FileUpload {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
}

// Health Check Types
export interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  services: {
    database: boolean;
    supabase: boolean;
    claude: boolean;
  };
} 