'use client'

import { ReactNode, useState, useEffect } from 'react'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConnectKitProvider } from 'connectkit'
import { config } from '../lib/wagmi'

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  const [mounted, setMounted] = useState(false)
  
  // Create QueryClient inside component to avoid hydration issues
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // Disable automatic refetching on window focus to prevent hydration issues
        refetchOnWindowFocus: false,
        // Increase stale time to reduce unnecessary requests
        staleTime: 30 * 1000, // 30 seconds
        // Increase cache time to keep data longer
        gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
        // Reduce retry attempts to prevent request flooding
        retry: 1,
        // Add delay between retries
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        // Disable refetch on reconnect to prevent request spikes
        refetchOnReconnect: false,
      },
    },
  }))

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider
          theme="auto"
          mode="light"
          options={{
            initialChainId: 0, // Let wagmi handle chain selection
            enforceSupportedChains: false, // Allow custom chains
          }}
        >
          {mounted ? children : <div>Loading...</div>}
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}