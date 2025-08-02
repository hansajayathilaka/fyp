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
    <div className="bg-white rounded-lg shadow-lg p-8">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-bold text-gray-900">
          Proof Request Created
        </h2>
        <span className={`px-4 py-2 rounded-full text-base font-semibold ${getStatusColor(proofRequest.status)}`}>
          {proofRequest.status ? proofRequest.status.charAt(0).toUpperCase() + proofRequest.status.slice(1) : 'Unknown'}
        </span>
      </div>

      <div className="space-y-8">
        {/* Success Message */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-base font-semibold text-green-800">
                Proof request created successfully!
              </h3>
              <p className="mt-2 text-base text-green-700">
                Your proof request is now active and ready to receive credential presentations.
              </p>
            </div>
          </div>
        </div>

        {/* Basic Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Request Details</h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-base font-semibold text-gray-700">Name</dt>
                <dd className="text-base text-gray-900 mt-1">{proofRequest.config?.name || 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-base font-semibold text-gray-700">Purpose</dt>
                <dd className="text-base text-gray-900 mt-1">{proofRequest.config?.purpose || 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-base font-semibold text-gray-700">Request ID</dt>
                <dd className="text-base text-gray-900 font-mono mt-1 break-all">{proofRequest.id || 'N/A'}</dd>
              </div>
            </dl>
          </div>

          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Timing</h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-base font-semibold text-gray-700">Created</dt>
                <dd className="text-base text-gray-900 mt-1">{proofRequest.createdAt ? formatDate(proofRequest.createdAt) : 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-base font-semibold text-gray-700">Expires</dt>
                <dd className="text-base text-gray-900 mt-1">{proofRequest.expiresAt ? formatDate(proofRequest.expiresAt) : 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-base font-semibold text-gray-700">Timeout</dt>
                <dd className="text-base text-gray-900 mt-1">
                  {proofRequest.config?.timeoutMinutes || 30} minutes
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Credential Types */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Requested Credential Types</h3>
          <div className="flex flex-wrap gap-3">
            {proofRequest.config?.credentialTypes?.map((type, index) => (
              <span
                key={index}
                className="px-4 py-2 bg-blue-100 text-blue-800 text-base rounded-full font-medium"
              >
                {type}
              </span>
            )) || <span className="text-gray-600 text-base">No credential types specified</span>}
          </div>
        </div>

        {/* Required Fields */}
        {proofRequest.config?.requiredFields && proofRequest.config.requiredFields.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Required Fields</h3>
            <div className="space-y-3">
              {proofRequest.config.requiredFields.map((field, index) => (
                <div key={index} className="flex items-center justify-between bg-white px-4 py-3 rounded-lg border border-gray-200">
                  <span className="text-base font-medium text-gray-800">{field.path}</span>
                  {field.required && (
                    <span className="px-3 py-1 text-sm bg-red-100 text-red-800 rounded-full font-medium">
                      Required
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Response URL */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Response URL</h3>
          <div className="flex items-center space-x-3">
            <input
              type="text"
              value={proofRequest.response_url || ''}
              readOnly
              className="flex-1 px-4 py-3 bg-white border border-gray-300 rounded-lg text-base font-mono text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => copyToClipboard(proofRequest.response_url || '')}
              className="px-4 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
              title="Copy to clipboard"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
          <p className="mt-3 text-base text-gray-700">
            This URL is used by the system to receive credential presentations. It's automatically handled when using the QR code.
          </p>
        </div>

        {/* QR Code Display */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">
            {proofRequest.status === 'completed' ? 'Verification Complete' : 'QR Code Preview'}
          </h3>

          {proofRequest.status !== 'completed' ? (
            <div className="space-y-6">
              {/* Direct Link Section */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">📎 Direct Wallet Link</h4>
                <p className="text-base text-gray-700 mb-4">
                  If QR code scanning is not available, credential holders can use this direct link:
                </p>
                <div className="flex items-center space-x-3">
                  <input
                    type="text"
                    value={proofRequest.qr || ''}
                    readOnly
                    className="flex-1 px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-sm font-mono text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => copyToClipboard(proofRequest.qr || '')}
                    className="px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                    title="Copy link to clipboard"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                  <a
                    href={proofRequest.qr || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors font-medium"
                  >
                    🔗 Open in Wallet
                  </a>
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-blue-900 mb-4">📋 How to Use</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">1</div>
                      <div>
                        <p className="font-medium text-blue-900">Display QR Code</p>
                        <p className="text-sm text-blue-800">Click the button below to show the scannable QR code</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">2</div>
                      <div>
                        <p className="font-medium text-blue-900">Scan with Wallet</p>
                        <p className="text-sm text-blue-800">Use your mobile wallet app to scan the QR code</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">3</div>
                      <div>
                        <p className="font-medium text-blue-900">Present Credential</p>
                        <p className="text-sm text-blue-800">Select and present your DEIP Access Credential</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">4</div>
                      <div>
                        <p className="font-medium text-blue-900">Wait for Verification</p>
                        <p className="text-sm text-blue-800">The system will automatically verify your credential</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-green-50 border-2 border-green-300 rounded-lg p-8 text-center">
              <div className="text-8xl mb-6">✅</div>
              <h4 className="text-2xl font-bold text-green-800 mb-4">Verification Successful!</h4>
              <p className="text-lg text-green-700">The credential has been verified and is authentic.</p>
            </div>
          )}
        </div>



        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 pt-8 border-t border-gray-200">
          {onProceedToQR && (
            <button
              onClick={onProceedToQR}
              className="flex-1 px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-semibold text-lg transition-colors shadow-lg"
            >
              🔍 Display QR Code & Monitor
            </button>
          )}
          {onCreateNew && (
            <button
              onClick={onCreateNew}
              className="flex-1 px-8 py-4 bg-gray-700 text-white rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 font-semibold text-lg transition-colors shadow-lg"
            >
              ➕ Create New Request
            </button>
          )}
        </div>

        {/* Additional Information */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-blue-900 mb-4">Next Steps</h4>
          <ul className="text-base text-blue-800 space-y-2">
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              <span>Share the QR code with credential holders</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              <span>Monitor the request status for incoming presentations</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              <span>Review verification results when credentials are presented</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              <span>The request will automatically expire after the timeout period</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ProofRequestDetails;