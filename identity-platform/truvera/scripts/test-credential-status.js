#!/usr/bin/env node

/**
 * Test script to verify credential status handling after credential is claimed
 */

const axios = require('axios');
require('dotenv').config({ path: './backend/.env' });

const API_BASE_URL = 'http://localhost:3001/api';

/**
 * Test the credential status endpoint with a non-existent issuer ID
 * This simulates what happens after a credential is claimed and the issuer is deleted
 */
async function testCredentialStatus() {
    console.log('🧪 Testing Credential Status Handling...\n');

    // Test with a fake issuer ID that doesn't exist (simulates claimed credential)
    const fakeIssuerId = '00000000-0000-0000-0000-000000000000';
    
    try {
        console.log(`📡 Testing credential status for issuer: ${fakeIssuerId}`);
        
        const response = await axios.get(`${API_BASE_URL}/credentials/status/${fakeIssuerId}`, {
            timeout: 10000
        });

        console.log('✅ Response received:');
        console.log(`   Status: ${response.status}`);
        console.log(`   Data:`, JSON.stringify(response.data, null, 2));

        // Check if the response indicates the credential was delivered
        if (response.data.success && response.data.deliveryStatus === 'delivered') {
            console.log('\n🎉 SUCCESS: Credential status correctly indicates delivery!');
            console.log('   The system properly handles the case where the issuer is deleted after credential claim.');
        } else {
            console.log('\n⚠️  UNEXPECTED: Response does not indicate successful delivery');
        }

    } catch (error) {
        if (error.response) {
            console.log('❌ API Error:');
            console.log(`   Status: ${error.response.status}`);
            console.log(`   Data:`, JSON.stringify(error.response.data, null, 2));
        } else if (error.code === 'ECONNREFUSED') {
            console.log('❌ Connection Error: Backend server is not running');
            console.log('   Please start the backend server with: npm start');
        } else {
            console.log('❌ Network Error:', error.message);
        }
    }
}

/**
 * Test with a real session ID to see the full flow
 */
async function testWithRealSession() {
    console.log('\n🔄 Testing with a real session...\n');

    try {
        // Create a new session
        console.log('📝 Creating new session...');
        const sessionResponse = await axios.post(`${API_BASE_URL}/session/create`);
        const sessionId = sessionResponse.data.sessionId;
        console.log(`   Session ID: ${sessionId}`);

        // Test status check on new session (should return session not found)
        console.log('\n📡 Testing status on new session...');
        const statusResponse = await axios.get(`${API_BASE_URL}/credentials/status/${sessionId}`);
        
        console.log('✅ Status Response:');
        console.log(`   Status: ${statusResponse.status}`);
        console.log(`   Data:`, JSON.stringify(statusResponse.data, null, 2));

    } catch (error) {
        if (error.response) {
            console.log('📋 Expected Response (session not found):');
            console.log(`   Status: ${error.response.status}`);
            console.log(`   Data:`, JSON.stringify(error.response.data, null, 2));
        } else {
            console.log('❌ Unexpected Error:', error.message);
        }
    }
}

/**
 * Main test function
 */
async function main() {
    console.log('🚀 Starting Credential Status Tests...\n');
    console.log('This test verifies that the system correctly handles credential status');
    console.log('when the OpenID issuer is deleted after successful credential claim.\n');
    console.log('='.repeat(70));

    // Test 1: Non-existent issuer (simulates claimed credential)
    await testCredentialStatus();

    // Test 2: Real session flow
    await testWithRealSession();

    console.log('\n' + '='.repeat(70));
    console.log('🎯 Credential Status Tests Complete!');
    console.log('\nKey Points:');
    console.log('• OpenID issuers with singleUse=true are deleted after credential claim');
    console.log('• 404 responses should be interpreted as successful delivery');
    console.log('• This prevents credential reuse and ensures security');
    console.log('='.repeat(70) + '\n');
}

// Run the test if called directly
if (require.main === module) {
    main().catch(error => {
        console.error('❌ Test failed:', error.message);
        process.exit(1);
    });
}

module.exports = {
    testCredentialStatus,
    testWithRealSession,
    main
};