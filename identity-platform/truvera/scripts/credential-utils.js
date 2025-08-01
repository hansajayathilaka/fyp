#!/usr/bin/env node

/**
 * Credential Testing Utilities
 * Common functions for credential testing scripts
 */

const axios = require('axios');
const QRCode = require('qrcode');
const path = require('path');
const readline = require('readline');

// Sample data arrays for realistic random generation
const FIRST_NAMES = [
    'John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'Robert', 'Lisa',
    'James', 'Maria', 'William', 'Jennifer', 'Richard', 'Patricia', 'Charles',
    'Linda', 'Thomas', 'Barbara', 'Christopher', 'Elizabeth', 'Daniel', 'Helen',
    'Matthew', 'Sandra', 'Anthony', 'Donna', 'Mark', 'Carol', 'Donald', 'Ruth'
];

const LAST_NAMES = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
    'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
    'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
    'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson'
];

const COUNTRIES = [
    'United States', 'Canada', 'United Kingdom', 'Germany', 'France', 'Australia',
    'Japan', 'South Korea', 'Singapore', 'Netherlands', 'Switzerland', 'Sweden',
    'Norway', 'Denmark', 'Finland', 'New Zealand', 'Ireland', 'Belgium', 'Austria',
    'Luxembourg', 'Italy', 'Spain', 'Portugal', 'Czech Republic', 'Poland'
];

const EMAIL_DOMAINS = [
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'protonmail.com',
    'icloud.com', 'aol.com', 'mail.com', 'zoho.com', 'fastmail.com'
];

const INVESTOR_TYPES = ['Individual', 'Company'];
const KYC_LEVELS = ['basic', 'advanced'];

/**
 * Generate a random element from an array
 */
function getRandomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
}

/**
 * Generate a random number between min and max (inclusive)
 */
function getRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate a random first name
 */
function generateFirstName() {
    return getRandomElement(FIRST_NAMES);
}

/**
 * Generate a random last name
 */
function generateLastName() {
    return getRandomElement(LAST_NAMES);
}

/**
 * Generate a realistic NIC (National Identity Card) number
 * Format: 9 digits + 1 letter (e.g., 123456789V)
 */
function generateNIC() {
    const digits = Array.from({ length: 9 }, () => getRandomNumber(0, 9)).join('');
    const letter = String.fromCharCode(65 + getRandomNumber(0, 25)); // A-Z
    return digits + letter;
}

/**
 * Generate a random country
 */
function generateCountry() {
    return getRandomElement(COUNTRIES);
}

/**
 * Generate a realistic email address
 */
function generateEmail(firstName, lastName) {
    const domain = getRandomElement(EMAIL_DOMAINS);
    const username = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${getRandomNumber(1, 999)}`;
    return `${username}@${domain}`;
}

/**
 * Generate a valid Ethereum wallet address
 * Format: 0x followed by 40 hexadecimal characters
 */
function generateWalletAddress() {
    const hexChars = '0123456789abcdef';
    let address = '0x';

    for (let i = 0; i < 40; i++) {
        address += hexChars[Math.floor(Math.random() * hexChars.length)];
    }

    return address;
}

/**
 * Generate a random investor type
 */
function generateInvestorType() {
    return getRandomElement(INVESTOR_TYPES);
}

/**
 * Generate a random KYC level
 */
function generateKYCLevel() {
    return getRandomElement(KYC_LEVELS);
}

/**
 * Generate a random AML status
 * 80% chance of true (passed), 20% chance of false
 */
function generateAMLStatus() {
    return Math.random() < 0.8;
}

/**
 * Generate a secure numerical PIN
 * Format: 6-digit PIN (e.g., 123456)
 */
function generateSecurePIN() {
    // Generate a 6-digit PIN
    const pin = Array.from({ length: 6 }, () => getRandomNumber(0, 9)).join('');
    return pin;
}

/**
 * Generate complete random test data for credential testing
 */
function generateTestData() {
    const firstName = generateFirstName();
    const lastName = generateLastName();

    const testData = {
        firstName,
        lastName,
        nic: generateNIC(),
        country: generateCountry(),
        email: generateEmail(firstName, lastName),
        walletAddress: generateWalletAddress(),
        investorType: generateInvestorType(),
        kycLevel: generateKYCLevel(),
        amlStatus: generateAMLStatus(),
        // Security PIN for credential offer
        securityPIN: generateSecurePIN(),
        // Additional metadata
        generatedAt: new Date().toISOString(),
        testId: `test_${Date.now()}_${getRandomNumber(1000, 9999)}`
    };

    return testData;
}

/**
 * Display test data in a readable format
 */
function displayTestData(testData) {
    console.log('\n' + '='.repeat(60));
    console.log('🧪 GENERATED TEST CREDENTIAL DATA');
    console.log('='.repeat(60));

    console.log('\n📋 Personal Information:');
    console.log(`   First Name: ${testData.firstName}`);
    console.log(`   Last Name: ${testData.lastName}`);
    console.log(`   NIC: ${testData.nic}`);
    console.log(`   Country: ${testData.country}`);
    console.log(`   Email: ${testData.email}`);

    console.log('\n💼 Investment Information:');
    console.log(`   Investor Type: ${testData.investorType}`);
    console.log(`   KYC Level: ${testData.kycLevel}`);
    console.log(`   AML Status: ${testData.amlStatus ? '✅ Passed' : '❌ Failed'}`);

    console.log('\n🔗 Blockchain Information:');
    console.log(`   Wallet Address: ${testData.walletAddress}`);

    console.log('\n🔒 Security Information:');
    console.log(`   Security PIN: ${testData.securityPIN}`);

    console.log('\n🔍 Test Metadata:');
    console.log(`   Test ID: ${testData.testId}`);
    console.log(`   Generated At: ${testData.generatedAt}`);

    console.log('\n' + '='.repeat(60));
    console.log('✨ Test data generation complete!');
    console.log('='.repeat(60) + '\n');
}

/**
 * Validate environment configuration
 */
function validateEnvironment() {
    console.log('\n🔧 Environment Configuration:');
    console.log(`   TRUVERA_API_URL: ${process.env.TRUVERA_API_URL || 'NOT SET'}`);
    console.log(`   TRUVERA_API_KEY: ${process.env.TRUVERA_API_KEY ? process.env.TRUVERA_API_KEY.substring(0, 20) + '...' : 'NOT SET'}`);
    console.log(`   ISSUER_DID: ${process.env.ISSUER_DID || 'NOT SET'}`);
    console.log(`   CREDENTIAL_SCHEMA_URL: ${process.env.CREDENTIAL_SCHEMA_URL || 'NOT SET'}`);

    const requiredVars = ['TRUVERA_API_URL', 'TRUVERA_API_KEY', 'ISSUER_DID', 'CREDENTIAL_SCHEMA_URL'];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
        throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    console.log('   ✅ All required environment variables are set');
}

/**
 * Create Truvera API client with authentication
 */
function createTruveraClient() {
    const apiUrl = process.env.TRUVERA_API_URL;
    const apiKey = process.env.TRUVERA_API_KEY;

    if (!apiUrl || !apiKey) {
        throw new Error('Missing Truvera API configuration. Please check TRUVERA_API_URL and TRUVERA_API_KEY in .env file.');
    }

    return axios.create({
        baseURL: apiUrl,
        timeout: 30000,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'User-Agent': 'Credential-Testing-Script/1.0.0',
        },
    });
}

/**
 * Generate QR code from issuer URL and display it
 */
async function generateQRCode(issuerUrl, filename = 'credential-qr.png') {
    console.log('\n' + '='.repeat(60));
    console.log('📱 GENERATING QR CODE');
    console.log('='.repeat(60));

    try {
        console.log('\n🔗 Processing issuer URL...');
        console.log(`   URL: ${issuerUrl}`);

        // Generate QR code as ASCII art for console display
        console.log('\n🎨 Generating QR code for console display...');
        const qrCodeString = await QRCode.toString(issuerUrl, {
            type: 'terminal',
            small: true
        });

        // Generate QR code as PNG file
        console.log('💾 Saving QR code as PNG file...');
        const qrCodePath = path.join(process.cwd(), filename);
        await QRCode.toFile(qrCodePath, issuerUrl, {
            width: 300,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        });

        console.log('\n✅ QR code generated successfully!');
        console.log(`   File saved: ${qrCodePath}`);

        // Display QR code in console
        console.log('\n📱 QR CODE (scan with Dock wallet):');
        console.log('─'.repeat(60));
        console.log(qrCodeString);
        console.log('─'.repeat(60));

        console.log('\n📋 Instructions:');
        console.log('   1. Open your Dock wallet app');
        console.log('   2. Scan the QR code above');
        console.log('   3. Accept the credential offer');
        console.log('   4. The credential will be added to your wallet');

        console.log('\n' + '='.repeat(60));
        console.log('🎯 QR code generation complete!');
        console.log('='.repeat(60) + '\n');

        return {
            qrCodePath,
            qrCodeString,
            issuerUrl
        };

    } catch (error) {
        console.error('\n❌ Error generating QR code:');
        console.error(`   Error: ${error.message}`);

        // Fallback: display URL as text
        console.log('\n📋 Fallback - Credential Offer URL:');
        console.log(`   ${issuerUrl}`);
        console.log('\n   Copy this URL and open it in your Dock wallet');

        console.log('\n' + '='.repeat(60));
        console.log('❌ QR code generation failed (URL provided as fallback)');
        console.log('='.repeat(60) + '\n');

        throw error;
    }
}

/**
 * Create readline interface for user input
 */
function createReadlineInterface() {
    return readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
}

/**
 * Wait for user input with a custom question
 */
async function waitForUserInput(question) {
    return new Promise((resolve) => {
        const rl = createReadlineInterface();
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer.trim());
        });
    });
}

/**
 * Display clear instructions for scanning QR code with Dock wallet
 */
function displayScanningInstructions() {
    console.log('\n' + '='.repeat(60));
    console.log('📱 DOCK WALLET SCANNING INSTRUCTIONS');
    console.log('='.repeat(60));
    
    console.log('\n🔍 How to scan the QR code with Dock wallet:');
    console.log('   1. 📲 Open the Dock wallet app on your mobile device');
    console.log('   2. 🔍 Look for the "Scan QR Code" or "+" button');
    console.log('   3. 📷 Point your camera at the QR code displayed above');
    console.log('   4. ✅ Accept the credential offer when prompted');
    console.log('   5. 💾 The credential will be saved to your wallet');
    
    console.log('\n⚠️  Important notes:');
    console.log('   • Make sure you have the latest version of Dock wallet');
    console.log('   • Ensure your device has camera permissions enabled');
    console.log('   • The QR code contains a secure credential offer');
    console.log('   • This is a test credential for development purposes');
    
    console.log('\n🔒 Security PIN required:');
    console.log('   • You may be prompted to enter a PIN during the process');
    console.log('   • Use the 6-digit PIN displayed in the test data above');
    console.log('   • This PIN ensures secure credential delivery');
    
    console.log('\n' + '='.repeat(60));
    console.log('📋 Ready to scan? Follow the steps above!');
    console.log('='.repeat(60) + '\n');
}

module.exports = {
    // Data generation functions
    generateTestData,
    displayTestData,
    generateFirstName,
    generateLastName,
    generateNIC,
    generateCountry,
    generateEmail,
    generateWalletAddress,
    generateInvestorType,
    generateKYCLevel,
    generateAMLStatus,
    generateSecurePIN,
    getRandomElement,
    getRandomNumber,
    
    // Environment and API functions
    validateEnvironment,
    createTruveraClient,
    
    // QR code functions
    generateQRCode,
    
    // User interaction functions
    createReadlineInterface,
    waitForUserInput,
    displayScanningInstructions,
    
    // Constants
    FIRST_NAMES,
    LAST_NAMES,
    COUNTRIES,
    EMAIL_DOMAINS,
    INVESTOR_TYPES,
    KYC_LEVELS
};