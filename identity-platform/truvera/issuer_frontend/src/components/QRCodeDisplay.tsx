import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { useAppContext } from '../contexts/AppContext';
import { ProcessStep } from '../types';
import { apiConfig } from '../config/api';
import { useRenderTracker } from '../utils/renderTracker';

// QR code and connection states
type QRState = 'generating' | 'ready' | 'expired' | 'error';
type ConnectionState = 'pending' | 'connected' | 'failed' | 'timeout';

interface QRCodeDisplayProps {
    onConnectionEstablished?: (holderDID: string) => void;
}

export default function QRCodeDisplay({ onConnectionEstablished: _onConnectionEstablished }: QRCodeDisplayProps) {
    // Only track renders in development
    if (process.env.NODE_ENV === 'development') {
        useRenderTracker('QRCodeDisplay');
    }
    
    const [qrState, setQrState] = useState<QRState>('generating');
    const [connectionState, setConnectionState] = useState<ConnectionState>('pending');
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
    const [credentialOfferUrl, setCredentialOfferUrl] = useState<string>('');
    const [securityPIN, setSecurityPIN] = useState<string>('');

    const [errorMessage, setErrorMessage] = useState<string>('');
    const [retryCount, setRetryCount] = useState(0);
    const [timeRemaining, setTimeRemaining] = useState(300); // 5 minutes

    // Use ref to track if QR code has been generated to prevent infinite loops
    const hasGeneratedRef = useRef(false);
    const currentWalletAddressRef = useRef<string>('');
    const isGeneratingRef = useRef(false);

    const { state, setConnectionId: setGlobalConnectionId, setStep, setErrorState } = useAppContext();
    const navigate = useNavigate();

    // Generate QR code for credential offer using backend API
    const generateQRCode = useCallback(async (forceRegenerate = false) => {
        if (!state.walletAddress || !state.sessionId || !state.sessionCreated) {
            setErrorMessage('Wallet address and session are required');
            setQrState('error');
            return;
        }

        // Check if form data is available (required for credential offer)
        if (!state.formData) {
            setErrorMessage('Form data is required to generate credential offer');
            setQrState('error');
            return;
        }

        // Prevent multiple generations unless forced (for regeneration)
        if (!forceRegenerate && hasGeneratedRef.current && currentWalletAddressRef.current === state.walletAddress) {
            console.log('QR code already generated for this wallet address, skipping...');
            return;
        }

        // Prevent concurrent generations
        if (isGeneratingRef.current) {
            console.log('QR code generation already in progress, skipping...');
            return;
        }

        isGeneratingRef.current = true;
        setQrState('generating');
        setErrorMessage('');

        try {
            // Call backend API to create credential offer (complete workflow)
            const response = await fetch(apiConfig.endpoints.credentials.createOffer, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sessionId: state.sessionId,
                }),
            });

            if (!response.ok) {
                throw new Error(`Failed to create credential offer: ${response.status}`);
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error?.message || 'Failed to create credential offer');
            }

            // Generate QR code from the credential offer URL
            const qrDataUrl = await QRCode.toDataURL(data.data.credentialOfferUrl, {
                width: 256,
                margin: 2,
                color: {
                    dark: '#1f2937', // gray-800
                    light: '#ffffff',
                },
            });

            setQrCodeDataUrl(qrDataUrl);
            setGlobalConnectionId(data.data.issuerId); // Use issuer ID as connection ID
            setCredentialOfferUrl(data.data.credentialOfferUrl);
            setSecurityPIN(data.data.securityPIN || '');
            setQrState('ready');
            setConnectionState('pending');
            setTimeRemaining(300); // Reset timer

            // Mark as generated and store current wallet address
            hasGeneratedRef.current = true;
            currentWalletAddressRef.current = state.walletAddress;

            // Update step to wallet pairing
            setStep(ProcessStep.WALLET_PAIRING);

        } catch (error) {
            console.error('Failed to create credential offer:', error);
            setErrorMessage('Failed to create credential offer. Please try again.');
            setQrState('error');
            setErrorState({ 
                hasError: true, 
                error: `Credential offer creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                code: 'CREDENTIAL_OFFER_FAILED'
            });
        } finally {
            isGeneratingRef.current = false;
        }
    }, [state.walletAddress, state.sessionId, state.sessionCreated, state.formData, setGlobalConnectionId, setStep, setErrorState]);

    // Status polling is now handled by StatusMonitor component to avoid duplicate requests

    // Initialize QR code generation - check if QR data is already available from form submission
    useEffect(() => {
        // If QR code data is already available from the form submission workflow, use it
        if (state.qrCodeData && state.qrCodeData.qrCodeData && state.qrCodeData.credentialOfferUrl) {
            console.log('Using existing QR code data from form submission workflow');
            setQrCodeDataUrl(state.qrCodeData.qrCodeImage || '');
            setCredentialOfferUrl(state.qrCodeData.credentialOfferUrl);
            setQrState('ready');
            setConnectionState('pending');
            setTimeRemaining(300); // Reset timer
            
            // Mark as generated
            hasGeneratedRef.current = true;
            currentWalletAddressRef.current = state.walletAddress || '';
            
            // Update step to wallet pairing
            setStep(ProcessStep.WALLET_PAIRING);
            return;
        }
        
        // Otherwise, generate QR code if all required data is available
        if (state.walletAddress && state.sessionId && state.sessionCreated && state.formData && (!hasGeneratedRef.current || currentWalletAddressRef.current !== state.walletAddress)) {
            console.log('Triggering credential offer QR code generation from useEffect');
            generateQRCode();
        }
    }, [state.walletAddress, state.sessionId, state.sessionCreated, state.formData, state.qrCodeData, setStep]);

    // Polling is now handled by StatusMonitor component to avoid duplicate requests
    // This component only handles QR code display and initial state management

    // Set up countdown timer
    useEffect(() => {
        if (qrState === 'ready' && timeRemaining > 0) {
            const timer = setInterval(() => {
                setTimeRemaining(prev => {
                    if (prev <= 1) {
                        setQrState('expired');
                        setConnectionState('timeout');
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            return () => clearInterval(timer);
        }
    }, [qrState, timeRemaining]);

    // Handle QR code regeneration
    const handleRegenerate = useCallback(() => {
        console.log('Manual QR code regeneration requested');
        setRetryCount(prev => prev + 1);
        hasGeneratedRef.current = false; // Reset the flag to allow regeneration
        isGeneratingRef.current = false; // Reset the generation lock
        generateQRCode(true); // Force regeneration
    }, [generateQRCode]);

    // Format time remaining
    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    // Show loading state if session is not ready
    if (!state.sessionCreated || !state.sessionId) {
        return (
            <div className="text-center">
                <div className="mb-6">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Initializing Session
                </h3>

                <p className="text-gray-600">
                    Please wait while we set up your session...
                </p>
            </div>
        );
    }

    // Show loading state if wallet is not connected
    if (!state.walletAddress) {
        return (
            <div className="text-center">
                <div className="mb-6">
                    <svg
                        className="mx-auto h-16 w-16 text-orange-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                        />
                    </svg>
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Wallet Not Connected
                </h3>

                <p className="text-gray-600 mb-6">
                    Please connect your MetaMask wallet first before generating a credential offer.
                </p>

                <button
                    onClick={() => navigate('/wallet-connection')}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                >
                    Connect Wallet
                </button>
            </div>
        );
    }

    // Show loading state if form data is not available
    if (!state.formData) {
        return (
            <div className="text-center">
                <div className="mb-6">
                    <svg
                        className="mx-auto h-16 w-16 text-orange-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                    </svg>
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Form Data Required
                </h3>

                <p className="text-gray-600 mb-6">
                    Please fill out the credential form first before generating the credential offer.
                </p>

                <button
                    onClick={() => navigate('/credential-form')}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                >
                    Fill Out Form
                </button>
            </div>
        );
    }

    // Render different states
    if (qrState === 'generating') {
        return (
            <div className="text-center">
                <div className="mb-6">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Generating QR Code
                </h3>

                <p className="text-gray-600">
                    Please wait while we generate your connection QR code...
                </p>
            </div>
        );
    }

    if (qrState === 'error') {
        return (
            <div className="text-center">
                <div className="mb-6">
                    <svg
                        className="mx-auto h-16 w-16 text-red-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                        />
                    </svg>
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    QR Code Generation Failed
                </h3>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                    <p className="text-sm text-red-800">
                        {errorMessage}
                    </p>
                </div>

                <button
                    onClick={handleRegenerate}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                >
                    Try Again
                </button>
            </div>
        );
    }

    if (qrState === 'expired') {
        return (
            <div className="text-center">
                <div className="mb-6">
                    <svg
                        className="mx-auto h-16 w-16 text-orange-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                    </svg>
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    QR Code Expired
                </h3>

                <p className="text-gray-600 mb-6">
                    The QR code has expired for security reasons. Please generate a new one to continue.
                </p>

                <button
                    onClick={handleRegenerate}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                >
                    Generate New QR Code
                </button>

                {retryCount > 0 && (
                    <p className="text-sm text-gray-500 mt-4">
                        Retry attempt: {retryCount}
                    </p>
                )}
            </div>
        );
    }

    if (connectionState === 'connected') {
        return (
            <div className="text-center">
                <div className="mb-6">
                    <svg
                        className="mx-auto h-16 w-16 text-green-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                    </svg>
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Credential Delivered Successfully!
                </h3>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                    <p className="text-sm text-green-800">
                        Your DEIP Access Credential has been successfully delivered to your Truvera wallet.
                    </p>
                </div>
            </div>
        );
    }

    // Default state: QR code ready for scanning
    return (
        <div className="text-center">
            <div className="mb-8">
                <h3 className="text-lg md:text-xl lg:text-2xl font-semibold text-gray-900 mb-6">
                    Scan to Receive Your Credential
                </h3>

                {/* Security PIN Display */}
                {securityPIN && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 max-w-md mx-auto">
                        <div className="flex items-center justify-center space-x-3">
                            <svg className="w-6 h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            <span className="text-sm md:text-base font-medium text-yellow-800">Security PIN:</span>
                            <span className="text-xl md:text-2xl font-bold text-yellow-900 font-mono">{securityPIN}</span>
                        </div>
                        <p className="text-sm text-yellow-700 mt-2">
                            You may need this PIN when accepting the credential offer
                        </p>
                    </div>
                )}

                {/* QR Code Display */}
                <div className="bg-white border-2 border-gray-200 rounded-lg p-6 lg:p-8 inline-block mb-6">
                    <img
                        src={qrCodeDataUrl}
                        alt="Credential Offer QR Code"
                        className="w-64 h-64 md:w-80 md:h-80 lg:w-96 lg:h-96 mx-auto"
                    />
                </div>

                {/* Timer and Status */}
                <div className="mb-8">
                    <div className="flex items-center justify-center space-x-3 text-sm md:text-base text-gray-600 mb-3">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="font-medium">Expires in: {formatTime(timeRemaining)}</span>
                    </div>

                    <div className="flex items-center justify-center space-x-3">
                        <div className="animate-pulse w-3 h-3 bg-blue-600 rounded-full"></div>
                        <span className="text-sm md:text-base text-gray-600">Waiting for credential acceptance...</span>
                    </div>
                </div>
            </div>

            {/* Comprehensive Scanning Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 lg:p-8 mb-6">
                <h4 className="font-medium text-blue-900 mb-4 flex items-center text-lg">
                    <svg className="w-6 h-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Scanning Instructions
                </h4>
                <ol className="text-sm md:text-base text-blue-800 text-left space-y-4 max-w-4xl mx-auto">
                    <li className="flex items-start">
                        <span className="font-semibold mr-4 text-blue-900 text-lg">1.</span>
                        <div>
                            <strong className="text-base md:text-lg">Open your Dock (Truvera) wallet app</strong>
                            <p className="text-sm text-blue-700 mt-1">Make sure you have the latest version installed</p>
                        </div>
                    </li>
                    <li className="flex items-start">
                        <span className="font-semibold mr-4 text-blue-900 text-lg">2.</span>
                        <div>
                            <strong className="text-base md:text-lg">Tap "Scan QR Code" or "Add Connection"</strong>
                            <p className="text-sm text-blue-700 mt-1">Usually found on the main screen or in the menu</p>
                        </div>
                    </li>
                    <li className="flex items-start">
                        <span className="font-semibold mr-4 text-blue-900 text-lg">3.</span>
                        <div>
                            <strong className="text-base md:text-lg">Point your camera at the QR code above</strong>
                            <p className="text-sm text-blue-700 mt-1">Ensure good lighting and hold steady for best results</p>
                        </div>
                    </li>
                    <li className="flex items-start">
                        <span className="font-semibold mr-4 text-blue-900 text-lg">4.</span>
                        <div>
                            <strong className="text-base md:text-lg">Accept the connection invitation</strong>
                            <p className="text-sm text-blue-700 mt-1">Review the connection details before accepting</p>
                        </div>
                    </li>
                    <li className="flex items-start">
                        <span className="font-semibold mr-4 text-blue-900 text-lg">5.</span>
                        <div>
                            <strong className="text-base md:text-lg">Wait for the credential offer</strong>
                            <p className="text-sm text-blue-700 mt-1">This may take a few seconds to appear</p>
                        </div>
                    </li>
                    <li className="flex items-start">
                        <span className="font-semibold mr-4 text-blue-900 text-lg">6.</span>
                        <div>
                            <strong className="text-base md:text-lg">Review and accept the credential</strong>
                            <p className="text-sm text-blue-700 mt-1">Check the credential details before storing in your wallet</p>
                        </div>
                    </li>
                </ol>
            </div>

            {/* Troubleshooting Tips */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 lg:p-8 mb-6">
                <h4 className="font-medium text-orange-900 mb-4 flex items-center text-lg">
                    <svg className="w-6 h-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    Troubleshooting Tips
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ul className="text-sm md:text-base text-orange-800 text-left space-y-4">
                    <li className="flex items-start">
                        <span className="mr-3 text-orange-600">•</span>
                        <div>
                            <strong>QR code won't scan?</strong> Try adjusting your distance from the screen or improving lighting
                        </div>
                    </li>
                    <li className="flex items-start">
                        <span className="mr-3 text-orange-600">•</span>
                        <div>
                            <strong>Connection failed?</strong> Check your internet connection and try generating a new QR code
                        </div>
                    </li>
                    <li className="flex items-start">
                        <span className="mr-3 text-orange-600">•</span>
                        <div>
                            <strong>Wallet app issues?</strong> Make sure you have the latest version of the Dock wallet app
                        </div>
                    </li>
                    <li className="flex items-start">
                        <span className="mr-3 text-orange-600">•</span>
                        <div>
                            <strong>Still having problems?</strong> Use the credential offer URL below as a fallback option
                        </div>
                    </li>
                </ul>
                </div>
            </div>

            {/* Credential Offer URL Fallback */}
            {credentialOfferUrl && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 lg:p-8 mb-6">
                    <h4 className="font-medium text-gray-900 mb-4 flex items-center text-lg">
                        <svg className="w-6 h-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                        Alternative: Use Credential Offer URL
                    </h4>
                    <p className="text-sm md:text-base text-gray-700 mb-4">
                        If scanning doesn't work, you can copy this URL and paste it into your Dock wallet:
                    </p>
                    <div className="bg-white border border-gray-300 rounded p-4 mb-4">
                        <code className="text-xs md:text-sm text-gray-800 break-all font-mono">
                            {credentialOfferUrl}
                        </code>
                    </div>
                    <button
                        onClick={() => navigator.clipboard.writeText(credentialOfferUrl)}
                        className="text-sm md:text-base bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded transition-colors"
                    >
                        Copy URL
                    </button>
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col md:flex-row items-center justify-center space-y-4 md:space-y-0 md:space-x-4">
                <button
                    onClick={handleRegenerate}
                    className="w-full md:w-auto bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-6 rounded-md transition-colors flex items-center justify-center text-base"
                >
                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Generate New QR Code
                </button>

                {retryCount > 0 && (
                    <div className="text-sm text-gray-500 text-center">
                        Retry attempt: {retryCount}
                    </div>
                )}
            </div>
        </div>
    );
}