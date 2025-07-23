'use client'

import { useRpcErrorHandler } from '../hooks/useRpcErrorHandler'

/**
 * Component that handles RPC errors globally
 */
export function RpcErrorHandler() {
  useRpcErrorHandler()
  return null
}