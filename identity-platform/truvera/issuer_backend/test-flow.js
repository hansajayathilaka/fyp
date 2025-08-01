#!/usr/bin/env node

/**
 * Comprehensive test script for the credential issuance flow
 * This script tests the full flow and extracts QR code data for manual testing
 */

const axios = require('axios');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

// Handle axios import issues
const axiosInstance = axios.default || axios;

// Configuration
const BASE_URL = 'http://localhost:3001/api';
const TEST_WALLET_ADDRESS = '0x3d4ed828b9c7f60d7b5a5c8e9f2a1b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5';

// Test data
const TEST_FORM_DATA = {
    firstName: 'John',
    lastName: 'Doe',
    nic: '123456789V',
    country: 'United States',
    email: 'john.doe@example.com',
    walletAddress: TEST_WALLET_ADDRESS,
    investorType: 'Individual',
    kycLevel: 'basic',
    amlStatus: 'cleared'
};

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
    log(`\n${step}. ${message}`, 'cyan');
    log('='.repeat(50), 'cyan');
}

function logSuccess(message) {
    log(`✅ ${message}`, 'green');
}

function logError(message) {
    log(`❌ ${message}`, 'red');
}

function logWarning(message) {
    log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
    log(`ℹ️  ${message}`, 'blue');
}

// API helper functions
async function makeRequest(method, endpoint, data = null) {
    try {
        const config = {
            method,
            url: `${BASE_URL}${endpoint}`,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (data) {
            config.data = data;
        }

        const response = await axiosInstance(config);
        return { success: true, data: response.data };
    } catch (error) {
        return {
            success: false,
            error: error.response?.data || error.message,
            status: error.response?.status
        };
    }
}

// Test functions
async function createSession() {
    logStep(1, 'Creating new session');
    
    const result = await makeRequest('POST', '/session/create');
    
    if (result.success && result.data.success) {
        const sessionId = result.data.data.sessionId;
        logSuccess(`Session created: ${sessionId}`);
        return sessionId;
    } else {
        logError(`Failed to create session: ${JSON.stringify(result.error)}`);
        throw new Error('Session creation failed');
    }
}

async function connectWallet(sessionId) {
    logStep(2, 'Connecting wallet');
    
    const result = await makeRequest('POST', '/wallet/connect', {
        sessionId,
        walletAddress: TEST_WALLET_ADDRESS
    });
    
    if (result.success && result.data.success) {
        logSuccess(`Wallet connected: ${TEST_WALLET_ADDRESS}`);
        return true;
    } else {
        logError(`Failed to connect wallet: ${JSON.stringify(result.error)}`);
        throw new Error('Wallet connection failed');
    }
}

async function submitFormData(sessionId) {
    logStep(3, 'Submitting form data');
    
    const result = await makeRequest('POST', '/credentials/form', {
        sessionId,
        formData: TEST_FORM_DATA
    });
    
    if (result.success && result.data.success) {
        logSuccess('Form data submitted successfully');
        logInfo(`Form data: ${JSON.stringify(TEST_FORM_DATA, null, 2)}`);
        return true;
    } else {
        logError(`Failed to submit form data: ${JSON.stringify(result.error)}`);
        throw new Error('Form data submission failed');
    }
}

async function generateCredentialOfferQR(sessionId) {
    logStep(4, 'Generating credential offer QR code');
    
    const result = await makeRequest('POST', '/credentials/qr-generate', {
        sessionId
    });
    
    if (result.success && result.data.success) {
        const qrData = result.data.data;
        logSuccess('Credential offer QR code generated successfully');
        logInfo(`Connection ID: ${qrData.connectionId}`);
        logInfo(`Credential Offer URL: ${qrData.credentialOfferUrl}`);
        
        // Extract and display QR code data
        log('\n📱 QR CODE DATA FOR MANUAL TESTING:', 'magenta');
        log('='.repeat(60), 'magenta');
        log(qrData.qrCodeData, 'bright');
        log('='.repeat(60), 'magenta');
        
        // Save QR code data to file
        const qrDataFile = path.join(__dirname, 'qr-code-data.txt');
        fs.writeFileSync(qrDataFile, qrData.qrCodeData);
        logInfo(`QR code data saved to: ${qrDataFile}`);
        
        // Generate QR code image
        try {
            const qrCodeImage = await QRCode.toDataURL(qrData.qrCodeData, {
                width: 512,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#ffffff',
                },
            });
            
            // Save QR code image as base64
            const qrImageFile = path.join(__dirname, 'qr-code.html');
            const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Credential Offer QR Code</title>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 20px; }
        .qr-container { margin: 20px 0; }
        .qr-data { background: #f5f5f5; padding: 15px; margin: 20px 0; word-break: break-all; }
        .instructions { text-align: left; max-width: 600px; margin: 0 auto; }
    </style>
</head>
<body>
    <h1>DEIP Access Credential Offer</h1>
    <div class="qr-container">
        <img src="${qrCodeImage}" alt="Credential Offer QR Code" />
    </div>
    <h3>QR Code Data:</h3>
    <div class="qr-data">${qrData.qrCodeData}</div>
    <div class="instructions">
        <h3>Testing Instructions:</h3>
        <ol>
            <li>Open your Truvera (Dock) wallet app</li>
            <li>Look for a "Scan QR Code" or "Receive Credential" option</li>
            <li>Scan the QR code above or manually enter the QR code data</li>
            <li>Review the credential offer details</li>
            <li>Accept the credential to receive it in your wallet</li>
        </ol>
        <h3>Expected Credential Data:</h3>
        <pre>${JSON.stringify(TEST_FORM_DATA, null, 2)}</pre>
    </div>
</body>
</html>`;
            
            fs.writeFileSync(qrImageFile, htmlContent);
            logInfo(`QR code image saved to: ${qrImageFile}`);
            logInfo('Open the HTML file in your browser to see the QR code');
            
        } catch (qrError) {
            logWarning(`Failed to generate QR code image: ${qrError.message}`);
        }
        
        return qrData;
    } else {
        logError(`Failed to generate credential offer QR: ${JSON.stringify(result.error)}`);
        throw new Error('Credential offer QR generation failed');
    }
}

async function checkCredentialStatus(sessionId, maxAttempts = 10) {
    logStep(5, 'Checking credential status');
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        logInfo(`Status check attempt ${attempt}/${maxAttempts}`);
        
        const result = await makeRequest('GET', `/credentials/status/${sessionId}`);
        
        if (result.success && result.data.success) {
            const status = result.data.data;
            logInfo(`Status: ${status.status}, Delivery: ${status.deliveryStatus}`);
            
            if (status.status === 'issued' && status.deliveryStatus === 'delivered') {
                logSuccess('Credential has been issued and delivered!');
                return status;
            } else if (status.status === 'failed') {
                logError('Credential issuance failed');
                return status;
            } else {
                logInfo('Credential is still pending...');
            }
        } else {
            logWarning(`Status check failed: ${JSON.stringify(result.error)}`);
        }
        
        if (attempt < maxAttempts) {
            logInfo('Waiting 5 seconds before next check...');
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
    
    logWarning('Maximum status check attempts reached');
    return null;
}

async function getSessionInfo(sessionId) {
    logStep(6, 'Getting session information');
    
    const result = await makeRequest('GET', `/session/${sessionId}`);
    
    if (result.success && result.data.success) {
        const session = result.data.data;
        logSuccess('Session information retrieved');
        logInfo(`Current step: ${session.currentStep}`);
        logInfo(`Wallet address: ${session.walletAddress || 'Not set'}`);
        logInfo(`Connection ID: ${session.connectionId || 'Not set'}`);
        logInfo(`Issuer ID: ${session.issuerId || 'Not set'}`);
        logInfo(`Credential ID: ${session.credentialId || 'Not set'}`);
        return session;
    } else {
        logWarning(`Failed to get session info: ${JSON.stringify(result.error)}`);
        return null;
    }
}

// Main test function
async function runFullFlowTest() {
    log('🚀 Starting Credential Issuance Flow Test', 'bright');
    log('=' .repeat(60), 'bright');
    
    let sessionId;
    
    try {
        // Step 1: Create session
        sessionId = await createSession();
        
        // Step 2: Connect wallet
        await connectWallet(sessionId);
        
        // Step 3: Submit form data
        await submitFormData(sessionId);
        
        // Step 4: Generate credential offer QR
        const qrData = await generateCredentialOfferQR(sessionId);
        
        // Step 5: Check initial credential status
        await checkCredentialStatus(sessionId, 2);
        
        // Step 6: Get session info
        await getSessionInfo(sessionId);
        
        // Final instructions
        log('\n🎯 MANUAL TESTING INSTRUCTIONS:', 'magenta');
        log('=' .repeat(60), 'magenta');
        log('1. The QR code data has been saved to qr-code-data.txt', 'yellow');
        log('2. A visual QR code has been saved to qr-code.html', 'yellow');
        log('3. Open qr-code.html in your browser to see the QR code', 'yellow');
        log('4. Use your Truvera (Dock) wallet to scan the QR code', 'yellow');
        log('5. Accept the credential offer in your wallet', 'yellow');
        log('6. Run the status check script to verify delivery', 'yellow');
        
        log('\n📋 QR CODE DATA (for manual entry):', 'cyan');
        log(qrData.qrCodeData, 'bright');
        
        log('\n✅ Test completed successfully!', 'green');
        log(`Session ID: ${sessionId}`, 'green');
        
        return { success: true, sessionId, qrData };
        
    } catch (error) {
        logError(`Test failed: ${error.message}`);
        
        if (sessionId) {
            log(`\nSession ID for debugging: ${sessionId}`, 'yellow');
        }
        
        return { success: false, error: error.message, sessionId };
    }
}

// Status check only function
async function runStatusCheck(sessionId) {
    if (!sessionId) {
        logError('Session ID is required for status check');
        return;
    }
    
    log(`🔍 Checking status for session: ${sessionId}`, 'bright');
    
    try {
        await checkCredentialStatus(sessionId, 1);
        await getSessionInfo(sessionId);
    } catch (error) {
        logError(`Status check failed: ${error.message}`);
    }
}

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];
const sessionId = args[1];

// Main execution
async function main() {
    if (command === 'status' && sessionId) {
        await runStatusCheck(sessionId);
    } else if (command === 'test' || !command) {
        const result = await runFullFlowTest();
        
        if (result.success) {
            log('\n💡 To check status later, run:', 'blue');
            log(`node test-flow.js status ${result.sessionId}`, 'bright');
        }
    } else {
        log('Usage:', 'yellow');
        log('  node test-flow.js test          # Run full flow test', 'yellow');
        log('  node test-flow.js status <id>   # Check status of existing session', 'yellow');
    }
}

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
    logError(`Unhandled error: ${error.message}`);
    process.exit(1);
});

// Run the script
main().catch(error => {
    logError(`Script failed: ${error.message}`);
    process.exit(1);
});