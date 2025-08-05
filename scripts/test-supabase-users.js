#!/usr/bin/env node

/**
 * Test script for authentication with actual Supabase users
 * 
 * This script tests authentication with the users shown in your Supabase dashboard
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

async function testSupabaseUsers() {
  console.log('🔐 Testing Authentication with Supabase Users');
  console.log('=============================================\n');

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
      console.log('   Try signing in with one of these users from your dashboard:');
      console.log('   - tim@glucify.com');
      console.log('   - jdgwork028@gmail.com');
      console.log('   - tim@capecandle.com');
      console.log('   - puddingbear0217@gmail.com');
      console.log('   - proactive0217@protonmail.com');
      return;
    }

    console.log('✅ Supabase session found');
    console.log('   User ID:', session.user.id);
    console.log('   Email:', session.user.email);
    console.log('   Token length:', session.access_token?.length || 0);
    console.log('   Token prefix:', session.access_token?.substring(0, 20) + '...');

    // 3. Test JWT token decoding
    console.log('\n3️⃣ Testing JWT token decoding...');
    const jwt = require('jsonwebtoken');
    const decoded = jwt.decode(session.access_token);
    
    if (decoded) {
      console.log('✅ JWT token decoded successfully');
      console.log('   User ID (sub):', decoded.sub);
      console.log('   Email:', decoded.email);
      console.log('   Expires:', new Date(decoded.exp * 1000).toISOString());
      console.log('   Issued:', new Date(decoded.iat * 1000).toISOString());
    } else {
      console.log('❌ Failed to decode JWT token');
    }

    // 4. Test backend authentication
    console.log('\n4️⃣ Testing backend authentication...');
    const authHeader = `Bearer ${session.access_token}`;
    
    try {
      const response = await axios.get(`${backendUrl}/api/payment/subscription`, {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ Backend authentication successful');
      console.log('   Response status:', response.status);
      console.log('   User authenticated:', !!response.data?.data);
    } catch (error) {
      console.log('❌ Backend authentication failed');
      console.log('   Status:', error.response?.status);
      console.log('   Error:', error.response?.data?.error);
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
      console.log('✅ Trial endpoint authentication successful');
      console.log('   Response status:', trialResponse.status);
    } catch (error) {
      console.log('❌ Trial endpoint authentication failed');
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
      console.log('✅ Beta status endpoint authentication successful');
      console.log('   Response status:', betaResponse.status);
    } catch (error) {
      console.log('❌ Beta status endpoint authentication failed');
      console.log('   Status:', error.response?.status);
      console.log('   Error:', error.response?.data?.error);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testSupabaseUsers().then(() => {
  console.log('\n🏁 Supabase users authentication test completed');
  console.log('\n📋 Summary:');
  console.log('   - If all endpoints accept the token: ✅ Authentication is working');
  console.log('   - If endpoints reject the token: ❌ Check backend auth middleware');
  console.log('   - If no session found: ⚠️  Sign in to the app first');
  console.log('\n👥 Available users from your dashboard:');
  console.log('   - tim@glucify.com (Email provider)');
  console.log('   - jdgwork028@gmail.com (Email provider)');
  console.log('   - tim@capecandle.com (Google provider)');
  console.log('   - puddingbear0217@gmail.com (Google provider)');
  console.log('   - proactive0217@protonmail.com (Email provider)');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
}); 