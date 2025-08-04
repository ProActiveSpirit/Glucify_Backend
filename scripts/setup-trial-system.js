#!/usr/bin/env node

/**
 * Trial System Setup Script
 * 
 * This script helps set up the trial system by:
 * 1. Creating the user_trials table
 * 2. Setting up RLS policies
 * 3. Creating helper functions
 * 4. Verifying the setup
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up Glucify Trial System...\n');

// Read the migration file
const migrationPath = path.join(__dirname, '../database/migrations/001_create_user_trials_table.sql');
const migrationContent = fs.readFileSync(migrationPath, 'utf8');

console.log('📋 Migration SQL:');
console.log('='.repeat(50));
console.log(migrationContent);
console.log('='.repeat(50));

console.log('\n📝 Setup Instructions:');
console.log('1. Connect to your Supabase database');
console.log('2. Execute the SQL migration above');
console.log('3. Verify the setup with the commands below\n');

console.log('🔍 Verification Commands:');
console.log('='.repeat(50));

const verificationQueries = [
  {
    name: 'Check if user_trials table exists',
    query: "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_trials');"
  },
  {
    name: 'Check RLS policies',
    query: "SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual FROM pg_policies WHERE tablename = 'user_trials';"
  },
  {
    name: 'Check helper functions',
    query: "SELECT proname FROM pg_proc WHERE proname IN ('get_beta_user_count', 'get_next_beta_user_number', 'update_updated_at_column');"
  },
  {
    name: 'Check table structure',
    query: "SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = 'user_trials' ORDER BY ordinal_position;"
  }
];

verificationQueries.forEach((item, index) => {
  console.log(`${index + 1}. ${item.name}:`);
  console.log(`   ${item.query}\n`);
});

console.log('🧪 Test Data Commands:');
console.log('='.repeat(50));

const testQueries = [
  {
    name: 'Insert test trial (replace with actual user_id)',
    query: `INSERT INTO user_trials (user_id, email, trial_start_date, trial_end_date, is_active, is_beta_user, beta_user_number)
VALUES ('your-user-id-here', 'test@example.com', NOW(), NOW() + INTERVAL '14 days', true, true, 1);`
  },
  {
    name: 'Check beta user count',
    query: "SELECT get_beta_user_count();"
  },
  {
    name: 'Get next beta user number',
    query: "SELECT get_next_beta_user_number();"
  },
  {
    name: 'View all trials',
    query: "SELECT user_id, email, trial_start_date, trial_end_date, is_active, is_beta_user, beta_user_number FROM user_trials ORDER BY created_at DESC;"
  }
];

testQueries.forEach((item, index) => {
  console.log(`${index + 1}. ${item.name}:`);
  console.log(`   ${item.query}\n`);
});

console.log('✅ Setup Complete!');
console.log('\n📚 Next Steps:');
console.log('1. Update your environment variables');
console.log('2. Test the API endpoints');
console.log('3. Verify the frontend integration');
console.log('4. Test the signup flow');

console.log('\n🔗 Useful Links:');
console.log('- Trial System README: TRIAL_SYSTEM_README.md');
console.log('- API Documentation: Check the trial routes');
console.log('- Frontend Integration: Check TrialContext and TrialNotification components');

console.log('\n🚨 Important Notes:');
console.log('- Make sure your Stripe price IDs are configured');
console.log('- Verify your Supabase RLS policies are working');
console.log('- Test the trial creation during signup');
console.log('- Monitor trial conversions and beta user signups'); 