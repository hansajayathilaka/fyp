import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CustomIntegrationConfig } from '../components';

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
              <p className="mt-2 text-gray-600">
                Configure your verification system settings and integrations
              </p>
            </div>
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Back to Home
            </button>
          </div>
        </div>

        {/* Settings Sections */}
        <div className="space-y-8">
          {/* Custom Integration Configuration */}
          <CustomIntegrationConfig />

          {/* System Information */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              System Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Frontend Version:</span>
                <span className="ml-2 text-gray-900">1.0.0</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Backend API:</span>
                <span className="ml-2 text-gray-900">{import.meta.env.VITE_API_URL || 'http://localhost:4001'}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Environment:</span>
                <span className="ml-2 text-gray-900">{import.meta.env.MODE}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Build Time:</span>
                <span className="ml-2 text-gray-900">{new Date().toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* API Endpoints */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Available API Endpoints
            </h3>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-center space-x-3">
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">POST</span>
                <span className="font-mono text-gray-700">/api/proof-requests</span>
                <span className="text-gray-500">Create proof request</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">GET</span>
                <span className="font-mono text-gray-700">/api/proof-requests/:id/status</span>
                <span className="text-gray-500">Get proof request status</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">POST</span>
                <span className="font-mono text-gray-700">/api/verify</span>
                <span className="text-gray-500">Verify credential presentation</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">POST</span>
                <span className="font-mono text-gray-700">/api/integration/custom-action</span>
                <span className="text-gray-500">Execute custom action</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">GET</span>
                <span className="font-mono text-gray-700">/api/integration/config</span>
                <span className="text-gray-500">Get integration config</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">PUT</span>
                <span className="font-mono text-gray-700">/api/integration/config</span>
                <span className="text-gray-500">Update integration config</span>
              </div>
            </div>
          </div>

          {/* Usage Instructions */}
          <div className="bg-blue-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">
              How to Use Custom Integration
            </h3>
            
            <div className="space-y-3 text-sm text-blue-800">
              <div className="flex items-start space-x-3">
                <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">1</span>
                <div>
                  <p className="font-medium">Configure your endpoint</p>
                  <p>Set up a webhook endpoint that can receive POST/PUT requests with verification results</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">2</span>
                <div>
                  <p className="font-medium">Test the connection</p>
                  <p>Use the "Test Connection" button to verify your endpoint is reachable</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">3</span>
                <div>
                  <p className="font-medium">Enable integration</p>
                  <p>Toggle the integration on and save your configuration</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">4</span>
                <div>
                  <p className="font-medium">Automatic execution</p>
                  <p>When credentials are successfully verified, your endpoint will receive the verification data</p>
                </div>
              </div>
            </div>

            <div className="mt-4 p-4 bg-blue-100 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Expected Payload Format</h4>
              <pre className="text-xs text-blue-800 overflow-x-auto">
{`{
  "verificationResult": {
    "verified": true,
    "partiallyVerified": false,
    "results": [...],
    "presentation": {...},
    "timestamp": "2024-01-01T00:00:00.000Z"
  },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "sessionId": "session-123456789",
  "metadata": {
    "userAgent": "...",
    "timestamp": "..."
  }
}`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;