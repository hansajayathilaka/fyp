import React, { useState, useEffect } from 'react';
import { ProofRequest } from '../types';

interface StatusDebuggerProps {
  proofRequest: ProofRequest | null;
  className?: string;
}

interface StatusLog {
  timestamp: string;
  status: string;
  message: string;
}

export const StatusDebugger: React.FC<StatusDebuggerProps> = ({
  proofRequest,
  className = '',
}) => {
  const [statusLogs, setStatusLogs] = useState<StatusLog[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  // Log status changes
  useEffect(() => {
    if (proofRequest) {
      const newLog: StatusLog = {
        timestamp: new Date().toLocaleTimeString(),
        status: proofRequest.status,
        message: `Status updated to: ${proofRequest.status}`,
      };
      
      setStatusLogs(prev => [...prev, newLog].slice(-10)); // Keep last 10 logs
      console.log('StatusDebugger: Status change logged', newLog);
    }
  }, [proofRequest?.status]);

  // Add initial log when component mounts
  useEffect(() => {
    const initialLog: StatusLog = {
      timestamp: new Date().toLocaleTimeString(),
      status: 'initialized',
      message: 'StatusDebugger component mounted',
    };
    setStatusLogs([initialLog]);
  }, []);

  if (!isVisible) {
    return (
      <div className={`fixed bottom-4 right-4 ${className}`}>
        <button
          onClick={() => setIsVisible(true)}
          className="bg-blue-600 text-white px-3 py-2 rounded-lg shadow-lg hover:bg-blue-700 text-sm"
        >
          🐛 Debug Status
        </button>
      </div>
    );
  }

  return (
    <div className={`fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-md ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-gray-900 text-sm">Status Debugger</h4>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-500 hover:text-gray-700 text-lg leading-none"
        >
          ×
        </button>
      </div>

      {/* Current Status */}
      <div className="mb-3 p-2 bg-gray-50 rounded text-sm">
        <div className="font-medium text-gray-700">Current Status:</div>
        <div className={`font-semibold ${
          proofRequest?.status === 'completed' ? 'text-green-600' :
          proofRequest?.status === 'active' ? 'text-blue-600' :
          proofRequest?.status === 'expired' ? 'text-red-600' :
          proofRequest?.status === 'failed' ? 'text-red-600' :
          'text-gray-600'
        }`}>
          {proofRequest?.status || 'No status'}
        </div>
        {proofRequest && (
          <div className="text-xs text-gray-500 mt-1">
            ID: {proofRequest.id}
          </div>
        )}
      </div>

      {/* Status Logs */}
      <div className="mb-3">
        <div className="font-medium text-gray-700 text-sm mb-2">Recent Status Changes:</div>
        <div className="max-h-32 overflow-y-auto space-y-1">
          {statusLogs.map((log, index) => (
            <div key={index} className="text-xs p-2 bg-gray-50 rounded">
              <div className="flex justify-between items-start">
                <span className="font-mono text-gray-600">{log.timestamp}</span>
                <span className={`font-semibold ml-2 ${
                  log.status === 'completed' ? 'text-green-600' :
                  log.status === 'active' ? 'text-blue-600' :
                  log.status === 'expired' ? 'text-red-600' :
                  log.status === 'failed' ? 'text-red-600' :
                  'text-gray-600'
                }`}>
                  {log.status}
                </span>
              </div>
              <div className="text-gray-700 mt-1">{log.message}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex space-x-2">
        <button
          onClick={() => setStatusLogs([])}
          className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200"
        >
          Clear Logs
        </button>
        <button
          onClick={() => {
            const debugInfo = {
              proofRequest,
              statusLogs,
              timestamp: new Date().toISOString(),
            };
            console.log('StatusDebugger: Debug info', debugInfo);
            navigator.clipboard?.writeText(JSON.stringify(debugInfo, null, 2));
          }}
          className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
        >
          Copy Debug Info
        </button>
      </div>

      {/* Instructions */}
      <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
        <div className="font-medium text-yellow-800 mb-1">Debug Tips:</div>
        <ul className="text-yellow-700 space-y-1">
          <li>• Watch for status changes in real-time</li>
          <li>• Check browser console for detailed logs</li>
          <li>• Status should change from 'active' to 'completed'</li>
          <li>• Navigation should happen 1 second after 'completed'</li>
        </ul>
      </div>
    </div>
  );
};

export default StatusDebugger;