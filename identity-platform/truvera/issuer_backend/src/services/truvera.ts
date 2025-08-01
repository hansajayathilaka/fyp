import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { config } from '../config';
import { logger } from '../middleware';
import {
    OpenIDIssuerConfig,
    CredentialFormData
} from '../types';

export interface TruveraApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
        details?: unknown;
    };
}

export interface OpenIDIssuerResponse {
    issuerId: string;
    issuerUrl: string;
    credentialOfferUrl: string;
}

export interface ConnectionInvitation {
    connectionId: string; // OpenID issuer ID
    invitationUrl: string; // OpenID credential offer URL
    qrCodeData: string; // QR code data for wallet scanning
}

export interface ConnectionStatus {
    connectionId: string; // OpenID issuer ID
    status: 'pending' | 'connected' | 'expired';
    holderDID?: string;
    connectedAt?: Date;
}

export interface CredentialIssuanceResult {
    credentialId: string;
    status: 'issued' | 'pending' | 'failed';
    deliveryStatus: 'sent' | 'delivered' | 'failed';
}

class TruveraService {
    private client: AxiosInstance;

    constructor() {
        this.client = axios.create({
            baseURL: config.truvera.apiUrl,
            timeout: config.truvera.timeout,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.truvera.apiKey}`,
                'User-Agent': 'SSI-Issuing-Platform/1.0.0',
            },
        });

        // Request interceptor for logging
        this.client.interceptors.request.use(
            (config) => {
                logger.info('Truvera API Request', {
                    method: config.method?.toUpperCase(),
                    url: `${config.baseURL}${config.url}`,
                    headers: { 
                        ...config.headers, 
                        Authorization: config.headers?.Authorization ? '[REDACTED]' : undefined 
                    },
                    timeout: config.timeout
                });

                if (config.data && process.env.NODE_ENV !== 'production') {
                    logger.debug('Request payload', {
                        data: typeof config.data === 'string' ? config.data : JSON.stringify(config.data, null, 2)
                    });
                }

                return config;
            },
            (error) => {
                logger.error('Truvera API Request Error', {
                    message: error.message,
                    code: error.code
                });
                return Promise.reject(error);
            }
        );

        // Response interceptor for logging and error handling
        this.client.interceptors.response.use(
            (response: AxiosResponse) => {
                logger.info('Truvera API Response', {
                    status: response.status,
                    statusText: response.statusText,
                    url: response.config.url,
                    dataSize: JSON.stringify(response.data).length
                });

                if (process.env.NODE_ENV !== 'production') {
                    logger.debug('Response data', {
                        data: JSON.stringify(response.data, null, 2)
                    });
                }

                return response;
            },
            (error) => {
                logger.error('Truvera API Response Error', {
                    status: error.response?.status,
                    statusText: error.response?.statusText,
                    url: error.config?.url,
                    method: error.config?.method?.toUpperCase(),
                    message: error.message,
                    responseData: error.response?.data
                });
                return Promise.reject(this.handleApiError(error));
            }
        );
    }

    private handleApiError(error: any): Error {
        if (error.response) {
            // Server responded with error status
            const status = error.response.status;
            const data = error.response.data;

            logger.error('Truvera API response error', {
                status,
                statusText: error.response.statusText,
                data,
                url: error.config?.url,
                method: error.config?.method?.toUpperCase()
            });

            switch (status) {
                case 401:
                    return new Error('Truvera API authentication failed - check API key');
                case 403:
                    return new Error('Truvera API access forbidden - insufficient permissions');
                case 404:
                    return new Error('Truvera API endpoint not found');
                case 429:
                    return new Error('Truvera API rate limit exceeded - please retry later');
                case 500:
                    return new Error('Truvera API internal server error');
                case 502:
                    return new Error('Truvera API bad gateway - service temporarily unavailable');
                case 503:
                    return new Error('Truvera API service unavailable');
                default:
                    return new Error(data?.message || `Truvera API error: ${status} ${error.response.statusText}`);
            }
        } else if (error.request) {
            // Network error
            logger.error('Truvera API network error', {
                message: error.message,
                code: error.code,
                timeout: error.timeout,
                url: config.truvera.apiUrl
            });
            return new Error(`Failed to connect to Truvera API at ${config.truvera.apiUrl} - check network connectivity`);
        } else {
            // Other error
            logger.error('Truvera API unexpected error', {
                message: error.message,
                stack: error.stack
            });
            return new Error(`Truvera API error: ${error.message}`);
        }
    }

    /**
     * Create an OpenID issuer for credential issuance
     */
    async createOpenIDIssuer(formData: CredentialFormData): Promise<OpenIDIssuerResponse> {
        try {
            logger.info('Creating OpenID issuer for credential issuance', {
                firstName: formData.firstName,
                lastName: formData.lastName,
                nic: formData.nic,
                country: formData.country,
                investorType: formData.investorType,
                kycLevel: formData.kycLevel
            });

            // Validate required environment variables
            const schemaUrl = config.credential.schemaUrl;
            const issuerDid = config.credential.issuerDid;

            if (!schemaUrl) {
                throw new Error('CREDENTIAL_SCHEMA_URL environment variable is required');
            }

            if (!issuerDid) {
                throw new Error('ISSUER_DID environment variable is required');
            }

            const issuerConfig: OpenIDIssuerConfig = {
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
                            id: formData.nic, // Use NIC as the credential subject ID
                            firstName: formData.firstName,
                            lastName: formData.lastName,
                            country: formData.country,
                            email: formData.email,
                            walletAddress: formData.walletAddress,
                            investorType: formData.investorType,
                            kycLevel: formData.kycLevel,
                            amlStatus: formData.amlStatus,
                        },
                        issuer: issuerDid,
                        issuanceDate: new Date().toISOString(),
                        expirationDate: new Date(
                            Date.now() + config.credential.expirationHours * 60 * 60 * 1000
                        ).toISOString(),
                    },
                    // Add signing parameters to ensure credentials are properly signed
                    algorithm: 'ed25519', // Use ed25519 for signing
                    anchor: false, // Don't anchor on blockchain for testing
                    persist: false, // Don't store encrypted version
                    distribute: false, // Don't auto-distribute
                    format: 'jsonld' // Use JSON-LD format
                },
                singleUse: true,
            };

            logger.debug('OpenID issuer configuration', {
                issuerDid,
                schemaUrl,
                subjectId: formData.nic,
                subjectName: `${formData.firstName} ${formData.lastName}`
            });

            const response = await this.client.post('/openid/issuers', issuerConfig);

            const issuerId = response.data.id;
            const issuerUrl = response.data.qrUrl || response.data.credentialOfferUrl || response.data.issuerUrl;

            if (!issuerUrl) {
                throw new Error('No QR URL found in OpenID issuer response');
            }

            logger.info('OpenID issuer created successfully', {
                issuerId,
                issuerUrl: issuerUrl.substring(0, 50) + '...',
                subjectName: `${formData.firstName} ${formData.lastName}`,
                subjectId: formData.nic
            });

            return {
                issuerId,
                issuerUrl,
                credentialOfferUrl: issuerUrl,
            };
        } catch (error) {
            logger.error('Failed to create OpenID issuer', {
                error: error instanceof Error ? error.message : 'Unknown error',
                firstName: formData.firstName,
                lastName: formData.lastName,
                nic: formData.nic
            });
            throw error;
        }
    }

    /**
     * Create a credential offer using the OpenID issuer
     */
    async createCredentialOffer(issuerId: string, formData: CredentialFormData): Promise<ConnectionInvitation> {
        try {
            logger.info('Creating credential offer using OpenID issuer', {
                issuerId,
                firstName: formData.firstName,
                lastName: formData.lastName,
                nic: formData.nic
            });

            // Generate a secure PIN for the credential offer
            const securityPIN = this.generateSecurePIN();

            logger.info('Generated security PIN for credential offer', {
                issuerId,
                pin: securityPIN,
                subjectName: `${formData.firstName} ${formData.lastName}`
            });

            try {
                // Create a credential offer for the issuer with PIN
                const offerResponse = await this.client.post('/openid/credential-offers', {
                    id: issuerId,
                    requestParameters: {
                        user_pin: securityPIN,
                        pin_hint: "Enter the 6-digit PIN shown in the console"
                    }
                });

                const credentialOfferUrl = offerResponse.data.url;

                if (!credentialOfferUrl) {
                    // Fallback: Get the OpenID issuer details to extract the QR URL
                    const issuerResponse = await this.client.get(`/openid/issuers/${issuerId}`);
                    const issuerData = issuerResponse.data;
                    const qrUrl = issuerData.qrUrl || issuerData.credentialOfferUrl || issuerData.issuerUrl;
                    
                    if (!qrUrl) {
                        throw new Error('No QR URL found in OpenID issuer response');
                    }

                    logger.info('Using fallback issuer URL for credential offer', {
                        issuerId,
                        qrUrl: qrUrl.substring(0, 50) + '...'
                    });

                    return {
                        connectionId: issuerId,
                        invitationUrl: qrUrl,
                        qrCodeData: qrUrl,
                    };
                }

                logger.info('Credential offer created successfully with PIN', {
                    issuerId,
                    credentialOfferUrl: credentialOfferUrl.substring(0, 50) + '...',
                    pin: securityPIN
                });

                return {
                    connectionId: issuerId, // Use issuer ID as connection ID for consistency
                    invitationUrl: credentialOfferUrl,
                    qrCodeData: credentialOfferUrl, // OpenID uses direct URL, not DIDComm format
                };

            } catch (offerError) {
                logger.warn('Failed to create credential offer with PIN, falling back to issuer URL', {
                    issuerId,
                    error: offerError instanceof Error ? offerError.message : 'Unknown error'
                });

                // Fallback: Get the OpenID issuer details to extract the QR URL
                const issuerResponse = await this.client.get(`/openid/issuers/${issuerId}`);
                const issuerData = issuerResponse.data;
                const qrUrl = issuerData.qrUrl || issuerData.credentialOfferUrl || issuerData.issuerUrl;
                
                if (!qrUrl) {
                    throw new Error('No QR URL found in OpenID issuer response');
                }

                logger.info('Using fallback issuer URL for credential offer', {
                    issuerId,
                    qrUrl: qrUrl.substring(0, 50) + '...'
                });

                return {
                    connectionId: issuerId,
                    invitationUrl: qrUrl,
                    qrCodeData: qrUrl,
                };
            }
        } catch (error) {
            logger.error('Failed to create credential offer using OpenID issuer', { 
                issuerId, 
                error: error instanceof Error ? error.message : 'Unknown error',
                firstName: formData.firstName,
                lastName: formData.lastName,
                nic: formData.nic
            });
            throw error;
        }
    }



    /**
     * Check the status of an OpenID issuer
     */
    async getConnectionStatus(connectionId: string): Promise<ConnectionStatus> {
        try {
            logger.info('Checking OpenID issuer status', { connectionId });

            // Get OpenID issuer status (connectionId is actually the issuer ID)
            const issuerResponse = await this.client.get(`/openid/issuers/${connectionId}`);

            const issuerData = issuerResponse.data;
            let status: 'pending' | 'connected' | 'expired' = 'pending';
            let holderDID: string | undefined;
            let connectedAt: Date | undefined;

            // For OpenID issuers, we consider them "connected" if they exist and are active
            // The actual credential issuance happens when the holder scans the QR code
            if (issuerData && issuerData.id) {
                status = 'connected'; // OpenID issuer is ready for credential issuance
                connectedAt = issuerData.createdAt ? new Date(issuerData.createdAt) : new Date();
            }

            logger.info('OpenID issuer status retrieved', {
                connectionId,
                status,
                issuerId: issuerData.id
            });

            return {
                connectionId,
                status,
                holderDID,
                connectedAt,
            };

        } catch (error) {
            logger.error('Failed to get OpenID issuer status', { connectionId, error });

            // If issuer doesn't exist, consider it expired
            if (error instanceof Error && error.message.includes('404')) {
                return {
                    connectionId,
                    status: 'expired',
                };
            }

            throw error;
        }
    }

    /**
     * Issue a credential using OpenID issuer (this updates the issuer with specific credential data)
     */
    async issueCredential(
        issuerId: string,
        connectionId: string,
        holderDID: string,
        formData: CredentialFormData
    ): Promise<CredentialIssuanceResult> {
        try {
            logger.info('Updating OpenID issuer with credential data', {
                issuerId,
                connectionId,
                holderDID: holderDID?.substring(0, 20) + '...' || 'None'
            });

            // For OpenID flow, we need to update the existing issuer with the specific credential data
            // or create a new issuer with the form data
            const updatedIssuerConfig = {
                credentialOptions: {
                    credential: {
                        type: ['VerifiableCredential', 'DEIPAccessCredential'],
                        '@context': [
                            'https://www.w3.org/2018/credentials/v1',
                            config.credential.schemaUrl
                        ],
                        credentialSchema: {
                            id: config.credential.schemaUrl,
                            type: 'JsonSchemaValidator2018'
                        },
                        credentialSubject: {
                            id: formData.nic, // Use NIC as the credential subject ID
                            firstName: formData.firstName,
                            lastName: formData.lastName,
                            country: formData.country,
                            email: formData.email,
                            walletAddress: formData.walletAddress,
                            investorType: formData.investorType,
                            kycLevel: formData.kycLevel,
                            amlStatus: formData.amlStatus,
                        },
                        issuer: config.credential.issuerDid,
                        issuanceDate: new Date().toISOString(),
                        expirationDate: new Date(
                            Date.now() + config.credential.expirationHours * 60 * 60 * 1000
                        ).toISOString(),
                    },
                },
                singleUse: true, // Make it single use for specific credential
            };

            // Create a new issuer with the specific credential data
            const issuanceResponse = await this.client.post('/openid/issuers', updatedIssuerConfig);
            const credentialIssuerId = issuanceResponse.data.id;

            logger.info('OpenID issuer updated with credential data', {
                originalIssuerId: issuerId,
                credentialIssuerId,
                connectionId
            });

            return {
                credentialId: credentialIssuerId,
                status: 'issued',
                deliveryStatus: 'sent',
            };
        } catch (error) {
            logger.error('Failed to update OpenID issuer with credential data', {
                issuerId,
                connectionId,
                error
            });
            throw error;
        }
    }



    /**
     * Get credential delivery status via OpenID issuer
     * Enhanced with comprehensive status checking
     */
    async getCredentialStatus(credentialId: string): Promise<CredentialIssuanceResult> {
        try {
            logger.info('Getting OpenID issuer credential status', { credentialId });

            // Use the comprehensive status check for better accuracy
            // For OpenID issuers, the credentialId is actually the issuer ID
            const comprehensiveStatus = await this.checkCredentialDeliveryStatus(credentialId, credentialId);

            // Map comprehensive status to legacy format for backward compatibility
            let status: 'issued' | 'pending' | 'failed';
            let deliveryStatus: 'sent' | 'delivered' | 'failed';

            switch (comprehensiveStatus.deliveryStatus) {
                case 'delivered':
                    status = 'issued';
                    deliveryStatus = 'delivered';
                    break;
                case 'pending':
                    status = 'issued'; // Credential is ready for issuance
                    deliveryStatus = 'sent'; // QR code is available for scanning
                    break;
                case 'error':
                    status = 'failed';
                    deliveryStatus = 'failed';
                    break;
                default:
                    status = 'pending';
                    deliveryStatus = 'sent';
            }

            logger.info('OpenID issuer credential status retrieved and mapped', {
                credentialId,
                comprehensiveStatus: comprehensiveStatus.deliveryStatus,
                mappedStatus: status,
                mappedDeliveryStatus: deliveryStatus,
                credentialClaimed: comprehensiveStatus.credentialClaimed
            });

            return {
                credentialId,
                status,
                deliveryStatus,
            };

        } catch (error) {
            logger.error('Failed to get OpenID issuer credential status', { credentialId, error });
            
            // Check for 404 error (issuer deleted after credential claim)
            const is404Error = (error instanceof Error && 
                               (error.message.includes('404') || error.message.includes('endpoint not found')));
            
            if (is404Error) {
                logger.info('OpenID issuer not found - credential was likely claimed successfully', { 
                    credentialId 
                });
                
                return {
                    credentialId,
                    status: 'issued',
                    deliveryStatus: 'delivered',
                };
            }
            
            throw error;
        }
    }

    /**
     * Comprehensive credential delivery status check using multiple APIs
     * Based on enhanced testing script implementation
     */
    async checkCredentialDeliveryStatus(issuerId: string, credentialId?: string): Promise<{
        timestamp: string;
        issuerId: string;
        credentialId?: string;
        issuerExists: boolean;
        issuerStatus: 'active' | 'deleted' | 'error' | 'unknown';
        deliveryStatus: 'pending' | 'delivered' | 'error' | 'unknown';
        credentialClaimed: boolean;
        jobStatus?: string;
        recommendations: string[];
        rawData?: {
            issuerResponse?: any;
            jobResponse?: any;
            credentialResponse?: any;
            recentCredentials?: any;
        };
    }> {
        const timestamp = new Date().toISOString();
        
        logger.info('Comprehensive credential delivery status check', {
            issuerId,
            credentialId,
            timestamp
        });

        const statusResult = {
            timestamp,
            issuerId,
            credentialId,
            issuerExists: false,
            issuerStatus: 'unknown' as 'active' | 'deleted' | 'error' | 'unknown',
            deliveryStatus: 'unknown' as 'pending' | 'delivered' | 'error' | 'unknown',
            credentialClaimed: false,
            jobStatus: undefined as string | undefined,
            recommendations: [] as string[],
            rawData: {} as any
        };

        try {
            // Step 1: Check OpenID issuer status (primary indicator)
            logger.info('Step 1: Checking OpenID issuer status', { issuerId });
            
            try {
                const issuerResponse = await this.client.get(`/openid/issuers/${issuerId}`);
                
                statusResult.issuerExists = true;
                statusResult.issuerStatus = 'active';
                statusResult.deliveryStatus = 'pending';
                statusResult.rawData.issuerResponse = issuerResponse.data;
                
                logger.info('Issuer status: ACTIVE', {
                    issuerId,
                    issuerData: issuerResponse.data
                });
                
                // Check for associated job
                if (issuerResponse.data.jobId) {
                    logger.info('Step 2: Checking associated job status', { 
                        issuerId, 
                        jobId: issuerResponse.data.jobId 
                    });
                    
                    try {
                        const jobResponse = await this.client.get(`/jobs/${issuerResponse.data.jobId}`);
                        statusResult.jobStatus = jobResponse.data.status;
                        statusResult.rawData.jobResponse = jobResponse.data;
                        
                        logger.info('Job status retrieved', {
                            issuerId,
                            jobId: issuerResponse.data.jobId,
                            jobStatus: jobResponse.data.status
                        });
                    } catch (jobError) {
                        logger.warn('Job status check failed', {
                            issuerId,
                            jobId: issuerResponse.data.jobId,
                            error: jobError instanceof Error ? jobError.message : 'Unknown error'
                        });
                    }
                }
                
            } catch (issuerError: any) {
                // Check for 404 error (issuer deleted after credential claim)
                const is404Error = (issuerError.response && issuerError.response.status === 404) ||
                                  (issuerError instanceof Error && issuerError.message.includes('endpoint not found'));
                
                if (is404Error) {
                    statusResult.issuerExists = false;
                    statusResult.issuerStatus = 'deleted';
                    statusResult.deliveryStatus = 'delivered';
                    statusResult.credentialClaimed = true;
                    
                    logger.info('Issuer status: DELETED (404) - credential successfully delivered', {
                        issuerId
                    });
                    
                    statusResult.recommendations.push('Update deliveryStatus to "delivered" in your database');
                    statusResult.recommendations.push('404 response is expected and indicates success');
                    statusResult.recommendations.push('No further polling needed for this credential');
                    
                } else {
                    logger.error('Issuer status check failed', {
                        issuerId,
                        error: issuerError instanceof Error ? issuerError.message : 'Unknown error'
                    });
                    statusResult.issuerStatus = 'error';
                    statusResult.deliveryStatus = 'error';
                }
            }

            // Step 2: If we have a credential ID, check credential metadata
            if (credentialId) {
                logger.info('Step 3: Checking credential metadata', { credentialId });
                try {
                    const credentialResponse = await this.client.get(`/credentials/${credentialId}`);
                    statusResult.rawData.credentialResponse = credentialResponse.data;
                    
                    logger.info('Credential metadata retrieved', {
                        credentialId,
                        credentialData: credentialResponse.data
                    });
                } catch (credError: any) {
                    if (credError.response && credError.response.status === 404) {
                        logger.info('Credential not found (404) - may not be persisted', { credentialId });
                    } else {
                        logger.warn('Credential metadata check failed', {
                            credentialId,
                            error: credError instanceof Error ? credError.message : 'Unknown error'
                        });
                    }
                }
            }

            // Step 3: Check recent credential activity for context
            logger.info('Step 4: Checking recent credential activity');
            try {
                const recentCredentials = await this.client.get('/credentials?limit=5');
                statusResult.rawData.recentCredentials = recentCredentials.data;
                
                if (recentCredentials.data && recentCredentials.data.length > 0) {
                    const latest = recentCredentials.data[0];
                    logger.info('Recent credential activity found', {
                        recentCount: recentCredentials.data.length,
                        latestCreated: latest.created
                    });
                }
            } catch (credListError) {
                logger.warn('Recent credentials check failed', {
                    error: credListError instanceof Error ? credListError.message : 'Unknown error'
                });
            }

        } catch (error) {
            logger.error('Unexpected error during comprehensive status check', {
                issuerId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
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

        logger.info('Comprehensive status check completed', {
            issuerId,
            issuerExists: statusResult.issuerExists,
            issuerStatus: statusResult.issuerStatus,
            deliveryStatus: statusResult.deliveryStatus,
            credentialClaimed: statusResult.credentialClaimed,
            recommendationCount: statusResult.recommendations.length
        });

        return statusResult;
    }

    /**
     * Get OpenID issuer status to check if credentials are ready for issuance
     * Enhanced with comprehensive status checking
     */
    async getIssuerStatus(issuerId: string): Promise<CredentialIssuanceResult> {
        try {
            logger.info('Checking OpenID issuer status for credential issuance', { issuerId });

            // Use the comprehensive status check for better accuracy
            const comprehensiveStatus = await this.checkCredentialDeliveryStatus(issuerId);

            // Map comprehensive status to legacy format for backward compatibility
            let status: 'issued' | 'pending' | 'failed';
            let deliveryStatus: 'sent' | 'delivered' | 'failed';

            switch (comprehensiveStatus.deliveryStatus) {
                case 'delivered':
                    status = 'issued';
                    deliveryStatus = 'delivered';
                    break;
                case 'pending':
                    status = 'issued'; // OpenID issuer is ready for credential issuance
                    deliveryStatus = 'sent'; // QR code is available for scanning
                    break;
                case 'error':
                    status = 'failed';
                    deliveryStatus = 'failed';
                    break;
                default:
                    status = 'pending';
                    deliveryStatus = 'sent';
            }

            logger.info('OpenID issuer status mapped to legacy format', {
                issuerId,
                comprehensiveStatus: comprehensiveStatus.deliveryStatus,
                mappedStatus: status,
                mappedDeliveryStatus: deliveryStatus
            });

            return {
                credentialId: issuerId,
                status,
                deliveryStatus,
            };

        } catch (error) {
            logger.error('Failed to get OpenID issuer status', { issuerId, error });

            // Check for 404 error (issuer deleted after credential claim)
            const is404Error = (error instanceof Error && 
                               (error.message.includes('404') || error.message.includes('endpoint not found')));
            
            if (is404Error) {
                logger.info('OpenID issuer not found - credential was likely claimed successfully', { 
                    issuerId 
                });
                
                return {
                    credentialId: issuerId,
                    status: 'issued',
                    deliveryStatus: 'delivered',
                };
            }

            throw error;
        }
    }

    /**
     * Generate a secure 6-digit PIN for credential offers
     */
    generateSecurePIN(): string {
        // Generate a 6-digit PIN
        const pin = Array.from({ length: 6 }, () => Math.floor(Math.random() * 10)).join('');
        return pin;
    }

    /**
     * Health check for Truvera API
     */
    async healthCheck(): Promise<boolean> {
        try {
            // Use the DIDs endpoint to check if the API is accessible
            await this.client.get('/dids?limit=1');
            return true;
        } catch (error) {
            logger.error('Truvera API health check failed', error);
            return false;
        }
    }
}

// Export singleton instance
export const truveraService = new TruveraService();
export default truveraService;