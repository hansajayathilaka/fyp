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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading verification results...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
          <div className="flex justify-center mb-4">
            <svg className="w-12 h-12 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Results</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-y-3">
            <button
              onClick={handleRetry}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={handleBackToQRCode}
              className="w-full px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition-colors"
            >
              Back to QR Code
            </button>
            <button
              onClick={handleCreateNewRequest}
              className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-gray-900">Verification Results</h1>
              <p className="mt-2 text-gray-600">
                Credential verification results for proof request {proofRequestId}
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleBackToQRCode}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              >
                Back to QR Code
              </button>
              <button
                onClick={handleCreateNewRequest}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                New Verification
              </button>
            </div>
          </div>
        </div>

        {/* Verification Results Component */}
        <VerificationResults
          verificationResult={verificationResult}
          onRetry={handleRetry}
          className="mb-8"
        />
      </div>
    </div>
  );
};

export default VerificationResultsPage;