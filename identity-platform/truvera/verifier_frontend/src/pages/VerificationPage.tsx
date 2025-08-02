import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ProofRequest,
  CredentialPresentation,
  VerificationResult,
  ErrorState
} from '../types';
import { apiService } from '../services/api';
// import { VerificationResults } from '../components'; // Temporarily disabled for debugging

export const VerificationPage: React.FC = () => {
  console.log('VerificationPage: Component is rendering!');

  const navigate = useNavigate();
  const { proofRequestId } = useParams<{ proofRequestId: string }>();

  console.log('VerificationPage: proofRequestId from params:', proofRequestId);

  const [proofRequest, setProofRequest] = useState<ProofRequest | null>(null);
  const [presentation, setPresentation] = useState<CredentialPresentation | null>(null);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<ErrorState | null>(null);

  // Load proof request and start verification process
  useEffect(() => {
    console.log('VerificationPage: useEffect triggered with proofRequestId:', proofRequestId);

    if (!proofRequestId) {
      console.log('VerificationPage: No proofRequestId provided');
      setError({
        type: 'validation',
        code: 'MISSING_PROOF_REQUEST_ID',
        message: 'No proof request ID provided',
        recoverable: false,
      });
      setLoading(false);
      return;
    }

    console.log('VerificationPage: Starting loadProofRequestAndVerify');
    loadProofRequestAndVerify();
  }, [proofRequestId]);

  const loadProofRequestAndVerify = async () => {
    if (!proofRequestId) return;

    try {
      setLoading(true);
      setError(null);

      console.log(`VerificationPage: Loading proof request: ${proofRequestId}`);

      // First, get the proof request status
      const proofRequestResponse = await apiService.getProofRequestStatus(proofRequestId);

      console.log('VerificationPage: API response:', proofRequestResponse);

      if (!proofRequestResponse.success || !proofRequestResponse.data) {
        const errorMsg = proofRequestResponse.error?.message || 'Failed to load proof request';
        console.error('VerificationPage: API error:', errorMsg);
        throw new Error(errorMsg);
      }

      const proofRequestData = proofRequestResponse.data;
      setProofRequest(proofRequestData);

      console.log('VerificationPage: Proof request loaded:', proofRequestData);
      console.log('VerificationPage: Current status:', proofRequestData.status);

      // Check if the proof request has meaningful presentation data
      const hasMeaningfulPresentation = proofRequestData.presentation && 
                                       proofRequestData.presentation.holder && 
                                       proofRequestData.presentation.credentials && 
                                       proofRequestData.presentation.credentials.length > 0;

      if (!hasMeaningfulPresentation) {
        console.log('VerificationPage: No meaningful presentation data available yet');
        console.log('VerificationPage: Presentation data:', proofRequestData.presentation);
        
        // If status is completed but no meaningful presentation, there might be an issue
        if (proofRequestData.status === 'completed') {
          setError({
            type: 'verification',
            code: 'INCOMPLETE_PRESENTATION',
            message: 'The proof request is marked as completed but presentation data is incomplete. This may indicate a system issue.',
            recoverable: true,
            retryAction: () => loadProofRequestAndVerify(),
          });
        } else {
          setError({
            type: 'validation',
            code: 'NO_PRESENTATION',
            message: 'No credential presentation has been submitted yet. Please scan the QR code with your wallet and submit credentials.',
            recoverable: true,
            retryAction: () => loadProofRequestAndVerify(),
          });
        }
        return;
      }

      // Set the actual presentation data from the proof request
      setPresentation(proofRequestData.presentation);

      console.log('VerificationPage: Found meaningful presentation data:');
      console.log('  Holder:', proofRequestData.presentation.holder);
      console.log('  Credentials count:', proofRequestData.presentation.credentials.length);
      console.log('  Full presentation:', proofRequestData.presentation);

      // Start verification process with real presentation data
      await performVerification(proofRequestData.presentation);

    } catch (err) {
      console.error('VerificationPage: Error loading proof request:', err);
      setError({
        type: 'network',
        code: 'LOAD_ERROR',
        message: err instanceof Error ? err.message : 'Failed to load proof request',
        recoverable: true,
        retryAction: () => loadProofRequestAndVerify(),
      });
    } finally {
      setLoading(false);
    }
  };

  const performVerification = async (presentationData: CredentialPresentation) => {
    try {
      setVerifying(true);
      setError(null);

      console.log('VerificationPage: Starting verification process...');
      console.log('VerificationPage: Presentation data:', presentationData);

      const verificationResponse = await apiService.verifyPresentation(presentationData, proofRequestId);

      console.log('VerificationPage: Verification API response:', verificationResponse);

      if (verificationResponse.success && verificationResponse.data) {
        console.log('VerificationPage: Verification completed successfully:', verificationResponse.data);
        setVerificationResult(verificationResponse.data);
      } else {
        const errorMsg = verificationResponse.error?.message || 'Verification failed';
        console.error('VerificationPage: Verification failed:', errorMsg);
        throw new Error(errorMsg);
      }

    } catch (err) {
      console.error('VerificationPage: Verification error:', err);
      setError({
        type: 'verification',
        code: 'VERIFICATION_FAILED',
        message: err instanceof Error ? err.message : 'Verification process failed',
        recoverable: true,
        retryAction: () => performVerification(presentationData),
      });
    } finally {
      console.log('VerificationPage: Setting verifying to false');
      setVerifying(false);
    }
  };



  // const handleCustomAction = (result: VerificationResult) => {
  //   console.log('Custom action triggered with result:', result);
  // };

  // const handleRetryVerification = () => {
  //   if (presentation) {
  //     performVerification(presentation);
  //   } else {
  //     loadProofRequestAndVerify();
  //   }
  // };

  const handleCreateNewRequest = () => {
    navigate('/');
  };

  const handleBackToQRCode = () => {
    if (proofRequestId) {
      navigate(`/qr/${proofRequestId}`);
    }
  };

  // Debug: Log current state before rendering
  console.log('VerificationPage: About to render, current state:', {
    loading,
    verifying,
    error: error ? error.message : null,
    verificationResult: verificationResult ? 'exists' : null,
    proofRequest: proofRequest ? 'exists' : null
  });

  // Loading state
  if (loading) {
    console.log('VerificationPage: Rendering loading state');
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading verification data...</p>
          <p className="text-sm text-gray-500 mt-2">Proof Request ID: {proofRequestId}</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !verificationResult) {
    console.log('VerificationPage: Rendering error state:', error);
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
          <div className="text-red-600 text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {error.type === 'verification' ? 'Verification Error' : 'Loading Error'}
          </h2>
          <p className="text-gray-600 mb-6">{error.message}</p>
          <div className="space-y-3">
            {error.retryAction && (
              <button
                onClick={error.retryAction}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {error.type === 'verification' ? 'Retry Verification' : 'Try Again'}
              </button>
            )}
            <button
              onClick={handleBackToQRCode}
              className="w-full px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500"
            >
              Back to QR Code
            </button>
            <button
              onClick={handleCreateNewRequest}
              className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Create New Request
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Verifying state
  if (verifying && !verificationResult) {
    console.log('VerificationPage: Rendering verifying state');
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Verifying Credentials</h2>
          <p className="text-gray-600">Please wait while we verify the presented credentials...</p>
          <div className="mt-6 bg-white rounded-lg shadow-md p-4 max-w-md mx-auto">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-700">Validating signatures...</span>
            </div>
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-700">Checking issuer trust...</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-700">Verifying expiration...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success state - show verification results
  if (verificationResult) {
    console.log('VerificationPage: Rendering verification results:', verificationResult);
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Verification Complete</h1>
                <p className="mt-2 text-gray-600">
                  {proofRequest ? `Results for "${proofRequest.config.name}"` : 'Credential verification results'}
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleBackToQRCode}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Back to QR Code
                </button>
                <button
                  onClick={handleCreateNewRequest}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  New Verification
                </button>
              </div>
            </div>
          </div>

          {/* Verification Results - Enhanced Debug Mode */}
          <div className="bg-white rounded-lg shadow-lg border-2 border-green-500 p-6 mb-8">
            <h2 className="text-3xl font-bold text-green-600 mb-6">✅ Verification Results (Debug Mode)</h2>
            
            {/* Status Summary */}
            <div className="bg-green-50 border border-green-200 p-6 rounded-lg mb-6">
              <h3 className="text-xl font-bold text-green-800 mb-4">📊 Status Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-lg">
                <div className="bg-white p-4 rounded border">
                  <span className="font-semibold text-gray-700">Verification Status:</span>
                  <span className={`ml-2 font-bold ${verificationResult.verified ? 'text-green-600' : 'text-red-600'}`}>
                    {verificationResult.verified ? '✅ VERIFIED' : '❌ FAILED'}
                  </span>
                </div>
                <div className="bg-white p-4 rounded border">
                  <span className="font-semibold text-gray-700">Results Count:</span>
                  <span className="ml-2 font-bold text-blue-600">{verificationResult.results?.length || 0}</span>
                </div>
                <div className="bg-white p-4 rounded border">
                  <span className="font-semibold text-gray-700">Partially Verified:</span>
                  <span className={`ml-2 font-bold ${verificationResult.partiallyVerified ? 'text-yellow-600' : 'text-gray-600'}`}>
                    {verificationResult.partiallyVerified ? '⚠️ Yes' : '✅ No'}
                  </span>
                </div>
                <div className="bg-white p-4 rounded border">
                  <span className="font-semibold text-gray-700">Timestamp:</span>
                  <span className="ml-2 font-bold text-gray-800">{verificationResult.timestamp || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Blockchain Registration Status */}
            {verificationResult.blockchainRegistration && (
              <div className={`border p-6 rounded-lg mb-6 ${
                verificationResult.blockchainRegistration.success 
                  ? 'bg-blue-50 border-blue-200' 
                  : verificationResult.blockchainRegistration.attempted 
                    ? 'bg-red-50 border-red-200' 
                    : 'bg-gray-50 border-gray-200'
              }`}>
                <h3 className={`text-xl font-bold mb-4 ${
                  verificationResult.blockchainRegistration.success 
                    ? 'text-blue-800' 
                    : verificationResult.blockchainRegistration.attempted 
                      ? 'text-red-800' 
                      : 'text-gray-800'
                }`}>
                  🔗 Blockchain Registration
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded border">
                    <span className="font-semibold text-gray-700">Registration Status:</span>
                    <span className={`ml-2 font-bold ${
                      verificationResult.blockchainRegistration.success 
                        ? 'text-green-600' 
                        : verificationResult.blockchainRegistration.attempted 
                          ? 'text-red-600' 
                          : 'text-gray-600'
                    }`}>
                      {verificationResult.blockchainRegistration.success 
                        ? '✅ SUCCESS' 
                        : verificationResult.blockchainRegistration.attempted 
                          ? '❌ FAILED' 
                          : '⏸️ NOT ATTEMPTED'}
                    </span>
                  </div>
                  
                  {verificationResult.blockchainRegistration.transactionHash && (
                    <div className="bg-white p-4 rounded border">
                      <span className="font-semibold text-gray-700">Transaction Hash:</span>
                      <div className="mt-1">
                        <code className="text-xs bg-gray-100 p-1 rounded break-all">
                          {verificationResult.blockchainRegistration.transactionHash}
                        </code>
                      </div>
                    </div>
                  )}
                  
                  {verificationResult.blockchainRegistration.userType !== undefined && (
                    <div className="bg-white p-4 rounded border">
                      <span className="font-semibold text-gray-700">User Type:</span>
                      <span className="ml-2 font-bold text-blue-600">
                        {verificationResult.blockchainRegistration.userType === 0 && '👤 Individual'}
                        {verificationResult.blockchainRegistration.userType === 1 && '🏢 Organization'}
                        {verificationResult.blockchainRegistration.userType === 2 && '🏛️ Government'}
                        {verificationResult.blockchainRegistration.userType === 3 && '🎓 Academic'}
                        {verificationResult.blockchainRegistration.userType !== undefined && 
                         ![0,1,2,3].includes(verificationResult.blockchainRegistration.userType) && 
                         `Unknown (${verificationResult.blockchainRegistration.userType})`}
                      </span>
                    </div>
                  )}
                  
                  {verificationResult.blockchainRegistration.walletAddress && (
                    <div className="bg-white p-4 rounded border">
                      <span className="font-semibold text-gray-700">Wallet Address:</span>
                      <div className="mt-1">
                        <code className="text-xs bg-gray-100 p-1 rounded break-all">
                          {verificationResult.blockchainRegistration.walletAddress}
                        </code>
                      </div>
                    </div>
                  )}
                  
                  {verificationResult.blockchainRegistration.ssiIdentifier && (
                    <div className="bg-white p-4 rounded border">
                      <span className="font-semibold text-gray-700">SSI Identifier:</span>
                      <div className="mt-1">
                        <code className="text-xs bg-gray-100 p-1 rounded break-all">
                          {verificationResult.blockchainRegistration.ssiIdentifier}
                        </code>
                      </div>
                    </div>
                  )}
                  
                  {verificationResult.blockchainRegistration.error && (
                    <div className="bg-white p-4 rounded border md:col-span-2">
                      <span className="font-semibold text-red-700">Error:</span>
                      <div className="mt-1 text-red-600 text-sm">
                        {verificationResult.blockchainRegistration.error}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Blockchain Registration Info */}
                <div className="mt-4 text-sm text-gray-600">
                  <p>
                    <strong>ℹ️ About Blockchain Registration:</strong> 
                    {verificationResult.blockchainRegistration.success 
                      ? ' Your identity has been successfully registered on the blockchain with the detected user type.'
                      : verificationResult.blockchainRegistration.attempted 
                        ? ' There was an issue registering your identity on the blockchain, but your credential verification was successful.'
                        : ' Blockchain registration was not attempted (likely because verification failed or blockchain is disabled).'}
                  </p>
                </div>
              </div>
            )}

            {/* API Response Debug */}
            <div className="bg-gray-900 text-white rounded-lg p-6">
              <h3 className="text-xl font-bold mb-4 text-yellow-300">🔍 Raw API Response</h3>
              <div className="bg-black p-4 rounded">
                <pre className="text-green-300 font-mono text-sm whitespace-pre-wrap break-words max-h-96 overflow-y-auto">
                  {JSON.stringify(verificationResult, null, 2)}
                </pre>
              </div>
              <div className="mt-4 text-sm text-gray-300">
                <p>💡 <strong>Tip:</strong> Check if the API response has the expected structure</p>
                <p>📝 <strong>Expected:</strong> Should have 'results' array, 'verified' boolean, 'timestamp' string</p>
              </div>
            </div>
          </div>

          {/* Proof Request Details */}
          {proofRequest && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Original Request Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-gray-700">Request Name:</p>
                  <p className="text-gray-900">{proofRequest.config.name}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-700">Purpose:</p>
                  <p className="text-gray-900">{proofRequest.config.purpose}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-700">Requested Types:</p>
                  <p className="text-gray-900">{proofRequest.config.credentialTypes.join(', ')}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-700">Created:</p>
                  <p className="text-gray-900">{new Date(proofRequest.createdAt).toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Fallback state - make it very visible for debugging
  console.log('VerificationPage: Rendering fallback state');
  console.log('VerificationPage: Current state values:', {
    loading,
    verifying,
    error: error ? error.message : null,
    verificationResult: verificationResult ? 'exists' : null,
    proofRequest: proofRequest ? 'exists' : null,
    presentation: presentation ? 'exists' : null
  });

  return (
    <div className="min-h-screen bg-red-100 flex items-center justify-center">
      <div className="text-center bg-white p-8 rounded-lg shadow-lg max-w-md">
        <div className="text-red-600 text-4xl mb-4">🔍</div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">DEBUG: Fallback State</h2>
        <p className="text-gray-600 mb-4">The component reached the fallback state</p>

        <div className="text-left text-sm bg-gray-100 p-4 rounded mb-4">
          <p><strong>Loading:</strong> {loading.toString()}</p>
          <p><strong>Verifying:</strong> {verifying.toString()}</p>
          <p><strong>Error:</strong> {error ? error.message : 'null'}</p>
          <p><strong>VerificationResult:</strong> {verificationResult ? 'exists' : 'null'}</p>
          <p><strong>ProofRequest:</strong> {proofRequest ? 'exists' : 'null'}</p>
          <p><strong>Presentation:</strong> {presentation ? 'exists' : 'null'}</p>
        </div>

        <div className="space-y-2">
          <button
            onClick={() => {
              console.log('Manual retry triggered');
              loadProofRequestAndVerify();
            }}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Retry Loading
          </button>
          <button
            onClick={handleCreateNewRequest}
            className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Create New Request
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerificationPage;