#!/usr/bin/env node

/**
 * Test script for authentication between frontend and backend
 * 
 * This script helps debug authentication issues by testing token validation
 */

const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAuthentication() {
  console.log('🔐 Testing Authentication Flow');
  console.log('================================\n');

  try {
    // 1. Test backend health
    console.log('1️⃣ Testing backend health...');
    const healthResponse = await axios.get(`${backendUrl}/health`);
    console.log('✅ Backend is healthy:', healthResponse.status);

    // 2. Test getting plans (no auth required)
    console.log('\n2️⃣ Testing plans endpoint (no auth)...');
    const plansResponse = await axios.get(`${backendUrl}/api/payment/plans`);
    console.log('✅ Plans endpoint works:', plansResponse.status);

    // 3. Test authentication with invalid token
    console.log('\n3️⃣ Testing with invalid token...');
    try {
      await axios.get(`${backendUrl}/api/payment/subscription`, {
        headers: {
          'Authorization': 'Bearer invalid_token_123'
        }
      });
      console.log('❌ Should have failed with invalid token');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Correctly rejected invalid token');
      } else {
        console.log('❌ Unexpected error:', error.response?.status);
      }
    }

    // 4. Test authentication with no token
    console.log('\n4️⃣ Testing with no token...');
    try {
      await axios.get(`${backendUrl}/api/payment/subscription`);
      console.log('❌ Should have failed with no token');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Correctly rejected request with no token');
      } else {
        console.log('❌ Unexpected error:', error.response?.status);
      }
    }

    // 5. Test Supabase client
    console.log('\n5️⃣ Testing Supabase client...');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.log('❌ Supabase session error:', sessionError.message);
    } else if (session) {
      console.log('✅ Supabase session found');
      console.log('   User ID:', session.user.id);
      console.log('   Token length:', session.access_token?.length || 0);
      
      // 6. Test with valid token
      console.log('\n6️⃣ Testing with valid token...');
      try {
        const response = await axios.get(`${backendUrl}/api/payment/subscription`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });
        console.log('✅ Valid token accepted:', response.status);
      } catch (error) {
        console.log('❌ Valid token rejected:', error.response?.status);
        console.log('   Error:', error.response?.data?.error);
      }
    } else {
      console.log('⚠️  No active Supabase session found');
      console.log('   You need to sign in first to test with valid token');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testAuthentication().then(() => {
  console.log('\n🏁 Authentication test completed');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
}); 