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
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <header className="text-center mb-12">
          <div className="mb-6">
            <div className="flex items-center justify-center space-x-4 mb-4">
              <img 
                src="/favicon.svg" 
                alt="DEIP Logo" 
                className="w-16 h-16"
              />
              <h1 className="text-5xl font-bold text-gray-900">
                DEIP Credential Verifier
              </h1>
            </div>
            <p className="text-xl text-gray-700 max-w-2xl mx-auto">
              Generate QR codes for users to scan and present their credentials securely
            </p>
          </div>
        </header>

        <main className="max-w-5xl mx-auto">
          {!currentProofRequest ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <ProofRequestForm
                  onSubmit={handleCreateProofRequest}
                  isLoading={isLoading}
                  error={error}
                  onClearError={clearError}
                />
              </div>
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow-md p-6 h-fit">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Guide</h3>
                  <div className="space-y-4 text-sm text-gray-700">
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</div>
                      <p>Generate a QR code with your verification requirements</p>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</div>
                      <p>Share the QR code with credential holders</p>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</div>
                      <p>Monitor real-time status as users scan and present</p>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">4</div>
                      <p>Review verification results instantly</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <ProofRequestDetails
              proofRequest={currentProofRequest}
              onCreateNew={handleCreateNew}
              onProceedToQR={handleProceedToQR}
            />
          )}
        </main>

        {/* Footer */}
        <footer className="mt-20 text-center text-base text-gray-600">
          <p>
            Powered by Truvera API • Secure credential verification
          </p>
        </footer>
      </div>
    </div>
  );
};

export default ProofRequestPage;