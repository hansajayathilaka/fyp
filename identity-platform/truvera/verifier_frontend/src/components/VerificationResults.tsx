import React, { useState, useCallback } from 'react';
import { 
  VerificationResult, 
  CredentialVerificationResult, 
  VerifiableCredential,
  CustomActionPayload 
} from '../types';
import { apiService } from '../services/api';

interface VerificationResultsProps {
  verificationResult: VerificationResult;
  onCustomAction?: (result: VerificationResult) => void;
  onRetry?: () => void;
  className?: string;
}

export const VerificationResults: React.FC<VerificationResultsProps> = ({
  verificationResult,
  onCustomAction,
  onRetry,
  className = '',
}) => {
  const [customActionLoading, setCustomActionLoading] = useState(false);
  const [customActionError, setCustomActionError] = useState<string | null>(null);
  const [customActionSuccess, setCustomActionSuccess] = useState(false);
  const [expandedCredentials, setExpandedCredentials] = useState<Set<string>>(new Set());

  // Handle custom action trigger
  const handleCustomAction = useCallback(async () => {
    if (!onCustomAction) return;

    setCustomActionLoading(true);
    setCustomActionError(null);
    setCustomActionSuccess(false);

    try {
      // Create payload for custom action
      const payload: CustomActionPayload = {
        verificationResult,
        timestamp: new Date().toISOString(),
        sessionId: `session-${Date.now()}`,
        metadata: {
          userAgent: navigator.userAgent,
          timestamp: verificationResult.timestamp,
        },
      };

      const response = await apiService.triggerCustomAction(payload);

      if (response.success) {
        setCustomActionSuccess(true);
        onCustomAction(verificationResult);
      } else {
        setCustomActionError(response.error?.message || 'Custom action failed');
      }
    } catch (error) {
      setCustomActionError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setCustomActionLoading(false);
    }
  }, [verificationResult, onCustomAction]);

  // Toggle credential expansion
  const toggleCredentialExpansion = useCallback((credentialId: string) => {
    setExpandedCredentials(prev => {
      const newSet = new Set(prev);
      if (newSet.has(credentialId)) {
        newSet.delete(credentialId);
      } else {
        newSet.add(credentialId);
      }
      return newSet;
    });
  }, []);

  // Get overall status color and icon
  const getOverallStatusDisplay = () => {
    if (verificationResult.verified) {
      return {
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        icon: '✅',
        status: 'Verified',
        description: 'All credentials have been successfully verified',
      };
    } else if (verificationResult.partiallyVerified) {
      return {
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        icon: '⚠️',
        status: 'Partially Verified',
        description: 'Some credentials were verified, but others failed verification',
      };
    } else {
      return {
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        icon: '❌',
        status: 'Verification Failed',
        description: 'Credential verification was unsuccessful',
      };
    }
  };

  // Get credential status display
  const getCredentialStatusDisplay = (result: CredentialVerificationResult) => {
    if (result.verified) {
      return {
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        icon: '✅',
        status: 'Verified',
      };
    } else {
      return {
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        icon: '❌',
        status: 'Failed',
      };
    }
  };

  // Format issuer display
  const formatIssuer = (issuer: string | { id: string; name?: string }): string => {
    if (typeof issuer === 'string') {
      return issuer;
    }
    return issuer.name || issuer.id;
  };

  // Format date display
  const formatDate = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  // Check if credential is expired
  const isCredentialExpired = (credential: VerifiableCredential): boolean => {
    if (!credential.expirationDate) return false;
    return new Date(credential.expirationDate) < new Date();
  };

  // Render credential subject details
  const renderCredentialSubject = (credentialSubject: Record<string, any>) => {
    return Object.entries(credentialSubject).map(([key, value]) => (
      <div key={key} className="flex justify-between py-1">
        <span className="text-sm font-medium text-gray-600 capitalize">
          {key.replace(/([A-Z])/g, ' $1').trim()}:
        </span>
        <span className="text-sm text-gray-900">
          {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
        </span>
      </div>
    ));
  };

  // Render verification details
  const renderVerificationDetails = (details?: CredentialVerificationResult['details']) => {
    if (!details) return null;

    return (
      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
        <h5 className="text-sm font-medium text-gray-700 mb-2">Verification Details</h5>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className={`flex items-center space-x-1 ${details.signatureValid ? 'text-green-600' : 'text-red-600'}`}>
            <span>{details.signatureValid ? '✅' : '❌'}</span>
            <span>Signature Valid</span>
          </div>
          <div className={`flex items-center space-x-1 ${details.issuerTrusted ? 'text-green-600' : 'text-red-600'}`}>
            <span>{details.issuerTrusted ? '✅' : '❌'}</span>
            <span>Issuer Trusted</span>
          </div>
          <div className={`flex items-center space-x-1 ${details.notExpired ? 'text-green-600' : 'text-red-600'}`}>
            <span>{details.notExpired ? '✅' : '❌'}</span>
            <span>Not Expired</span>
          </div>
          <div className={`flex items-center space-x-1 ${details.schemaValid ? 'text-green-600' : 'text-red-600'}`}>
            <span>{details.schemaValid ? '✅' : '❌'}</span>
            <span>Schema Valid</span>
          </div>
        </div>
      </div>
    );
  };

  const overallStatus = getOverallStatusDisplay();

  return (
    <div className={`bg-white rounded-lg shadow-lg ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Verification Results</h2>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">
              {formatDate(verificationResult.timestamp)}
            </span>
            {onRetry && (
              <button
                onClick={onRetry}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                Verify Again
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Overall Status */}
      <div className={`mx-6 mt-6 p-4 rounded-lg border ${overallStatus.borderColor} ${overallStatus.bgColor}`}>
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{overallStatus.icon}</span>
          <div className="flex-1">
            <h3 className={`text-lg font-semibold ${overallStatus.color}`}>
              {overallStatus.status}
            </h3>
            <p className="text-sm text-gray-600">{overallStatus.description}</p>
          </div>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">📋</span>
              <div>
                <p className="text-sm font-medium text-gray-700">Total Credentials</p>
                <p className="text-lg font-semibold text-gray-900">
                  {verificationResult.results.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">✅</span>
              <div>
                <p className="text-sm font-medium text-gray-700">Verified</p>
                <p className="text-lg font-semibold text-green-600">
                  {verificationResult.results.filter(r => r.verified).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">❌</span>
              <div>
                <p className="text-sm font-medium text-gray-700">Failed</p>
                <p className="text-lg font-semibold text-red-600">
                  {verificationResult.results.filter(r => !r.verified).length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Presentation Holder Information */}
      <div className="px-6 py-4 border-t border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Presentation Details</h3>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Holder:</span>
            <span className="text-sm text-gray-900 font-mono">
              {verificationResult.presentation.holder || 'Unknown'}
            </span>
          </div>
          {verificationResult.presentation.presentation_submission && (
            <div className="mt-2 pt-2 border-t border-gray-200">
              <span className="text-sm font-medium text-gray-700">Submission Details:</span>
              <pre className="mt-1 text-xs text-gray-600 bg-white p-2 rounded border overflow-x-auto">
                {JSON.stringify(verificationResult.presentation.presentation_submission, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* Individual Credential Results */}
      <div className="px-6 py-4 border-t border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Individual Credential Results</h3>
        <div className="space-y-4">
          {verificationResult.results.map((result) => {
            const statusDisplay = getCredentialStatusDisplay(result);
            const isExpanded = expandedCredentials.has(result.credential.id);
            const isExpired = isCredentialExpired(result.credential);

            return (
              <div key={result.credential.id} className="border border-gray-200 rounded-lg">
                {/* Credential Header */}
                <div 
                  className="p-4 cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleCredentialExpansion(result.credential.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-xl">{statusDisplay.icon}</span>
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {result.credential.type.filter(t => t !== 'VerifiableCredential').join(', ') || 'Credential'}
                        </h4>
                        <p className="text-sm text-gray-600">
                          Issued by: {formatIssuer(result.credential.issuer)}
                        </p>
                        {isExpired && (
                          <p className="text-sm text-red-600 font-medium">⚠️ Expired</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusDisplay.bgColor} ${statusDisplay.color}`}>
                        {statusDisplay.status}
                      </span>
                      <span className="text-gray-400">
                        {isExpanded ? '▼' : '▶'}
                      </span>
                    </div>
                  </div>

                  {/* Error Message (if any) */}
                  {result.error && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                      <strong>Error:</strong> {result.error}
                    </div>
                  )}
                </div>

                {/* Expanded Credential Details */}
                {isExpanded && (
                  <div className="border-t border-gray-200 p-4 bg-gray-50">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Basic Information */}
                      <div>
                        <h5 className="text-sm font-medium text-gray-700 mb-3">Basic Information</h5>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm font-medium text-gray-600">ID:</span>
                            <span className="text-sm text-gray-900 font-mono break-all">
                              {result.credential.id}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm font-medium text-gray-600">Issued:</span>
                            <span className="text-sm text-gray-900">
                              {formatDate(result.credential.issuanceDate)}
                            </span>
                          </div>
                          {result.credential.expirationDate && (
                            <div className="flex justify-between">
                              <span className="text-sm font-medium text-gray-600">Expires:</span>
                              <span className={`text-sm ${isExpired ? 'text-red-600 font-medium' : 'text-gray-900'}`}>
                                {formatDate(result.credential.expirationDate)}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-sm font-medium text-gray-600">Types:</span>
                            <span className="text-sm text-gray-900">
                              {result.credential.type.join(', ')}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Subject Information */}
                      <div>
                        <h5 className="text-sm font-medium text-gray-700 mb-3">Subject Information</h5>
                        <div className="space-y-1">
                          {renderCredentialSubject(result.credential.credentialSubject)}
                        </div>
                      </div>
                    </div>

                    {/* Verification Details */}
                    {renderVerificationDetails(result.details)}

                    {/* Context Information */}
                    {result.credential['@context'] && (
                      <div className="mt-4">
                        <h5 className="text-sm font-medium text-gray-700 mb-2">Context</h5>
                        <div className="text-xs text-gray-600 bg-white p-2 rounded border">
                          {result.credential['@context'].join(', ')}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Custom Action Section */}
      {onCustomAction && verificationResult.verified && (
        <div className="px-6 py-4 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Custom Integration</h3>
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-900">
                  Trigger Custom Backend Action
                </p>
                <p className="text-sm text-blue-700">
                  Execute custom integration with verification results
                </p>
              </div>
              <button
                onClick={handleCustomAction}
                disabled={customActionLoading}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  customActionLoading
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : customActionSuccess
                    ? 'bg-green-600 text-white'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {customActionLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500"></div>
                    <span>Processing...</span>
                  </div>
                ) : customActionSuccess ? (
                  '✅ Completed'
                ) : (
                  'Execute Action'
                )}
              </button>
            </div>

            {/* Custom Action Status */}
            {customActionError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                <strong>Action Failed:</strong> {customActionError}
              </div>
            )}

            {customActionSuccess && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700">
                <strong>Success:</strong> Custom action executed successfully
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer Actions */}
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Verification completed at {formatDate(verificationResult.timestamp)}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => window.print()}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              Print Results
            </button>
            <button
              onClick={() => {
                const dataStr = JSON.stringify(verificationResult, null, 2);
                const dataBlob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(dataBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `verification-results-${Date.now()}.json`;
                link.click();
                URL.revokeObjectURL(url);
              }}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
            >
              Export JSON
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerificationResults;