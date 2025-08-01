import { useState, useEffect, useCallback, useRef } from 'react';
import { getCredentialStatus } from '../utils';
import { useRenderTracker } from '../utils/renderTracker';

interface StatusMonitorProps {
  sessionId: string;
  onComplete: (success: boolean) => void;
  pollInterval?: number;
  onConnectionEstablished?: (holderDID: string) => void;
}

type CredentialStatus = 'pending' | 'issued' | 'failed';
type DeliveryStatus = 'sent' | 'delivered' | 'failed';

interface StatusData {
  status: CredentialStatus;
  deliveryStatus: DeliveryStatus;
  message: string;
}

export default function StatusMonitor({ 
  sessionId, 
  onComplete, 
  pollInterval = 5000, // 5 seconds as requested
  onConnectionEstablished
}: StatusMonitorProps) {
  // Only track renders in development
  if (process.env.NODE_ENV === 'development') {
    useRenderTracker('StatusMonitor');
  }
  
  const [statusData, setStatusData] = useState<StatusData>({
    status: 'pending',
    deliveryStatus: 'sent',
    message: 'Initializing credential issuance...'
  });
  const [isPolling, setIsPolling] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pollCount, setPollCount] = useState(0);
  const [startTime] = useState(new Date());
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [nextAllowedPoll, setNextAllowedPoll] = useState<number>(0);

  // Use refs to store current values for polling function
  const isPollingRef = useRef(isPolling);
  const pollCountRef = useRef(pollCount);
  
  // Update refs when state changes
  useEffect(() => {
    isPollingRef.current = isPolling;
  }, [isPolling]);
  
  useEffect(() => {
    pollCountRef.current = pollCount;
  }, [pollCount]);

  // Calculate elapsed time
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime(Math.floor((new Date().getTime() - startTime.getTime()) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [startTime]);

  // Format elapsed time
  const formatElapsedTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Poll for status updates with intelligent rate limiting handling
  const pollStatus = useCallback(async () => {
    if (!sessionId || !isPollingRef.current) return;

    try {
      setError(null);
      setIsRateLimited(false);
      
      const result = await getCredentialStatus(sessionId);
      
      if (result.success && result.status && result.deliveryStatus) {
        const newStatusData: StatusData = {
          status: result.status,
          deliveryStatus: result.deliveryStatus,
          message: result.message
        };
        
        setStatusData(newStatusData);
        setPollCount(prev => prev + 1);

        // Check if operation is complete
        if (result.status === 'issued' && result.deliveryStatus === 'delivered') {
          // Credential has been successfully delivered to the wallet
          setIsPolling(false);
          
          // Notify about connection establishment if callback provided
          if (onConnectionEstablished && result.holderDID) {
            onConnectionEstablished(result.holderDID);
          }
          
          onComplete(true);
        } else if (result.status === 'failed' || result.deliveryStatus === 'failed') {
          // Credential issuance or delivery failed
          setIsPolling(false);
          onComplete(false);
        } else if (result.status === 'issued' && result.deliveryStatus === 'sent') {
          // Credential is ready and QR code is available - this is normal, keep polling
          // The credential will be marked as 'delivered' once the user scans and accepts it
          console.log('Credential is ready for scanning, continuing to monitor...');
        }
      }
    } catch (error) {
      // Handle rate limiting gracefully without logging errors
      if (error instanceof Error && (error.message.includes('rate limit') || error.message.includes('429'))) {
        setIsRateLimited(true);
        
        // Extract remaining time from error message if available
        const timeMatch = error.message.match(/(\d+)\s+more\s+seconds?/);
        const waitTime = timeMatch ? parseInt(timeMatch[1]) : 10; // Default to 10 seconds
        
        // Set next allowed poll time
        setNextAllowedPoll(Date.now() + (waitTime + 1) * 1000); // Add 1 second buffer
        
        setError(`Rate limited. Waiting ${waitTime + 1} seconds before next check...`);
        
        // Don't log rate limiting errors or increment failure count
        return;
      }
      
      // Only log actual errors, not rate limiting
      console.error('Failed to poll credential status:', error);
      setIsRateLimited(false);
      setError('Failed to check credential status. Retrying...');
      
      // Stop polling after too many failures (increased threshold since we're polling every 5 seconds)
      if (pollCountRef.current > 60) { // 5 minutes of polling
        setIsPolling(false);
        setError('Status monitoring timed out. Please check your credential manually.');
        onComplete(false);
      }
    }
  }, [sessionId, onComplete, onConnectionEstablished]);

  // Set up polling with rate limit awareness
  useEffect(() => {
    if (!isPolling || !sessionId) return;

    // Initial poll
    pollStatus();
    
    // Set up interval polling
    const interval = setInterval(() => {
      // Check rate limiting before polling
      const now = Date.now();
      if (now >= nextAllowedPoll && !isRateLimited) {
        pollStatus();
      }
    }, pollInterval);
    
    return () => clearInterval(interval);
  }, [isPolling, sessionId, pollInterval, pollStatus, nextAllowedPoll, isRateLimited]);

  // Get progress percentage based on status
  const getProgressPercentage = (): number => {
    if (statusData.status === 'failed') return 0;
    if (statusData.status === 'pending') return 33;
    if (statusData.status === 'issued' && statusData.deliveryStatus === 'sent') return 66;
    if (statusData.status === 'issued' && statusData.deliveryStatus === 'delivered') return 100;
    return 0;
  };

  // Get status color
  const getStatusColor = (): string => {
    if (statusData.status === 'failed' || statusData.deliveryStatus === 'failed') return 'red';
    if (statusData.status === 'issued' && statusData.deliveryStatus === 'delivered') return 'green';
    return 'blue';
  };

  // Get next steps based on current status
  const getNextSteps = (): string[] => {
    if (statusData.status === 'failed' || statusData.deliveryStatus === 'failed') {
      return [
        'Check your internet connection',
        'Try generating a new credential offer',
        'Contact support if the problem persists'
      ];
    }
    
    if (statusData.status === 'issued' && statusData.deliveryStatus === 'delivered') {
      return [
        'Check your Dock wallet for the new credential',
        'Verify the credential details are correct',
        'You can now use this credential for authentication'
      ];
    }
    
    if (statusData.status === 'issued' && statusData.deliveryStatus === 'sent') {
      return [
        'Open your Dock wallet app',
        'Check for new credential notifications',
        'Accept the credential to store it in your wallet'
      ];
    }
    
    // Default for pending status
    return [
      'Keep your Dock wallet app open',
      'Ensure you have a stable internet connection',
      'Wait for the credential offer to appear'
    ];
  };

  const progressPercentage = getProgressPercentage();
  const statusColor = getStatusColor();
  const nextSteps = getNextSteps();

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Credential Status Monitor
        </h3>
        <p className="text-sm text-gray-600">
          Elapsed time: {formatElapsedTime(elapsedTime)} | Checks: {pollCount}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Progress</span>
          <span>{progressPercentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${
              statusColor === 'green' ? 'bg-green-500' :
              statusColor === 'red' ? 'bg-red-500' : 'bg-blue-500'
            }`}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Status Display */}
      <div className="mb-6">
        <div className={`p-4 rounded-lg border ${
          statusColor === 'green' ? 'bg-green-50 border-green-200' :
          statusColor === 'red' ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'
        }`}>
          <div className="flex items-center mb-2">
            {statusColor === 'green' ? (
              <svg className="w-5 h-5 text-green-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : statusColor === 'red' ? (
              <svg className="w-5 h-5 text-red-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            ) : (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-2"></div>
            )}
            <span className={`font-medium ${
              statusColor === 'green' ? 'text-green-800' :
              statusColor === 'red' ? 'text-red-800' : 'text-blue-800'
            }`}>
              {statusData.status === 'issued' && statusData.deliveryStatus === 'delivered' ? 'Completed Successfully' :
               statusData.status === 'failed' || statusData.deliveryStatus === 'failed' ? 'Operation Failed' :
               statusData.status === 'issued' ? 'Credential Issued' : 'Processing...'}
            </span>
          </div>
          <p className={`text-sm ${
            statusColor === 'green' ? 'text-green-700' :
            statusColor === 'red' ? 'text-red-700' : 'text-blue-700'
          }`}>
            {statusData.message}
          </p>
        </div>
      </div>

      {/* Detailed Status Information */}
      <div className="mb-6">
        <h4 className="font-medium text-gray-900 mb-3">Operation Details</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-sm font-medium text-gray-500 mb-1">Credential Status</div>
            <div className={`font-semibold ${
              statusData.status === 'issued' ? 'text-green-600' :
              statusData.status === 'failed' ? 'text-red-600' : 'text-blue-600'
            }`}>
              {statusData.status.charAt(0).toUpperCase() + statusData.status.slice(1)}
            </div>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-sm font-medium text-gray-500 mb-1">Delivery Status</div>
            <div className={`font-semibold ${
              statusData.deliveryStatus === 'delivered' ? 'text-green-600' :
              statusData.deliveryStatus === 'failed' ? 'text-red-600' : 'text-blue-600'
            }`}>
              {statusData.deliveryStatus.charAt(0).toUpperCase() + statusData.deliveryStatus.slice(1)}
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="text-sm text-red-800">{error}</span>
          </div>
        </div>
      )}

      {/* Next Steps */}
      <div className="mb-6">
        <h4 className="font-medium text-gray-900 mb-3 flex items-center">
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Next Steps
        </h4>
        <ul className="space-y-2">
          {nextSteps.map((step, index) => (
            <li key={index} className="flex items-start">
              <span className="flex-shrink-0 w-5 h-5 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-medium mr-3 mt-0.5">
                {index + 1}
              </span>
              <span className="text-sm text-gray-700">{step}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-3">
        {isPolling ? (
          <button
            onClick={() => setIsPolling(false)}
            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            Stop Monitoring
          </button>
        ) : (
          <button
            onClick={() => {
              setIsPolling(true);
              setError(null);
              setPollCount(0);
            }}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            Resume Monitoring
          </button>
        )}
        
        <button
          onClick={() => pollStatus()}
          disabled={!sessionId}
          className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition-colors"
        >
          Check Now
        </button>
      </div>

      {/* Polling Status */}
      {isPolling && (
        <div className="mt-4 text-center">
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
            <div className={`w-2 h-2 rounded-full ${
              isRateLimited ? 'bg-yellow-500 animate-pulse' : 'bg-blue-600 animate-pulse'
            }`}></div>
            <span>
              {isRateLimited 
                ? 'Rate limited - waiting before next check...' 
                : `Monitoring status... (checking every ${pollInterval / 1000}s)`
              }
            </span>
          </div>
        </div>
      )}
    </div>
  );
}