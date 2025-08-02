import { BrowserRouter } from 'react-router-dom';
import { AppProvider } from './contexts/AppContext';
import { useSessionInitialization } from './hooks/useSessionInitialization';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import AppRouter from './routes/AppRouter';

function AppContent() {
  const { isInitializing, error } = useSessionInitialization();

  // Show loading state during session initialization
  if (isInitializing) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center bg-white rounded-lg shadow-md p-8 lg:p-12 max-w-md mx-auto">
            <div className="mb-6">
              <div className="animate-spin rounded-full h-16 w-16 lg:h-20 lg:w-20 border-b-2 border-blue-600 mx-auto"></div>
            </div>
            <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-3">
              Initializing Session
            </h3>
            <p className="text-gray-600 text-base">
              Setting up your secure credential issuance session...
            </p>
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                This should only take a moment
              </p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Show error state if session initialization failed
  if (error && !isInitializing) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center bg-white rounded-lg shadow-md p-8 lg:p-12 max-w-md lg:max-w-lg mx-auto">
            <div className="mb-6">
              <svg
                className="mx-auto h-16 w-16 lg:h-20 lg:w-20 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h3 className="text-lg md:text-xl lg:text-2xl font-semibold text-gray-900 mb-4">
              Session Initialization Failed
            </h3>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-sm md:text-base text-red-800">{error}</p>
            </div>
            <div className="flex justify-center">
              <button
                onClick={() => window.location.reload()}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-md transition-colors text-base"
              >
                Retry
              </button>
            </div>
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                If this problem persists, please try refreshing your browser or contact support.
              </p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <AppRouter />
    </Layout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </AppProvider>
    </ErrorBoundary>
  );
}

export default App;
