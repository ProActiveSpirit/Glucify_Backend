#!/usr/bin/env node

/**
 * Setup script for Supabase Service Role Key
 * 
 * This script helps you set up the SUPABASE_SERVICE_ROLE_KEY environment variable
 * which is required for the backend to bypass Row Level Security (RLS) policies
 * when creating and managing user trials.
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Setting up Supabase Service Role Key for Backend');
console.log('==================================================\n');

// Check if .env file exists
const envPath = path.join(__dirname, '..', '.env');
const envExists = fs.existsSync(envPath);

if (!envExists) {
  console.log('❌ No .env file found in the backend directory.');
  console.log('Please create a .env file with the following variables:');
  console.log('');
  console.log('SUPABASE_URL=your_supabase_project_url');
  console.log('SUPABASE_ANON_KEY=your_supabase_anon_key');
  console.log('SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key');
  console.log('');
  console.log('You can copy from env.example as a starting point.');
  process.exit(1);
}

// Read current .env file
let envContent = fs.readFileSync(envPath, 'utf8');

// Check if service role key is already set
if (envContent.includes('SUPABASE_SERVICE_ROLE_KEY=')) {
  const lines = envContent.split('\n');
  const serviceRoleLine = lines.find(line => line.startsWith('SUPABASE_SERVICE_ROLE_KEY='));
  
  if (serviceRoleLine && !serviceRoleLine.includes('your_supabase_service_role_key')) {
    console.log('✅ SUPABASE_SERVICE_ROLE_KEY is already configured');
    console.log('Current value:', serviceRoleLine.split('=')[1]);
    console.log('');
    console.log('If you need to update it, please edit the .env file manually.');
  } else {
    console.log('⚠️  SUPABASE_SERVICE_ROLE_KEY is set but appears to be a placeholder');
    console.log('Please update it with your actual service role key in the .env file');
  }
} else {
  console.log('❌ SUPABASE_SERVICE_ROLE_KEY is not configured');
  console.log('');
  console.log('To get your service role key:');
  console.log('1. Go to your Supabase project dashboard');
  console.log('2. Navigate to Settings > API');
  console.log('3. Copy the "service_role" key (not the anon key)');
  console.log('4. Add it to your .env file:');
  console.log('   SUPABASE_SERVICE_ROLE_KEY=your_actual_service_role_key');
  console.log('');
  console.log('⚠️  IMPORTANT: Keep your service role key secret!');
  console.log('   It has admin privileges and can bypass all RLS policies.');
}

console.log('\n📋 Next Steps:');
console.log('1. Ensure your .env file has the correct SUPABASE_SERVICE_ROLE_KEY');
console.log('2. Restart your backend server');
console.log('3. Test the trial creation by signing up a new user');
console.log('');
console.log('🔍 To verify the setup:');
console.log('   npm run test:trial-system'); 