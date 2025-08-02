import React from 'react';
import { useParams } from 'react-router-dom';

export const TestPage: React.FC = () => {
  const { proofRequestId } = useParams<{ proofRequestId: string }>();
  
  console.log('TestPage: Rendering with proofRequestId:', proofRequestId);
  
  return (
    <div className="min-h-screen bg-blue-50 flex items-center justify-center">
      <div className="text-center p-8 bg-white rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-blue-900 mb-4">Test Page Working!</h1>
        <p className="text-blue-700 mb-2">
          <strong>Proof Request ID:</strong> {proofRequestId || 'Not provided'}
        </p>
        <p className="text-blue-700 mb-2">
          <strong>Current URL:</strong> {window.location.pathname}
        </p>
        <p className="text-blue-700">
          <strong>Full URL:</strong> {window.location.href}
        </p>
        <div className="mt-4 p-4 bg-blue-100 rounded">
          <p className="text-sm text-blue-800">
            If you can see this, React Router is working correctly.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TestPage;