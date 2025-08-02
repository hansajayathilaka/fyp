
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';
import { ProcessStep, CredentialFormData } from '../types';
import { getOperationSummary, getErrorMessage } from '../utils';
import OperationSummary from '../components/OperationSummary';

interface OperationStep {
  name: string;
  status: 'completed' | 'failed' | 'skipped';
  timestamp?: Date;
  details?: Record<string, any>;
}

interface SessionData {
  sessionId: string;
  formData?: any;
  issuerId?: string;
  credentialOfferUrl?: string;
  qrCodeGenerated: boolean;
  credentialStatus: 'pending' | 'issued' | 'failed';
  startTime: Date;
  endTime?: Date;
  nextSteps: string[];
}

interface OperationResult {
  success: boolean;
  steps: OperationStep[];
  summary: any;
  errors?: string[];
}

export default function CompletionPage() {
  const { state, setStep, setFormData, setErrorState } = useAppContext();
  const navigate = useNavigate();
  
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [operationResult, setOperationResult] = useState<OperationResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Load operation summary from backend
  useEffect(() => {
    const loadOperationSummary = async () => {
      if (!state.sessionId) {
        setLoadError('No session ID available');
        setIsLoading(false);
        return;
      }

      try {
        const result = await getOperationSummary(state.sessionId);
        
        if (result.success && result.summary) {
          const summary = result.summary;
          
          // Create session data from summary
          const sessionData: SessionData = {
            sessionId: summary.sessionId,
            formData: summary.formData ? {
              firstName: summary.formData.firstName,
              lastName: summary.formData.lastName,
              nic: summary.formData.nic,
              country: summary.formData.country,
              email: '', // Not available in summary
              walletAddress: '', // Not available in summary
              investorType: summary.formData.investorType as 'Individual' | 'Company',
              kycLevel: summary.formData.kycLevel as 'basic' | 'advanced',
              amlStatus: summary.formData.amlStatus,
            } : undefined,
            issuerId: summary.issuerId,
            credentialOfferUrl: summary.connectionId, // Use connectionId as fallback
            qrCodeGenerated: summary.progress.qrGenerated,
            credentialStatus: summary.credentialStatus?.status || 'pending',
            startTime: new Date(summary.createdAt),
            endTime: new Date(), // Use current time as fallback
            nextSteps: [] // Not available in new summary
          };

          // Create operation steps based on the summary
          const steps: OperationStep[] = [
            {
              name: 'Form Data Submitted',
              status: summary.progress.formSubmitted ? 'completed' : 'failed',
              timestamp: new Date(summary.createdAt)
            },
            {
              name: 'OpenID Issuer Created',
              status: summary.issuerId ? 'completed' : 'failed',
              timestamp: summary.issuerId ? new Date(summary.createdAt) : undefined
            },
            {
              name: 'Credential Offer Generated',
              status: summary.connectionId ? 'completed' : 'failed',
              timestamp: summary.connectionId ? new Date(summary.createdAt) : undefined
            },
            {
              name: 'QR Code Generated',
              status: summary.progress.qrGenerated ? 'completed' : 'failed',
              timestamp: summary.progress.qrGenerated ? new Date(summary.createdAt) : undefined
            },
            {
              name: 'Credential Issued',
              status: summary.credentialStatus?.status === 'issued' ? 'completed' : 
                     summary.credentialStatus?.status === 'failed' ? 'failed' : 'skipped',
              timestamp: new Date() // Use current time as fallback
            }
          ];

          const operationResult: OperationResult = {
            success: summary.credentialStatus?.status === 'issued',
            steps: steps,
            summary: sessionData,
            errors: summary.credentialStatus?.status === 'failed' ? ['Credential issuance failed'] : undefined
          };

          setSessionData(sessionData);
          setOperationResult(operationResult);
        } else {
          setLoadError('Failed to load operation summary');
        }
      } catch (error) {
        console.error('Failed to load operation summary:', error);
        setLoadError(getErrorMessage(error));
      } finally {
        setIsLoading(false);
      }
    };

    loadOperationSummary();
  }, [state.sessionId]);

  // Handle starting a new session
  const handleStartNew = () => {
    // Clear current state - reset to empty form data
    const emptyFormData: CredentialFormData = {
      firstName: '',
      lastName: '',
      nic: '',
      country: '',
      email: '',
      walletAddress: '',
      investorType: 'Individual',
      kycLevel: 'basic',
      amlStatus: false,
    };
    setFormData(emptyFormData);
    setErrorState({ hasError: false });
    setStep(ProcessStep.WALLET_CONNECTION);
    
    // Navigate to the beginning
    navigate('/wallet-connection');
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center">
          <div className="mb-6">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          </div>
          
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Loading Operation Summary
          </h3>
          
          <p className="text-gray-600">
            Please wait while we gather the details of your credential issuance...
          </p>
        </div>
      </div>
    );
  }

  // Show error state
  if (loadError || !sessionData || !operationResult) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center">
          <div className="mb-6">
            <svg
              className="mx-auto h-16 w-16 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Unable to Load Summary
          </h2>
          
          <p className="text-gray-600 mb-6">
            {loadError || 'Failed to load the operation summary. The session may have expired.'}
          </p>
          
          <div className="space-y-3">
            <button
              onClick={handleStartNew}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-md transition-colors"
            >
              Start New Session
            </button>
            
            <button
              onClick={() => navigate('/credential-form')}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-6 rounded-md transition-colors"
            >
              Go to Form
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show success state with operation summary
  return (
    <div className="space-y-8">
      {/* Success Header */}
      <div className="bg-white rounded-lg shadow-md p-6 lg:p-8">
        <div className="text-center">
          <div className="mb-8">
            <svg
              className="mx-auto h-16 w-16 lg:h-20 lg:w-20 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          
          <h2 className="text-xl md:text-2xl lg:text-3xl font-semibold text-gray-900 mb-4">
            {operationResult.success ? 'Credential Issued Successfully!' : 'Operation Completed'}
          </h2>
          
          <p className="text-gray-600 text-base lg:text-lg mb-8 max-w-2xl mx-auto">
            {operationResult.success 
              ? 'Your DEIP Access Credential has been successfully delivered to your Dock wallet.'
              : 'The credential issuance process has completed. Please review the details below.'}
          </p>
          
          {operationResult.success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8 max-w-2xl mx-auto">
              <p className="text-green-800 text-sm md:text-base">
                You can now use this credential to access the DEIP platform and other supported services.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Operation Summary */}
      <OperationSummary
        sessionData={sessionData}
        operationResult={operationResult}
        onStartNew={handleStartNew}
      />

      {/* Additional Guidance */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 lg:p-8">
        <h4 className="font-medium text-blue-900 mb-4 flex items-center text-lg">
          <svg className="w-6 h-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          What's Next?
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm md:text-base text-blue-800">
          {operationResult.success ? (
            <>
              <div>
                <p className="font-semibold text-blue-900 mb-2">Check your Dock wallet:</p>
                <p>Your new DEIP Access Credential should now be available in your wallet.</p>
              </div>
              <div>
                <p className="font-semibold text-blue-900 mb-2">Verify the credential:</p>
                <p>Make sure all the information in the credential is correct.</p>
              </div>
              <div>
                <p className="font-semibold text-blue-900 mb-2">Use your credential:</p>
                <p>You can now use this credential for authentication and access to DEIP services.</p>
              </div>
            </>
          ) : (
            <>
              <div>
                <p className="font-semibold text-blue-900 mb-2">Review the errors:</p>
                <p>Check the operation summary above for details about what went wrong.</p>
              </div>
              <div>
                <p className="font-semibold text-blue-900 mb-2">Try again:</p>
                <p>You can start a new credential issuance session if needed.</p>
              </div>
              <div>
                <p className="font-semibold text-blue-900 mb-2">Contact support:</p>
                <p>If problems persist, please contact our support team with your session ID.</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}