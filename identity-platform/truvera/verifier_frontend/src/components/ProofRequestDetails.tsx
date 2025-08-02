import React from 'react';
import { ProofRequest } from '../types';

interface ProofRequestDetailsProps {
  proofRequest: ProofRequest;
  onCreateNew?: () => void;
  onProceedToQR?: () => void;
}

export const ProofRequestDetails: React.FC<ProofRequestDetailsProps> = ({
  proofRequest,
  onCreateNew,
  onProceedToQR,
}) => {
  // Debug logging
  console.log('ProofRequestDetails received proofRequest:', proofRequest);
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here
      console.log('Copied to clipboard:', text);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const getStatusColor = (status: ProofRequest['status']) => {
    if (!status) return 'bg-gray-100 text-gray-800';
    
    switch (status) {
      case 'active':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">
          Proof Request Created
        </h2>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(proofRequest.status)}`}>
          {proofRequest.status ? proofRequest.status.charAt(0).toUpperCase() + proofRequest.status.slice(1) : 'Unknown'}
        </span>
      </div>

      <div className="space-y-6">
        {/* Success Message */}
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">
                Proof request created successfully!
              </h3>
              <p className="mt-1 text-sm text-green-700">
                Your proof request is now active and ready to receive credential presentations.
              </p>
            </div>
          </div>
        </div>

        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium text-gray-800 mb-3">Request Details</h3>
            <dl className="space-y-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Name</dt>
                <dd className="text-sm text-gray-900">{proofRequest.config?.name || 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Purpose</dt>
                <dd className="text-sm text-gray-900">{proofRequest.config?.purpose || 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Request ID</dt>
                <dd className="text-sm text-gray-900 font-mono">{proofRequest.id || 'N/A'}</dd>
              </div>
            </dl>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-800 mb-3">Timing</h3>
            <dl className="space-y-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Created</dt>
                <dd className="text-sm text-gray-900">{proofRequest.createdAt ? formatDate(proofRequest.createdAt) : 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Expires</dt>
                <dd className="text-sm text-gray-900">{proofRequest.expiresAt ? formatDate(proofRequest.expiresAt) : 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Timeout</dt>
                <dd className="text-sm text-gray-900">
                  {proofRequest.config?.timeoutMinutes || 30} minutes
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Credential Types */}
        <div>
          <h3 className="text-lg font-medium text-gray-800 mb-3">Requested Credential Types</h3>
          <div className="flex flex-wrap gap-2">
            {proofRequest.config?.credentialTypes?.map((type, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
              >
                {type}
              </span>
            )) || <span className="text-gray-500">No credential types specified</span>}
          </div>
        </div>

        {/* Required Fields */}
        {proofRequest.config?.requiredFields && proofRequest.config.requiredFields.length > 0 && (
          <div>
            <h3 className="text-lg font-medium text-gray-800 mb-3">Required Fields</h3>
            <div className="space-y-2">
              {proofRequest.config.requiredFields.map((field, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-md">
                  <span className="text-sm font-medium text-gray-700">{field.path}</span>
                  {field.required && (
                    <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                      Required
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Response URL */}
        <div>
          <h3 className="text-lg font-medium text-gray-800 mb-3">Response URL</h3>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={proofRequest.response_url || ''}
              readOnly
              className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm font-mono"
            />
            <button
              onClick={() => copyToClipboard(proofRequest.response_url || '')}
              className="px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
              title="Copy to clipboard"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            This URL can be shared with credential holders for manual entry if QR code scanning is not available.
          </p>
        </div>

        {/* QR Code Display */}
        <div>
          <h3 className="text-lg font-medium text-gray-800 mb-3">
            {proofRequest.status === 'completed' ? 'Verification Complete' : 'QR Code Preview'}
          </h3>
          
          {proofRequest.status !== 'completed' ? (
            <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-6 text-center">
              <div className="mb-4">
                <div className="w-48 h-48 mx-auto bg-white border-2 border-gray-300 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-4xl mb-2">📱</div>
                    <div className="text-sm text-gray-600">
                      QR Code Available<br />
                      <a 
                        href={proofRequest.qr || '#'} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline font-medium"
                      >
                        Click to open in wallet
                      </a>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="text-lg font-medium text-blue-800">Next Steps:</h4>
                <div className="text-sm text-blue-700 space-y-1">
                  <p>1. Click "Display QR Code & Monitor" below</p>
                  <p>2. Use your mobile wallet to scan the QR code</p>
                  <p>3. Present your DEIP Access Credential</p>
                  <p>4. Wait for verification to complete</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-green-50 border-2 border-green-300 rounded-lg p-6 text-center">
              <div className="text-6xl mb-4">✅</div>
              <h4 className="text-xl font-medium text-green-800 mb-2">Verification Successful!</h4>
              <p className="text-green-700">The credential has been verified and is authentic.</p>
            </div>
          )}
        </div>



        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200">
          {onProceedToQR && (
            <button
              onClick={onProceedToQR}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-medium"
            >
              Display QR Code & Monitor
            </button>
          )}
          {onCreateNew && (
            <button
              onClick={onCreateNew}
              className="flex-1 px-6 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 font-medium"
            >
              Create New Request
            </button>
          )}
        </div>

        {/* Additional Information */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <h4 className="text-sm font-medium text-blue-800 mb-2">Next Steps</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Share the QR code with credential holders</li>
            <li>• Monitor the request status for incoming presentations</li>
            <li>• Review verification results when credentials are presented</li>
            <li>• The request will automatically expire after the timeout period</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ProofRequestDetails;