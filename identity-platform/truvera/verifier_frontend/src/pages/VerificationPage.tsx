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
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-6"></div>
          <p className="text-gray-700 text-xl font-medium">Loading verification data...</p>
          <p className="text-base text-gray-600 mt-3">Proof Request ID: {proofRequestId}</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !verificationResult) {
    console.log('VerificationPage: Rendering error state:', error);
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-lg w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-red-600 text-6xl mb-6">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {error.type === 'verification' ? 'Verification Error' : 'Loading Error'}
          </h2>
          <p className="text-gray-700 mb-8 text-lg">{error.message}</p>
          <div className="space-y-4">
            {error.retryAction && (
              <button
                onClick={error.retryAction}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium transition-colors"
              >
                {error.type === 'verification' ? 'Retry Verification' : 'Try Again'}
              </button>
            )}
            <button
              onClick={handleBackToQRCode}
              className="w-full px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 font-medium transition-colors"
            >
              Back to QR Code
            </button>
            <button
              onClick={handleCreateNewRequest}
              className="w-full px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 font-medium transition-colors"
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
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600 mx-auto mb-6"></div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Verifying Credentials</h2>
          <p className="text-gray-700 text-lg">Please wait while we verify the presented credentials...</p>
          <div className="mt-8 bg-white rounded-lg shadow-lg p-6 max-w-lg mx-auto">
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-base text-gray-800 font-medium">Validating signatures...</span>
            </div>
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-4 h-4 bg-yellow-500 rounded-full animate-pulse"></div>
              <span className="text-base text-gray-800 font-medium">Checking issuer trust...</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-base text-gray-800 font-medium">Verifying expiration...</span>
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-10">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold text-gray-900">Verification Complete</h1>
                <p className="mt-3 text-xl text-gray-700">
                  {proofRequest ? `Results for "${proofRequest.config.name}"` : 'Credential verification results'}
                </p>
              </div>
              <div className="flex space-x-4">
                <button
                  onClick={handleBackToQRCode}
                  className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 font-medium transition-colors"
                >
                  ← Back to QR Code
                </button>
                <button
                  onClick={handleCreateNewRequest}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium transition-colors"
                >
                  🔍 New Verification
                </button>
              </div>
            </div>
          </div>

          {/* Verification Results - Enhanced Debug Mode */}
          <div className="bg-white rounded-lg shadow-lg border-2 border-green-500 p-8 mb-10">
            <h2 className="text-4xl font-bold text-green-600 mb-8">✅ Verification Results (Debug Mode)</h2>

            {/* Status Summary */}
            <div className="bg-green-50 border border-green-200 p-8 rounded-lg mb-8">
              <h3 className="text-2xl font-bold text-green-800 mb-6">📊 Status Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-lg">
                <div className="bg-white p-6 rounded-lg border shadow-sm">
                  <span className="font-semibold text-gray-800 text-base">Verification Status:</span>
                  <span className={`ml-3 font-bold text-xl ${verificationResult.verified ? 'text-green-600' : 'text-red-600'}`}>
                    {verificationResult.verified ? '✅ VERIFIED' : '❌ FAILED'}
                  </span>
                </div>
                <div className="bg-white p-6 rounded-lg border shadow-sm">
                  <span className="font-semibold text-gray-800 text-base">Results Count:</span>
                  <span className="ml-3 font-bold text-xl text-blue-600">{verificationResult.results?.length || 0}</span>
                </div>
                <div className="bg-white p-6 rounded-lg border shadow-sm">
                  <span className="font-semibold text-gray-800 text-base">Partially Verified:</span>
                  <div className="mt-2">
                    {verificationResult.partiallyVerified ? (
                      <div>
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                          ⚠️ Yes - Mixed Results
                        </span>
                        <p className="text-sm text-gray-600 mt-2">
                          The user presented multiple credentials, but only some of them passed verification. 
                          Some credentials were valid while others failed due to issues like expiration, 
                          invalid signatures, or untrusted issuers.
                        </p>
                      </div>
                    ) : (
                      <div>
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                          ✅ No - All or None
                        </span>
                        <p className="text-sm text-gray-600 mt-2">
                          Either all credentials were verified successfully, or all failed verification. 
                          No mixed results.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="bg-white p-6 rounded-lg border shadow-sm">
                  <span className="font-semibold text-gray-800 text-base">Timestamp:</span>
                  <span className="ml-3 font-bold text-xl text-gray-900">{verificationResult.timestamp || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Blockchain Registration Status */}
            {verificationResult.blockchainRegistration && (
              <div className={`border p-8 rounded-lg mb-8 ${verificationResult.blockchainRegistration.success
                ? 'bg-blue-50 border-blue-200'
                : verificationResult.blockchainRegistration.attempted
                  ? 'bg-red-50 border-red-200'
                  : 'bg-gray-50 border-gray-200'
                }`}>
                <h3 className={`text-2xl font-bold mb-6 ${verificationResult.blockchainRegistration.success
                  ? 'text-blue-800'
                  : verificationResult.blockchainRegistration.attempted
                    ? 'text-red-800'
                    : 'text-gray-800'
                  }`}>
                  🔗 Blockchain Registration
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-lg border shadow-sm">
                    <span className="font-semibold text-gray-800 text-base">Blockchain Registration:</span>
                    <div className="mt-2">
                      {verificationResult.blockchainRegistration.success ? (
                        <div>
                          {verificationResult.blockchainRegistration.status === 'newly_registered' ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                              🆕 Newly Registered
                            </span>
                          ) : verificationResult.blockchainRegistration.status === 'already_registered' ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                              ✅ Already Registered
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                              ✅ Success
                            </span>
                          )}
                          <p className="text-sm text-gray-600 mt-2">
                            {verificationResult.blockchainRegistration.userFriendlyMessage || 
                             (verificationResult.blockchainRegistration.status === 'newly_registered' 
                               ? 'User has been successfully registered on the blockchain for the first time.'
                               : 'User was already registered on the blockchain with the same credentials.')}
                          </p>
                        </div>
                      ) : verificationResult.blockchainRegistration.attempted ? (
                        <div>
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                            ❌ Registration Failed
                          </span>
                          <p className="text-sm text-gray-600 mt-2">
                            {verificationResult.blockchainRegistration.userFriendlyMessage || 
                             'There was an issue registering the user on the blockchain.'}
                          </p>
                        </div>
                      ) : (
                        <div>
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                            ⏸️ Not Attempted
                          </span>
                          <p className="text-sm text-gray-600 mt-2">
                            Blockchain registration was not attempted.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {verificationResult.blockchainRegistration.transactionHash && (
                    <div className="bg-white p-6 rounded-lg border shadow-sm">
                      <span className="font-semibold text-gray-800 text-base">Transaction Hash:</span>
                      <div className="mt-2">
                        <code className="text-sm bg-gray-100 p-2 rounded break-all text-gray-900">
                          {verificationResult.blockchainRegistration.transactionHash}
                        </code>
                      </div>
                    </div>
                  )}

                  {verificationResult.blockchainRegistration.userType !== undefined && (
                    <div className="bg-white p-6 rounded-lg border shadow-sm">
                      <span className="font-semibold text-gray-800 text-base">User Type:</span>
                      <span className="ml-3 font-bold text-xl text-blue-600">
                        {verificationResult.blockchainRegistration.userType === 0 && '👤 Individual'}
                        {verificationResult.blockchainRegistration.userType === 1 && '🏢 Organization'}
                        {verificationResult.blockchainRegistration.userType === 2 && '🏛️ Government'}
                        {verificationResult.blockchainRegistration.userType === 3 && '🎓 Academic'}
                        {verificationResult.blockchainRegistration.userType !== undefined &&
                          ![0, 1, 2, 3].includes(verificationResult.blockchainRegistration.userType) &&
                          `Unknown (${verificationResult.blockchainRegistration.userType})`}
                      </span>
                    </div>
                  )}

                  {verificationResult.blockchainRegistration.walletAddress && (
                    <div className="bg-white p-6 rounded-lg border shadow-sm">
                      <span className="font-semibold text-gray-800 text-base">Wallet Address:</span>
                      <div className="mt-2">
                        <code className="text-sm bg-gray-100 p-2 rounded break-all text-gray-900">
                          {verificationResult.blockchainRegistration.walletAddress}
                        </code>
                      </div>
                    </div>
                  )}

                  {verificationResult.blockchainRegistration.ssiIdentifier && (
                    <div className="bg-white p-6 rounded-lg border shadow-sm">
                      <span className="font-semibold text-gray-800 text-base">SSI Identifier:</span>
                      <div className="mt-2">
                        <code className="text-sm bg-gray-100 p-2 rounded break-all text-gray-900">
                          {verificationResult.blockchainRegistration.ssiIdentifier}
                        </code>
                      </div>
                    </div>
                  )}

                  {verificationResult.blockchainRegistration.error && (
                    <div className="bg-white p-6 rounded-lg border shadow-sm md:col-span-2">
                      <span className="font-semibold text-red-800 text-base">Error:</span>
                      <div className="mt-2 text-red-700 text-base">
                        {verificationResult.blockchainRegistration.error}
                      </div>
                    </div>
                  )}
                </div>

                {/* Blockchain Registration Info */}
                <div className="mt-6 text-base text-gray-700 bg-white p-4 rounded-lg border">
                  <p>
                    <strong className="text-gray-900">ℹ️ About Blockchain Registration:</strong>
                    {verificationResult.blockchainRegistration.success
                      ? (verificationResult.blockchainRegistration.status === 'newly_registered'
                          ? ' This is the first time this user has been registered on the blockchain. A new blockchain record has been created.'
                          : verificationResult.blockchainRegistration.status === 'already_registered'
                            ? ' This user was already registered on the blockchain with the same credentials. No new registration was needed.'
                            : ' Your identity has been successfully processed on the blockchain.')
                      : verificationResult.blockchainRegistration.attempted
                        ? ' There was an issue registering your identity on the blockchain, but your credential verification was successful.'
                        : ' Blockchain registration was not attempted (likely because verification failed or blockchain is disabled).'}
                  </p>
                </div>
              </div>
            )}

            {/* API Response Debug */}
            <div className="bg-gray-900 text-white rounded-lg p-8">
              <h3 className="text-2xl font-bold mb-6 text-yellow-300">🔍 Raw API Response</h3>
              <div className="bg-black p-6 rounded-lg">
                <pre className="text-green-300 font-mono text-base whitespace-pre-wrap break-words max-h-96 overflow-y-auto">
                  {JSON.stringify(verificationResult, null, 2)}
                </pre>
              </div>
              <div className="mt-6 text-base text-gray-300">
                <p>💡 <strong>Tip:</strong> Check if the API response has the expected structure</p>
                <p>📝 <strong>Expected:</strong> Should have 'results' array, 'verified' boolean, 'timestamp' string</p>
              </div>
            </div>
          </div>

          {/* Proof Request Details */}
          {proofRequest && (
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h3 className="text-2xl font-semibold text-gray-900 mb-6">Original Request Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-base">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="font-semibold text-gray-800 mb-2">Request Name:</p>
                  <p className="text-gray-900">{proofRequest.config.name}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="font-semibold text-gray-800 mb-2">Purpose:</p>
                  <p className="text-gray-900">{proofRequest.config.purpose}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="font-semibold text-gray-800 mb-2">Requested Types:</p>
                  <p className="text-gray-900">{proofRequest.config.credentialTypes.join(', ')}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="font-semibold text-gray-800 mb-2">Created:</p>
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
      <div className="text-center bg-white p-10 rounded-lg shadow-lg max-w-lg">
        <div className="text-red-600 text-6xl mb-6">🔍</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">DEBUG: Fallback State</h2>
        <p className="text-gray-700 mb-6 text-lg">The component reached the fallback state</p>

        <div className="text-left text-base bg-gray-100 p-6 rounded-lg mb-6">
          <p><strong>Loading:</strong> {loading.toString()}</p>
          <p><strong>Verifying:</strong> {verifying.toString()}</p>
          <p><strong>Error:</strong> {error ? error.message : 'null'}</p>
          <p><strong>VerificationResult:</strong> {verificationResult ? 'exists' : 'null'}</p>
          <p><strong>ProofRequest:</strong> {proofRequest ? 'exists' : 'null'}</p>
          <p><strong>Presentation:</strong> {presentation ? 'exists' : 'null'}</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => {
              console.log('Manual retry triggered');
              loadProofRequestAndVerify();
            }}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
          >
            Retry Loading
          </button>
          <button
            onClick={handleCreateNewRequest}
            className="w-full px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-800 font-medium transition-colors"
          >
            Create New Request
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerificationPage;