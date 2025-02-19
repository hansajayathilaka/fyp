"use client";

import type React from "react";

interface LoadingSpinnerProps {
  size?: number;
  color?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 40,
}) => {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="loading-spinner" style={{ width: size, height: size }}>
        <style jsx>{`
          .loading-spinner {
            border: 4px solid rgba(0, 0, 0, 0.1);
            border-left-color: #25aef3;
            border-radius: 50%;
            animation: spin 1s linear infinite, fadeIn 0.5s ease-in;
          }

          @keyframes spin {
            0% {
              transform: rotate(0deg);
            }
            100% {
              transform: rotate(360deg);
            }
          }

          @keyframes fadeIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }
        `}</style>
      </div>
    </div>
  );
};

export default LoadingSpinner;
