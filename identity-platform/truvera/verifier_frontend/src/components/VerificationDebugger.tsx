import React, { useState } from 'react';
import { ProofRequest, VerificationResult, ErrorState } from '../types';

interface VerificationDebuggerProps {
  proofRequest: ProofRequest | null;
  verificationResult: VerificationResult | null;
  error: ErrorState | null;
  loading: boolean;
  verifying: boolean;
  className?: string;
}

export const VerificationDebugger: React.FC<VerificationDebuggerProps> = ({
  proofRequest,
  verificationResult,
  error,
  loading,
  verifying,
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(false);

  if (!isVisible) {
    return (
      <div className={`fixed bottom-4 left-4 ${className}`}>
        <button
          onClick={() => setIsVisible(true)}
          className="bg-indigo-600 text-white px-3 py-2 rounded-lg shadow-lg hover:bg-indigo-700 text-sm"
        >
          🔍 Debug Verification
        </button>
      </div>
    );
  }

  return (
    <div className={`fixed bottom-4 left-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-lg ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-gray-900 text-sm">Verification Debugger</h4>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-500 hover:text-gray-700 text-lg leading-none"
        >
          ×
        </button>
      </div>

      {/* Current State */}
      <div className="mb-3 p-2 bg-gray-50 rounded text-sm">
        <div className="font-medium text-gray-700 mb-2">Current State:</div>
        <div className="space-y-1">
          <div className="flex justify-between">
            <span>Loading:</span>
            <span className={`font-semibold ${loading ? 'text-blue-600' : 'text-gray-600'}`}>
              {loading.toString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Verifying:</span>
            <span className={`font-semibold ${verifying ? 'text-yellow-600' : 'text-gray-600'}`}>
              {verifying.toString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Has Error:</span>
            <span className={`font-semibold ${error ? 'text-red-600' : 'text-green-600'}`}>
              {error ? 'Yes' : 'No'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Has ProofRequest:</span>
            <span className={`font-semibold ${proofRequest ? 'text-green-600' : 'text-red-600'}`}>
              {proofRequest ? 'Yes' : 'No'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Has VerificationResult:</span>
            <span className={`font-semibold ${verificationResult ? 'text-green-600' : 'text-red-600'}`}>
              {verificationResult ? 'Yes' : 'No'}
            </span>
          </div>
        </div>
      </div>

      {/* Error Details */}
      {error && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-sm">
          <div className="font-medium text-red-800 mb-1">Error Details:</div>
          <div className="text-red-700 space-y-1">
            <div><strong>Type:</strong> {error.type}</div>
            <div><strong>Code:</strong> {error.code}</div>
            <div><strong>Message:</strong> {error.message}</div>
            <div><strong>Recoverable:</strong> {error.recoverable.toString()}</div>
          </div>
        </div>
      )}

      {/* ProofRequest Details */}
      {proofRequest && (
        <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
          <div className="font-medium text-blue-800 mb-1">ProofRequest Details:</div>
          <div className="text-blue-700 space-y-1">
            <div><strong>ID:</strong> {proofRequest.id}</div>
            <div><strong>Status:</strong> {proofRequest.status}</div>
            <div><strong>Name:</strong> {proofRequest.config.name}</div>
            <div><strong>Created:</strong> {new Date(proofRequest.createdAt).toLocaleTimeString()}</div>
          </div>
        </div>
      )}

      {/* VerificationResult Details */}
      {verificationResult && (
        <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded text-sm">
          <div className="font-medium text-green-800 mb-1">VerificationResult Details:</div>
          <div className="text-green-700 space-y-1">
            <div><strong>Verified:</strong> {verificationResult.verified.toString()}</div>
            <div><strong>Partially Verified:</strong> {verificationResult.partiallyVerified.toString()}</div>
            <div><strong>Results Count:</strong> {verificationResult.results.length}</div>
            <div><strong>Timestamp:</strong> {new Date(verificationResult.timestamp).toLocaleTimeString()}</div>
          </div>
        </div>
      )}

      {/* Expected Flow */}
      <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
        <div className="font-medium text-yellow-800 mb-1">Expected Flow:</div>
        <ol className="text-yellow-700 space-y-1 list-decimal list-inside">
          <li>Loading: true (loading proof request)</li>
          <li>Loading: false, ProofRequest: exists</li>
          <li>Verifying: true (verifying presentation)</li>
          <li>Verifying: false, VerificationResult: exists</li>
          <li>Show verification results UI</li>
        </ol>
      </div>

      {/* Actions */}
      <div className="mt-3 flex space-x-2">
        <button
          onClick={() => {
            const debugData = {
              loading,
              verifying,
              error,
              proofRequest: proofRequest ? {
                id: proofRequest.id,
                status: proofRequest.status,
                config: proofRequest.config
              } : null,
              verificationResult: verificationResult ? {
                verified: verificationResult.verified,
                partiallyVerified: verificationResult.partiallyVerified,
                resultsCount: verificationResult.results.length
              } : null,
              timestamp: new Date().toISOString()
            };
            console.log('VerificationDebugger: Debug data', debugData);
            navigator.clipboard?.writeText(JSON.stringify(debugData, null, 2));
          }}
          className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs hover:bg-indigo-200"
        >
          Copy Debug Data
        </button>
      </div>
    </div>
  );
};

export default VerificationDebugger;