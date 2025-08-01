import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';
import { ProcessStep } from '../types';
import QRCodeDisplay from '../components/QRCodeDisplay';
import StatusMonitor from '../components/StatusMonitor';
import { useRenderTracker } from '../utils/renderTracker';

export default function QRCodePage() {
  useRenderTracker('QRCodePage');
  
  const { state, setStep, setHolderDID, setOperationStatus, setErrorState } = useAppContext();
  const navigate = useNavigate();
  const [showStatusMonitor, setShowStatusMonitor] = useState(false);
  const [credentialAccepted, setCredentialAccepted] = useState(false);

  // Handle when credential is accepted and connection is established
  const handleConnectionEstablished = useCallback((holderDID: string) => {
    console.log('Connection established with holder DID:', holderDID);
    setCredentialAccepted(true);
    setShowStatusMonitor(true);
    
    // Update app context with holder DID for completion tracking
    setHolderDID(holderDID);
  }, [setHolderDID]);

  // Handle status monitoring completion with enhanced workflow tracking
  const handleStatusComplete = useCallback((success: boolean) => {
    console.log('Credential issuance workflow completed:', { success });
    
    if (success) {
      // Update operation status in context
      setOperationStatus({
        status: 'issued',
        deliveryStatus: 'delivered',
        message: 'Credential successfully issued and delivered'
      });
      
      // Move to completion step
      setStep(ProcessStep.COMPLETION);
      navigate('/completion');
    } else {
      // Handle failure with detailed error tracking
      console.error('Credential issuance workflow failed');
      
      setOperationStatus({
        status: 'failed',
        deliveryStatus: 'failed',
        message: 'Credential issuance failed'
      });
      
      setErrorState({
        hasError: true,
        error: 'Credential issuance failed. Please try generating a new QR code or contact support.',
        code: 'CREDENTIAL_ISSUANCE_FAILED'
      });
    }
  }, [setOperationStatus, setStep, navigate, setErrorState]);

  // Check if we should show status monitor based on app state
  useEffect(() => {
    // If we already have a connection or the credential was accepted, show status monitor
    if (state.connectionId || credentialAccepted) {
      setShowStatusMonitor(true);
    }
  }, [state.connectionId, credentialAccepted]);

  // Redirect if no session or form data
  useEffect(() => {
    if (!state.sessionId || !state.formData) {
      navigate('/credential-form');
    }
  }, [state.sessionId, state.formData, navigate]);

  return (
    <div className="space-y-6">
      {/* Main QR Code Display */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Scan QR Code to Receive Credential
          </h2>
          <p className="text-gray-600">
            Use your Dock wallet to scan the QR code below and accept the credential offer.
          </p>
        </div>

        <QRCodeDisplay onConnectionEstablished={handleConnectionEstablished} />
      </div>

      {/* Status Monitor - Show when credential is being processed */}
      {showStatusMonitor && state.sessionId && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="text-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Credential Processing Status
            </h3>
            <p className="text-gray-600">
              Monitoring the status of your credential issuance...
            </p>
          </div>

          <StatusMonitor
            sessionId={state.sessionId}
            onComplete={handleStatusComplete}
            onConnectionEstablished={handleConnectionEstablished}
            pollInterval={10000} // Poll every 10 seconds to respect API rate limits
          />
        </div>
      )}

      {/* Progress Indicator */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-700">Form Submitted</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-700">QR Code Generated</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${
                showStatusMonitor ? 'bg-blue-500 animate-pulse' : 'bg-gray-300'
              }`}></div>
              <span className="text-sm text-gray-700">Waiting for Scan</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${
                credentialAccepted ? 'bg-green-500' : 'bg-gray-300'
              }`}></div>
              <span className="text-sm text-gray-700">Credential Delivered</span>
            </div>
          </div>
        </div>
      </div>

      {/* Help Section */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2 flex items-center">
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Need Help?
        </h4>
        <div className="text-sm text-gray-700 space-y-2">
          <p>
            <strong>Don't have the Dock wallet?</strong> Download it from your app store and create an account first.
          </p>
          <p>
            <strong>QR code not working?</strong> Make sure your camera has permission and try adjusting the lighting.
          </p>
          <p>
            <strong>Still having issues?</strong> You can copy the credential offer URL from the QR code section above.
          </p>
        </div>
      </div>
    </div>
  );
}