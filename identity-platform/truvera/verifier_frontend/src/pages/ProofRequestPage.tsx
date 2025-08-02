import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProofRequestForm } from '../components/ProofRequestForm';
import { ProofRequestDetails } from '../components/ProofRequestDetails';
import { apiService } from '../services/api';
import { ProofRequestConfig, ProofRequest, ErrorState } from '../types';

export const ProofRequestPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentProofRequest, setCurrentProofRequest] = useState<ProofRequest | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ErrorState | null>(null);

  const handleCreateProofRequest = async (config: ProofRequestConfig) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiService.createProofRequest(config);
      
      console.log('API Response:', response);
      
      if (response.success && response.data) {
        console.log('Setting proof request data:', response.data);
        setCurrentProofRequest(response.data);
      } else if (response.error) {
        setError(response.error);
      } else {
        setError({
          type: 'verification',
          code: 'UNKNOWN_ERROR',
          message: 'An unexpected error occurred while creating the proof request',
          recoverable: true,
        });
      }
    } catch (err) {
      console.error('Error creating proof request:', err);
      setError({
        type: 'network',
        code: 'REQUEST_FAILED',
        message: 'Failed to create proof request. Please try again.',
        recoverable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNew = () => {
    setCurrentProofRequest(null);
    setError(null);
  };

  const handleProceedToQR = () => {
    if (currentProofRequest?.id) {
      navigate(`/qr/${currentProofRequest.id}`);
    }
  };

  const clearError = () => {
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <div className="flex justify-between items-start mb-4">
            <div></div>
            <div className="text-center">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                DEIP Credential Verifier
              </h1>
              <p className="text-lg text-gray-600">
                Generate QR codes for users to scan and present their credentials
              </p>
            </div>
            <div>
              <button
                onClick={() => navigate('/settings')}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 text-sm"
              >
                ⚙️ Settings
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto">
          {!currentProofRequest ? (
            <ProofRequestForm
              onSubmit={handleCreateProofRequest}
              isLoading={isLoading}
              error={error}
              onClearError={clearError}
            />
          ) : (
            <ProofRequestDetails
              proofRequest={currentProofRequest}
              onCreateNew={handleCreateNew}
              onProceedToQR={handleProceedToQR}
            />
          )}
        </main>

        {/* Footer */}
        <footer className="mt-16 text-center text-sm text-gray-500">
          <p>
            Powered by Truvera API • Secure credential verification
          </p>
        </footer>
      </div>
    </div>
  );
};

export default ProofRequestPage;