#!/usr/bin/env node

/**
 * Test script for authentication matching between frontend and backend
 * 
 * This script tests that the frontend getAuthHeaders and backend authenticateToken
 * are properly matched and working together.
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

async function testAuthMatching() {
  console.log('🔐 Testing Authentication Matching');
  console.log('===================================\n');

  try {
    // 1. Test backend health
    console.log('1️⃣ Testing backend health...');
    const healthResponse = await axios.get(`${backendUrl}/health`);
    console.log('✅ Backend is healthy:', healthResponse.status);

    // 2. Test Supabase session
    console.log('\n2️⃣ Testing Supabase session...');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.log('❌ Supabase session error:', sessionError.message);
      console.log('   You need to sign in first to test authentication');
      return;
    }
    
    if (!session) {
      console.log('⚠️  No active Supabase session found');
      console.log('   You need to sign in first to test authentication');
      return;
    }

    console.log('✅ Supabase session found');
    console.log('   User ID:', session.user.id);
    console.log('   Email:', session.user.email);
    console.log('   Token length:', session.access_token?.length || 0);
    console.log('   Token prefix:', session.access_token?.substring(0, 20) + '...');

    // 3. Test token format
    console.log('\n3️⃣ Testing token format...');
    const token = session.access_token;
    const authHeader = `Bearer ${token}`;
    
    console.log('   Auth header format:', authHeader.substring(0, 30) + '...');
    console.log('   Token type:', typeof token);
    console.log('   Token length:', token?.length || 0);

    // 4. Test backend authentication with valid token
    console.log('\n4️⃣ Testing backend authentication with valid token...');
    try {
      const response = await axios.get(`${backendUrl}/api/payment/subscription`, {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ Valid token accepted by backend');
      console.log('   Response status:', response.status);
      console.log('   User authenticated:', !!response.data?.data);
    } catch (error) {
      console.log('❌ Valid token rejected by backend');
      console.log('   Status:', error.response?.status);
      console.log('   Error:', error.response?.data?.error);
      console.log('   This indicates a mismatch between frontend and backend auth');
    }

    // 5. Test trial endpoints
    console.log('\n5️⃣ Testing trial endpoints...');
    try {
      const trialResponse = await axios.get(`${backendUrl}/api/trial/status`, {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ Trial endpoint accepts token');
      console.log('   Response status:', trialResponse.status);
    } catch (error) {
      console.log('❌ Trial endpoint rejects token');
      console.log('   Status:', error.response?.status);
      console.log('   Error:', error.response?.data?.error);
    }

    // 6. Test beta status endpoint
    console.log('\n6️⃣ Testing beta status endpoint...');
    try {
      const betaResponse = await axios.get(`${backendUrl}/api/payment/beta-status`, {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ Beta status endpoint accepts token');
      console.log('   Response status:', betaResponse.status);
    } catch (error) {
      console.log('❌ Beta status endpoint rejects token');
      console.log('   Status:', error.response?.status);
      console.log('   Error:', error.response?.data?.error);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testAuthMatching().then(() => {
  console.log('\n🏁 Authentication matching test completed');
  console.log('\n📋 Summary:');
  console.log('   - If all endpoints accept the token: ✅ Authentication is working');
  console.log('   - If endpoints reject the token: ❌ Check backend auth middleware');
  console.log('   - If no session found: ⚠️  Sign in to the app first');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
}); 