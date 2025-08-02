import React from 'react';
import { ProofRequestConfig, ErrorState } from '../types';

interface ProofRequestFormProps {
  onSubmit: (config: ProofRequestConfig) => Promise<void>;
  isLoading?: boolean;
  error?: ErrorState | null;
  onClearError?: () => void;
  config?: {
    name?: string;
    purpose?: string;
    credentialTypes?: string[];
    requiredFields?: string[];
    timeoutMinutes?: number;
  };
}

export const ProofRequestForm: React.FC<ProofRequestFormProps> = ({
  onSubmit,
  isLoading = false,
  error,
  onClearError,
  config,
}) => {
  // Default configuration - can be overridden via props
  const defaultConfig = {
    name: 'DEIP Credential Verification',
    purpose: 'Verify your DEIP access credential for platform access',
    credentialTypes: ['DEIPAccessCredential'],
    requiredFields: [
      'firstName',
      'lastName', 
      'kycLevel',
      'walletAddress'
    ],
    timeoutMinutes: 30
  };

  // Merge default config with provided config
  const finalConfig = {
    ...defaultConfig,
    ...config
  };

  const handleGenerateQR = async () => {
    if (onClearError) {
      onClearError();
    }

    // Create API payload in the format expected by the backend
    const apiPayload = {
      name: finalConfig.name,
      purpose: finalConfig.purpose,
      credentialTypes: finalConfig.credentialTypes,
      requiredFields: finalConfig.requiredFields.map(field => ({
        path: `credentialSubject.${field}`,
        required: true
      })),
      timeoutMinutes: finalConfig.timeoutMinutes
    };

    try {
      await onSubmit(apiPayload as ProofRequestConfig);
    } catch (err) {
      console.error('QR generation error:', err);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-semibold text-gray-800 mb-6">
        DEIP Credential Verification
      </h2>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="mt-1 text-sm text-red-700">{error.message}</p>
              {error.recoverable && onClearError && (
                <button
                  onClick={onClearError}
                  className="mt-2 text-sm text-red-600 hover:text-red-500 underline"
                >
                  Dismiss
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Configuration Display */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-6">
          <h3 className="text-lg font-medium text-blue-800 mb-4">Verification Configuration</h3>
          <div className="space-y-3">
            <div>
              <span className="text-sm font-medium text-blue-700">Request Name:</span>
              <span className="ml-2 text-sm text-blue-900">{finalConfig.name}</span>
            </div>
            <div>
              <span className="text-sm font-medium text-blue-700">Purpose:</span>
              <span className="ml-2 text-sm text-blue-900">{finalConfig.purpose}</span>
            </div>
            <div>
              <span className="text-sm font-medium text-blue-700">Credential Types:</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {finalConfig.credentialTypes.map((type, index) => (
                  <span key={index} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                    {type}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <span className="text-sm font-medium text-blue-700">Required Fields:</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {finalConfig.requiredFields.map((field, index) => (
                  <span key={index} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                    {field}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-gray-50 border border-gray-200 rounded-md p-6">
          <h3 className="text-lg font-medium text-gray-800 mb-4">How it works</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-center">
              <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-medium mr-3">1</span>
              <span>Click "Generate QR Code" to create a verification request</span>
            </div>
            <div className="flex items-center">
              <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-medium mr-3">2</span>
              <span>User scans the QR code with their mobile wallet app</span>
            </div>
            <div className="flex items-center">
              <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-medium mr-3">3</span>
              <span>User presents their DEIP Access Credential</span>
            </div>
            <div className="flex items-center">
              <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-medium mr-3">4</span>
              <span>System automatically verifies the credential</span>
            </div>
          </div>
        </div>

        {/* Generate Button */}
        <div className="flex justify-center">
          <button
            onClick={handleGenerateQR}
            disabled={isLoading}
            className="px-8 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed text-lg font-medium"
          >
            {isLoading ? (
              <div className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating QR Code...
              </div>
            ) : (
              '🔍 Generate QR Code for Verification'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProofRequestForm;