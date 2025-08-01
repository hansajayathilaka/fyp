import { Routes, Route, Navigate } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';
import { ProcessStep } from '../types';

// Page components
import WalletConnectionPage from '../pages/WalletConnectionPage';
import QRCodePage from '../pages/QRCodePage';
import CredentialFormPage from '../pages/CredentialFormPage';
import IssuancePage from '../pages/IssuancePage';
import CompletionPage from '../pages/CompletionPage';

// Route configuration based on process steps
const routeConfig = {
  [ProcessStep.WALLET_CONNECTION]: {
    path: '/wallet-connection',
    component: WalletConnectionPage,
  },
  [ProcessStep.FORM_SUBMISSION]: {
    path: '/credential-form',
    component: CredentialFormPage,
  },
  [ProcessStep.QR_GENERATION]: {
    path: '/qr-code',
    component: QRCodePage,
  },
  [ProcessStep.WALLET_PAIRING]: {
    path: '/qr-code',
    component: QRCodePage,
  },
  [ProcessStep.CREDENTIAL_ISSUANCE]: {
    path: '/issuance',
    component: IssuancePage,
  },
  [ProcessStep.COMPLETION]: {
    path: '/completion',
    component: CompletionPage,
  },
};

// Protected route component that redirects based on current step
function ProtectedRoute({ 
  children, 
  allowedSteps 
}: { 
  children: React.ReactNode; 
  allowedSteps: ProcessStep[] 
}) {
  const { state } = useAppContext();
  
  if (!allowedSteps.includes(state.currentStep)) {
    const currentRoute = routeConfig[state.currentStep];
    return <Navigate to={currentRoute.path} replace />;
  }
  
  return <>{children}</>;
}

export default function AppRouter() {
  const { state } = useAppContext();

  return (
    <Routes>
      {/* Default route - redirect to current step */}
      <Route 
        path="/" 
        element={<Navigate to={routeConfig[state.currentStep].path} replace />} 
      />
      
      {/* Wallet connection route */}
      <Route
        path="/wallet-connection"
        element={
          <ProtectedRoute allowedSteps={[ProcessStep.WALLET_CONNECTION]}>
            <WalletConnectionPage />
          </ProtectedRoute>
        }
      />
      
      {/* Credential form route */}
      <Route
        path="/credential-form"
        element={
          <ProtectedRoute allowedSteps={[ProcessStep.FORM_SUBMISSION]}>
            <CredentialFormPage />
          </ProtectedRoute>
        }
      />
      
      {/* QR code route (handles both QR generation and wallet pairing) */}
      <Route
        path="/qr-code"
        element={
          <ProtectedRoute 
            allowedSteps={[ProcessStep.QR_GENERATION, ProcessStep.WALLET_PAIRING]}
          >
            <QRCodePage />
          </ProtectedRoute>
        }
      />
      
      {/* Credential issuance route */}
      <Route
        path="/issuance"
        element={
          <ProtectedRoute allowedSteps={[ProcessStep.CREDENTIAL_ISSUANCE]}>
            <IssuancePage />
          </ProtectedRoute>
        }
      />
      
      {/* Completion route */}
      <Route
        path="/completion"
        element={
          <ProtectedRoute allowedSteps={[ProcessStep.COMPLETION]}>
            <CompletionPage />
          </ProtectedRoute>
        }
      />
      
      {/* Catch all route - redirect to current step */}
      <Route 
        path="*" 
        element={<Navigate to={routeConfig[state.currentStep].path} replace />} 
      />
    </Routes>
  );
}