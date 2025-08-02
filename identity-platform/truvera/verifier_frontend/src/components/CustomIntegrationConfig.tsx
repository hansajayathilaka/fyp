import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';

interface CustomIntegrationConfig {
  enabled: boolean;
  endpoint: string;
  method: 'POST' | 'PUT';
  timeout: number;
}

interface CustomIntegrationConfigProps {
  className?: string;
}

export const CustomIntegrationConfig: React.FC<CustomIntegrationConfigProps> = ({
  className = ''
}) => {
  const [config, setConfig] = useState<CustomIntegrationConfig>({
    enabled: false,
    endpoint: '',
    method: 'POST',
    timeout: 30000
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load current configuration
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiService.getIntegrationConfig();
      
      if (response.success && response.data) {
        setConfig(response.data);
      } else {
        setError(response.error?.message || 'Failed to load configuration');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const response = await apiService.updateIntegrationConfig(config);
      
      if (response.success) {
        setSuccess('Configuration saved successfully');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(response.error?.message || 'Failed to save configuration');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    try {
      setTesting(true);
      setError(null);
      setSuccess(null);

      const response = await apiService.testIntegrationConnection();
      
      if (response.success) {
        setSuccess('Connection test successful');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(response.error?.message || 'Connection test failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection test failed');
    } finally {
      setTesting(false);
    }
  };

  const handleInputChange = (field: keyof CustomIntegrationConfig, value: any) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }));
    setError(null);
    setSuccess(null);
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Custom Integration Configuration
      </h3>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">{success}</p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-700">
              Enable Custom Integration
            </label>
            <p className="text-sm text-gray-500">
              Execute custom actions when verification is successful
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleInputChange('enabled', !config.enabled)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              config.enabled ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                config.enabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Endpoint URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Endpoint URL
          </label>
          <input
            type="url"
            value={config.endpoint}
            onChange={(e) => handleInputChange('endpoint', e.target.value)}
            placeholder="https://your-api.example.com/webhook"
            disabled={!config.enabled}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
          />
        </div>

        {/* HTTP Method */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            HTTP Method
          </label>
          <select
            value={config.method}
            onChange={(e) => handleInputChange('method', e.target.value as 'POST' | 'PUT')}
            disabled={!config.enabled}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
          >
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
          </select>
        </div>

        {/* Timeout */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Timeout (milliseconds)
          </label>
          <input
            type="number"
            value={config.timeout}
            onChange={(e) => handleInputChange('timeout', parseInt(e.target.value) || 30000)}
            min="1000"
            max="300000"
            step="1000"
            disabled={!config.enabled}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
          />
          <p className="text-sm text-gray-500 mt-1">
            Request timeout in milliseconds (1000-300000)
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 pt-4">
          <button
            onClick={saveConfig}
            disabled={saving || !config.enabled || !config.endpoint}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {saving ? (
              <div className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </div>
            ) : (
              'Save Configuration'
            )}
          </button>

          <button
            onClick={testConnection}
            disabled={testing || !config.enabled || !config.endpoint}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {testing ? (
              <div className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Testing...
              </div>
            ) : (
              'Test Connection'
            )}
          </button>
        </div>

        {/* Information */}
        <div className="bg-blue-50 rounded-lg p-4 mt-4">
          <h4 className="font-medium text-blue-900 mb-2">How it works</h4>
          <div className="text-sm text-blue-800 space-y-1">
            <p>• When a credential verification is successful, the system will send a POST/PUT request to your endpoint</p>
            <p>• The payload will include the verification result, timestamp, and session information</p>
            <p>• Use this to trigger custom business logic, update databases, or integrate with other systems</p>
            <p>• The request will timeout after the specified duration if no response is received</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomIntegrationConfig;