// Custom hook for session initialization
import { useEffect, useRef } from 'react';
import { useAppContext } from '../contexts/AppContext';

export function useSessionInitialization() {
  const { state, createSession } = useAppContext();
  const initializationAttempted = useRef(false);

  useEffect(() => {
    // Only attempt session creation once
    if (
      !initializationAttempted.current &&
      !state.sessionCreated &&
      !state.sessionId &&
      !state.sessionInitializing
    ) {
      initializationAttempted.current = true;
      createSession();
    }
  }, [state.sessionCreated, state.sessionId, state.sessionInitializing, createSession]);

  return {
    isInitializing: state.sessionInitializing,
    isInitialized: state.sessionCreated,
    sessionId: state.sessionId,
    error: state.errorState.error,
  };
}