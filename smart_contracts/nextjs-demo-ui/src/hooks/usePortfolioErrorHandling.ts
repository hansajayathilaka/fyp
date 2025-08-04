import { useState, useCallback, useEffect, useMemo } from 'react'
import { useRpcErrorHandler } from './useRpcErrorHandler'

export interface ErrorState {
  hasError: boolean
  error: string | null
  errorType: 'network' | 'contract' | 'validation' | 'unknown'
  retryCount: number
  canRetry: boolean
}

export interface RetryConfig {
  maxRetries: number
  retryDelay: number
  exponentialBackoff: boolean
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  exponentialBackoff: true
}

/**
 * Enhanced error handling hook for portfolio operations
 * Provides retry mechanisms, error categorization, and recovery strategies
 */
export function usePortfolioErrorHandling(config: Partial<RetryConfig> = {}) {
  const retryConfig = useMemo(() => ({ ...DEFAULT_RETRY_CONFIG, ...config }), [config])
  const [errorState, setErrorState] = useState<ErrorState>({
    hasError: false,
    error: null,
    errorType: 'unknown',
    retryCount: 0,
    canRetry: true
  })

  // Use existing RPC error handler
  useRpcErrorHandler()

  // Categorize error type based on error message
  const categorizeError = useCallback((error: string): ErrorState['errorType'] => {
    const lowerError = error.toLowerCase()
    
    if (lowerError.includes('network') || 
        lowerError.includes('fetch') || 
        lowerError.includes('timeout') ||
        lowerError.includes('rpc') ||
        lowerError.includes('connection')) {
      return 'network'
    }
    
    if (lowerError.includes('contract') ||
        lowerError.includes('revert') ||
        lowerError.includes('execution') ||
        lowerError.includes('gas')) {
      return 'contract'
    }
    
    if (lowerError.includes('invalid') ||
        lowerError.includes('insufficient') ||
        lowerError.includes('balance') ||
        lowerError.includes('amount')) {
      return 'validation'
    }
    
    return 'unknown'
  }, [])

  // Set error with categorization
  const setError = useCallback((error: string | Error) => {
    const errorMessage = error instanceof Error ? error.message : error
    const errorType = categorizeError(errorMessage)
    
    setErrorState(prev => ({
      hasError: true,
      error: errorMessage,
      errorType,
      retryCount: prev.retryCount,
      canRetry: prev.retryCount < retryConfig.maxRetries
    }))
  }, [categorizeError, retryConfig.maxRetries])

  // Clear error state
  const clearError = useCallback(() => {
    setErrorState({
      hasError: false,
      error: null,
      errorType: 'unknown',
      retryCount: 0,
      canRetry: true
    })
  }, [])

  // Retry mechanism with exponential backoff
  const retry = useCallback(async (operation: () => Promise<void> | void) => {
    if (!errorState.canRetry) return

    const delay = retryConfig.exponentialBackoff 
      ? retryConfig.retryDelay * Math.pow(2, errorState.retryCount)
      : retryConfig.retryDelay

    // Wait before retry
    await new Promise(resolve => setTimeout(resolve, delay))

    try {
      await operation()
      clearError()
    } catch (error) {
      const newRetryCount = errorState.retryCount + 1
      const errorMessage = error instanceof Error ? error.message : String(error)
      const errorType = categorizeError(errorMessage)
      
      setErrorState({
        hasError: true,
        error: errorMessage,
        errorType,
        retryCount: newRetryCount,
        canRetry: newRetryCount < retryConfig.maxRetries
      })
    }
  }, [errorState.canRetry, errorState.retryCount, retryConfig, categorizeError, clearError])

  // Safe execution wrapper that handles errors automatically
  const safeExecute = useCallback(async <T>(
    operation: () => Promise<T>,
    fallback?: T,
    options?: { 
      suppressError?: boolean
      customErrorMessage?: string
    }
  ): Promise<T | undefined> => {
    try {
      const result = await operation()
      if (errorState.hasError) {
        clearError()
      }
      return result
    } catch (error) {
      const errorMessage = options?.customErrorMessage || 
        (error instanceof Error ? error.message : String(error))
      
      if (!options?.suppressError) {
        setError(errorMessage)
      }
      
      return fallback
    }
  }, [errorState.hasError, clearError, setError])

  // Check if error is recoverable
  const isRecoverable = useCallback((errorType: ErrorState['errorType']): boolean => {
    switch (errorType) {
      case 'network':
        return true // Network errors are usually temporary
      case 'contract':
        return false // Contract errors usually need user action
      case 'validation':
        return false // Validation errors need user input correction
      case 'unknown':
        return true // Unknown errors might be temporary
      default:
        return false
    }
  }, [])

  // Get user-friendly error message
  const getErrorMessage = useCallback((error: string, errorType: ErrorState['errorType']): string => {
    switch (errorType) {
      case 'network':
        return 'Network connection issue. Please check your internet connection and try again.'
      case 'contract':
        return 'Smart contract error. This might be due to invalid parameters or contract state.'
      case 'validation':
        return 'Invalid input. Please check your values and try again.'
      case 'unknown':
      default:
        return error || 'An unexpected error occurred. Please try again.'
    }
  }, [])

  // Get suggested actions based on error type
  const getSuggestedActions = useCallback((errorType: ErrorState['errorType']): string[] => {
    switch (errorType) {
      case 'network':
        return [
          'Check your internet connection',
          'Try refreshing the page',
          'Wait a moment and retry'
        ]
      case 'contract':
        return [
          'Check your wallet balance',
          'Validate transaction parameters',
          'Contact support if issue persists'
        ]
      case 'validation':
        return [
          'Check input values',
          'Ensure sufficient balance',
          'Validate all required fields'
        ]
      case 'unknown':
      default:
        return [
          'Try refreshing the page',
          'Check your wallet connection',
          'Contact support if issue persists'
        ]
    }
  }, [])

  return {
    errorState,
    setError,
    clearError,
    retry,
    safeExecute,
    isRecoverable: isRecoverable(errorState.errorType),
    userFriendlyMessage: getErrorMessage(errorState.error || '', errorState.errorType),
    suggestedActions: getSuggestedActions(errorState.errorType)
  }
}

/**
 * Hook for handling multiple async operations with error aggregation
 */
export function useMultipleOperationsErrorHandling() {
  const [operations, setOperations] = useState<Map<string, ErrorState>>(new Map())
  
  const setOperationError = useCallback((operationId: string, error: string | Error) => {
    const errorMessage = error instanceof Error ? error.message : error
    setOperations(prev => {
      const newMap = new Map(prev)
      newMap.set(operationId, {
        hasError: true,
        error: errorMessage,
        errorType: 'unknown',
        retryCount: 0,
        canRetry: true
      })
      return newMap
    })
  }, [])

  const clearOperationError = useCallback((operationId: string) => {
    setOperations(prev => {
      const newMap = new Map(prev)
      newMap.delete(operationId)
      return newMap
    })
  }, [])

  const clearAllErrors = useCallback(() => {
    setOperations(new Map())
  }, [])

  const hasAnyErrors = operations.size > 0
  const errorCount = operations.size
  const errors = Array.from(operations.entries()).map(([id, error]) => ({ id, ...error }))

  return {
    operations,
    setOperationError,
    clearOperationError,
    clearAllErrors,
    hasAnyErrors,
    errorCount,
    errors
  }
}

/**
 * Hook for network connectivity monitoring
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)
  const [isConnected, setIsConnected] = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Test blockchain connectivity periodically
    const testConnection = async () => {
      try {
        // Simple connectivity test - try to fetch from a reliable endpoint
        const response = await fetch('https://api.github.com/zen', { 
          method: 'HEAD',
          mode: 'no-cors',
          cache: 'no-cache'
        })
        setIsConnected(true)
      } catch {
        setIsConnected(false)
      }
    }

    // Test connection every 30 seconds
    const interval = setInterval(testConnection, 30000)
    testConnection() // Initial test

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(interval)
    }
  }, [])

  return { isOnline, isConnected }
}