import React, { useState, useCallback } from 'react';
import { 
  VerificationResult, 
  CredentialVerificationResult, 
  VerifiableCredential
} from '../types';

interface VerificationResultsProps {
  verificationResult: VerificationResult;
  onRetry?: () => void;
  className?: string;
}

export const VerificationResults: React.FC<VerificationResultsProps> = ({
  verificationResult,
  onRetry,
  className = '',
}) => {
  const [expandedCredentials, setExpandedCredentials] = useState<Set<string>>(new Set());

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
        color: 'text-green-700',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-300',
        icon: (
          <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        ),
        status: 'Verified',
        description: 'All credentials have been successfully verified',
      };
    } else if (verificationResult.partiallyVerified) {
      return {
        color: 'text-amber-700',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-300',
        icon: (
          <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        ),
        status: 'Partially Verified',
        description: 'Some credentials passed verification, but others failed. This means the user presented multiple credentials but not all of them could be verified successfully.',
      };
    } else {
      return {
        color: 'text-red-700',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-300',
        icon: (
          <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        ),
        status: 'Verification Failed',
        description: 'Credential verification was unsuccessful',
      };
    }
  };

  // Get credential status display
  const getCredentialStatusDisplay = (result: CredentialVerificationResult) => {
    if (result.verified) {
      return {
        color: 'text-green-700',
        bgColor: 'bg-green-100',
        icon: (
          <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        ),
        status: 'Verified',
      };
    } else {
      return {
        color: 'text-red-700',
        bgColor: 'bg-red-100',
        icon: (
          <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        ),
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
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className={`flex items-center space-x-2 ${details.signatureValid ? 'text-green-700' : 'text-red-700'}`}>
            <div className="flex-shrink-0">
              {details.signatureValid ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <span>Signature Valid</span>
          </div>
          <div className={`flex items-center space-x-2 ${details.issuerTrusted ? 'text-green-700' : 'text-red-700'}`}>
            <div className="flex-shrink-0">
              {details.issuerTrusted ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <span>Issuer Trusted</span>
          </div>
          <div className={`flex items-center space-x-2 ${details.notExpired ? 'text-green-700' : 'text-red-700'}`}>
            <div className="flex-shrink-0">
              {details.notExpired ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <span>Not Expired</span>
          </div>
          <div className={`flex items-center space-x-2 ${details.schemaValid ? 'text-green-700' : 'text-red-700'}`}>
            <div className="flex-shrink-0">
              {details.schemaValid ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <span>Schema Valid</span>
          </div>
        </div>
      </div>
    );
  };

  const overallStatus = getOverallStatusDisplay();

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
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
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Verify Again
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Overall Status */}
      <div className={`mx-6 mt-6 p-4 rounded-lg border ${overallStatus.borderColor} ${overallStatus.bgColor}`}>
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">{overallStatus.icon}</div>
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
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Total Credentials</p>
                <p className="text-2xl font-bold text-gray-900">
                  {verificationResult.results.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Verified</p>
                <p className="text-2xl font-bold text-green-600">
                  {verificationResult.results.filter(r => r.verified).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Failed</p>
                <p className="text-2xl font-bold text-red-600">
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
                      <div className="flex-shrink-0">{statusDisplay.icon}</div>
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {result.credential.type.filter(t => t !== 'VerifiableCredential').join(', ') || 'Credential'}
                        </h4>
                        <p className="text-sm text-gray-600">
                          Issued by: {formatIssuer(result.credential.issuer)}
                        </p>
                        {isExpired && (
                          <div className="flex items-center space-x-1 text-sm text-red-600 font-medium">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            <span>Expired</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${statusDisplay.bgColor} ${statusDisplay.color} border`}>
                        {statusDisplay.status}
                      </span>
                      <svg className={`w-5 h-5 text-gray-400 transform transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
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



      {/* Footer Actions */}
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Verification completed at {formatDate(verificationResult.timestamp)}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
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
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-300 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export JSON
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerificationResults;