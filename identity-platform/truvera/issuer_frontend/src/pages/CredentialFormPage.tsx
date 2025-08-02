
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';
import { ProcessStep, CredentialFormData } from '../types';
import { 
  submitFormData, 
  createCredentialOffer,
  getErrorMessage, 
  retryWithBackoff,
  ApiError
} from '../utils';
import { CredentialForm } from '../components';

export default function CredentialFormPage() {
  const { 
    state, 
    setStep, 
    setFormData: setContextFormData, 
    setFormSubmitted,
    setConnectionId,
    setQRCodeData,
    setErrorState 
  } = useAppContext();
  const navigate = useNavigate();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitAttempts, setSubmitAttempts] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Handle form submission with complete credential issuance workflow
  const handleFormSubmit = async (formData: CredentialFormData) => {
    setIsSubmitting(true);
    setErrorState({ hasError: false });
    setFormErrors({});
    setSubmitAttempts(prev => prev + 1);

    try {
      // Step 1: Submit and validate form data with retry logic
      console.log('Step 1: Submitting form data...');
      await retryWithBackoff(
        () => submitFormData(state.sessionId!, formData),
        3, // max retries
        1000 // base delay
      );

      // Store form data in context immediately after successful submission
      setContextFormData(formData);
      setFormSubmitted(true);
      
      // Step 2: Create complete credential offer workflow (OpenID issuer + credential offer + QR code)
      console.log('Step 2: Creating credential offer with complete workflow...');
      const offerResult = await retryWithBackoff(
        () => createCredentialOffer(state.sessionId!, formData),
        2, // fewer retries for offer creation
        1500 // slightly longer delay
      );

      // Update context with credential offer details for seamless QR page transition
      if (offerResult.success) {
        console.log('Credential offer workflow completed successfully:', {
          connectionId: offerResult.connectionId,
          credentialOfferUrl: offerResult.credentialOfferUrl,
          hasQRCode: !!offerResult.qrCodeData,
          hasQRImage: !!offerResult.qrCodeImage
        });

        // Store all credential offer data in context
        if (offerResult.connectionId) {
          setConnectionId(offerResult.connectionId);
        }
        
        if (offerResult.qrCodeData && offerResult.credentialOfferUrl) {
          setQRCodeData({
            qrCodeData: offerResult.qrCodeData,
            credentialOfferUrl: offerResult.credentialOfferUrl,
            qrCodeImage: offerResult.qrCodeImage,
          });
        }
      }
      
      // Show success message with comprehensive next steps
      setShowSuccess(true);
      
      // Move to QR code page after showing success confirmation
      setTimeout(() => {
        setStep(ProcessStep.QR_GENERATION);
        navigate('/qr-code');
      }, 2000);

    } catch (error) {
      console.error('Failed to complete credential issuance workflow:', error);
      
      const errorMessage = getErrorMessage(error);
      setErrorState({ 
        hasError: true, 
        error: errorMessage, 
        code: 'CREDENTIAL_WORKFLOW_FAILED' 
      });
      
      // Handle specific error types with appropriate user guidance
      if (error instanceof ApiError) {
        switch (error.code) {
          case 'INVALID_FORM_DATA':
            if (error.details) {
              const validationErrors = error.details as Record<string, string>;
              setFormErrors(validationErrors);
            }
            break;
          case 'SESSION_EXPIRED':
            // Trigger session refresh
            setTimeout(() => {
              navigate('/wallet-connection');
            }, 3000);
            break;
          case 'WALLET_NOT_CONNECTED':
            // Redirect back to wallet connection
            setTimeout(() => {
              navigate('/wallet-connection');
            }, 2000);
            break;
          case 'CREDENTIAL_OFFER_CREATION_FAILED':
            // Specific guidance for credential offer failures
            setErrorState({ 
              hasError: true, 
              error: 'Failed to create credential offer. This may be due to a temporary service issue. Please try again in a few moments.', 
              code: 'CREDENTIAL_OFFER_FAILED' 
            });
            break;
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Enhanced success confirmation component
  if (showSuccess) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center">
          <div className="mb-4">
            <svg
              className="mx-auto h-16 w-16 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Information Processed Successfully!
          </h2>
          
          <div className="text-left bg-green-50 border border-green-200 rounded-md p-4 mb-4">
            <h3 className="text-sm font-medium text-green-800 mb-2">
              ✅ Completed Steps:
            </h3>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• Form data validated and sanitized</li>
              <li>• Information securely stored</li>
              <li>• OpenID issuer created</li>
              <li>• Credential offer generated</li>
              <li>• QR code prepared</li>
            </ul>
          </div>
          
          <div className="text-left bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
            <h3 className="text-sm font-medium text-blue-800 mb-2">
              📱 Next Steps:
            </h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Scan QR code with your Dock wallet</li>
              <li>• Enter the security PIN when prompted</li>
              <li>• Accept the credential offer</li>
              <li>• Receive your DEIP Access Credential</li>
            </ul>
          </div>
          
          <p className="text-gray-600 mb-4">
            Redirecting to QR code display...
          </p>
          
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          
          <p className="mt-3 text-xs text-gray-500">
            This process typically takes a few seconds
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 lg:p-8">
      <div className="text-center mb-8">
        <div className="mb-6">
          <svg
            className="mx-auto h-16 w-16 lg:h-20 lg:w-20 text-blue-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        
        <h2 className="text-xl md:text-2xl lg:text-3xl font-semibold text-gray-900 mb-3">
          Credential Information
        </h2>
        
        <p className="text-gray-600 text-base lg:text-lg max-w-2xl mx-auto">
          Please fill out the form below to receive your DEIP Access Credential.
        </p>
      </div>
      
      {/* Error Display */}
      {state.errorState.hasError && state.errorState.error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Submission Error
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{state.errorState.error}</p>
              </div>
              <div className="mt-3">
                <div className="-mx-2 -my-1.5 flex">
                  <button
                    type="button"
                    onClick={() => setErrorState({ hasError: false })}
                    className="bg-red-50 px-2 py-1.5 rounded-md text-sm font-medium text-red-800 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-red-50 focus:ring-red-600"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Retry information */}
      {submitAttempts > 1 && !isSubmitting && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-800 text-center">
            Submission attempt {submitAttempts}. The system will automatically retry if needed.
          </p>
        </div>
      )}

      <CredentialForm
        onSubmit={handleFormSubmit}
        isLoading={isSubmitting}
        errors={formErrors}
        walletAddress={state.walletAddress || ''}
        initialData={state.formData || undefined}
      />
    </div>
  );
}