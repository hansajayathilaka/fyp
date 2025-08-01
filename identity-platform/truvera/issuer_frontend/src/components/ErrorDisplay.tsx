import { useState } from 'react';
import { EnhancedError, ErrorSeverity } from '../utils/errorHandling';

interface ErrorDisplayProps {
  error: EnhancedError;
  onDismiss?: () => void;
  showDetails?: boolean;
  className?: string;
}

export default function ErrorDisplay({ 
  error, 
  onDismiss, 
  showDetails = false,
  className = '' 
}: ErrorDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);

  // Get appropriate styling based on error severity
  const getSeverityStyles = () => {
    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        return {
          container: 'bg-red-50 border-red-200',
          icon: 'text-red-600',
          title: 'text-red-800',
          text: 'text-red-700',
          button: 'bg-red-600 hover:bg-red-700'
        };
      case ErrorSeverity.HIGH:
        return {
          container: 'bg-orange-50 border-orange-200',
          icon: 'text-orange-600',
          title: 'text-orange-800',
          text: 'text-orange-700',
          button: 'bg-orange-600 hover:bg-orange-700'
        };
      case ErrorSeverity.MEDIUM:
        return {
          container: 'bg-yellow-50 border-yellow-200',
          icon: 'text-yellow-600',
          title: 'text-yellow-800',
          text: 'text-yellow-700',
          button: 'bg-yellow-600 hover:bg-yellow-700'
        };
      default:
        return {
          container: 'bg-blue-50 border-blue-200',
          icon: 'text-blue-600',
          title: 'text-blue-800',
          text: 'text-blue-700',
          button: 'bg-blue-600 hover:bg-blue-700'
        };
    }
  };

  const styles = getSeverityStyles();

  // Get appropriate icon based on error severity
  const getErrorIcon = () => {
    if (error.severity === ErrorSeverity.CRITICAL || error.severity === ErrorSeverity.HIGH) {
      return (
        <svg className={`w-5 h-5 ${styles.icon}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      );
    }
    
    return (
      <svg className={`w-5 h-5 ${styles.icon}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  };

  return (
    <div className={`border rounded-lg p-4 ${styles.container} ${className}`}>
      <div className="flex">
        <div className="flex-shrink-0">
          {getErrorIcon()}
        </div>
        
        <div className="ml-3 flex-1">
          {/* Error title and message */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className={`text-sm font-medium ${styles.title}`}>
                {error.severity === ErrorSeverity.CRITICAL ? 'Critical Error' :
                 error.severity === ErrorSeverity.HIGH ? 'Error' :
                 error.severity === ErrorSeverity.MEDIUM ? 'Warning' : 'Notice'}
              </h3>
              <div className={`mt-2 text-sm ${styles.text}`}>
                <p>{error.userMessage}</p>
              </div>
            </div>
            
            {/* Dismiss button */}
            {onDismiss && (
              <div className="ml-4">
                <button
                  type="button"
                  onClick={onDismiss}
                  className={`inline-flex rounded-md p-1.5 ${styles.text} hover:bg-opacity-20 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent focus:ring-gray-600`}
                >
                  <span className="sr-only">Dismiss</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* Recovery options */}
          {error.recoveryOptions.length > 0 && (
            <div className="mt-4">
              <div className="flex flex-wrap gap-2">
                {error.recoveryOptions.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => option.action()}
                    className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-white transition-colors ${
                      option.primary ? styles.button : 'bg-gray-600 hover:bg-gray-700'
                    }`}
                    title={option.description}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Expandable details */}
          {(showDetails || error.troubleshooting.length > 0) && (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className={`text-sm font-medium ${styles.text} hover:underline focus:outline-none`}
              >
                {isExpanded ? 'Hide Details' : 'Show Details'}
                <svg 
                  className={`ml-1 w-4 h-4 inline-block transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {isExpanded && (
                <div className="mt-3 space-y-3">
                  {/* Error details */}
                  {showDetails && (
                    <div className={`p-3 bg-white bg-opacity-50 rounded border ${styles.text}`}>
                      <h4 className="text-xs font-medium mb-2">Technical Details</h4>
                      <div className="text-xs space-y-1">
                        <div><strong>Code:</strong> {error.code || 'N/A'}</div>
                        <div><strong>Category:</strong> {error.category}</div>
                        <div><strong>Severity:</strong> {error.severity}</div>
                        <div><strong>Time:</strong> {error.timestamp.toLocaleString()}</div>
                        {error.details ? (
                          <div>
                            <strong>Details:</strong>
                            <pre className="mt-1 text-xs whitespace-pre-wrap">
                              {typeof error.details === 'string' ? error.details : JSON.stringify(error.details, null, 2)}
                            </pre>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  )}
                  
                  {/* Troubleshooting steps */}
                  {error.troubleshooting.length > 0 && (
                    <div>
                      <button
                        type="button"
                        onClick={() => setShowTroubleshooting(!showTroubleshooting)}
                        className={`text-sm font-medium ${styles.text} hover:underline focus:outline-none flex items-center`}
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Troubleshooting Steps
                        <svg 
                          className={`ml-1 w-4 h-4 transition-transform ${showTroubleshooting ? 'rotate-180' : ''}`} 
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      
                      {showTroubleshooting && (
                        <div className="mt-2">
                          <ol className={`text-sm ${styles.text} space-y-1 list-decimal list-inside`}>
                            {error.troubleshooting.map((step, index) => (
                              <li key={index}>{step}</li>
                            ))}
                          </ol>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}