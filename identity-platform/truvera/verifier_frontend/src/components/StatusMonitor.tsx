import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ProofRequest, CredentialPresentation } from '../types';
import { apiService } from '../services/api';

interface StatusMonitorProps {
  proofRequestId: string;
  onStatusUpdate: (proofRequest: ProofRequest) => void;
  onPresentationReceived?: (presentation: CredentialPresentation) => void;
  onTimeout?: () => void;
  onError?: (error: string) => void;
  pollInterval?: number;
  timeoutMinutes?: number;
  className?: string;
}

export const StatusMonitor: React.FC<StatusMonitorProps> = ({
  proofRequestId,
  onStatusUpdate,
  onPresentationReceived,
  onTimeout,
  onError,
  pollInterval = 5000, // 5 seconds as requested
  timeoutMinutes = 30,
  className = '',
}) => {
  const [isPolling, setIsPolling] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(timeoutMinutes * 60);
  const [currentStatus, setCurrentStatus] = useState<string>('active');
  const [pollCount, setPollCount] = useState<number>(0);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<Date>(new Date());
  const isPollingRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);
  const currentStatusRef = useRef<string>('active');
  const pollCountRef = useRef<number>(0);

  // Cleanup function
  const cleanup = useCallback(() => {
    console.log('StatusMonitor: Cleaning up timers');
    
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    
    isPollingRef.current = false;
  }, []);

  // Poll for status updates - using ref to avoid dependency issues
  const pollStatusRef = useRef<() => Promise<void>>();
  
  pollStatusRef.current = async () => {
    // Prevent polling if component is unmounted or not polling
    if (!isMountedRef.current || !isPollingRef.current) {
      console.log('StatusMonitor: Skipping poll - component unmounted or not polling');
      return;
    }

    try {
      const currentPollCount = pollCountRef.current + 1;
      pollCountRef.current = currentPollCount;
      
      console.log(`StatusMonitor: Polling status for ${proofRequestId} (poll #${currentPollCount}) at ${new Date().toLocaleTimeString()}`);
      
      // Update state for UI
      if (isMountedRef.current) {
        setError(null);
        setPollCount(currentPollCount);
      }
      
      const response = await apiService.getProofRequestStatus(proofRequestId);

      // Check again if component is still mounted after async call
      if (!isMountedRef.current) {
        console.log('StatusMonitor: Component unmounted during API call');
        return;
      }

      if (response.success && response.data) {
        const proofRequest = response.data;
        const newStatus = proofRequest.status;
        const oldStatus = currentStatusRef.current;
        
        console.log(`StatusMonitor: Status update - ${oldStatus} -> ${newStatus}`);
        console.log('StatusMonitor: Full API response:', JSON.stringify(response.data, null, 2));
        
        // Update refs first
        currentStatusRef.current = newStatus;
        
        // Update state for UI only if status actually changed to prevent unnecessary re-renders
        if (isMountedRef.current && oldStatus !== newStatus) {
          console.log(`StatusMonitor: Updating UI state from ${oldStatus} to ${newStatus}`);
          setCurrentStatus(newStatus);
        }
        
        if (isMountedRef.current) {
          setLastUpdate(new Date());
        }
        
        // Always call the parent callback
        onStatusUpdate(proofRequest);

        // Check if we received a presentation (status completed)
        if (newStatus === 'completed' && onPresentationReceived && proofRequest.presentation) {
          console.log('StatusMonitor: Presentation completed, notifying parent');
          onPresentationReceived(proofRequest.presentation);
        }

        // Stop polling if completed, expired, or failed
        if (['completed', 'expired', 'failed'].includes(newStatus)) {
          console.log(`StatusMonitor: Final status reached: ${newStatus}, stopping polling`);
          if (isMountedRef.current) {
            setIsPolling(false);
          }
          isPollingRef.current = false;
          cleanup();
          
          if (newStatus === 'expired' && onTimeout) {
            onTimeout();
          }
        }
      } else {
        const errorMessage = response.error?.message || 'Failed to get proof request status';
        console.error('StatusMonitor: API error:', errorMessage);
        if (isMountedRef.current) {
          setError(errorMessage);
        }
        if (onError) {
          onError(errorMessage);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Network error occurred';
      console.error('StatusMonitor: Network error:', err);
      
      // Only set error if component is still mounted
      if (isMountedRef.current) {
        setError(errorMessage);
        if (onError) {
          onError(errorMessage);
        }
      }
    }
  };



  // Start polling
  const startPolling = useCallback(() => {
    if (isPollingRef.current || !isMountedRef.current) {
      console.log('StatusMonitor: Already polling or component unmounted, skipping start');
      return;
    }

    console.log(`StatusMonitor: Starting polling with ${pollInterval}ms interval (first poll will wait ${pollInterval}ms)`);
    
    // Reset refs
    currentStatusRef.current = 'active';
    pollCountRef.current = 0;
    
    // Update state
    if (isMountedRef.current) {
      setIsPolling(true);
      setError(null);
      setPollCount(0);
      setCurrentStatus('active');
      setTimeRemaining(timeoutMinutes * 60);
    }
    
    isPollingRef.current = true;
    startTimeRef.current = new Date();

    // DO NOT call pollStatus() immediately - wait for the first interval
    console.log('StatusMonitor: Waiting for first poll interval...');

    // Set up polling interval - this will handle all polling including the first one
    pollIntervalRef.current = setInterval(() => {
      if (isPollingRef.current && isMountedRef.current && pollStatusRef.current) {
        console.log(`StatusMonitor: Interval triggered at ${new Date().toLocaleTimeString()}`);
        pollStatusRef.current();
      } else {
        console.log('StatusMonitor: Interval callback - stopping due to unmount or polling stopped');
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      }
    }, pollInterval);

    // Set up timeout
    timeoutRef.current = setTimeout(() => {
      console.log('StatusMonitor: Timeout reached, stopping polling');
      if (isMountedRef.current) {
        setIsPolling(false);
      }
      isPollingRef.current = false;
      cleanup();
      if (onTimeout) {
        onTimeout();
      }
    }, timeoutMinutes * 60 * 1000);

    // Set up countdown timer
    countdownRef.current = setInterval(() => {
      if (!isMountedRef.current) return;
      
      const elapsed = Math.floor((new Date().getTime() - startTimeRef.current.getTime()) / 1000);
      const remaining = Math.max(0, timeoutMinutes * 60 - elapsed);
      setTimeRemaining(remaining);

      if (remaining === 0 && isMountedRef.current) {
        console.log('StatusMonitor: Countdown reached zero, stopping polling');
        setIsPolling(false);
        isPollingRef.current = false;
        cleanup();
        if (onTimeout) {
          onTimeout();
        }
      }
    }, 1000);
  }, [pollInterval, timeoutMinutes, onTimeout]);

  // Stop polling
  const stopPolling = useCallback(() => {
    console.log('StatusMonitor: Manually stopping polling');
    setIsPolling(false);
    isPollingRef.current = false;
    cleanup();
  }, [cleanup]);

  // Auto-start polling when component mounts
  useEffect(() => {
    console.log('StatusMonitor: Component mounted, starting polling');
    isMountedRef.current = true;
    startPolling();
    
    return () => {
      console.log('StatusMonitor: Component unmounting, cleaning up');
      isMountedRef.current = false;
      cleanup();
    };
  }, [startPolling]);

  // Restart polling if proofRequestId changes
  useEffect(() => {
    if (proofRequestId && isMountedRef.current) {
      console.log(`StatusMonitor: ProofRequestId changed to ${proofRequestId}, restarting polling`);
      cleanup();
      
      // Reset refs and state
      currentStatusRef.current = 'active';
      pollCountRef.current = 0;
      
      if (isMountedRef.current) {
        setCurrentStatus('active');
        setError(null);
        setPollCount(0);
      }
      
      // Small delay to ensure cleanup is complete before restarting
      setTimeout(() => {
        if (isMountedRef.current) {
          startPolling();
        }
      }, 100);
    }
  }, [proofRequestId]);

  // Format time remaining
  const formatTimeRemaining = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Get status color
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'active':
        return 'text-green-600';
      case 'completed':
        return 'text-blue-600';
      case 'expired':
        return 'text-red-600';
      case 'failed':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string): string => {
    switch (status) {
      case 'active':
        return '🔄';
      case 'completed':
        return '✅';
      case 'expired':
        return '⏰';
      case 'failed':
        return '❌';
      default:
        return '❓';
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Status Monitor</h3>
        <div className="flex items-center space-x-2">
          {isPolling && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          )}
          <button
            onClick={() => {
              console.log('StatusMonitor: Manual poll triggered at', new Date().toLocaleTimeString());
              if (pollStatusRef.current) {
                pollStatusRef.current();
              }
            }}
            className="px-3 py-1 text-sm rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200"
          >
            Poll Now
          </button>
          <button
            onClick={isPolling ? stopPolling : startPolling}
            className={`px-3 py-1 text-sm rounded-md ${
              isPolling
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            {isPolling ? 'Stop' : 'Start'} Monitoring
          </button>
        </div>
      </div>

      {/* Current Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">{getStatusIcon(currentStatus)}</span>
            <div>
              <p className="text-sm font-medium text-gray-700">Current Status</p>
              <p className={`text-lg font-semibold ${getStatusColor(currentStatus)}`}>
                {currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">⏱️</span>
            <div>
              <p className="text-sm font-medium text-gray-700">Time Remaining</p>
              <p className={`text-lg font-semibold ${
                timeRemaining < 300 ? 'text-red-600' : 'text-gray-900'
              }`}>
                {formatTimeRemaining(timeRemaining)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">🔄</span>
            <div>
              <p className="text-sm font-medium text-gray-700">Last Update</p>
              <p className="text-lg font-semibold text-gray-900">
                {lastUpdate ? lastUpdate.toLocaleTimeString() : 'Never'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Indicators */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Progress</span>
          <span className="text-sm text-gray-500">
            {isPolling ? 'Monitoring...' : 'Stopped'}
          </span>
        </div>
        
        {/* Progress Steps */}
        <div className="flex items-center space-x-4">
          <div className={`flex items-center space-x-2 ${
            ['active', 'completed', 'expired', 'failed'].includes(currentStatus) 
              ? 'text-green-600' : 'text-gray-400'
          }`}>
            <div className={`w-3 h-3 rounded-full ${
              ['active', 'completed', 'expired', 'failed'].includes(currentStatus)
                ? 'bg-green-600' : 'bg-gray-300'
            }`}></div>
            <span className="text-sm">Request Created</span>
          </div>
          
          <div className="flex-1 h-0.5 bg-gray-300">
            <div className={`h-full transition-all duration-500 ${
              currentStatus === 'active' ? 'bg-yellow-500 w-1/2' :
              ['completed', 'expired', 'failed'].includes(currentStatus) ? 'bg-green-600 w-full' :
              'bg-gray-300 w-0'
            }`}></div>
          </div>
          
          <div className={`flex items-center space-x-2 ${
            currentStatus === 'active' ? 'text-yellow-600' :
            ['completed', 'expired', 'failed'].includes(currentStatus) ? 'text-green-600' : 'text-gray-400'
          }`}>
            <div className={`w-3 h-3 rounded-full ${
              currentStatus === 'active' ? 'bg-yellow-500 animate-pulse' :
              ['completed', 'expired', 'failed'].includes(currentStatus) ? 'bg-green-600' : 'bg-gray-300'
            }`}></div>
            <span className="text-sm">Waiting for Presentation</span>
          </div>
          
          <div className="flex-1 h-0.5 bg-gray-300">
            <div className={`h-full transition-all duration-500 ${
              currentStatus === 'completed' ? 'bg-green-600 w-full' : 'bg-gray-300 w-0'
            }`}></div>
          </div>
          
          <div className={`flex items-center space-x-2 ${
            currentStatus === 'completed' ? 'text-green-600' : 'text-gray-400'
          }`}>
            <div className={`w-3 h-3 rounded-full ${
              currentStatus === 'completed' ? 'bg-green-600' : 'bg-gray-300'
            }`}></div>
            <span className="text-sm">Presentation Received</span>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div className="flex items-center space-x-2">
            <span className="text-red-600">⚠️</span>
            <div>
              <p className="text-sm font-medium text-red-800">Monitoring Error</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
          <button
            onClick={() => {
              setError(null);
              if (!isPolling) {
                startPolling();
              }
            }}
            className="mt-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">What's happening?</h4>
        <div className="text-sm text-blue-800 space-y-1">
          {currentStatus === 'active' && (
            <>
              <p>• Waiting for a credential holder to scan the QR code</p>
              <p>• The system is checking for presentations every {pollInterval / 1000} seconds</p>
              <p>• Poll count: {pollCount}</p>
              <p>• This request will expire in {formatTimeRemaining(timeRemaining)}</p>
            </>
          )}
          {currentStatus === 'completed' && (
            <>
              <p>• ✅ A credential presentation has been received!</p>
              <p>• The verification process will begin shortly</p>
            </>
          )}
          {currentStatus === 'expired' && (
            <>
              <p>• ⏰ This proof request has expired</p>
              <p>• You can create a new proof request to try again</p>
            </>
          )}
          {currentStatus === 'failed' && (
            <>
              <p>• ❌ The proof request has failed</p>
              <p>• Please check the error details and try again</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatusMonitor;