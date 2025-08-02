import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { VerificationResults } from '../components';
import { VerificationResult } from '../types';
import { apiService } from '../services/api';

export const VerificationResultsPage: React.FC = () => {
  const { proofRequestId } = useParams<{ proofRequestId: string }>();
  const navigate = useNavigate();
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!proofRequestId) {
      setError('No proof request ID provided');
      setLoading(false);
      return;
    }

    loadVerificationResult();
  }, [proofRequestId]);

  const loadVerificationResult = async () => {
    if (!proofRequestId) return;

    try {
      setLoading(true);
      setError(null);

      // Get the proof request to check if it has presentation data
      const proofRequestResponse = await apiService.getProofRequestStatus(proofRequestId);
      
      if (!proofRequestResponse.success || !proofRequestResponse.data) {
        throw new Error(proofRequestResponse.error?.message || 'Failed to load proof request');
      }

      const proofRequest = proofRequestResponse.data;
      
      // Check if there's presentation data to verify
      if (!proofRequest.presentation || Object.keys(proofRequest.presentation).length === 0) {
        throw new Error('No presentation data found for this proof request');
      }

      // Verify the presentation
      const verificationResponse = await apiService.verifyPresentation(proofRequest.presentation, proofRequestId);
      
      if (!verificationResponse.success || !verificationResponse.data) {
        throw new Error(verificationResponse.error?.message || 'Verification failed');
      }

      setVerificationResult(verificationResponse.data);

    } catch (err) {
      console.error('Error loading verification result:', err);
      setError(err instanceof Error ? err.message : 'Failed to load verification result');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomAction = (result: VerificationResult) => {
    console.log('Custom action triggered with result:', result);
    // Implement custom action logic here
  };

  const handleRetry = () => {
    loadVerificationResult();
  };

  const handleBackToQRCode = () => {
    if (proofRequestId) {
      navigate(`/qr/${proofRequestId}`);
    }
  };

  const handleCreateNewRequest = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading verification results...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
          <div className="text-red-600 text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error Loading Results</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-y-3">
            <button
              onClick={handleRetry}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Try Again
            </button>
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

  if (!verificationResult) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No verification results available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Verification Results</h1>
              <p className="mt-2 text-gray-600">
                Credential verification results for proof request {proofRequestId}
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

        {/* Verification Results Component */}
        <VerificationResults
          verificationResult={verificationResult}
          onCustomAction={handleCustomAction}
          onRetry={handleRetry}
          className="mb-8"
        />
      </div>
    </div>
  );
};

export default VerificationResultsPage;