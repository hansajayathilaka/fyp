import React, { useState, useEffect, useRef } from 'react';

interface CountdownTimerProps {
  expiresAt: string;
  onExpired?: () => void;
  className?: string;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  expiresAt,
  onExpired,
  className = '',
}) => {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef<boolean>(true);

  // Calculate remaining time from expiresAt
  const calculateRemainingTime = (): number => {
    const expirationTime = new Date(expiresAt);
    const now = new Date();
    const remainingMs = expirationTime.getTime() - now.getTime();
    const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));
    
    // Log detailed calculation (only occasionally to avoid spam)
    if (remainingSeconds % 10 === 0 || remainingSeconds < 10) {
      console.log(`CountdownTimer: Time calculation details:`);
      console.log(`  - Expires at: ${expirationTime.toISOString()}`);
      console.log(`  - Current time: ${now.toISOString()}`);
      console.log(`  - Remaining MS: ${remainingMs}`);
      console.log(`  - Remaining seconds: ${remainingSeconds}`);
    }
    
    return remainingSeconds;
  };

  // Format time for display
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Update timer
  useEffect(() => {
    if (!expiresAt) {
      console.log('CountdownTimer: No expiresAt provided');
      return;
    }

    // Clear any existing interval
    if (intervalRef.current) {
      console.log('CountdownTimer: Clearing existing interval');
      clearInterval(intervalRef.current);
    }

    // Calculate initial time
    const initialTime = calculateRemainingTime();
    console.log(`CountdownTimer: Starting timer setup`);
    console.log(`  - expiresAt: ${expiresAt}`);
    console.log(`  - Initial time: ${initialTime} seconds`);
    console.log(`  - Formatted: ${formatTime(initialTime)}`);
    setTimeRemaining(initialTime);

    // Set up countdown interval
    console.log('CountdownTimer: Setting up 1-second interval');
    intervalRef.current = setInterval(() => {
      if (!isMountedRef.current) {
        console.log('CountdownTimer: Component unmounted, skipping update');
        return;
      }

      const remaining = calculateRemainingTime();
      const formatted = formatTime(remaining);
      console.log(`CountdownTimer: Second tick - ${remaining}s remaining (${formatted})`);
      
      setTimeRemaining(prevTime => {
        console.log(`  - Previous: ${prevTime}s, New: ${remaining}s`);
        return remaining;
      });

      // Check if expired
      if (remaining === 0 && onExpired) {
        console.log('CountdownTimer: Timer expired, calling onExpired');
        onExpired();
      }
    }, 1000);

    console.log('CountdownTimer: Interval set up complete');

    return () => {
      console.log('CountdownTimer: Cleanup - clearing interval');
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [expiresAt]);

  // Cleanup on unmount
  useEffect(() => {
    console.log('CountdownTimer: Component mounted');
    isMountedRef.current = true;
    
    return () => {
      console.log('CountdownTimer: Component unmounting');
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return (
    <div className={className}>
      <p className={`text-xl font-bold ${
        timeRemaining < 300 ? 'text-red-600' : 'text-gray-900'
      }`}>
        {formatTime(timeRemaining)}
      </p>
    </div>
  );
};

export default CountdownTimer;