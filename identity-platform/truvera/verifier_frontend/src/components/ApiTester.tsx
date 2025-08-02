import React, { useState } from 'react';
import { apiService } from '../services/api';

interface ApiTesterProps {
  proofRequestId: string;
  className?: string;
}

export const ApiTester: React.FC<ApiTesterProps> = ({
  proofRequestId,
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [testing, setTesting] = useState(false);
  const [lastResponse, setLastResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const testApiCall = async () => {
    setTesting(true);
    setError(null);
    
    try {
      console.log('ApiTester: Making direct API call to:', `/api/proof-requests/${proofRequestId}/status`);
      
      const response = await apiService.getProofRequestStatus(proofRequestId);
      
      console.log('ApiTester: Raw API response:', response);
      setLastResponse(response);
      
      if (response.success && response.data) {
        console.log('ApiTester: Parsed proof request:', response.data);
      } else {
        setError(response.error?.message || 'API call failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('ApiTester: API call error:', err);
      setError(errorMessage);
    } finally {
      setTesting(false);
    }
  };

  if (!isVisible) {
    return (
      <div className={`fixed bottom-20 right-4 ${className}`}>
        <button
          onClick={() => setIsVisible(true)}
          className="bg-purple-600 text-white px-3 py-2 rounded-lg shadow-lg hover:bg-purple-700 text-sm"
        >
          🧪 Test API
        </button>
      </div>
    );
  }

  return (
    <div className={`fixed bottom-20 right-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-lg ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-gray-900 text-sm">API Tester</h4>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-500 hover:text-gray-700 text-lg leading-none"
        >
          ×
        </button>
      </div>

      {/* Test Controls */}
      <div className="mb-3">
        <button
          onClick={testApiCall}
          disabled={testing}
          className={`w-full px-3 py-2 text-sm rounded-md ${
            testing
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-purple-600 text-white hover:bg-purple-700'
          }`}
        >
          {testing ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500"></div>
              <span>Testing...</span>
            </div>
          ) : (
            'Test API Call'
          )}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-sm">
          <div className="font-medium text-red-800">API Error:</div>
          <div className="text-red-700">{error}</div>
        </div>
      )}

      {/* Response Display */}
      {lastResponse && (
        <div className="mb-3">
          <div className="font-medium text-gray-700 text-sm mb-2">Last API Response:</div>
          <div className="max-h-40 overflow-y-auto">
            <div className="text-xs p-2 bg-gray-50 rounded border font-mono">
              <div className="mb-2">
                <span className="font-semibold">Success:</span> {lastResponse.success ? '✅' : '❌'}
              </div>
              {lastResponse.data && (
                <div className="mb-2">
                  <span className="font-semibold">Status:</span> 
                  <span className={`ml-1 px-1 rounded text-xs ${
                    lastResponse.data.status === 'completed' ? 'bg-green-100 text-green-800' :
                    lastResponse.data.status === 'active' ? 'bg-blue-100 text-blue-800' :
                    lastResponse.data.status === 'expired' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {lastResponse.data.status}
                  </span>
                </div>
              )}
              <details className="mt-2">
                <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
                  Full Response (click to expand)
                </summary>
                <pre className="mt-2 text-xs overflow-x-auto">
                  {JSON.stringify(lastResponse, null, 2)}
                </pre>
              </details>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
        <div className="font-medium text-yellow-800 mb-1">How to use:</div>
        <ul className="text-yellow-700 space-y-1">
          <li>• Click "Test API Call" to make a direct API request</li>
          <li>• Check if the API returns the correct status</li>
          <li>• Compare with what the StatusMonitor shows</li>
          <li>• Look at browser console for detailed logs</li>
        </ul>
      </div>
    </div>
  );
};

export default ApiTester;