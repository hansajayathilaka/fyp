import { truveraService } from './truvera';
import { sessionService } from './session';
import { qrCodeService } from './qrcode';
import { logger } from '../middleware';
import { CredentialFormData, ProcessStep } from '../types';

export interface CredentialIssuanceRequest {
    sessionId: string;
    formData: CredentialFormData;
}

export interface CredentialIssuanceResponse {
    success: boolean;
    credentialId?: string;
    status: 'issued' | 'pending' | 'failed';
    message: string;
}

export interface QRCodeGenerationResponse {
    success: boolean;
    connectionId?: string;
    qrCodeData?: string;
    qrCodeImage?: string;
    invitationUrl?: string;
    message: string;
}

export interface CredentialOfferQRResponse {
    success: boolean;
    connectionId?: string;
    credentialOfferUrl?: string;
    qrCodeData?: string;
    qrCodeImage?: string;
    message: string;
}

export interface ConnectionStatusResponse {
    success: boolean;
    status: 'pending' | 'connected' | 'expired';
    holderDID?: string;
    message: string;
}

export class CredentialService {
    /**
     * Generate QR code for wallet connection
     */
    async generateQRCode(sessionId: string): Promise<QRCodeGenerationResponse> {
        try {
            const session = sessionService.getSession(sessionId);

            if (!session) {
                logger.warn('QR generation failed: Session not found', { sessionId });
                return {
                    success: false,
                    message: 'Session not found or expired',
                };
            }

            if (!session.walletAddress) {
                logger.warn('QR generation failed: Wallet address not set', { sessionId });
                return {
                    success: false,
                    message: 'Wallet address not set in session',
                };
            }

            if (!session.formData) {
                logger.warn('QR generation failed: Form data not set', { sessionId });
                return {
                    success: false,
                    message: 'Form data not set in session',
                };
            }

            logger.info('Generating QR code for wallet connection', {
                sessionId,
                walletAddress: session.walletAddress.substring(0, 10) + '...'
            });

            // Create OpenID credential offer via Truvera
            let invitation;
            try {
                // First create the OpenID issuer with form data
                const issuerResponse = await truveraService.createOpenIDIssuer(session.formData);
                
                // Update session with issuer ID
                sessionService.setIssuerId(sessionId, issuerResponse.issuerId);
                
                // Then create credential offer
                invitation = await truveraService.createCredentialOffer(
                    issuerResponse.issuerId,
                    session.formData
                );

                // Update session with connection details
                const updatedSession = sessionService.setConnectionDetails(
                    sessionId,
                    invitation.connectionId
                );

                if (!updatedSession) {
                    logger.error('Failed to update session with connection details', { sessionId });
                    return {
                        success: false,
                        message: 'Failed to update session with connection details',
                    };
                }

                logger.info('QR code generated successfully', {
                    sessionId,
                    connectionId: invitation.connectionId
                });

                // Generate QR code image for the invitation URL
                const qrCodeResult = await qrCodeService.generateDataURL(invitation.qrCodeData);
                
                if (!qrCodeResult.success) {
                    logger.warn('Failed to generate QR code image, using URL only', {
                        sessionId,
                        error: qrCodeResult.error
                    });
                }

                return {
                    success: true,
                    connectionId: invitation.connectionId,
                    qrCodeData: invitation.qrCodeData,
                    qrCodeImage: qrCodeResult.qrCodeDataURL,
                    invitationUrl: invitation.invitationUrl,
                    message: 'QR code generated successfully',
                };
            } catch (truveraError) {
                logger.error('Truvera API error during QR generation', {
                    sessionId,
                    error: truveraError,
                    errorMessage: truveraError instanceof Error ? truveraError.message : 'Unknown error'
                });

                // Return error without any mocking
                const errorMessage = truveraError instanceof Error ? truveraError.message : 'Unknown Truvera API error';
                return {
                    success: false,
                    message: `Failed to create connection invitation: ${errorMessage}`,
                };
            }
        } catch (error) {
            logger.error('Unexpected error during QR generation', { sessionId, error });
            return {
                success: false,
                message: `Failed to generate QR code: ${error instanceof Error ? error.message : 'Unknown error'}`,
            };
        }
    }

    /**
     * Check connection status
     */
    async checkConnectionStatus(sessionId: string): Promise<ConnectionStatusResponse> {
        try {
            const session = sessionService.getSession(sessionId);

            if (!session) {
                return {
                    success: false,
                    status: 'expired',
                    message: 'Session not found or expired',
                };
            }

            if (!session.connectionId) {
                return {
                    success: false,
                    status: 'expired',
                    message: 'Connection ID not found in session',
                };
            }

            // Check connection status via Truvera
            const connectionStatus = await truveraService.getConnectionStatus(session.connectionId);

            // Update session if connection is established
            if (connectionStatus.status === 'connected' && connectionStatus.holderDID) {
                sessionService.setConnectionDetails(
                    sessionId,
                    session.connectionId,
                    connectionStatus.holderDID
                );
            }

            return {
                success: true,
                status: connectionStatus.status,
                holderDID: connectionStatus.holderDID,
                message: `Connection status: ${connectionStatus.status}`,
            };
        } catch (error) {
            logger.error('Failed to check connection status', { sessionId, error });
            return {
                success: false,
                status: 'expired',
                message: 'Failed to check connection status',
            };
        }
    }

    /**
     * Store form data in session
     */
    async storeFormData(request: { sessionId: string; formData: CredentialFormData }): Promise<{
        success: boolean;
        message: string;
    }> {
        const { sessionId, formData } = request;

        try {
            const session = sessionService.getSession(sessionId);

            if (!session) {
                return {
                    success: false,
                    message: 'Session not found or expired',
                };
            }

            // Validate form data
            const validation = this.validateFormData(formData);
            if (!validation.isValid) {
                return {
                    success: false,
                    message: 'Form data validation failed',
                };
            }

            // Store form data in session
            const updatedSession = sessionService.setFormData(sessionId, formData);

            if (!updatedSession) {
                return {
                    success: false,
                    message: 'Failed to store form data in session',
                };
            }

            // Update session step to QR generation
            sessionService.setCurrentStep(sessionId, ProcessStep.QR_GENERATION);

            logger.info('Form data stored successfully', {
                sessionId,
                firstName: formData.firstName,
                lastName: formData.lastName,
                nic: formData.nic,
                country: formData.country,
            });

            return {
                success: true,
                message: 'Form data stored successfully',
            };
        } catch (error) {
            logger.error('Failed to store form data', { sessionId, error });
            return {
                success: false,
                message: 'Failed to store form data',
            };
        }
    }

    /**
     * Issue credential to connected wallet
     */
    async issueCredential(request: CredentialIssuanceRequest): Promise<CredentialIssuanceResponse> {
        const { sessionId, formData } = request;

        try {
            const session = sessionService.getSession(sessionId);

            if (!session) {
                return {
                    success: false,
                    status: 'failed',
                    message: 'Session not found or expired',
                };
            }

            // Validate session has all required data
            if (!sessionService.hasRequiredDataForStep(session, ProcessStep.FORM_SUBMISSION)) {
                return {
                    success: false,
                    status: 'failed',
                    message: 'Session missing required data for credential issuance',
                };
            }

            logger.info('Starting credential issuance process', {
                sessionId,
                holderDID: session.holderDID?.substring(0, 20) + '...'
            });

            // Step 1: Create OpenID issuer
            const issuerResponse = await truveraService.createOpenIDIssuer(formData);

            // Update session with issuer ID
            const updatedSession = sessionService.setIssuerId(sessionId, issuerResponse.issuerId);

            if (!updatedSession) {
                return {
                    success: false,
                    status: 'failed',
                    message: 'Failed to update session with issuer ID',
                };
            }

            // Step 2: Issue credential
            const issuanceResult = await truveraService.issueCredential(
                issuerResponse.issuerId,
                session.connectionId!,
                session.holderDID!,
                formData
            );

            // Step 3: Update session with credential ID
            sessionService.setCredentialId(sessionId, issuanceResult.credentialId);

            logger.info('Credential issuance completed successfully', {
                sessionId,
                credentialId: issuanceResult.credentialId
            });

            return {
                success: true,
                credentialId: issuanceResult.credentialId,
                status: issuanceResult.status,
                message: 'Credential issued successfully',
            };
        } catch (error) {
            logger.error('Failed to issue credential', { sessionId, error });
            return {
                success: false,
                status: 'failed',
                message: 'Failed to issue credential',
            };
        }
    }

    /**
     * Get credential status with enhanced checking
     */
    async getCredentialStatus(sessionId: string): Promise<{
        success: boolean;
        status?: 'issued' | 'pending' | 'failed';
        deliveryStatus?: 'sent' | 'delivered' | 'failed';
        message: string;
        details?: {
            credentialClaimed?: boolean;
            recommendations?: string[];
            lastChecked?: string;
        };
    }> {
        try {
            const session = sessionService.getSession(sessionId);

            if (!session) {
                return {
                    success: false,
                    message: 'Session not found or expired',
                };
            }

            // Handle two different flows:
            // 1. Old flow: credential issued via /issue endpoint (has credentialId)
            // 2. New flow: credential offer generated via /qr-generate (has issuerId)

            if (session.credentialId) {
                // Old flow: use credential ID to get status
                try {
                    const credentialStatus = await truveraService.getCredentialStatus(session.credentialId);

                    return {
                        success: true,
                        status: credentialStatus.status,
                        deliveryStatus: credentialStatus.deliveryStatus,
                        message: 'Credential status retrieved successfully',
                        details: {
                            lastChecked: new Date().toISOString()
                        }
                    };
                } catch (error) {
                    logger.error('Failed to get credential status', { sessionId, error });
                    
                    // If credential status check fails, assume it's still pending
                    return {
                        success: true,
                        status: 'pending',
                        deliveryStatus: 'sent',
                        message: 'Credential status check failed, assuming pending',
                        details: {
                            lastChecked: new Date().toISOString()
                        }
                    };
                }
            } else if (session.issuerId) {
                // New flow: check if credential has been issued for this issuer
                try {
                    const issuerStatus = await truveraService.getIssuerStatus(session.issuerId);
                    
                    // If a credential has been issued, update the session with the credential ID
                    if (issuerStatus.status === 'issued' && issuerStatus.credentialId) {
                        sessionService.setCredentialId(sessionId, issuerStatus.credentialId);
                        logger.info('Updated session with credential ID from issuer status', {
                            sessionId,
                            credentialId: issuerStatus.credentialId
                        });
                    }
                    
                    return {
                        success: true,
                        status: issuerStatus.status,
                        deliveryStatus: issuerStatus.deliveryStatus,
                        message: 'Credential status retrieved successfully',
                        details: {
                            credentialClaimed: issuerStatus.deliveryStatus === 'delivered',
                            lastChecked: new Date().toISOString()
                        }
                    };
                } catch (error) {
                    // If issuer status check fails, assume credential is still pending
                    logger.warn('Failed to get issuer status, assuming pending', { 
                        sessionId, 
                        issuerId: session.issuerId,
                        error: error instanceof Error ? error.message : 'Unknown error'
                    });
                    
                    return {
                        success: true,
                        status: 'pending',
                        deliveryStatus: 'sent',
                        message: 'Credential offer is pending user acceptance',
                        details: {
                            credentialClaimed: false,
                            lastChecked: new Date().toISOString()
                        }
                    };
                }
            } else {
                // No credential ID or issuer ID found
                return {
                    success: false,
                    message: 'No credential or credential offer found in session. Please generate a credential offer first.',
                };
            }
        } catch (error) {
            logger.error('Failed to get credential status', { sessionId, error });
            return {
                success: false,
                message: 'Failed to get credential status',
            };
        }
    }

    /**
     * Get comprehensive credential delivery status
     * This provides detailed information about the credential delivery process
     */
    async getComprehensiveCredentialStatus(sessionId: string): Promise<{
        success: boolean;
        message: string;
        data?: {
            timestamp: string;
            sessionId: string;
            issuerId?: string;
            credentialId?: string;
            issuerExists: boolean;
            issuerStatus: 'active' | 'deleted' | 'error' | 'unknown';
            deliveryStatus: 'pending' | 'delivered' | 'error' | 'unknown';
            credentialClaimed: boolean;
            jobStatus?: string;
            recommendations: string[];
            sessionData?: {
                currentStep?: string;
                walletAddress?: string;
                connectionId?: string;
                formData?: any;
            };
        };
    }> {
        try {
            const session = sessionService.getSession(sessionId);

            if (!session) {
                return {
                    success: false,
                    message: 'Session not found or expired',
                };
            }

            // Determine which ID to use for status checking
            const issuerId = session.issuerId;
            const credentialId = session.credentialId;

            if (!issuerId && !credentialId) {
                return {
                    success: false,
                    message: 'No credential or credential offer found in session. Please generate a credential offer first.',
                };
            }

            logger.info('Getting comprehensive credential status', {
                sessionId,
                issuerId,
                credentialId,
                hasFormData: !!session.formData
            });

            // Use the issuer ID for comprehensive status check (preferred)
            const statusCheckId = issuerId || credentialId;
            const comprehensiveStatus = await truveraService.checkCredentialDeliveryStatus(
                statusCheckId!,
                credentialId
            );

            return {
                success: true,
                message: 'Comprehensive credential status retrieved successfully',
                data: {
                    ...comprehensiveStatus,
                    sessionId,
                    sessionData: {
                        currentStep: session.currentStep,
                        walletAddress: session.walletAddress,
                        connectionId: session.connectionId,
                        formData: session.formData ? {
                            firstName: session.formData.firstName,
                            lastName: session.formData.lastName,
                            nic: session.formData.nic,
                            country: session.formData.country,
                            investorType: session.formData.investorType,
                            kycLevel: session.formData.kycLevel
                        } : undefined
                    }
                }
            };

        } catch (error) {
            logger.error('Failed to get comprehensive credential status', { sessionId, error });
            return {
                success: false,
                message: `Failed to get comprehensive credential status: ${error instanceof Error ? error.message : 'Unknown error'}`,
            };
        }
    }

    /**
     * Get process statistics for monitoring
     */
    async getProcessStatistics(): Promise<{
        totalSessions: number;
        activeSessions: number;
        completedSessions: number;
        failedSessions: number;
        averageCompletionTime?: number;
        recentActivity: {
            last24Hours: number;
            lastHour: number;
        };
    }> {
        try {
            // This would typically query a database, but for now we'll use session service
            const allSessions = sessionService.getAllActiveSessions();
            
            const stats = {
                totalSessions: allSessions.length,
                activeSessions: allSessions.filter(s => s.currentStep !== ProcessStep.COMPLETION).length,
                completedSessions: allSessions.filter(s => s.currentStep === ProcessStep.COMPLETION).length,
                failedSessions: 0, // Would need to track failed sessions
                recentActivity: {
                    last24Hours: allSessions.filter(s => 
                        new Date(s.createdAt).getTime() > Date.now() - 24 * 60 * 60 * 1000
                    ).length,
                    lastHour: allSessions.filter(s => 
                        new Date(s.createdAt).getTime() > Date.now() - 60 * 60 * 1000
                    ).length,
                }
            };

            logger.info('Process statistics retrieved', stats);
            return stats;
        } catch (error) {
            logger.error('Failed to get process statistics', { error });
            throw error;
        }
    }

    /**
     * Validate form data with comprehensive validation matching test script requirements
     */
    validateFormData(formData: CredentialFormData): {
        isValid: boolean;
        errors: Record<string, string>;
    } {
        const errors: Record<string, string> = {};

        logger.debug('Validating form data', {
            firstName: formData.firstName,
            lastName: formData.lastName,
            nic: formData.nic,
            country: formData.country,
            investorType: formData.investorType,
            kycLevel: formData.kycLevel,
            hasEmail: !!formData.email,
            hasWalletAddress: !!formData.walletAddress
        });

        // Required fields validation with enhanced checks
        if (!formData.firstName?.trim()) {
            errors.firstName = 'First name is required';
        } else if (formData.firstName.trim().length < 2) {
            errors.firstName = 'First name must be at least 2 characters long';
        } else if (formData.firstName.trim().length > 50) {
            errors.firstName = 'First name must be less than 50 characters';
        } else if (!/^[a-zA-Z\s'-]+$/.test(formData.firstName.trim())) {
            errors.firstName = 'First name can only contain letters, spaces, hyphens, and apostrophes';
        }

        if (!formData.lastName?.trim()) {
            errors.lastName = 'Last name is required';
        } else if (formData.lastName.trim().length < 2) {
            errors.lastName = 'Last name must be at least 2 characters long';
        } else if (formData.lastName.trim().length > 50) {
            errors.lastName = 'Last name must be less than 50 characters';
        } else if (!/^[a-zA-Z\s'-]+$/.test(formData.lastName.trim())) {
            errors.lastName = 'Last name can only contain letters, spaces, hyphens, and apostrophes';
        }

        // NIC validation with format checking
        if (!formData.nic?.trim()) {
            errors.nic = 'NIC (National Identity Card) is required';
        } else if (formData.nic.trim().length < 5) {
            errors.nic = 'NIC must be at least 5 characters long';
        } else if (formData.nic.trim().length > 20) {
            errors.nic = 'NIC must be less than 20 characters';
        } else if (!/^[a-zA-Z0-9]+$/.test(formData.nic.trim())) {
            errors.nic = 'NIC can only contain letters and numbers';
        }

        // Country validation
        if (!formData.country?.trim()) {
            errors.country = 'Country is required';
        } else if (formData.country.trim().length < 2) {
            errors.country = 'Country name must be at least 2 characters long';
        } else if (formData.country.trim().length > 100) {
            errors.country = 'Country name must be less than 100 characters';
        }

        // Investor type validation
        if (!formData.investorType) {
            errors.investorType = 'Investor type is required';
        } else if (!['Individual', 'Company'].includes(formData.investorType)) {
            errors.investorType = 'Investor type must be Individual or Company';
        }

        // KYC level validation
        if (!formData.kycLevel) {
            errors.kycLevel = 'KYC level is required';
        } else if (!['basic', 'advanced'].includes(formData.kycLevel)) {
            errors.kycLevel = 'KYC level must be basic or advanced';
        }

        // Email validation (optional but if provided, must be valid)
        if (formData.email) {
            const emailTrimmed = formData.email.trim();
            if (emailTrimmed.length === 0) {
                // If email is provided but empty after trim, treat as empty string
                formData.email = '';
            } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
                errors.email = 'Invalid email format';
            } else if (emailTrimmed.length > 254) {
                errors.email = 'Email address is too long (max 254 characters)';
            }
        }

        // Wallet address validation
        if (!formData.walletAddress?.trim()) {
            errors.walletAddress = 'Wallet address is required';
        } else {
            const walletTrimmed = formData.walletAddress.trim();
            if (!/^0x[a-fA-F0-9]{40}$/.test(walletTrimmed)) {
                errors.walletAddress = 'Invalid Ethereum wallet address format (must be 0x followed by 40 hexadecimal characters)';
            }
        }

        // AML status validation (if provided)
        if (formData.amlStatus !== undefined && typeof formData.amlStatus !== 'boolean') {
            errors.amlStatus = 'AML status must be a boolean value';
        }

        const isValid = Object.keys(errors).length === 0;

        logger.info('Form validation completed', {
            isValid,
            errorCount: Object.keys(errors).length,
            errors: isValid ? undefined : Object.keys(errors)
        });

        return {
            isValid,
            errors,
        };
    }

    /**
     * Generate QR code for credential offer (new flow)
     */
    async generateCredentialOfferQR(sessionId: string): Promise<CredentialOfferQRResponse> {
        try {
            const session = sessionService.getSession(sessionId);

            if (!session) {
                logger.warn('Credential offer QR generation failed: Session not found', { sessionId });
                return {
                    success: false,
                    message: 'Session not found or expired',
                };
            }

            if (!session.walletAddress) {
                logger.warn('Credential offer QR generation failed: Wallet address not set', { sessionId });
                return {
                    success: false,
                    message: 'Wallet address not set in session',
                };
            }

            if (!session.formData) {
                logger.warn('Credential offer QR generation failed: Form data not set', { sessionId });
                return {
                    success: false,
                    message: 'Form data not set in session. Please fill out the form first.',
                };
            }

            logger.info('Generating credential offer QR code', {
                sessionId,
                walletAddress: session.walletAddress.substring(0, 10) + '...',
                firstName: session.formData.firstName,
                lastName: session.formData.lastName,
                nic: session.formData.nic
            });

            try {
                // Create OpenID issuer with form data
                const issuerResponse = await truveraService.createOpenIDIssuer(session.formData);
                
                // Update session with issuer ID
                sessionService.setIssuerId(sessionId, issuerResponse.issuerId);
                
                // Create credential offer (this will include the form data)
                const credentialOffer = await truveraService.createCredentialOffer(
                    issuerResponse.issuerId,
                    session.formData
                );

                // Update session with connection details
                const updatedSession = sessionService.setConnectionDetails(
                    sessionId,
                    credentialOffer.connectionId
                );

                if (!updatedSession) {
                    logger.error('Failed to update session with connection details', { sessionId });
                    return {
                        success: false,
                        message: 'Failed to update session with connection details',
                    };
                }

                // Generate QR code image for the credential offer URL
                const qrCodeResult = await qrCodeService.generateDataURL(credentialOffer.qrCodeData);
                
                if (!qrCodeResult.success) {
                    logger.warn('Failed to generate QR code image for credential offer, using URL only', {
                        sessionId,
                        error: qrCodeResult.error
                    });
                }

                logger.info('Credential offer QR code generated successfully', {
                    sessionId,
                    connectionId: credentialOffer.connectionId,
                    issuerId: issuerResponse.issuerId,
                    hasQRImage: !!qrCodeResult.qrCodeDataURL
                });

                return {
                    success: true,
                    connectionId: credentialOffer.connectionId,
                    credentialOfferUrl: credentialOffer.invitationUrl,
                    qrCodeData: credentialOffer.qrCodeData,
                    qrCodeImage: qrCodeResult.qrCodeDataURL,
                    message: 'Credential offer QR code generated successfully',
                };
            } catch (truveraError) {
                logger.error('Truvera API error during credential offer QR generation', {
                    sessionId,
                    error: truveraError,
                    errorMessage: truveraError instanceof Error ? truveraError.message : 'Unknown error'
                });

                const errorMessage = truveraError instanceof Error ? truveraError.message : 'Unknown Truvera API error';
                return {
                    success: false,
                    message: `Failed to create credential offer: ${errorMessage}`,
                };
            }
        } catch (error) {
            logger.error('Unexpected error during credential offer QR generation', { sessionId, error });
            return {
                success: false,
                message: `Failed to generate credential offer QR code: ${error instanceof Error ? error.message : 'Unknown error'}`,
            };
        }
    }

    /**
     * Create credential offer with QR code generation (combined workflow)
     */
    async createCredentialOfferWithQR(sessionId: string, formData: CredentialFormData): Promise<CredentialOfferQRResponse> {
        try {
            logger.info('Creating credential offer with QR code generation', {
                sessionId,
                firstName: formData.firstName,
                lastName: formData.lastName,
                nic: formData.nic,
                country: formData.country,
                investorType: formData.investorType,
                kycLevel: formData.kycLevel
            });

            const session = sessionService.getSession(sessionId);

            if (!session) {
                logger.warn('Credential offer with QR generation failed: Session not found', { sessionId });
                return {
                    success: false,
                    message: 'Session not found or expired',
                };
            }

            // Validate form data
            const validation = this.validateFormData(formData);
            if (!validation.isValid) {
                logger.warn('Credential offer with QR generation failed: Form validation failed', {
                    sessionId,
                    errors: validation.errors
                });
                return {
                    success: false,
                    message: 'Form validation failed: ' + Object.values(validation.errors).join(', '),
                };
            }

            // Store form data in session first
            const storeResult = await this.storeFormData({ sessionId, formData });
            if (!storeResult.success) {
                return {
                    success: false,
                    message: storeResult.message,
                };
            }

            try {
                // Create OpenID issuer with form data
                const issuerResponse = await truveraService.createOpenIDIssuer(formData);
                
                // Update session with issuer ID
                sessionService.setIssuerId(sessionId, issuerResponse.issuerId);
                
                // Create credential offer (this will include the form data)
                const credentialOffer = await truveraService.createCredentialOffer(
                    issuerResponse.issuerId,
                    formData
                );

                // Update session with connection details
                const updatedSession = sessionService.setConnectionDetails(
                    sessionId,
                    credentialOffer.connectionId
                );

                if (!updatedSession) {
                    logger.error('Failed to update session with connection details', { sessionId });
                    return {
                        success: false,
                        message: 'Failed to update session with connection details',
                    };
                }

                // Generate QR code image for the credential offer URL
                const qrCodeResult = await qrCodeService.generateDataURL(credentialOffer.qrCodeData);
                
                if (!qrCodeResult.success) {
                    logger.warn('Failed to generate QR code image for credential offer, using URL only', {
                        sessionId,
                        error: qrCodeResult.error
                    });
                }

                logger.info('Credential offer with QR code generated successfully', {
                    sessionId,
                    connectionId: credentialOffer.connectionId,
                    issuerId: issuerResponse.issuerId,
                    hasQRImage: !!qrCodeResult.qrCodeDataURL,
                    subjectName: `${formData.firstName} ${formData.lastName}`,
                    subjectId: formData.nic
                });

                // Update session step to indicate QR code is ready
                sessionService.setCurrentStep(sessionId, ProcessStep.WALLET_PAIRING);

                return {
                    success: true,
                    connectionId: credentialOffer.connectionId,
                    credentialOfferUrl: credentialOffer.invitationUrl,
                    qrCodeData: credentialOffer.qrCodeData,
                    qrCodeImage: qrCodeResult.qrCodeDataURL,
                    message: 'Credential offer with QR code generated successfully',
                };

            } catch (truveraError) {
                logger.error('Truvera API error during credential offer with QR generation', {
                    sessionId,
                    error: truveraError,
                    errorMessage: truveraError instanceof Error ? truveraError.message : 'Unknown error'
                });

                const errorMessage = truveraError instanceof Error ? truveraError.message : 'Unknown Truvera API error';
                return {
                    success: false,
                    message: `Failed to create credential offer: ${errorMessage}`,
                };
            }
        } catch (error) {
            logger.error('Unexpected error during credential offer with QR generation', { 
                sessionId, 
                error,
                firstName: formData.firstName,
                lastName: formData.lastName,
                nic: formData.nic
            });
            return {
                success: false,
                message: `Failed to generate credential offer with QR code: ${error instanceof Error ? error.message : 'Unknown error'}`,
            };
        }
    }


}

// Export singleton instance
export const credentialService = new CredentialService();
export default credentialService;