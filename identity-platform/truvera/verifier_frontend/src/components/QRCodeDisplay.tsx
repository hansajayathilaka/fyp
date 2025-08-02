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
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Scan QR Code
        </h2>
        <p className="text-gray-600">
          Use your mobile wallet to scan this code
        </p>
      </div>

      {/* QR Code Area */}
      <div className="flex justify-center mb-8">
        {loading ? (
          <div className="w-96 h-96 bg-gray-100 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Generating QR Code...</p>
            </div>
          </div>
        ) : error ? (
          <div className="w-96 h-96 bg-red-50 rounded-lg flex items-center justify-center border-2 border-red-200">
            <div className="text-center">
              <div className="text-red-600 text-4xl mb-4">⚠️</div>
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={generateQRCode}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : qrCodeImage ? (
          <div className="bg-white p-4 rounded-lg border-2 border-gray-200 shadow-md">
            <img
              src={qrCodeImage}
              alt="QR Code"
              className="w-80 h-80 block"
            />
          </div>
        ) : (
          <div className="w-96 h-96 bg-gray-100 rounded-lg flex items-center justify-center">
            <p className="text-gray-500">No QR code available</p>
          </div>
        )}
      </div>

      {/* URL Display */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-gray-900 mb-2">QR Code URL</h3>
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={proofRequest.qr}
            readOnly
            className="flex-1 px-3 py-2 border border-gray-300 rounded bg-white text-sm font-mono"
          />
          <button
            onClick={copyUrl}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Copy
          </button>
        </div>
      </div>

      {/* Status */}
      <div className="text-center">
        <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
          Status: {proofRequest.status}
        </div>
      </div>

      {/* Regenerate Button */}
      <div className="text-center mt-6">
        <button
          onClick={generateQRCode}
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Generating...' : 'Regenerate QR Code'}
        </button>
      </div>
    </div>
  );
};

export default QRCodeDisplay;