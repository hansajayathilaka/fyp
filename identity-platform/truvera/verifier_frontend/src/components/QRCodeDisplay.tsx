import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { ProofRequest } from '../types';

interface QRCodeDisplayProps {
  proofRequest: ProofRequest;
  onRefresh?: () => void;
  className?: string;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  proofRequest,
  className = '',
}) => {
  const [qrCodeImage, setQrCodeImage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    generateQRCode();
  }, [proofRequest.qr]);

  const generateQRCode = async () => {
    if (!proofRequest.qr) {
      setError('No QR URL provided');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('Generating QR code for URL:', proofRequest.qr);
      
      const qrDataURL = await QRCode.toDataURL(proofRequest.qr, {
        width: 512,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'H'
      });

      setQrCodeImage(qrDataURL);
      console.log('QR code generated successfully');
    } catch (err) {
      console.error('QR generation error:', err);
      setError('Failed to generate QR code');
    } finally {
      setLoading(false);
    }
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(proofRequest.qr);
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg p-8 ${className}`}>
      {/* Title */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-3">
          Scan QR Code
        </h2>
        <p className="text-lg text-gray-700">
          Use your mobile wallet to scan this code and present your credentials
        </p>
      </div>

      {/* QR Code Area */}
      <div className="flex justify-center mb-8">
        {loading ? (
          <div className="w-96 h-96 bg-gray-100 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-6"></div>
              <p className="text-lg text-gray-700 font-medium">Generating QR Code...</p>
            </div>
          </div>
        ) : error ? (
          <div className="w-96 h-96 bg-red-50 rounded-lg flex items-center justify-center border-2 border-red-200">
            <div className="text-center">
              <div className="text-red-600 text-6xl mb-6">⚠️</div>
              <p className="text-red-700 mb-6 text-lg font-medium">{error}</p>
              <button
                onClick={generateQRCode}
                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : qrCodeImage ? (
          <div className="bg-white p-6 rounded-lg border-2 border-gray-300 shadow-lg">
            <img
              src={qrCodeImage}
              alt="QR Code for credential verification"
              className="w-80 h-80 block"
            />
          </div>
        ) : (
          <div className="w-96 h-96 bg-gray-100 rounded-lg flex items-center justify-center">
            <p className="text-gray-600 text-lg">No QR code available</p>
          </div>
        )}
      </div>

      {/* URL Display */}
      <div className="bg-gray-50 rounded-lg p-6 mb-6">
        <h3 className="font-semibold text-gray-900 mb-3 text-lg">QR Code URL</h3>
        <div className="flex items-center space-x-3">
          <input
            type="text"
            value={proofRequest.qr}
            readOnly
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg bg-white text-sm font-mono text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={copyUrl}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            📋 Copy
          </button>
        </div>
      </div>

      {/* Status */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center px-4 py-2 rounded-full text-base font-medium bg-green-100 text-green-800 border border-green-200">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
          Status: {proofRequest.status.charAt(0).toUpperCase() + proofRequest.status.slice(1)}
        </div>
      </div>

      {/* Regenerate Button */}
      <div className="text-center">
        <button
          onClick={generateQRCode}
          disabled={loading}
          className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {loading ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Generating...
            </div>
          ) : (
            '🔄 Regenerate QR Code'
          )}
        </button>
      </div>
    </div>
  );
};

export default QRCodeDisplay;