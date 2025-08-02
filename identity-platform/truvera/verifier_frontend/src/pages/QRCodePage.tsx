import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ProofRequest, CredentialPresentation } from '../types';
import { apiService } from '../services/api';
import QRCodeDisplay from '../components/QRCodeDisplay';
import StatusMonitor from '../components/StatusMonitor';
import StatusDebugger from '../components/StatusDebugger';
import ApiTester from '../components/ApiTester';
import PollingTester from '../components/PollingTester';

export const QRCodePage: React.FC = () => {
  const navigate = useNavigate();
  const { proofRequestId } = useParams<{ proofRequestId: string }>();
  
  const [proofRequest, setProofRequest] = useState<ProofRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [presentation, setPresentation] = useState<CredentialPresentation | null>(null);

  // Load initial proof request data
  useEffect(() => {
    if (!proofRequestId) {
      setError('No proof request ID provided');
      setLoading(false);
      return;
    }

    loadProofRequest();
  }, [proofRequestId]);

  const loadProofRequest = async () => {
    if (!proofRequestId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await apiService.getProofRequestStatus(proofRequestId);
      
      if (response.success && response.data) {
        setProofRequest(response.data);
      } else {
        setError(response.error?.message || 'Failed to load proof request');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Handle status updates from StatusMonitor
  const handleStatusUpdate = (updatedProofRequest: ProofRequest) => {
    console.log('QRCodePage: Status update received:', {
      oldStatus: proofRequest?.status,
      newStatus: updatedProofRequest.status,
      proofRequestId: updatedProofRequest.id,
      timestamp: new Date().toISOString()
    });
    
    setProofRequest(prevRequest => {
      console.log('QRCodePage: Updating proofRequest state:', {
        prevStatus: prevRequest?.status,
        newStatus: updatedProofRequest.status
      });
      return updatedProofRequest;
    });

    // Navigate to verification page when completed
    if (updatedProofRequest.status === 'completed') {
      console.log('QRCodePage: Status completed, navigating to verification page in 1 second');
      // Reduced delay to make it feel more responsive
      setTimeout(() => {
        console.log('QRCodePage: Executing navigation to verification page');
        navigate(`/verify/${proofRequestId}`);
      }, 1000);
    }
  };

  // Handle presentation received
  const handlePresentationReceived = (receivedPresentation: CredentialPresentation) => {
    setPresentation(receivedPresentation);
    console.log('Presentation received:', receivedPresentation);
  };

  // Handle timeout
  const handleTimeout = () => {
    setError('The proof request has expired. Please create a new request.');
  };

  // Handle monitoring errors
  const handleMonitoringError = (errorMessage: string) => {
    console.error('Monitoring error:', errorMessage);
    // Don't set the main error state for monitoring errors, 
    // let the StatusMonitor component handle its own error display
  };

  // Handle QR code refresh
  const handleRefreshQRCode = () => {
    loadProofRequest();
  };

  // Handle navigation back to create new request
  const handleCreateNewRequest = () => {
    navigate('/');
  };

  // Handle manual navigation to verification (for testing)
  const handleGoToVerification = () => {
    if (proofRequestId) {
      navigate(`/verify/${proofRequestId}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-6"></div>
          <p className="text-gray-700 text-xl font-medium">Loading proof request...</p>
        </div>
      </div>
    );
  }

  if (error && !proofRequest) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-lg w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-red-600 text-6xl mb-6">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Error Loading Request</h2>
          <p className="text-gray-700 mb-8 text-lg">{error}</p>
          <div className="space-y-4">
            <button
              onClick={loadProofRequest}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={handleCreateNewRequest}
              className="w-full px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 font-medium transition-colors"
            >
              Create New Request
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!proofRequest) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No proof request found</p>
          <button
            onClick={handleCreateNewRequest}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Create New Request
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Credential Verification</h1>
              <p className="mt-3 text-xl text-gray-700">
                Present your credential by scanning the QR code below
              </p>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={handleCreateNewRequest}
                className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 font-medium transition-colors"
              >
                New Request
              </button>
              {proofRequest.status === 'completed' && (
                <button
                  onClick={handleGoToVerification}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 font-medium transition-colors"
                >
                  Go to Verification
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* QR Code Display */}
          <div className="xl:col-span-2">
            <QRCodeDisplay
              proofRequest={proofRequest}
              onRefresh={handleRefreshQRCode}
              className="h-fit"
            />
          </div>

          {/* Status Monitor */}
          <div className="xl:col-span-1">
            <StatusMonitor
              proofRequestId={proofRequest.id}
              onStatusUpdate={handleStatusUpdate}
              onPresentationReceived={handlePresentationReceived}
              onTimeout={handleTimeout}
              onError={handleMonitoringError}
              timeoutMinutes={proofRequest.config.timeoutMinutes || 30}
              className="h-fit"
            />
          </div>
        </div>

        {/* Status-based Messages */}
        {proofRequest.status === 'completed' && (
          <div className="mt-10 bg-green-50 border border-green-200 rounded-lg p-8">
            <div className="flex items-center space-x-4">
              <div className="text-green-600 text-4xl">✅</div>
              <div>
                <h3 className="text-2xl font-bold text-green-900">
                  Credential Presentation Received!
                </h3>
                <p className="text-green-800 mt-2 text-lg">
                  Your credential has been successfully presented. Redirecting to verification results...
                </p>
              </div>
            </div>
          </div>
        )}

        {proofRequest.status === 'expired' && (
          <div className="mt-10 bg-red-50 border border-red-200 rounded-lg p-8">
            <div className="flex items-center space-x-4">
              <div className="text-red-600 text-4xl">⏰</div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-red-900">
                  Request Expired
                </h3>
                <p className="text-red-800 mt-2 text-lg">
                  This proof request has expired. Please create a new request to continue.
                </p>
                <button
                  onClick={handleCreateNewRequest}
                  className="mt-4 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 font-medium transition-colors"
                >
                  Create New Request
                </button>
              </div>
            </div>
          </div>
        )}

        {proofRequest.status === 'failed' && (
          <div className="mt-10 bg-red-50 border border-red-200 rounded-lg p-8">
            <div className="flex items-center space-x-4">
              <div className="text-red-600 text-4xl">❌</div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-red-900">
                  Request Failed
                </h3>
                <p className="text-red-800 mt-2 text-lg">
                  There was an error processing this proof request. Please try creating a new request.
                </p>
                <button
                  onClick={handleCreateNewRequest}
                  className="mt-4 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 font-medium transition-colors"
                >
                  Create New Request
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Debug Information (development only) */}
        {import.meta.env.DEV && (
          <div className="mt-8 bg-gray-100 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">Debug Information</h4>
            <div className="text-sm text-gray-700 space-y-1">
              <p><strong>Proof Request ID:</strong> {proofRequest.id}</p>
              <p><strong>Status:</strong> {proofRequest.status}</p>
              <p><strong>Created:</strong> {new Date(proofRequest.createdAt).toLocaleString()}</p>
              <p><strong>Expires:</strong> {new Date(proofRequest.expiresAt).toLocaleString()}</p>
              {presentation && (
                <p><strong>Presentation Received:</strong> Yes</p>
              )}
            </div>
          </div>
        )}

        {/* Status Debugger (development only) */}
        {import.meta.env.DEV && (
          <>
            <StatusDebugger proofRequest={proofRequest} />
            <ApiTester proofRequestId={proofRequest.id} />
            <PollingTester />
          </>
        )}
      </div>
    </div>
  );
};

export default QRCodePage;