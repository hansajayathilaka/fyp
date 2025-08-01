#!/usr/bin/env node

/**
 * Credential Verification Testing Script
 * Tests credential verification process using Truvera API
 */

const {
    validateEnvironment,
    createTruveraClient,
    waitForUserInput,
    displayTestData,
    generateTestData,
    generateQRCode
} = require('./credential-utils');

require('dotenv').config({ path: '../backend/.env' });

/**
 * Display verification instructions
 */
function displayVerificationInstructions() {
    console.log('\n' + '='.repeat(60));
    console.log('🔍 CREDENTIAL VERIFICATION TESTING');
    console.log('='.repeat(60));
    
    console.log('\n📋 How to test credential verification:');
    console.log('   1. 📱 This script will generate a QR code');
    console.log('   2. 🔍 Open your Dock wallet app');
    console.log('   3. 📷 Scan the QR code with your wallet');
    console.log('   4. 📄 Select the credential you want to present');
    console.log('   5. ✅ Confirm the credential presentation');
    console.log('   6. 🔄 The script will automatically verify the credential');
    
    console.log('\n⚠️  Important notes:');
    console.log('   • Make sure you have a valid credential in your wallet');
    console.log('   • The QR code will request credential presentation');
    console.log('   • This script will verify the credential authenticity');
    console.log('   • Verification checks signature, issuer, and expiration');
    
    console.log('\n' + '='.repeat(60));
    console.log('📋 Ready to verify? The QR code will be generated next!');
    console.log('='.repeat(60) + '\n');
}

/**
 * Create a proof request for credential verification
 */
async function createProofRequest() {
    console.log('\n' + '='.repeat(60));
    console.log('📋 CREATING PROOF REQUEST');
    console.log('='.repeat(60));
    
    try {
        const client = createTruveraClient();
        
        console.log('\n📡 Connecting to Truvera API...');
        console.log(`   API URL: ${process.env.TRUVERA_API_URL}`);
        console.log(`   API Key: ${process.env.TRUVERA_API_KEY ? process.env.TRUVERA_API_KEY.substring(0, 20) + '...' : 'Not set'}`);
        
        // Create proof request payload
        const proofRequestPayload = {
            name: 'DEIP Credential Verification',
            request: {
                name: 'DEIP Access Credential Verification',
                purpose: 'Verify your DEIP access credential for platform access',
                input_descriptors: [
                    {
                        id: 'deip_access_credential',
                        name: 'DEIP Access Credential',
                        purpose: 'We need to verify your DEIP access credential',
                        constraints: {
                            fields: [
                                {
                                    path: ['$.type'],
                                    filter: {
                                        type: 'array',
                                        contains: {
                                            const: 'DEIPAccessCredential'
                                        }
                                    }
                                },
                                {
                                    path: ['$.credentialSubject.firstName'],
                                    filter: {
                                        type: 'string'
                                    }
                                },
                                {
                                    path: ['$.credentialSubject.lastName'],
                                    filter: {
                                        type: 'string'
                                    }
                                },
                                {
                                    path: ['$.credentialSubject.kycLevel'],
                                    filter: {
                                        type: 'string'
                                    }
                                }
                            ]
                        }
                    }
                ]
            }
        };
        
        console.log('\n🏗️  Creating proof request...');
        console.log(`   Request Name: ${proofRequestPayload.name}`);
        console.log(`   Purpose: ${proofRequestPayload.request.purpose}`);
        
        console.log('\n🔍 Request payload:');
        console.log(JSON.stringify(proofRequestPayload, null, 2));
        
        // Make API call to create proof request
        const response = await client.post('/proof-requests', proofRequestPayload);
        
        const proofRequest = response.data;
        
        console.log('\n🔍 Response data:');
        console.log(JSON.stringify(proofRequest, null, 2));
        
        console.log('\n✅ Proof request created successfully!');
        console.log(`   Request ID: ${proofRequest.id}`);
        console.log(`   QR Code URL: ${proofRequest.qr}`);
        console.log(`   Response URL: ${proofRequest.response_url}`);
        
        console.log('\n' + '='.repeat(60));
        console.log('🎯 Proof request creation complete!');
        console.log('='.repeat(60) + '\n');
        
        return proofRequest;
        
    } catch (error) {
        console.error('\n❌ Error creating proof request:');
        
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
        console.log('❌ Proof request creation failed!');
        console.log('='.repeat(60) + '\n');
        
        throw error;
    }
}

/**
 * Generate a sample credential for testing purposes
 */
function generateSampleCredential() {
    const testData = generateTestData();
    
    const sampleCredential = {
        "@context": [
            "https://www.w3.org/2018/credentials/v1",
            process.env.CREDENTIAL_SCHEMA_URL || "https://schema.truvera.io/DEIPAccessCredential-V1.json"
        ],
        "type": ["VerifiableCredential", "DEIPAccessCredential"],
        "id": `urn:uuid:${testData.testId}`,
        "issuer": process.env.ISSUER_DID || "did:cheqd:testnet:sample-issuer",
        "issuanceDate": new Date().toISOString(),
        "expirationDate": new Date(Date.now() + 8760 * 60 * 60 * 1000).toISOString(), // 1 year
        "credentialSubject": {
            "id": testData.nic,
            "firstName": testData.firstName,
            "lastName": testData.lastName,
            "country": testData.country,
            "email": testData.email,
            "walletAddress": testData.walletAddress,
            "investorType": testData.investorType,
            "kycLevel": testData.kycLevel,
            "amlStatus": testData.amlStatus
        },
        "credentialSchema": {
            "id": process.env.CREDENTIAL_SCHEMA_URL || "https://schema.truvera.io/DEIPAccessCredential-V1.json",
            "type": "JsonSchemaValidator2018"
        },
        "proof": {
            "type": "Ed25519Signature2018",
            "created": new Date().toISOString(),
            "verificationMethod": `${process.env.ISSUER_DID || "did:cheqd:testnet:sample-issuer"}#keys-1`,
            "proofPurpose": "assertionMethod",
            "proofValue": "z" + "sample-proof-value-for-testing-purposes".repeat(3)
        }
    };
    
    console.log('\n🧪 Sample credential generated with test data:');
    displayTestData(testData);
    
    return sampleCredential;
}

/**
 * Wait for credential presentation by polling the proof request
 */
async function waitForCredentialPresentation(proofRequest) {
    console.log('\n' + '='.repeat(60));
    console.log('⏳ WAITING FOR CREDENTIAL PRESENTATION');
    console.log('='.repeat(60));
    
    const client = createTruveraClient();
    const maxAttempts = 60; // 5 minutes with 5-second intervals
    let attempts = 0;
    
    console.log('\n🔄 Polling for credential presentation...');
    console.log(`   Request ID: ${proofRequest.id}`);
    console.log(`   Max wait time: ${maxAttempts * 5} seconds`);
    console.log(`   Poll interval: 5 seconds`);
    
    while (attempts < maxAttempts) {
        try {
            attempts++;
            console.log(`\n📡 Poll attempt ${attempts}/${maxAttempts}...`);
            
            // Get the current status of the proof request
            const response = await client.get(`/proof-requests/${proofRequest.id}`);
            const updatedRequest = response.data;
            
            console.log(`   Status: ${updatedRequest.verified ? 'Verified' : 'Pending'}`);
            console.log(`   Expired: ${updatedRequest.expired ? 'Yes' : 'No'}`);
            console.log(`   Presentation keys: ${updatedRequest.presentation ? Object.keys(updatedRequest.presentation).length : 'null'}`);
            
            // Check if we received a presentation (must have actual content, not just empty object)
            if (updatedRequest.presentation && Object.keys(updatedRequest.presentation).length > 0) {
                console.log('\n✅ Credential presentation received!');
                console.log('\n🔍 Presentation data:');
                console.log(JSON.stringify(updatedRequest.presentation, null, 2));
                
                return {
                    success: true,
                    proofRequest: updatedRequest,
                    presentation: updatedRequest.presentation,
                    verified: updatedRequest.verified
                };
            }
            
            // Check if the proof request was verified (alternative way to detect completion)
            if (updatedRequest.verified === true) {
                console.log('\n✅ Proof request verified!');
                console.log('\n🔍 Updated request data:');
                console.log(JSON.stringify(updatedRequest, null, 2));
                
                return {
                    success: true,
                    proofRequest: updatedRequest,
                    presentation: updatedRequest.presentation,
                    verified: updatedRequest.verified
                };
            }
            
            // Check if the request expired
            if (updatedRequest.expired) {
                console.log('\n⏰ Proof request has expired!');
                return {
                    success: false,
                    error: 'Proof request expired',
                    proofRequest: updatedRequest
                };
            }
            
            // Wait 5 seconds before next poll (to avoid rate limiting)
            if (attempts < maxAttempts) {
                console.log('   Waiting 5 seconds before next poll...');
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
            
        } catch (error) {
            console.error(`\n❌ Error polling proof request (attempt ${attempts}):`, error.message);
            
            // Wait before retrying
            if (attempts < maxAttempts) {
                console.log('   Waiting 5 seconds before retry...');
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
    }
    
    console.log('\n⏰ Timeout reached - no credential presentation received');
    return {
        success: false,
        error: 'Timeout waiting for credential presentation',
        proofRequest
    };
}

/**
 * Verify the received presentation
 */
async function verifyPresentation(presentation, presentationResult) {
    console.log('\n' + '='.repeat(60));
    console.log('🔍 VERIFYING PRESENTATION');
    console.log('='.repeat(60));
    
    try {
        const client = createTruveraClient();
        
        console.log('\n📡 Verifying presentation with Truvera API...');
        
        // Verify the entire presentation using the /verify endpoint
        console.log('\n🔍 Verifying the complete presentation...');
        
        try {
            // Check if the proof request itself was verified successfully
            // This indicates that the credentials were validated during the presentation process
            console.log('\n🔍 Checking proof request verification status...');
            
            // Get the current proof request status from the waitForCredentialPresentation result
            const proofRequestVerified = presentationResult?.verified || false;
            
            // The proof request being verified means the credentials were successfully validated
            // during the presentation process by the Truvera platform
            if (proofRequestVerified) {
                console.log('\n✅ Proof request was successfully verified by Truvera platform');
                console.log('   This means the credentials were cryptographically validated during presentation');
                
                // Extract credential information for display
                let verificationResults = [];
                if (presentation.credentials && Array.isArray(presentation.credentials)) {
                    presentation.credentials.forEach((credential, index) => {
                        console.log(`\n📄 Credential ${index + 1} validation:`);
                        console.log(`   Type: ${credential.type ? credential.type.join(', ') : 'Unknown'}`);
                        console.log(`   Issuer: ${credential.issuer?.id || credential.issuer || 'Unknown'}`);
                        console.log(`   Subject: ${credential.credentialSubject?.firstName || ''} ${credential.credentialSubject?.lastName || ''}`.trim() || 'Unknown');
                        console.log(`   Status: ✅ Verified (via proof request validation)`);
                        
                        verificationResults.push({
                            credential,
                            verified: true, // Proof request verification confirms this
                            response: { verified: true, method: 'proof-request-validation' }
                        });
                    });
                }
                
                return {
                    verified: true,
                    partiallyVerified: false,
                    results: verificationResults,
                    presentation,
                    method: 'proof-request-validation'
                };
            }
            
            // If proof request wasn't verified, try direct verification as fallback
            console.log('\n⚠️  Proof request not verified, attempting direct credential verification...');
            
            // First, let's analyze the credentials
            if (presentation.credentials && Array.isArray(presentation.credentials)) {
                for (let i = 0; i < presentation.credentials.length; i++) {
                    const credential = presentation.credentials[i];
                    console.log(`\n📄 Analyzing credential ${i + 1}/${presentation.credentials.length}...`);
                    console.log(`   Has proof field: ${credential.proof ? '✅ Yes' : '❌ No'}`);
                    console.log(`   Has @context: ${credential['@context'] ? '✅ Yes' : '❌ No'}`);
                    console.log(`   Has type: ${credential.type ? '✅ Yes' : '❌ No'}`);
                    console.log(`   Has issuer: ${credential.issuer ? '✅ Yes' : '❌ No'}`);
                    console.log(`   Has credentialSubject: ${credential.credentialSubject ? '✅ Yes' : '❌ No'}`);
                    
                    if (!credential.proof) {
                        console.log(`   ⚠️  Credential is missing cryptographic proof - this may be why verification fails`);
                    }
                }
            }
            
            // Try to verify the presentation format
            const verifiablePresentation = {
                "@context": [
                    "https://www.w3.org/2018/credentials/v1"
                ],
                "type": ["VerifiablePresentation"],
                "holder": presentation.holder,
                "verifiableCredential": presentation.credentials || []
            };
            
            console.log('\n🔍 Attempting direct presentation verification...');
            const response = await client.post('/verify', verifiablePresentation);
            
            console.log(`\n📋 Verification result: ${response.data.verified ? '✅ Verified' : '❌ Failed'}`);
            
            // Log detailed results if available
            if (response.data.results && Array.isArray(response.data.results)) {
                console.log(`\n🔍 Detailed verification results:`);
                response.data.results.forEach((result, idx) => {
                    console.log(`   Result ${idx + 1}:`);
                    console.log(`     Verified: ${result.verified ? '✅ Yes' : '❌ No'}`);
                    if (result.error) {
                        console.log(`     Error: ${result.error}`);
                    }
                    if (result.proof) {
                        console.log(`     Proof Type: ${result.proof.type || 'Unknown'}`);
                        console.log(`     Verification Method: ${result.proof.verificationMethod || 'Unknown'}`);
                    }
                });
            }
            
            // Extract credential information for display
            let verificationResults = [];
            if (presentation.credentials && Array.isArray(presentation.credentials)) {
                presentation.credentials.forEach((credential, index) => {
                    verificationResults.push({
                        credential,
                        verified: response.data.verified, // Overall verification status applies to all credentials
                        response: response.data
                    });
                });
            }
            
            return {
                verified: response.data.verified,
                partiallyVerified: false, // Either all verified or none
                results: verificationResults,
                presentation,
                apiResponse: response.data
            };
            
        } catch (verifyError) {
            console.log(`\n❌ Presentation verification failed: ${verifyError.message}`);
            if (verifyError.response?.data) {
                console.log(`   API Error Details: ${JSON.stringify(verifyError.response.data, null, 2)}`);
            }
            
            // Fallback: try to verify individual credentials if presentation verification fails
            console.log('\n🔄 Attempting to verify individual credentials as fallback...');
            
            let verificationResults = [];
            
            if (presentation.credentials && Array.isArray(presentation.credentials)) {
                console.log(`\n🔍 Found ${presentation.credentials.length} credential(s) to verify individually`);
                
                for (let i = 0; i < presentation.credentials.length; i++) {
                    const credential = presentation.credentials[i];
                    console.log(`\n📄 Verifying credential ${i + 1}/${presentation.credentials.length}...`);
                    console.log(`   Type: ${credential.type ? credential.type.join(', ') : 'Unknown'}`);
                    console.log(`   Issuer: ${credential.issuer?.id || credential.issuer || 'Unknown'}`);
                    console.log(`   Subject: ${credential.credentialSubject?.firstName || ''} ${credential.credentialSubject?.lastName || ''}`.trim() || 'Unknown');
                    
                    try {
                        // Verify individual credential
                        const credResponse = await client.post('/verify', credential);
                        
                        console.log(`   Result: ${credResponse.data.verified ? '✅ Verified' : '❌ Failed'}`);
                        
                        if (!credResponse.data.verified && credResponse.data.results) {
                            credResponse.data.results.forEach((result, idx) => {
                                if (result.error) {
                                    console.log(`   Error ${idx + 1}: ${result.error}`);
                                }
                            });
                        }
                        
                        verificationResults.push({
                            credential,
                            verified: credResponse.data.verified,
                            response: credResponse.data
                        });
                        
                    } catch (credError) {
                        console.log(`   Result: ❌ Error - ${credError.message}`);
                        if (credError.response?.data) {
                            console.log(`   API Error: ${JSON.stringify(credError.response.data, null, 2)}`);
                        }
                        verificationResults.push({
                            credential,
                            verified: false,
                            error: credError.message,
                            response: credError.response?.data
                        });
                    }
                }
            } else {
                console.log('\n⚠️  No credentials found in presentation format');
                return {
                    verified: false,
                    error: 'No credentials found in presentation',
                    presentation
                };
            }
            
            // Determine overall verification status from individual results
            const allVerified = verificationResults.every(result => result.verified === true);
            const anyVerified = verificationResults.some(result => result.verified === true);
            
            return {
                verified: allVerified,
                partiallyVerified: anyVerified && !allVerified,
                results: verificationResults,
                presentation,
                fallbackUsed: true
            };
        }
        
        // Final summary (this should not be reached due to the return statements above)
        console.log('\n⚠️  Unexpected code path reached - no verification results available');
        return {
            verified: false,
            error: 'Unexpected verification flow',
            presentation
        };
        
    } catch (error) {
        console.error('\n❌ Error verifying presentation:');
        
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
        console.log('❌ PRESENTATION VERIFICATION FAILED');
        console.log('='.repeat(60));
        
        throw error;
    }
}

/**
 * Display verification results
 */
function displayVerificationResults(presentationResult, verificationResult) {
    console.log('\n' + '='.repeat(60));
    console.log('📊 VERIFICATION RESULTS');
    console.log('='.repeat(60));
    
    const verified = verificationResult?.verified || false;
    const partiallyVerified = verificationResult?.partiallyVerified || false;
    const presentation = presentationResult.presentation;
    
    // Overall status
    if (verified) {
        console.log('\n🎉 USER STATUS: VERIFIED ✅');
        console.log('\n✅ All credentials in the presentation are valid and authentic!');
    } else if (partiallyVerified) {
        console.log('\n⚠️  USER STATUS: PARTIALLY VERIFIED ⚠️');
        console.log('\n⚠️  Some credentials are valid, but others failed verification!');
    } else {
        console.log('\n⚠️  USER STATUS: UNVERIFIED ❌');
        console.log('\n❌ The credential verification failed!');
    }
    
    // Detailed results
    console.log('\n📋 Verification Details:');
    console.log(`   Overall Status: ${verified ? '✅ VERIFIED' : (partiallyVerified ? '⚠️ PARTIALLY VERIFIED' : '❌ UNVERIFIED')}`);
    console.log(`   Proof Request Status: ${presentationResult.verified ? '✅ Completed' : '❌ Failed'}`);
    
    if (verificationResult?.fallbackUsed) {
        console.log(`   Verification Method: ⚠️ Individual credential verification (fallback)`);
    } else {
        console.log(`   Verification Method: ✅ Complete presentation verification`);
    }
    
    if (verificationResult?.results && Array.isArray(verificationResult.results)) {
        console.log(`   Total Credentials: ${verificationResult.results.length}`);
        console.log(`   Verified Credentials: ${verificationResult.results.filter(r => r.verified).length}`);
        console.log(`   Failed Credentials: ${verificationResult.results.filter(r => !r.verified).length}`);
        
        verificationResult.results.forEach((result, index) => {
            console.log(`\n   📄 Credential ${index + 1}:`);
            console.log(`     Status: ${result.verified ? '✅ Verified' : '❌ Failed'}`);
            if (result.error) {
                console.log(`     Error: ${result.error}`);
            }
            if (result.credential) {
                const cred = result.credential;
                console.log(`     Type: ${cred.type ? cred.type.join(', ') : 'Unknown'}`);
                console.log(`     Subject: ${cred.credentialSubject?.firstName || ''} ${cred.credentialSubject?.lastName || ''}`.trim() || 'Unknown');
            }
        });
    }
    
    // Extract credential information from presentation (use first credential for detailed display)
    let credential = null;
    if (presentation && presentation.credentials && Array.isArray(presentation.credentials) && presentation.credentials.length > 0) {
        credential = presentation.credentials[0];
    }
    
    if (credential) {
        // Credential information
        console.log('\n📄 Primary Credential Information:');
        console.log(`   Type: ${credential.type ? credential.type.join(', ') : 'Unknown'}`);
        console.log(`   Issuer: ${credential.issuer?.id || credential.issuer || 'Unknown'}`);
        console.log(`   Name: ${credential.name || 'Unknown'}`);
        
        if (credential.credentialSubject) {
            const subject = credential.credentialSubject;
            console.log('\n👤 Subject Information:');
            console.log(`   ID: ${subject.id || 'Unknown'}`);
            console.log(`   Name: ${subject.firstName || ''} ${subject.lastName || ''}`.trim() || 'Unknown');
            console.log(`   Country: ${subject.country || 'Unknown'}`);
            console.log(`   Email: ${subject.email || 'Unknown'}`);
            console.log(`   Investor Type: ${subject.investorType || 'Unknown'}`);
            console.log(`   KYC Level: ${subject.kycLevel || 'Unknown'}`);
            console.log(`   AML Status: ${subject.amlStatus ? '✅ Passed' : '❌ Failed'}`);
            console.log(`   Wallet Address: ${subject.walletAddress || 'Unknown'}`);
        }
        
        // Validity period
        console.log('\n📅 Validity Period:');
        console.log(`   Issued: ${credential.issuanceDate || 'Unknown'}`);
        console.log(`   Expires: ${credential.expirationDate || 'Unknown'}`);
        
        if (credential.expirationDate) {
            const expirationDate = new Date(credential.expirationDate);
            const now = new Date();
            const isExpired = expirationDate < now;
            console.log(`   Status: ${isExpired ? '❌ Expired' : '✅ Valid'}`);
        }
        
        // Issuer information
        if (credential.issuer && typeof credential.issuer === 'object') {
            console.log('\n🏢 Issuer Information:');
            console.log(`   Name: ${credential.issuer.name || 'Unknown'}`);
            console.log(`   Description: ${credential.issuer.description || 'Unknown'}`);
            console.log(`   DID: ${credential.issuer.id || 'Unknown'}`);
        }
    }
    
    // Presentation information
    if (presentation) {
        console.log('\n📋 Presentation Information:');
        console.log(`   Holder: ${presentation.holder || 'Unknown'}`);
        console.log(`   Credentials Count: ${presentation.credentials ? presentation.credentials.length : 0}`);
    }
    
    console.log('\n' + '='.repeat(60));
    if (verified) {
        console.log('🎯 VERIFICATION COMPLETE - USER IS VERIFIED!');
    } else if (partiallyVerified) {
        console.log('🎯 VERIFICATION COMPLETE - USER IS PARTIALLY VERIFIED!');
    } else {
        console.log('🎯 VERIFICATION COMPLETE - USER IS UNVERIFIED!');
    }
    console.log('='.repeat(60) + '\n');
}

/**
 * Display completion message
 */
function displayCompletionMessage(success, presentationResult, verificationResult) {
    console.log('\n' + '='.repeat(60));
    console.log('🎉 CREDENTIAL VERIFICATION TESTING COMPLETE');
    console.log('='.repeat(60));
    
    if (success && presentationResult && verificationResult) {
        const verified = verificationResult.verified;
        
        console.log('\n✅ Test completed successfully!');
        
        console.log('\n🎯 What was accomplished:');
        console.log('   ✅ Proof request created successfully');
        console.log('   ✅ QR code generated and displayed');
        console.log('   ✅ Credential presentation received from wallet');
        console.log('   ✅ Presentation verified with Truvera API');
        console.log(`   ${verified ? '✅' : '❌'} Credential verification ${verified ? 'passed' : 'failed'}`);
        console.log('   ✅ Results displayed to user');
        
        if (verified) {
            console.log('\n🎉 Final Result: USER IS VERIFIED ✅');
            console.log('\n🔄 Next steps:');
            console.log('   • User can access protected resources');
            console.log('   • Credential is authentic and valid');
            console.log('   • Consider implementing this flow in your application');
            console.log('   • Use this verification pattern for user authentication');
        } else {
            console.log('\n⚠️  Final Result: USER IS UNVERIFIED ❌');
            console.log('\n🔄 Next steps:');
            console.log('   • User should obtain a valid credential');
            console.log('   • Check credential format and issuer');
            console.log('   • Verify credential has not expired');
            console.log('   • Ensure credential meets the proof request requirements');
        }
        
    } else if (success && presentationResult && !presentationResult.success) {
        console.log('\n⚠️  Test session completed but no credential was presented.');
        console.log('\n📋 What was completed:');
        console.log('   ✅ Environment validation completed');
        console.log('   ✅ Proof request created successfully');
        console.log('   ✅ QR code generated and displayed');
        console.log('   ❌ No credential presentation received');
        
        if (presentationResult.error === 'Timeout waiting for credential presentation') {
            console.log('\n⏰ Reason: Timeout - no credential was presented within 5 minutes');
        } else if (presentationResult.error === 'Proof request expired') {
            console.log('\n⏰ Reason: Proof request expired before credential was presented');
        }
        
        console.log('\n🔄 To complete the test:');
        console.log('   • Run the script again: npm run test:verification');
        console.log('   • Make sure to scan the QR code with your Dock wallet');
        console.log('   • Select and present a valid credential when prompted');
        console.log('   • Ensure you have a stable internet connection');
    } else {
        console.log('\n⚠️  Test session was cancelled or failed.');
        console.log('\n📋 What was attempted:');
        console.log('   ✅ Environment validation completed');
        console.log('   ❌ Credential verification not completed');
        
        console.log('\n🔄 To complete the test:');
        console.log('   • Run the script again: npm run test:verification');
        console.log('   • Make sure you have a valid credential in your wallet');
        console.log('   • Check your internet connection');
        console.log('   • Verify your Truvera API configuration');
    }
    
    console.log('\n📁 Files created:');
    console.log('   • verification-qr.png (QR code image for credential presentation)');
    
    console.log('\n' + '='.repeat(60));
    console.log('🚀 Thank you for testing credential verification!');
    console.log('='.repeat(60) + '\n');
}

/**
 * Main function to run the credential verification test
 */
async function main() {
    console.log('🚀 Starting Credential Verification Testing...');

    try {
        // Validate environment configuration
        validateEnvironment();

        // Display verification instructions
        displayVerificationInstructions();

        // Create a proof request
        const proofRequest = await createProofRequest();

        // Generate QR code from the proof request URL
        const qrCodeResult = await generateQRCode(proofRequest.qr, 'verification-qr.png');

        // Display scanning instructions
        console.log('\n' + '='.repeat(60));
        console.log('📱 CREDENTIAL PRESENTATION INSTRUCTIONS');
        console.log('='.repeat(60));
        
        console.log('\n🔍 How to present your credential:');
        console.log('   1. 📲 Open your Dock wallet app');
        console.log('   2. 📷 Scan the QR code displayed above');
        console.log('   3. 📄 Select the DEIP credential you want to present');
        console.log('   4. ✅ Confirm the credential presentation');
        console.log('   5. ⏳ Wait for verification to complete');
        
        console.log('\n⚠️  Important notes:');
        console.log('   • Make sure you have a DEIP Access Credential in your wallet');
        console.log('   • The script will automatically detect when you present the credential');
        console.log('   • You have 5 minutes to complete the presentation');
        console.log('   • The verification will happen automatically after presentation');
        
        console.log('\n' + '='.repeat(60));
        console.log('📋 Please scan the QR code now!');
        console.log('='.repeat(60) + '\n');

        // Wait for credential presentation
        const presentationResult = await waitForCredentialPresentation(proofRequest);

        if (!presentationResult.success) {
            displayCompletionMessage(true, presentationResult, null);
            return presentationResult;
        }

        // Verify the received presentation
        const verificationResult = await verifyPresentation(presentationResult.presentation, presentationResult);

        // Display verification results
        displayVerificationResults(presentationResult, verificationResult);

        // Display completion message
        displayCompletionMessage(true, presentationResult, verificationResult);

        // Return result for potential future use
        return {
            proofRequest,
            presentationResult,
            verificationResult,
            qrCodeResult
        };

    } catch (error) {
        console.error('❌ Error in credential verification testing:', error.message);
        
        // Display error completion message
        console.log('\n' + '='.repeat(60));
        console.log('❌ CREDENTIAL VERIFICATION TESTING FAILED');
        console.log('='.repeat(60));
        console.log(`\n💥 Error: ${error.message}`);
        console.log('\n🔧 Troubleshooting:');
        console.log('   • Check your .env configuration');
        console.log('   • Verify Truvera API connectivity');
        console.log('   • Ensure you have a valid DEIP credential in your wallet');
        console.log('   • Check the console output above for specific error details');
        console.log('   • Make sure your wallet app is up to date');
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
    displayVerificationInstructions,
    createProofRequest,
    waitForCredentialPresentation,
    verifyPresentation,
    displayVerificationResults,
    displayCompletionMessage,
    generateSampleCredential,
    main
};