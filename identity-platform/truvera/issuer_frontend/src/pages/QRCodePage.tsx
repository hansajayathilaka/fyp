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
  const [credentialDelivered, setCredentialDelivered] = useState(false);

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
      // Mark credential as delivered only when actually delivered
      setCredentialDelivered(true);
      
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

  // Check if credential was already delivered based on operation status
  useEffect(() => {
    if (state.operationStatus?.status === 'issued' && state.operationStatus?.deliveryStatus === 'delivered') {
      setCredentialDelivered(true);
    }
  }, [state.operationStatus]);

  // Redirect if no session or form data
  useEffect(() => {
    if (!state.sessionId || !state.formData) {
      navigate('/credential-form');
    }
  }, [state.sessionId, state.formData, navigate]);

  return (
    <div className="space-y-8">
      {/* Main QR Code Display */}
      <div className="bg-white rounded-lg shadow-md p-6 lg:p-8">
        <div className="text-center mb-8">
          <h2 className="text-xl md:text-2xl lg:text-3xl font-semibold text-gray-900 mb-3">
            Scan QR Code to Receive Credential
          </h2>
          <p className="text-gray-600 text-base lg:text-lg max-w-2xl mx-auto">
            Use your Dock wallet to scan the QR code below and accept the credential offer.
          </p>
        </div>

        <QRCodeDisplay onConnectionEstablished={handleConnectionEstablished} />
      </div>

      {/* Status Monitor - Show when credential is being processed */}
      {showStatusMonitor && state.sessionId && (
        <div className="bg-white rounded-lg shadow-md p-6 lg:p-8">
          <div className="text-center mb-8">
            <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-3">
              Credential Processing Status
            </h3>
            <p className="text-gray-600 text-base lg:text-lg">
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
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex flex-col md:flex-row items-center justify-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-8">
            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              <span className="text-sm md:text-base text-gray-700 font-medium">Form Submitted</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              <span className="text-sm md:text-base text-gray-700 font-medium">QR Code Generated</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className={`w-4 h-4 rounded-full ${
                credentialDelivered ? 'bg-green-500' : 
                showStatusMonitor ? 'bg-blue-500 animate-pulse' : 'bg-gray-300'
              }`}></div>
              <span className="text-sm md:text-base text-gray-700 font-medium">
                Scan QR Code with Truvera wallet
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <div className={`w-4 h-4 rounded-full ${
                credentialDelivered ? 'bg-green-500' : 'bg-gray-300'
              }`}></div>
              <span className="text-sm md:text-base text-gray-700 font-medium">
                Receive Credential
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Help Section */}
      <div className="bg-gray-50 rounded-lg p-6 lg:p-8">
        <h4 className="font-medium text-gray-900 mb-4 flex items-center text-lg">
          <svg className="w-6 h-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Need Help?
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm md:text-base text-gray-700">
          <div>
            <p className="font-semibold text-gray-900 mb-2">Don't have the Dock wallet?</p>
            <p>Download it from your app store and create an account first.</p>
          </div>
          <div>
            <p className="font-semibold text-gray-900 mb-2">QR code not working?</p>
            <p>Make sure your camera has permission and try adjusting the lighting.</p>
          </div>
          <div>
            <p className="font-semibold text-gray-900 mb-2">Still having issues?</p>
            <p>You can copy the credential offer URL from the QR code section above.</p>
          </div>
        </div>
      </div>
    </div>
  );
}