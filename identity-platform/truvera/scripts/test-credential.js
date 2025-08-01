#!/usr/bin/env node

/**
 * Credential Testing Flow Script
 * Generates random test data and tests credential issuance with Dock wallet
 */

const {
    generateTestData,
    displayTestData,
    validateEnvironment,
    createTruveraClient,
    generateQRCode,
    createReadlineInterface,
    displayScanningInstructions
} = require('./credential-utils');

require('dotenv').config({ path: './issuer_backend/.env' });

/**
 * Create OpenID issuer using the generated test data
 */
async function createOpenIDIssuer(testData) {
    console.log('\n' + '='.repeat(60));
    console.log('🔗 CREATING OPENID ISSUER');
    console.log('='.repeat(60));

    try {
        const client = createTruveraClient();

        console.log('\n📡 Connecting to Truvera API...');
        console.log(`   API URL: ${process.env.TRUVERA_API_URL}`);
        console.log(`   API Key: ${process.env.TRUVERA_API_KEY ? process.env.TRUVERA_API_KEY.substring(0, 20) + '...' : 'Not set'}`);

        // Validate required environment variables
        const schemaUrl = process.env.CREDENTIAL_SCHEMA_URL;
        const issuerDid = process.env.ISSUER_DID;

        if (!schemaUrl) {
            throw new Error('CREDENTIAL_SCHEMA_URL environment variable is required');
        }

        if (!issuerDid) {
            throw new Error('ISSUER_DID environment variable is required');
        }

        // Create OpenID issuer configuration with proper signing
        const issuerConfig = {
            credentialOptions: {
                credential: {
                    name: 'DEIP Access Credential',
                    description: 'This credential provides access to the DEIP platform',
                    type: ['VerifiableCredential', 'DEIPAccessCredential'],
                    '@context': [
                        'https://www.w3.org/2018/credentials/v1',
                        schemaUrl
                    ],
                    credentialSchema: {
                        id: schemaUrl,
                        type: 'JsonSchemaValidator2018'
                    },
                    subject: {
                        id: testData.nic, // Use NIC as the credential subject ID
                        firstName: testData.firstName,
                        lastName: testData.lastName,
                        country: testData.country,
                        email: testData.email,
                        walletAddress: testData.walletAddress,
                        investorType: testData.investorType,
                        kycLevel: testData.kycLevel,
                        amlStatus: testData.amlStatus,
                    },
                    issuer: issuerDid,
                    issuanceDate: new Date().toISOString(),
                    expirationDate: new Date(Date.now() + 8760 * 60 * 60 * 1000).toISOString(), // 1 year
                },
                // Add signing algorithm to ensure credentials are properly signed
                algorithm: 'ed25519', // Use ed25519 for signing
                anchor: false, // Don't anchor on blockchain for testing
                persist: false, // Don't store encrypted version
                distribute: false, // Don't auto-distribute
                format: 'jsonld' // Use JSON-LD format
            },
            singleUse: true,
        };

        console.log('\n🏗️  Creating OpenID issuer with credential data...');
        console.log(`   Issuer DID: ${issuerDid}`);
        console.log(`   Schema URL: ${schemaUrl}`);
        console.log(`   Subject ID: ${testData.nic}`);
        console.log(`   Subject Name: ${testData.firstName} ${testData.lastName}`);

        console.log('\n🔍 Request payload:');
        console.log(JSON.stringify(issuerConfig, null, 2));

        // Make API call to create OpenID issuer
        const response = await client.post('/openid/issuers', issuerConfig);

        const issuerId = response.data.id;
        const issuerUrl = response.data.qrUrl || response.data.credentialOfferUrl || response.data.issuerUrl;

        console.log('\n🔍 Response data:');
        console.log(JSON.stringify(response.data, null, 2));

        console.log('\n✅ OpenID issuer created successfully!');
        console.log(`   Issuer ID: ${issuerId}`);
        console.log(`   Issuer URL: ${issuerUrl}`);

        // Create a credential offer for the issuer
        console.log('\n🎫 Creating credential offer...');
        console.log(`   🔒 Security PIN: ${testData.securityPIN}`);

        const offerResponse = await client.post('/openid/credential-offers', {
            id: issuerId,
            requestParameters: {
                user_pin: testData.securityPIN,
                pin_hint: "Enter the 6-digit PIN shown in the console"
            }
        });

        const credentialOfferUrl = offerResponse.data.url;
        console.log('\n🔍 Credential offer response:');
        console.log(JSON.stringify(offerResponse.data, null, 2));

        console.log('\n✅ Credential offer created successfully!');
        console.log(`   Offer URL: ${credentialOfferUrl}`);

        console.log('\n' + '='.repeat(60));
        console.log('🎯 OpenID issuer and credential offer creation complete!');
        console.log('='.repeat(60) + '\n');

        return {
            issuerId,
            issuerUrl,
            credentialOfferUrl: credentialOfferUrl || issuerUrl,
        };

    } catch (error) {
        console.error('\n❌ Error creating OpenID issuer:');

        if (error.response) {
            console.error(`   Status: ${error.response.status}`);
            console.error(`   Message: ${error.response.data?.message || error.message}`);
            console.error(`   Details:`, error.response.data);
        } else if (error.request) {
            console.error('   Network error: Failed to connect to Truvera API');
            console.error(`   Check if API URL is correct: ${process.env.TRUVERA_API_URL}`);
        } else {
            console.error(`   Error: ${error.message}`);
        }

        console.log('\n' + '='.repeat(60));
        console.log('❌ OpenID issuer creation failed!');
        console.log('='.repeat(60) + '\n');

        throw error;
    }
}



/**
 * Wait for user confirmation that they received the credentials
 */
async function waitForUserConfirmation() {
    console.log('\n' + '='.repeat(60));
    console.log('⏳ WAITING FOR USER CONFIRMATION');
    console.log('='.repeat(60));

    const rl = createReadlineInterface();

    return new Promise((resolve) => {
        console.log('\n📱 Please scan the QR code with your Dock wallet and complete the credential receipt process.');
        console.log('\n🔍 Steps to follow:');
        console.log('   1. Open your Dock wallet app');
        console.log('   2. Scan the QR code displayed above');
        console.log('   3. Enter the security PIN when prompted');
        console.log('   4. Accept the credential in your wallet');
        console.log('   5. Verify the credential appears in your wallet');
        
        const askConfirmation = () => {
            rl.question('\n❓ Have you successfully received the credential in your wallet? (y/n): ', (answer) => {
                const response = answer.toLowerCase().trim();
                
                if (response === 'y' || response === 'yes') {
                    console.log('\n✅ Great! User confirmed credential receipt.');
                    rl.close();
                    resolve({
                        success: true,
                        userConfirmed: true,
                        timestamp: new Date().toISOString()
                    });
                } else if (response === 'n' || response === 'no') {
                    console.log('\n❌ User indicated they have not received the credential yet.');
                    console.log('💡 Please try scanning the QR code again or check your wallet connection.');
                    
                    rl.question('\n🔄 Would you like to try again? (y/n): ', (retryAnswer) => {
                        const retryResponse = retryAnswer.toLowerCase().trim();
                        
                        if (retryResponse === 'y' || retryResponse === 'yes') {
                            console.log('\n🔄 Waiting for credential receipt...');
                            askConfirmation(); // Ask again
                        } else {
                            console.log('\n⏹️  User chose to stop waiting.');
                            rl.close();
                            resolve({
                                success: false,
                                userConfirmed: false,
                                timestamp: new Date().toISOString()
                            });
                        }
                    });
                } else {
                    console.log('\n⚠️  Please answer with "y" for yes or "n" for no.');
                    askConfirmation(); // Ask again
                }
            });
        };

        askConfirmation();
    });
}

/**
 * Monitor issuer status and track what happens over time
 * Uses multiple APIs to get comprehensive status information
 */
async function monitorIssuerStatus(issuerId) {
    console.log('\n' + '='.repeat(60));
    console.log('🔍 MONITORING ISSUER STATUS');
    console.log('='.repeat(60));

    const client = createTruveraClient();
    let checkCount = 0;
    const maxChecks = 20; // Check for up to 20 times
    const checkInterval = 5000; // Check every 5 seconds

    console.log(`\n📡 Starting comprehensive status monitoring for issuer: ${issuerId}`);
    console.log(`   Check interval: ${checkInterval / 1000} seconds`);
    console.log(`   Maximum checks: ${maxChecks}`);
    console.log(`   Total monitoring time: ${(maxChecks * checkInterval) / 1000} seconds`);
    console.log(`\n🔧 APIs being used:`);
    console.log(`   • GET /openid/issuers/{id} - Check issuer status`);
    console.log(`   • GET /jobs/{id} - Check any associated job status (if applicable)`);

    return new Promise((resolve) => {
        const statusCheck = async () => {
            checkCount++;
            const timestamp = new Date().toISOString();
            
            console.log(`\n📊 Status Check #${checkCount} at ${timestamp}`);
            console.log('─'.repeat(50));

            try {
                // Primary check: OpenID issuer status
                console.log(`🔍 Checking OpenID issuer status...`);
                const issuerResponse = await client.get(`/openid/issuers/${issuerId}`);
                
                console.log(`✅ Issuer Response Status: ${issuerResponse.status} ${issuerResponse.statusText}`);
                console.log(`📄 Issuer Response Data:`);
                console.log(JSON.stringify(issuerResponse.data, null, 2));
                
                // Check if issuer still exists and is active
                if (issuerResponse.data && issuerResponse.data.id) {
                    console.log(`🟢 Issuer Status: ACTIVE (ID: ${issuerResponse.data.id})`);
                    console.log(`🔗 QR URL: ${issuerResponse.data.qrUrl || 'Not available'}`);
                    console.log(`📅 Created: ${issuerResponse.data.created || 'Unknown'}`);
                    console.log(`📅 Updated: ${issuerResponse.data.updated || 'Unknown'}`);
                    console.log(`🔒 Single Use: ${issuerResponse.data.singleUse ? 'Yes' : 'No'}`);
                    
                    // Check if there's any job ID associated with this issuer
                    if (issuerResponse.data.jobId) {
                        console.log(`\n🔍 Found associated job ID: ${issuerResponse.data.jobId}`);
                        console.log(`🔍 Checking job status...`);
                        
                        try {
                            const jobResponse = await client.get(`/jobs/${issuerResponse.data.jobId}`);
                            console.log(`✅ Job Response Status: ${jobResponse.status} ${jobResponse.statusText}`);
                            console.log(`📄 Job Response Data:`);
                            console.log(JSON.stringify(jobResponse.data, null, 2));
                            
                            if (jobResponse.data && jobResponse.data.status) {
                                console.log(`🔧 Job Status: ${jobResponse.data.status.toUpperCase()}`);
                                console.log(`🆔 Job ID: ${jobResponse.data.id}`);
                                
                                if (jobResponse.data.result) {
                                    console.log(`📊 Job Result Available: Yes`);
                                } else {
                                    console.log(`📊 Job Result Available: No (still processing)`);
                                }
                            }
                        } catch (jobError) {
                            if (jobError.response && jobError.response.status === 404) {
                                console.log(`⚠️  Job not found (404) - may have been cleaned up`);
                            } else {
                                console.log(`⚠️  Error checking job status: ${jobError.message}`);
                            }
                        }
                    } else {
                        console.log(`ℹ️  No associated job ID found`);
                    }
                } else {
                    console.log(`⚠️  Issuer Status: UNKNOWN (No ID in response)`);
                }

                // Additional check: Try to get all issuers to see if this one still exists in the list
                try {
                    console.log(`\n🔍 Cross-checking with issuer list...`);
                    const allIssuersResponse = await client.get('/openid/issuers');
                    const issuerExists = allIssuersResponse.data && 
                                       allIssuersResponse.data.some(issuer => issuer.id === issuerId);
                    
                    console.log(`📋 Issuer exists in list: ${issuerExists ? 'Yes' : 'No'}`);
                    console.log(`📊 Total active issuers: ${allIssuersResponse.data ? allIssuersResponse.data.length : 'Unknown'}`);
                } catch (listError) {
                    console.log(`⚠️  Could not check issuer list: ${listError.message}`);
                }

            } catch (error) {
                console.log(`❌ Primary Request Failed:`);
                
                if (error.response) {
                    console.log(`   Status: ${error.response.status} ${error.response.statusText}`);
                    console.log(`   Error Data:`, JSON.stringify(error.response.data, null, 2));
                    
                    if (error.response.status === 404) {
                        console.log(`🔴 Issuer Status: DELETED/NOT_FOUND`);
                        console.log(`💡 This likely means the credential was claimed and the single-use issuer was deleted.`);
                        
                        // Try to verify this by checking if any credentials were issued
                        try {
                            console.log(`\n🔍 Checking recent credential activity...`);
                            const credentialsResponse = await client.get('/credentials?limit=10');
                            if (credentialsResponse.data && credentialsResponse.data.length > 0) {
                                console.log(`📊 Recent credentials found: ${credentialsResponse.data.length}`);
                                const recentCredential = credentialsResponse.data[0];
                                console.log(`📅 Most recent credential issued: ${recentCredential.created || 'Unknown'}`);
                            }
                        } catch (credError) {
                            console.log(`⚠️  Could not check recent credentials: ${credError.message}`);
                        }
                        
                        console.log('\n' + '='.repeat(60));
                        console.log('🎯 MONITORING COMPLETE - ISSUER DELETED');
                        console.log('='.repeat(60));
                        console.log(`\n📈 Summary:`);
                        console.log(`   • Total checks performed: ${checkCount}`);
                        console.log(`   • Issuer was active for: ${(checkCount - 1) * checkInterval / 1000} seconds`);
                        console.log(`   • Final status: DELETED (credential likely claimed)`);
                        console.log(`   • This is expected behavior for single-use issuers`);
                        
                        resolve({
                            success: true,
                            finalStatus: 'deleted',
                            checksPerformed: checkCount,
                            credentialClaimed: true
                        });
                        return;
                    }
                } else if (error.request) {
                    console.log(`   Network Error: ${error.message}`);
                } else {
                    console.log(`   Error: ${error.message}`);
                }
            }

            // Continue checking if we haven't reached the limit
            if (checkCount < maxChecks) {
                console.log(`⏳ Waiting ${checkInterval / 1000} seconds for next check...`);
                setTimeout(statusCheck, checkInterval);
            } else {
                console.log('\n' + '='.repeat(60));
                console.log('⏰ MONITORING TIMEOUT');
                console.log('='.repeat(60));
                console.log(`\n📈 Summary:`);
                console.log(`   • Total checks performed: ${checkCount}`);
                console.log(`   • Monitoring duration: ${(maxChecks * checkInterval) / 1000} seconds`);
                console.log(`   • Final status: STILL_ACTIVE (credential not claimed yet)`);
                
                resolve({
                    success: false,
                    finalStatus: 'timeout',
                    checksPerformed: checkCount,
                    credentialClaimed: false
                });
            }
        };

        // Start the first check
        statusCheck();
    });
}

/**
 * Check credential delivery status using multiple API endpoints
 * This function demonstrates the recommended approach for backend implementation
 */
async function checkCredentialDeliveryStatus(issuerId, credentialId = null) {
    console.log('\n' + '='.repeat(60));
    console.log('🔍 CHECKING CREDENTIAL DELIVERY STATUS');
    console.log('='.repeat(60));

    const client = createTruveraClient();
    const timestamp = new Date().toISOString();
    
    console.log(`\n📡 Checking delivery status at ${timestamp}`);
    console.log(`   Issuer ID: ${issuerId}`);
    console.log(`   Credential ID: ${credentialId || 'Not provided'}`);

    const statusResult = {
        timestamp,
        issuerId,
        credentialId,
        issuerExists: false,
        issuerStatus: 'unknown',
        deliveryStatus: 'unknown',
        credentialClaimed: false,
        jobStatus: null,
        recommendations: []
    };

    try {
        // 1. Check OpenID issuer status (primary indicator)
        console.log(`\n🔍 Step 1: Checking OpenID issuer status...`);
        
        try {
            const issuerResponse = await client.get(`/openid/issuers/${issuerId}`);
            
            statusResult.issuerExists = true;
            statusResult.issuerStatus = 'active';
            statusResult.deliveryStatus = 'pending';
            
            console.log(`✅ Issuer Status: ACTIVE`);
            console.log(`📊 Issuer Data:`, JSON.stringify(issuerResponse.data, null, 2));
            
            // Check for associated job
            if (issuerResponse.data.jobId) {
                console.log(`\n🔍 Step 2: Checking associated job status...`);
                try {
                    const jobResponse = await client.get(`/jobs/${issuerResponse.data.jobId}`);
                    statusResult.jobStatus = jobResponse.data.status;
                    console.log(`✅ Job Status: ${jobResponse.data.status.toUpperCase()}`);
                } catch (jobError) {
                    console.log(`⚠️  Job check failed: ${jobError.message}`);
                }
            }
            
        } catch (issuerError) {
            if (issuerError.response && issuerError.response.status === 404) {
                statusResult.issuerExists = false;
                statusResult.issuerStatus = 'deleted';
                statusResult.deliveryStatus = 'delivered';
                statusResult.credentialClaimed = true;
                
                console.log(`🎯 Issuer Status: DELETED (404)`);
                console.log(`💡 This indicates successful credential delivery!`);
                
                statusResult.recommendations.push('Update deliveryStatus to "delivered" in your database');
                statusResult.recommendations.push('404 response is expected and indicates success');
                statusResult.recommendations.push('No further polling needed for this credential');
                
            } else {
                console.log(`❌ Issuer check failed: ${issuerError.message}`);
                statusResult.issuerStatus = 'error';
                statusResult.deliveryStatus = 'error';
            }
        }

        // 2. If we have a credential ID, check credential metadata
        if (credentialId) {
            console.log(`\n🔍 Step 3: Checking credential metadata...`);
            try {
                const credentialResponse = await client.get(`/credentials/${credentialId}`);
                console.log(`✅ Credential exists in system`);
                console.log(`📊 Credential Data:`, JSON.stringify(credentialResponse.data, null, 2));
            } catch (credError) {
                if (credError.response && credError.response.status === 404) {
                    console.log(`⚠️  Credential not found (404) - may not be persisted`);
                } else {
                    console.log(`⚠️  Credential check failed: ${credError.message}`);
                }
            }
        }

        // 3. Check recent credential activity for context
        console.log(`\n🔍 Step 4: Checking recent credential activity...`);
        try {
            const recentCredentials = await client.get('/credentials?limit=5');
            if (recentCredentials.data && recentCredentials.data.length > 0) {
                console.log(`📊 Recent credentials in system: ${recentCredentials.data.length}`);
                const latest = recentCredentials.data[0];
                console.log(`📅 Latest credential issued: ${latest.created || 'Unknown'}`);
            }
        } catch (credListError) {
            console.log(`⚠️  Could not check recent credentials: ${credListError.message}`);
        }

    } catch (error) {
        console.log(`❌ Unexpected error during status check: ${error.message}`);
        statusResult.deliveryStatus = 'error';
    }

    // Generate recommendations based on findings
    if (statusResult.deliveryStatus === 'delivered') {
        statusResult.recommendations.push('Credential successfully delivered to holder');
        statusResult.recommendations.push('Single-use issuer automatically deleted after claim');
        statusResult.recommendations.push('This is the expected successful completion state');
    } else if (statusResult.deliveryStatus === 'pending') {
        statusResult.recommendations.push('Credential not yet claimed by holder');
        statusResult.recommendations.push('QR code/deep link is still valid');
        statusResult.recommendations.push('Continue monitoring or set expiration timeout');
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 DELIVERY STATUS SUMMARY');
    console.log('='.repeat(60));
    console.log(`\n🎯 Results:`);
    console.log(`   • Issuer Exists: ${statusResult.issuerExists ? '✅ Yes' : '❌ No'}`);
    console.log(`   • Issuer Status: ${statusResult.issuerStatus.toUpperCase()}`);
    console.log(`   • Delivery Status: ${statusResult.deliveryStatus.toUpperCase()}`);
    console.log(`   • Credential Claimed: ${statusResult.credentialClaimed ? '✅ Yes' : '❌ No'}`);
    console.log(`   • Job Status: ${statusResult.jobStatus || 'N/A'}`);

    if (statusResult.recommendations.length > 0) {
        console.log(`\n💡 Recommendations:`);
        statusResult.recommendations.forEach((rec, index) => {
            console.log(`   ${index + 1}. ${rec}`);
        });
    }

    console.log('\n' + '='.repeat(60) + '\n');

    return statusResult;
}

/**
 * Display completion message and exit script
 */
function displayCompletionMessage(testData, monitoringResult = null, userConfirmation = null) {
    console.log('\n' + '='.repeat(60));
    console.log('🎉 CREDENTIAL TESTING FLOW COMPLETE');
    console.log('='.repeat(60));

    console.log('\n📊 Test Summary:');
    console.log(`   • Test ID: ${testData.testId}`);
    console.log(`   • Credential Subject: ${testData.firstName} ${testData.lastName}`);
    console.log(`   • NIC: ${testData.nic}`);
    console.log(`   • Country: ${testData.country}`);
    console.log(`   • Investor Type: ${testData.investorType}`);
    console.log(`   • KYC Level: ${testData.kycLevel}`);
    console.log(`   • AML Status: ${testData.amlStatus ? '✅ Passed' : '❌ Failed'}`);
    console.log(`   • Generated At: ${testData.generatedAt}`);

    if (userConfirmation) {
        console.log('\n👤 User Confirmation:');
        console.log(`   • User confirmed receipt: ${userConfirmation.userConfirmed ? '✅ Yes' : '❌ No'}`);
        console.log(`   • Confirmation timestamp: ${userConfirmation.timestamp}`);
    }

    if (monitoringResult) {
        console.log('\n🔍 Monitoring Results:');
        console.log(`   • Status checks performed: ${monitoringResult.checksPerformed}`);
        console.log(`   • Final issuer status: ${monitoringResult.finalStatus.toUpperCase()}`);
        console.log(`   • Credential claimed: ${monitoringResult.credentialClaimed ? '✅ Yes' : '❌ No'}`);
        
        if (monitoringResult.finalStatus === 'deleted') {
            console.log('\n✅ Test completed successfully!');
            console.log('\n🎯 What was accomplished:');
            console.log('   ✅ Random test data generated');
            console.log('   ✅ OpenID issuer created via Truvera API');
            console.log('   ✅ Credential offer generated');
            console.log('   ✅ QR code created and displayed');
            console.log('   ✅ User confirmation received');
            console.log('   ✅ Issuer monitoring completed');
            console.log('   ✅ Credential was claimed (issuer deleted)');

            console.log('\n🔬 Key Findings:');
            console.log('   • Single-use OpenID issuers are automatically deleted after credential claim');
            console.log('   • 404 "Cannot find OpenID issuer" means successful credential delivery');
            console.log('   • This behavior is expected and indicates proper security');
            console.log('   • User confirmation validates the end-to-end flow');
            
        } else if (monitoringResult.finalStatus === 'timeout') {
            console.log('\n⏰ Test completed with timeout.');
            console.log('\n🎯 What was accomplished:');
            console.log('   ✅ Random test data generated');
            console.log('   ✅ OpenID issuer created via Truvera API');
            console.log('   ✅ Credential offer generated');
            console.log('   ✅ QR code created and displayed');
            console.log('   ✅ User confirmation received');
            console.log('   ✅ Issuer monitoring completed');
            console.log('   ⏰ Credential was not claimed during monitoring period');

            console.log('\n💡 Next steps:');
            console.log('   • The QR code is still valid - you can scan it with your Dock wallet');
            console.log('   • Run the script again to generate a fresh credential');
            console.log('   • Check that your Dock wallet is properly configured');
        }
    }

    console.log('\n📁 Files created:');
    console.log('   • credential-qr.png (QR code image)');

    console.log('\n🔄 Recommendations for backend implementation:');
    console.log('   • Use GET /openid/issuers/{id} as primary status check');
    console.log('   • Handle 404 responses as successful credential delivery');
    console.log('   • Update deliveryStatus to "delivered" when issuer returns 404');
    console.log('   • Don\'t treat 404 as an error - it\'s expected behavior');
    console.log('   • Check GET /jobs/{id} if jobId is available in issuer response');
    console.log('   • Use GET /credentials for recent activity context');
    console.log('   • Consider caching the last known status to avoid repeated 404s');
    console.log('   • Implement exponential backoff for polling to reduce API calls');

    console.log('\n' + '='.repeat(60));
    console.log('🚀 Thank you for testing the credential flow!');
    console.log('='.repeat(60) + '\n');
}

/**
 * Main function to run the test data generation, OpenID issuer creation, and QR code generation
 */
async function main() {
    console.log('🚀 Starting Credential Testing Flow...');

    try {
        // Validate environment configuration
        validateEnvironment();

        console.log('\n📊 Generating random test data...\n');

        // Generate random test data
        const testData = generateTestData();

        // Display the generated data
        displayTestData(testData);

        // Create OpenID issuer with the test data
        const issuerResult = await createOpenIDIssuer(testData);

        // Generate QR code from the credential offer URL
        const qrCodeResult = await generateQRCode(issuerResult.credentialOfferUrl);

        // Display scanning instructions for Dock wallet
        displayScanningInstructions();

        // Wait for user confirmation that they received the credentials
        console.log('\n🔄 Waiting for user to receive credentials...');
        const userConfirmation = await waitForUserConfirmation();

        // If user confirmed receipt, also monitor the issuer status to verify technical completion
        let monitoringResult = null;
        let deliveryStatusResult = null;
        
        if (userConfirmation.userConfirmed) {
            console.log('\n🔄 User confirmed receipt! Now performing technical verification...');
            
            // First, do a quick status check using the recommended backend approach
            console.log('\n🔄 Demonstrating recommended backend status check approach...');
            deliveryStatusResult = await checkCredentialDeliveryStatus(issuerResult.issuerId);
            
            // Then do the full monitoring if the credential hasn't been claimed yet
            if (!deliveryStatusResult.credentialClaimed) {
                console.log('\n🔄 Credential not yet claimed, starting continuous monitoring...');
                monitoringResult = await monitorIssuerStatus(issuerResult.issuerId);
            } else {
                console.log('\n✅ Credential already claimed! Skipping continuous monitoring.');
                monitoringResult = {
                    success: true,
                    finalStatus: 'deleted',
                    checksPerformed: 1,
                    credentialClaimed: true
                };
            }
        } else {
            console.log('\n⏹️  User did not confirm receipt. Skipping technical monitoring.');
        }

        // Display completion message and exit
        displayCompletionMessage(testData, monitoringResult, userConfirmation);

        // Return all results for potential future use
        return {
            testData,
            issuerResult,
            qrCodeResult,
            userConfirmation,
            monitoringResult
        };

    } catch (error) {
        console.error('❌ Error in credential testing flow:', error.message);

        // Display error completion message
        console.log('\n' + '='.repeat(60));
        console.log('❌ CREDENTIAL TESTING FLOW FAILED');
        console.log('='.repeat(60));
        console.log(`\n💥 Error: ${error.message}`);
        console.log('\n🔧 Troubleshooting:');
        console.log('   • Check your .env configuration');
        console.log('   • Verify Truvera API connectivity');
        console.log('   • Ensure all required environment variables are set');
        console.log('   • Check the console output above for specific error details');
        console.log('\n' + '='.repeat(60) + '\n');

        process.exit(1);
    }
}

// Run the script if called directly
if (require.main === module) {
    main().catch(error => {
        console.error('❌ Unhandled error:', error.message);
        process.exit(1);
    });
}

// Export functions for potential use in other modules
module.exports = {
    createOpenIDIssuer,
    waitForUserConfirmation,
    monitorIssuerStatus,
    checkCredentialDeliveryStatus,
    displayCompletionMessage,
    main
};