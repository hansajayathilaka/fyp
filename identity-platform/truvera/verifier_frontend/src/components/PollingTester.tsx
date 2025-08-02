import React, { useState, useEffect, useRef } from 'react';

interface PollingTesterProps {
  className?: string;
}

interface PollLog {
  timestamp: string;
  intervalSinceLastPoll: number;
  message: string;
}

export const PollingTester: React.FC<PollingTesterProps> = ({
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [pollLogs, setPollLogs] = useState<PollLog[]>([]);
  const [isTestRunning, setIsTestRunning] = useState(false);
  const lastPollTimeRef = useRef<number | null>(null);
  const testIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollCountRef = useRef<number>(0);

  const addPollLog = (message: string) => {
    const now = Date.now();
    const timestamp = new Date().toLocaleTimeString();
    const intervalSinceLastPoll = lastPollTimeRef.current 
      ? now - lastPollTimeRef.current 
      : 0;
    
    const log: PollLog = {
      timestamp,
      intervalSinceLastPoll,
      message,
    };
    
    setPollLogs(prev => [...prev.slice(-9), log]); // Keep last 10 logs
    lastPollTimeRef.current = now;
  };

  const startPollingTest = () => {
    if (isTestRunning) return;
    
    console.log('PollingTester: Starting 5-second polling test');
    setIsTestRunning(true);
    setPollLogs([]);
    pollCountRef.current = 0;
    lastPollTimeRef.current = null;
    
    addPollLog('Test started - waiting for first poll...');
    
    // Set up 5-second interval (same as StatusMonitor)
    testIntervalRef.current = setInterval(() => {
      pollCountRef.current += 1;
      addPollLog(`Poll #${pollCountRef.current} executed`);
      console.log(`PollingTester: Poll #${pollCountRef.current} at ${new Date().toLocaleTimeString()}`);
    }, 5000);
  };

  const stopPollingTest = () => {
    if (!isTestRunning) return;
    
    console.log('PollingTester: Stopping polling test');
    setIsTestRunning(false);
    
    if (testIntervalRef.current) {
      clearInterval(testIntervalRef.current);
      testIntervalRef.current = null;
    }
    
    addPollLog('Test stopped');
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (testIntervalRef.current) {
        clearInterval(testIntervalRef.current);
      }
    };
  }, []);

  if (!isVisible) {
    return (
      <div className={`fixed bottom-32 right-4 ${className}`}>
        <button
          onClick={() => setIsVisible(true)}
          className="bg-orange-600 text-white px-3 py-2 rounded-lg shadow-lg hover:bg-orange-700 text-sm"
        >
          ⏱️ Test Polling
        </button>
      </div>
    );
  }

  return (
    <div className={`fixed bottom-32 right-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-md ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-gray-900 text-sm">Polling Interval Tester</h4>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-500 hover:text-gray-700 text-lg leading-none"
        >
          ×
        </button>
      </div>

      {/* Test Controls */}
      <div className="mb-3 flex space-x-2">
        <button
          onClick={isTestRunning ? stopPollingTest : startPollingTest}
          className={`flex-1 px-3 py-2 text-sm rounded-md ${
            isTestRunning
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-orange-600 text-white hover:bg-orange-700'
          }`}
        >
          {isTestRunning ? 'Stop Test' : 'Start 5s Polling Test'}
        </button>
        <button
          onClick={() => setPollLogs([])}
          className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
        >
          Clear
        </button>
      </div>

      {/* Status */}
      <div className="mb-3 p-2 bg-gray-50 rounded text-sm">
        <div className="flex justify-between">
          <span className="font-medium text-gray-700">Status:</span>
          <span className={`font-semibold ${isTestRunning ? 'text-green-600' : 'text-gray-600'}`}>
            {isTestRunning ? 'Running' : 'Stopped'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="font-medium text-gray-700">Poll Count:</span>
          <span className="font-semibold text-gray-900">{pollCountRef.current}</span>
        </div>
      </div>

      {/* Poll Logs */}
      <div className="mb-3">
        <div className="font-medium text-gray-700 text-sm mb-2">Poll Timing Log:</div>
        <div className="max-h-40 overflow-y-auto space-y-1">
          {pollLogs.map((log, index) => (
            <div key={index} className="text-xs p-2 bg-gray-50 rounded">
              <div className="flex justify-between items-start">
                <span className="font-mono text-gray-600">{log.timestamp}</span>
                {log.intervalSinceLastPoll > 0 && (
                  <span className={`text-xs font-semibold ml-2 ${
                    Math.abs(log.intervalSinceLastPoll - 5000) < 100 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {(log.intervalSinceLastPoll / 1000).toFixed(1)}s
                  </span>
                )}
              </div>
              <div className="text-gray-700 mt-1">{log.message}</div>
            </div>
          ))}
          {pollLogs.length === 0 && (
            <div className="text-xs text-gray-500 italic p-2">
              No polls yet. Start the test to see timing logs.
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="p-2 bg-orange-50 border border-orange-200 rounded text-xs">
        <div className="font-medium text-orange-800 mb-1">How it works:</div>
        <ul className="text-orange-700 space-y-1">
          <li>• Tests the exact same 5-second interval as StatusMonitor</li>
          <li>• Green timing = within 100ms of 5 seconds (good)</li>
          <li>• Red timing = more than 100ms off (potential issue)</li>
          <li>• First poll waits 5 seconds (no immediate poll)</li>
        </ul>
      </div>
    </div>
  );
};

export default PollingTester;