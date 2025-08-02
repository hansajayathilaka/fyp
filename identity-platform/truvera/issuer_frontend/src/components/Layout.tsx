import { ReactNode } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { getProgressSteps } from '../utils';
import ProgressStepper from './ProgressStepper';

interface LayoutProps {
  children: ReactNode;
}



// Error display component
function ErrorDisplay() {
  const { state, setErrorState } = useAppContext();

  if (!state.errorState.hasError || !state.errorState.error) return null;

  return (
    <div className="w-full max-w-md mx-auto mb-6">
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
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
          <div className="ml-3 flex-1">
            <p className="text-sm text-red-800">{state.errorState.error}</p>
          </div>
          <div className="ml-auto pl-3">
            <button
              onClick={() => setErrorState({ hasError: false })}
              className="inline-flex text-red-400 hover:text-red-600 focus:outline-none focus:text-red-600"
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Loading overlay component
function LoadingOverlay() {
  const { state } = useAppContext();

  if (!state.loadingState.isLoading) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 flex items-center space-x-3">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <span className="text-gray-700">
          {state.loadingState.message || 'Processing...'}
        </span>
      </div>
    </div>
  );
}

// Main layout component
export default function Layout({ children }: LayoutProps) {
  const { state } = useAppContext();
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-4 py-6 max-w-7xl">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-center text-gray-900">
            SSI Issuing Platform
          </h1>
          <p className="text-center text-gray-600 mt-2 text-sm md:text-base lg:text-lg">
            Secure credential issuance with Truvera
          </p>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Progress Stepper at the top */}
        <div className="max-w-5xl mx-auto mb-8">
          <ProgressStepper steps={getProgressSteps(state.currentStep)} />
        </div>
        
        {/* Error display */}
        <ErrorDisplay />
        
        {/* Page content - Responsive width constraints */}
        <div className="max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="container mx-auto px-4 py-6 max-w-7xl">
          <p className="text-center text-sm text-gray-500">
            Powered by Truvera • Secure • Decentralized
          </p>
        </div>
      </footer>

      {/* Loading overlay */}
      <LoadingOverlay />
    </div>
  );
}