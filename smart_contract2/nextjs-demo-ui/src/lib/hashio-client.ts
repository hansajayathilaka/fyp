/**
 * Hashio API client that uses the Next.js API proxy to avoid CORS issues
 */

interface HashioRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: any
  headers?: Record<string, string>
}

export class HashioClient {
  private baseUrl = '/api/hashio'

  /**
   * Make a request to the Hashio API through the Next.js proxy
   */
  async request(endpoint: string, options: HashioRequestOptions = {}) {
    const { method = 'GET', body, headers = {} } = options

    const url = `${this.baseUrl}?endpoint=${encodeURIComponent(endpoint)}`
    
    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    }

    if (body && (method === 'POST' || method === 'PUT')) {
      fetchOptions.body = JSON.stringify(body)
    }

    const response = await fetch(url, fetchOptions)
    
    if (!response.ok) {
      throw new Error(`Hashio API error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Make a JSON-RPC call to the Hashio API
   */
  async jsonRpc(method: string, params: any[] = [], id: number = 1) {
    return this.request('', {
      method: 'POST',
      body: {
        jsonrpc: '2.0',
        method,
        params,
        id,
      },
    })
  }

  /**
   * Get chain ID
   */
  async getChainId() {
    return this.jsonRpc('eth_chainId')
  }

  /**
   * Get block number
   */
  async getBlockNumber() {
    return this.jsonRpc('eth_blockNumber')
  }

  /**
   * Get balance for an address
   */
  async getBalance(address: string, blockTag: string = 'latest') {
    return this.jsonRpc('eth_getBalance', [address, blockTag])
  }

  /**
   * Get transaction by hash
   */
  async getTransaction(hash: string) {
    return this.jsonRpc('eth_getTransactionByHash', [hash])
  }

  /**
   * Get transaction receipt
   */
  async getTransactionReceipt(hash: string) {
    return this.jsonRpc('eth_getTransactionReceipt', [hash])
  }
}

// Export a singleton instance
export const hashioClient = new HashioClient()

// Export convenience functions
export const getChainId = () => hashioClient.getChainId()
export const getBlockNumber = () => hashioClient.getBlockNumber()
export const getBalance = (address: string, blockTag?: string) => 
  hashioClient.getBalance(address, blockTag)
export const getTransaction = (hash: string) => hashioClient.getTransaction(hash)
export const getTransactionReceipt = (hash: string) => 
  hashioClient.getTransactionReceipt(hash)