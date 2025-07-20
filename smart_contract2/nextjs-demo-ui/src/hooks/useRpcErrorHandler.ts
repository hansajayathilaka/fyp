import { useEffect } from 'react'

/**
 * Hook to handle RPC errors gracefully and provide user feedback
 */
export function useRpcErrorHandler() {
  useEffect(() => {
    // Listen for unhandled promise rejections (common with RPC failures)
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason
      
      // Check if it's an RPC error
      if (error && typeof error === 'object') {
        const errorMessage = error.message || error.toString()
        
        // Handle specific RPC errors
        if (errorMessage.includes('400') && errorMessage.includes('hashio.io')) {
          console.warn('RPC Error: Bad request to Hedera testnet. This is expected during development.')
          event.preventDefault() // Prevent the error from being logged as unhandled
          return
        }
        
        if (errorMessage.includes('fetch')) {
          console.warn('Network Error: Failed to connect to RPC endpoint.')
          event.preventDefault()
          return
        }
        
        if (errorMessage.includes('timeout')) {
          console.warn('RPC Error: Request timeout. The network might be slow.')
          event.preventDefault()
          return
        }
      }
    }

    // Listen for general errors
    const handleError = (event: ErrorEvent) => {
      const error = event.error
      if (error && error.message && error.message.includes('hashio.io')) {
        console.warn('Suppressed RPC error:', error.message)
        event.preventDefault()
      }
    }

    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    window.addEventListener('error', handleError)

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
      window.removeEventListener('error', handleError)
    }
  }, [])
}

/**
 * Utility function to safely handle async operations that might fail due to RPC issues
 */
export async function safeRpcCall<T>(
  operation: () => Promise<T>,
  fallback?: T,
  errorMessage?: string
): Promise<T | undefined> {
  try {
    return await operation()
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    
    // Log specific error types differently
    if (errorMsg.includes('400') && errorMsg.includes('hashio.io')) {
      console.warn(errorMessage || 'RPC call failed with 400 error (expected during development)')
    } else if (errorMsg.includes('timeout')) {
      console.warn(errorMessage || 'RPC call timed out')
    } else {
      console.error(errorMessage || 'RPC call failed:', error)
    }
    
    return fallback
  }
}