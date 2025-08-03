'use client'

import { useState, useCallback } from 'react'
import { clsx } from 'clsx'

interface SSISignInProps {
  onSignInSuccess?: (ssiData: { identifier: string; userType: number }) => void
  onSignInError?: (error: string) => void
  className?: string
  disabled?: boolean
}

export function SSISignIn({ 
  onSignInSuccess, 
  onSignInError, 
  className,
  disabled = false 
}: SSISignInProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleSSISignIn = useCallback(() => {
    const ssiUrl = process.env.NEXT_PUBLIC_SSI_SIGNIN_URL
    
    if (!ssiUrl) {
      onSignInError?.('SSI sign-in URL not configured')
      return
    }

    setIsLoading(true)

    // Open popup window for SSI sign-in
    const popup = window.open(
      ssiUrl,
      'ssi-signin',
      'width=500,height=600,scrollbars=yes,resizable=yes,status=yes,location=yes,toolbar=no,menubar=no'
    )

    if (!popup) {
      setIsLoading(false)
      onSignInError?.('Popup blocked. Please allow popups for this site.')
      return
    }

    // Listen for messages from the popup
    const handleMessage = (event: MessageEvent) => {
      // Verify origin for security (adjust this to match your SSI provider's domain)
      const allowedOrigins = [
        new URL(ssiUrl).origin,
        window.location.origin // Allow same origin for testing
      ]
      
      if (!allowedOrigins.includes(event.origin)) {
        return
      }

      if (event.data.type === 'SSI_SIGNIN_SUCCESS') {
        setIsLoading(false)
        popup.close()
        window.removeEventListener('message', handleMessage)
        
        // Extract SSI data from the response
        const { identifier, userType = 0 } = event.data.payload || {}
        
        if (identifier) {
          onSignInSuccess?.({ identifier, userType })
        } else {
          onSignInError?.('Invalid SSI response: missing identifier')
        }
      } else if (event.data.type === 'SSI_SIGNIN_ERROR') {
        setIsLoading(false)
        popup.close()
        window.removeEventListener('message', handleMessage)
        onSignInError?.(event.data.message || 'SSI sign-in failed')
      }
    }

    // Check if popup was closed manually
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        setIsLoading(false)
        clearInterval(checkClosed)
        window.removeEventListener('message', handleMessage)
      }
    }, 1000)

    window.addEventListener('message', handleMessage)

    // Cleanup after 5 minutes
    setTimeout(() => {
      if (!popup.closed) {
        popup.close()
      }
      setIsLoading(false)
      clearInterval(checkClosed)
      window.removeEventListener('message', handleMessage)
    }, 300000) // 5 minutes
  }, [onSignInSuccess, onSignInError])

  return (
    <button
      onClick={handleSSISignIn}
      disabled={disabled || isLoading}
      className={clsx(
        'flex items-center justify-center space-x-2 w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
    >
      {isLoading ? (
        <>
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <span>Connecting to SSI...</span>
        </>
      ) : (
        <>
          <svg 
            className="w-4 h-4" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z" 
            />
          </svg>
          <span>Sign in with SSI</span>
        </>
      )}
    </button>
  )
}

