import React, { createContext, useContext, useReducer, ReactNode, useCallback, useMemo, useEffect } from 'react';
import { ProcessStep, CredentialFormData, QRCodeData, OperationStatus, OperationSummary, LoadingState, ErrorState } from '../types';
import { apiConfig } from '../config/api';

// Global application state
interface AppState {
  // Session management
  currentStep: ProcessStep;
  sessionId: string | null;
  sessionCreated: boolean;
  sessionInitializing: boolean;
  
  // Wallet connection
  walletAddress: string | null;
  holderDID: string | null;
  
  // Form data and validation
  formData: CredentialFormData | null;
  formSubmitted: boolean;
  
  // QR code and credential offer
  qrCodeData: QRCodeData | null;
  connectionId: string | null;
  
  // Credential issuance
  issuerId: string | null;
  credentialId: string | null;
  operationStatus: OperationStatus | null;
  
  // Operation summary
  operationSummary: OperationSummary | null;
  
  // Loading and error states
  loadingState: LoadingState;
  errorState: ErrorState;
  
  // Session persistence
  sessionPersisted: boolean;
}

// Actions for state management
type AppAction =
  // Session management
  | { type: 'SET_STEP'; payload: ProcessStep }
  | { type: 'SET_SESSION_ID'; payload: string }
  | { type: 'SET_SESSION_CREATED'; payload: boolean }
  | { type: 'SET_SESSION_INITIALIZING'; payload: boolean }
  | { type: 'SET_SESSION_PERSISTED'; payload: boolean }
  
  // Wallet connection
  | { type: 'SET_WALLET_ADDRESS'; payload: string }
  | { type: 'SET_HOLDER_DID'; payload: string }
  
  // Form data and validation
  | { type: 'SET_FORM_DATA'; payload: CredentialFormData }
  | { type: 'SET_FORM_SUBMITTED'; payload: boolean }
  
  // QR code and credential offer
  | { type: 'SET_QR_CODE_DATA'; payload: QRCodeData }
  | { type: 'SET_CONNECTION_ID'; payload: string }
  
  // Credential issuance
  | { type: 'SET_ISSUER_ID'; payload: string }
  | { type: 'SET_CREDENTIAL_ID'; payload: string }
  | { type: 'SET_OPERATION_STATUS'; payload: OperationStatus }
  
  // Operation summary
  | { type: 'SET_OPERATION_SUMMARY'; payload: OperationSummary }
  
  // Loading and error states
  | { type: 'SET_LOADING_STATE'; payload: LoadingState }
  | { type: 'SET_ERROR_STATE'; payload: ErrorState }
  
  // Utility actions
  | { type: 'RESET_STATE' }
  | { type: 'RESTORE_STATE'; payload: Partial<AppState> };

const initialState: AppState = {
  // Session management
  currentStep: ProcessStep.WALLET_CONNECTION,
  sessionId: null,
  sessionCreated: false,
  sessionInitializing: false,
  
  // Wallet connection
  walletAddress: null,
  holderDID: null,
  
  // Form data and validation
  formData: null,
  formSubmitted: false,
  
  // QR code and credential offer
  qrCodeData: null,
  connectionId: null,
  
  // Credential issuance
  issuerId: null,
  credentialId: null,
  operationStatus: null,
  
  // Operation summary
  operationSummary: null,
  
  // Loading and error states
  loadingState: {
    isLoading: false,
  },
  errorState: {
    hasError: false,
  },
  
  // Session persistence
  sessionPersisted: false,
};

// Reducer function
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    // Session management
    case 'SET_STEP':
      return { ...state, currentStep: action.payload };
    case 'SET_SESSION_ID':
      return { ...state, sessionId: action.payload };
    case 'SET_SESSION_CREATED':
      return { ...state, sessionCreated: action.payload };
    case 'SET_SESSION_INITIALIZING':
      return { ...state, sessionInitializing: action.payload };
    case 'SET_SESSION_PERSISTED':
      return { ...state, sessionPersisted: action.payload };
    
    // Wallet connection
    case 'SET_WALLET_ADDRESS':
      return { ...state, walletAddress: action.payload };
    case 'SET_HOLDER_DID':
      return { ...state, holderDID: action.payload };
    
    // Form data and validation
    case 'SET_FORM_DATA':
      return { ...state, formData: action.payload };
    case 'SET_FORM_SUBMITTED':
      return { ...state, formSubmitted: action.payload };
    
    // QR code and credential offer
    case 'SET_QR_CODE_DATA':
      return { ...state, qrCodeData: action.payload };
    case 'SET_CONNECTION_ID':
      return { ...state, connectionId: action.payload };
    
    // Credential issuance
    case 'SET_ISSUER_ID':
      return { ...state, issuerId: action.payload };
    case 'SET_CREDENTIAL_ID':
      return { ...state, credentialId: action.payload };
    case 'SET_OPERATION_STATUS':
      return { ...state, operationStatus: action.payload };
    
    // Operation summary
    case 'SET_OPERATION_SUMMARY':
      return { ...state, operationSummary: action.payload };
    
    // Loading and error states
    case 'SET_LOADING_STATE':
      return { ...state, loadingState: action.payload };
    case 'SET_ERROR_STATE':
      return { ...state, errorState: action.payload };
    
    // Utility actions
    case 'RESET_STATE':
      return initialState;
    case 'RESTORE_STATE':
      return { ...state, ...action.payload };
    
    default:
      return state;
  }
}

// Context type
interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  
  // Session management
  setStep: (step: ProcessStep) => void;
  setSessionId: (id: string) => void;
  setSessionCreated: (created: boolean) => void;
  setSessionInitializing: (initializing: boolean) => void;
  setSessionPersisted: (persisted: boolean) => void;
  
  // Wallet connection
  setWalletAddress: (address: string) => void;
  setHolderDID: (did: string) => void;
  
  // Form data and validation
  setFormData: (data: CredentialFormData) => void;
  setFormSubmitted: (submitted: boolean) => void;
  
  // QR code and credential offer
  setQRCodeData: (data: QRCodeData) => void;
  setConnectionId: (id: string) => void;
  
  // Credential issuance
  setIssuerId: (id: string) => void;
  setCredentialId: (id: string) => void;
  setOperationStatus: (status: OperationStatus) => void;
  
  // Operation summary
  setOperationSummary: (summary: OperationSummary) => void;
  
  // Loading and error states
  setLoadingState: (state: LoadingState) => void;
  setErrorState: (state: ErrorState) => void;
  
  // Utility functions
  resetState: () => void;
  restoreState: (state: Partial<AppState>) => void;
  
  // Session management functions
  createSession: () => Promise<void>;
  connectWallet: (walletAddress: string) => Promise<void>;
  
  // Session persistence
  persistState: () => void;
  loadPersistedState: () => void;
  clearPersistedState: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Provider component
interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Session management helper functions
  const setStep = useCallback((step: ProcessStep) => dispatch({ type: 'SET_STEP', payload: step }), []);
  const setSessionId = useCallback((id: string) => dispatch({ type: 'SET_SESSION_ID', payload: id }), []);
  const setSessionCreated = useCallback((created: boolean) => dispatch({ type: 'SET_SESSION_CREATED', payload: created }), []);
  const setSessionInitializing = useCallback((initializing: boolean) => dispatch({ type: 'SET_SESSION_INITIALIZING', payload: initializing }), []);
  const setSessionPersisted = useCallback((persisted: boolean) => dispatch({ type: 'SET_SESSION_PERSISTED', payload: persisted }), []);
  
  // Wallet connection helper functions
  const setWalletAddress = useCallback((address: string) => dispatch({ type: 'SET_WALLET_ADDRESS', payload: address }), []);
  const setHolderDID = useCallback((did: string) => dispatch({ type: 'SET_HOLDER_DID', payload: did }), []);
  
  // Form data and validation helper functions
  const setFormData = useCallback((data: CredentialFormData) => dispatch({ type: 'SET_FORM_DATA', payload: data }), []);
  const setFormSubmitted = useCallback((submitted: boolean) => dispatch({ type: 'SET_FORM_SUBMITTED', payload: submitted }), []);
  
  // QR code and credential offer helper functions
  const setQRCodeData = useCallback((data: QRCodeData) => dispatch({ type: 'SET_QR_CODE_DATA', payload: data }), []);
  const setConnectionId = useCallback((id: string) => dispatch({ type: 'SET_CONNECTION_ID', payload: id }), []);
  
  // Credential issuance helper functions
  const setIssuerId = useCallback((id: string) => dispatch({ type: 'SET_ISSUER_ID', payload: id }), []);
  const setCredentialId = useCallback((id: string) => dispatch({ type: 'SET_CREDENTIAL_ID', payload: id }), []);
  const setOperationStatus = useCallback((status: OperationStatus) => dispatch({ type: 'SET_OPERATION_STATUS', payload: status }), []);
  
  // Operation summary helper functions
  const setOperationSummary = useCallback((summary: OperationSummary) => dispatch({ type: 'SET_OPERATION_SUMMARY', payload: summary }), []);
  
  // Loading and error state helper functions
  const setLoadingState = useCallback((loadingState: LoadingState) => dispatch({ type: 'SET_LOADING_STATE', payload: loadingState }), []);
  const setErrorState = useCallback((errorState: ErrorState) => dispatch({ type: 'SET_ERROR_STATE', payload: errorState }), []);
  
  // Utility helper functions
  const resetState = useCallback(() => dispatch({ type: 'RESET_STATE' }), []);
  const restoreState = useCallback((partialState: Partial<AppState>) => dispatch({ type: 'RESTORE_STATE', payload: partialState }), []);

  // Session persistence functions
  const persistState = useCallback(() => {
    try {
      const stateToSave = {
        sessionId: state.sessionId,
        currentStep: state.currentStep,
        walletAddress: state.walletAddress,
        holderDID: state.holderDID,
        connectionId: state.connectionId,
        issuerId: state.issuerId,
        credentialId: state.credentialId,
        formData: state.formData,
        formSubmitted: state.formSubmitted,
        qrCodeData: state.qrCodeData,
        operationStatus: state.operationStatus,
        sessionCreated: state.sessionCreated,
      };
      
      localStorage.setItem('ssi-app-state', JSON.stringify(stateToSave));
      setSessionPersisted(true);
    } catch (error) {
      console.warn('Failed to persist state:', error);
    }
  }, [
    state.sessionId,
    state.currentStep,
    state.walletAddress,
    state.holderDID,
    state.connectionId,
    state.issuerId,
    state.credentialId,
    state.formData,
    state.formSubmitted,
    state.qrCodeData,
    state.operationStatus,
    state.sessionCreated,
    setSessionPersisted
  ]);

  const loadPersistedState = useCallback(() => {
    try {
      const savedState = localStorage.getItem('ssi-app-state');
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        restoreState(parsedState);
        setSessionPersisted(true);
      }
    } catch (error) {
      console.warn('Failed to load persisted state:', error);
      clearPersistedState();
    }
  }, [restoreState, setSessionPersisted]);

  const clearPersistedState = useCallback(() => {
    try {
      localStorage.removeItem('ssi-app-state');
      setSessionPersisted(false);
    } catch (error) {
      console.warn('Failed to clear persisted state:', error);
    }
  }, [setSessionPersisted]);

  // Session management with duplicate prevention
  const createSession = useCallback(async () => {
    // Prevent duplicate session creation
    if (state.sessionCreated || state.sessionId || state.sessionInitializing) {
      return;
    }

    try {
      setSessionInitializing(true);
      setErrorState({ hasError: false });
      
      const response = await fetch(apiConfig.endpoints.session.create, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to create session: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setSessionId(data.data.sessionId);
        setStep(data.data.currentStep);
        setSessionCreated(true);
        // Don't call persistState here - let the useEffect handle it
      } else {
        throw new Error(data.error?.message || 'Failed to create session');
      }
    } catch (error) {
      console.error('Failed to create session:', error);
      setErrorState({
        hasError: true,
        error: `Failed to create session: ${error instanceof Error ? error.message : 'Unknown error'}`,
        code: 'SESSION_CREATION_FAILED'
      });
    } finally {
      setSessionInitializing(false);
    }
  }, [state.sessionCreated, state.sessionId, state.sessionInitializing, setSessionInitializing, setErrorState, setSessionId, setStep, setSessionCreated]);

  // Wallet connection
  const connectWallet = useCallback(async (walletAddress: string) => {
    try {
      setLoadingState({ isLoading: true, operation: 'wallet_connection', message: 'Connecting wallet...' });
      setErrorState({ hasError: false });

      if (!state.sessionId) {
        throw new Error('No session available. Please refresh the page.');
      }
      
      const response = await fetch(apiConfig.endpoints.wallet.connect, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: state.sessionId,
          walletAddress: walletAddress,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to connect wallet: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setWalletAddress(walletAddress);
        setStep(data.data.currentStep);
        // Don't call persistState here - let the useEffect handle it
      } else {
        throw new Error(data.error?.message || 'Failed to connect wallet');
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      setErrorState({
        hasError: true,
        error: `Failed to connect wallet: ${error instanceof Error ? error.message : 'Unknown error'}`,
        code: 'WALLET_CONNECTION_FAILED'
      });
    } finally {
      setLoadingState({ isLoading: false });
    }
  }, [state.sessionId, setLoadingState, setErrorState, setWalletAddress, setStep]);

  // Load persisted state on mount
  useEffect(() => {
    loadPersistedState();
  }, []); // Empty dependency array - only run on mount

  // Auto-persist state when important changes occur
  useEffect(() => {
    if (state.sessionId && state.sessionCreated) {
      persistState();
    }
  }, [state.sessionId, state.sessionCreated, state.currentStep, state.walletAddress, state.formData, state.qrCodeData, state.operationStatus, persistState]);

  const value: AppContextType = useMemo(() => ({
    state,
    dispatch,
    
    // Session management
    setStep,
    setSessionId,
    setSessionCreated,
    setSessionInitializing,
    setSessionPersisted,
    
    // Wallet connection
    setWalletAddress,
    setHolderDID,
    
    // Form data and validation
    setFormData,
    setFormSubmitted,
    
    // QR code and credential offer
    setQRCodeData,
    setConnectionId,
    
    // Credential issuance
    setIssuerId,
    setCredentialId,
    setOperationStatus,
    
    // Operation summary
    setOperationSummary,
    
    // Loading and error states
    setLoadingState,
    setErrorState,
    
    // Utility functions
    resetState,
    restoreState,
    
    // Session management functions
    createSession,
    connectWallet,
    
    // Session persistence
    persistState,
    loadPersistedState,
    clearPersistedState,
  }), [
    state,
    dispatch,
    setStep,
    setSessionId,
    setSessionCreated,
    setSessionInitializing,
    setSessionPersisted,
    setWalletAddress,
    setHolderDID,
    setFormData,
    setFormSubmitted,
    setQRCodeData,
    setConnectionId,
    setIssuerId,
    setCredentialId,
    setOperationStatus,
    setOperationSummary,
    setLoadingState,
    setErrorState,
    resetState,
    restoreState,
    createSession,
    connectWallet,
    persistState,
    loadPersistedState,
    clearPersistedState,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// Custom hook to use the context
export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}