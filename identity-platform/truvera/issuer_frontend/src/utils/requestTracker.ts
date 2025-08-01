// Global request tracker to prevent duplicate API calls
class RequestTracker {
  private pendingRequests = new Map<string, Promise<any>>();
  private lastRequestTimes = new Map<string, number>();
  private readonly MIN_INTERVAL = 10000; // 10 seconds minimum between requests

  /**
   * Check if a request is allowed based on rate limiting
   */
  canMakeRequest(key: string): boolean {
    const now = Date.now();
    const lastRequestTime = this.lastRequestTimes.get(key);
    
    if (lastRequestTime && (now - lastRequestTime) < this.MIN_INTERVAL) {
      return false;
    }
    
    return true;
  }

  /**
   * Get or create a request, preventing duplicates
   */
  async getOrCreateRequest<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    // Check if there's already a pending request for this key
    const existingRequest = this.pendingRequests.get(key);
    if (existingRequest) {
      console.log(`Reusing existing request for key: ${key}`);
      return existingRequest;
    }

    // Rate limiting is now handled by components, this is just for deduplication

    // Create new request
    console.log(`Creating new request for key: ${key}`);
    const requestPromise = requestFn();
    
    // Store the pending request and update timestamp
    this.pendingRequests.set(key, requestPromise);
    this.lastRequestTimes.set(key, Date.now());

    try {
      const result = await requestPromise;
      return result;
    } catch (error) {
      // If the request failed due to server-side rate limiting, 
      // update our local tracking to respect the server's rate limit
      if (error instanceof Error && error.message.includes('rate limit')) {
        // Extract wait time from server response if available
        const timeMatch = error.message.match(/(\d+)\s+more\s+seconds?/);
        const serverWaitTime = timeMatch ? parseInt(timeMatch[1]) : 10;
        
        // Update our tracking to respect server's rate limit
        this.lastRequestTimes.set(key, Date.now() - this.MIN_INTERVAL + (serverWaitTime * 1000));
      }
      
      throw error;
    } finally {
      // Clean up the pending request
      this.pendingRequests.delete(key);
    }
  }

  /**
   * Clear tracking for a specific key
   */
  clearRequest(key: string): void {
    this.pendingRequests.delete(key);
    this.lastRequestTimes.delete(key);
  }

  /**
   * Get remaining cooldown time for a key
   */
  getRemainingCooldown(key: string): number {
    const lastRequestTime = this.lastRequestTimes.get(key);
    if (!lastRequestTime) return 0;
    
    const elapsed = Date.now() - lastRequestTime;
    const remaining = this.MIN_INTERVAL - elapsed;
    
    return Math.max(0, Math.ceil(remaining / 1000));
  }
}

// Export singleton instance
export const requestTracker = new RequestTracker();
export default requestTracker;