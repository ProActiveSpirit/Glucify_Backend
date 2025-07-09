import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env['SUPABASE_URL'] || 'https://mock.supabase.co';
const supabaseAnonKey = process.env['SUPABASE_ANON_KEY'] || 'mock-anon-key';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️  Using mock Supabase configuration for development. Please set up proper environment variables for production.');
}

// Create Supabase client with anon key for user operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true
  }
});

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true
  }
});

export interface DatabaseConfig {
  url: string;
  anonKey: string;
}

export const databaseConfig: DatabaseConfig = {
  url: supabaseUrl,
  anonKey: supabaseAnonKey,
}; 