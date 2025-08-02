import { useState } from 'react';
import { CredentialFormData } from '../types';

interface OperationStep {
  name: string;
  status: 'completed' | 'failed' | 'skipped';
  timestamp?: Date;
  details?: Record<string, any>;
}

interface SessionData {
  sessionId: string;
  formData?: CredentialFormData;
  issuerId?: string;
  credentialOfferUrl?: string;
  qrCodeGenerated: boolean;
  credentialStatus: 'pending' | 'issued' | 'failed';
  startTime: Date;
  endTime?: Date;
  nextSteps: string[];
}

interface OperationResult {
  success: boolean;
  steps: OperationStep[];
  summary: OperationSummary;
  errors?: string[];
}

interface OperationSummary {
  sessionId: string;
  formData: CredentialFormData;
  issuerId?: string;
  credentialOfferUrl?: string;
  qrCodeGenerated: boolean;
  credentialStatus: 'pending' | 'issued' | 'failed';
  startTime: Date;
  endTime?: Date;
  nextSteps: string[];
}

interface OperationSummaryProps {
  sessionData: SessionData;
  operationResult: OperationResult;
  onStartNew: () => void;
}

export default function OperationSummary({ 
  sessionData, 
  operationResult, 
  onStartNew 
}: OperationSummaryProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [exportFormat, setExportFormat] = useState<'json' | 'text'>('json');

  // Calculate operation duration
  const getDuration = (): string => {
    if (!sessionData.endTime) return 'In progress...';
    
    const duration = sessionData.endTime.getTime() - sessionData.startTime.getTime();
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  // Get overall status color
  const getStatusColor = (): string => {
    if (operationResult.success && sessionData.credentialStatus === 'issued') return 'green';
    if (!operationResult.success || sessionData.credentialStatus === 'failed') return 'red';
    return 'yellow';
  };

  // Get status icon
  const getStatusIcon = () => {
    const color = getStatusColor();
    
    if (color === 'green') {
      return (
        <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    } else if (color === 'red') {
      return (
        <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      );
    } else {
      return (
        <svg className="w-8 h-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    }
  };

  // Export operation data
  const exportData = () => {
    const exportData = {
      sessionId: sessionData.sessionId,
      operationResult: operationResult.success ? 'Success' : 'Failed',
      credentialStatus: sessionData.credentialStatus,
      duration: getDuration(),
      startTime: sessionData.startTime.toISOString(),
      endTime: sessionData.endTime?.toISOString(),
      formData: sessionData.formData,
      issuerId: sessionData.issuerId,
      credentialOfferUrl: sessionData.credentialOfferUrl,
      qrCodeGenerated: sessionData.qrCodeGenerated,
      steps: operationResult.steps,
      errors: operationResult.errors,
      nextSteps: sessionData.nextSteps,
      exportedAt: new Date().toISOString()
    };

    if (exportFormat === 'json') {
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `credential-operation-${sessionData.sessionId}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      const textData = `
Credential Issuance Operation Summary
=====================================

Session ID: ${sessionData.sessionId}
Operation Result: ${operationResult.success ? 'Success' : 'Failed'}
Credential Status: ${sessionData.credentialStatus}
Duration: ${getDuration()}
Start Time: ${sessionData.startTime.toLocaleString()}
End Time: ${sessionData.endTime?.toLocaleString() || 'N/A'}

Form Data:
----------
Name: ${sessionData.formData?.firstName} ${sessionData.formData?.lastName}
NIC: ${sessionData.formData?.nic}
Email: ${sessionData.formData?.email}
Country: ${sessionData.formData?.country}
Wallet Address: ${sessionData.formData?.walletAddress}
Investor Type: ${sessionData.formData?.investorType}
KYC Level: ${sessionData.formData?.kycLevel}
AML Status: ${sessionData.formData?.amlStatus ? 'Completed' : 'Not Completed'}

Technical Details:
------------------
Issuer ID: ${sessionData.issuerId || 'N/A'}
QR Code Generated: ${sessionData.qrCodeGenerated ? 'Yes' : 'No'}
Credential Offer URL: ${sessionData.credentialOfferUrl || 'N/A'}

Operation Steps:
----------------
${operationResult.steps.map(step => 
  `${step.status === 'completed' ? '✓' : step.status === 'failed' ? '✗' : '○'} ${step.name} ${step.timestamp ? `(${step.timestamp.toLocaleString()})` : ''}`
).join('\n')}

${operationResult.errors && operationResult.errors.length > 0 ? `
Errors:
-------
${operationResult.errors.join('\n')}
` : ''}

Next Steps:
-----------
${sessionData.nextSteps.map((step, index) => `${index + 1}. ${step}`).join('\n')}

Exported at: ${new Date().toLocaleString()}
      `.trim();

      const blob = new Blob([textData], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `credential-operation-${sessionData.sessionId}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const statusColor = getStatusColor();

  return (
    <div className="bg-white rounded-lg shadow-md p-6 lg:p-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="mb-6">
          {getStatusIcon()}
        </div>
        
        <h2 className="text-xl md:text-2xl lg:text-3xl font-semibold text-gray-900 mb-4">
          Operation Summary
        </h2>
        
        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
          statusColor === 'green' ? 'bg-green-100 text-green-800' :
          statusColor === 'red' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
        }`}>
          {operationResult.success && sessionData.credentialStatus === 'issued' ? 'Completed Successfully' :
           !operationResult.success || sessionData.credentialStatus === 'failed' ? 'Operation Failed' :
           'In Progress'}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gray-50 p-6 rounded-lg text-center">
          <div className="text-2xl lg:text-3xl font-bold text-gray-900">{getDuration()}</div>
          <div className="text-sm md:text-base text-gray-600 mt-2">Duration</div>
        </div>
        <div className="bg-gray-50 p-6 rounded-lg text-center">
          <div className="text-2xl lg:text-3xl font-bold text-gray-900">
            {operationResult.steps.filter(step => step.status === 'completed').length}
          </div>
          <div className="text-sm md:text-base text-gray-600 mt-2">Steps Completed</div>
        </div>
        <div className="bg-gray-50 p-6 rounded-lg text-center">
          <div className="text-2xl lg:text-3xl font-bold text-gray-900">
            {sessionData.credentialStatus.charAt(0).toUpperCase() + sessionData.credentialStatus.slice(1)}
          </div>
          <div className="text-sm md:text-base text-gray-600 mt-2">Credential Status</div>
        </div>
      </div>

      {/* Operation Steps */}
      <div className="mb-8">
        <h3 className="text-lg md:text-xl font-medium text-gray-900 mb-6">Operation Steps</h3>
        <div className="space-y-4">
          {operationResult.steps.map((step, index) => (
            <div key={index} className="flex items-center p-4 bg-gray-50 rounded-lg">
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mr-4 ${
                step.status === 'completed' ? 'bg-green-100 text-green-600' :
                step.status === 'failed' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'
              }`}>
                {step.status === 'completed' ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : step.status === 'failed' ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <div className="w-2 h-2 bg-current rounded-full"></div>
                )}
              </div>
              <div className="flex-1">
                <div className="text-sm md:text-base font-medium text-gray-900">{step.name}</div>
                {step.timestamp && (
                  <div className="text-xs md:text-sm text-gray-500 mt-1">{step.timestamp.toLocaleString()}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Credential Information */}
      {sessionData.formData && (
        <div className="mb-8">
          <h3 className="text-lg md:text-xl font-medium text-gray-900 mb-6">Credential Information</h3>
          <div className="bg-gray-50 p-6 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <div className="text-sm md:text-base font-medium text-gray-500 mb-2">Name</div>
                <div className="text-gray-900 font-semibold text-base">{sessionData.formData.firstName} {sessionData.formData.lastName}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500 mb-1">NIC</div>
                <div className="text-gray-900 font-semibold">{sessionData.formData.nic}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500 mb-1">Email</div>
                <div className="text-gray-900 font-semibold">{sessionData.formData.email}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500 mb-1">Country</div>
                <div className="text-gray-900 font-semibold">{sessionData.formData.country}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500 mb-1">Investor Type</div>
                <div className="text-gray-900 font-semibold">{sessionData.formData.investorType}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500 mb-1">KYC Level</div>
                <div className="text-gray-900 font-semibold capitalize">{sessionData.formData.kycLevel}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500 mb-1">AML Status</div>
                <div className={`font-semibold ${sessionData.formData.amlStatus ? 'text-green-600' : 'text-yellow-600'}`}>
                  {sessionData.formData.amlStatus ? 'Completed' : 'Pending'}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500 mb-1">Wallet Address</div>
                <div className="text-gray-900 font-mono text-sm break-all">{sessionData.formData.walletAddress}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Technical Details */}
      <div className="mb-6">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center text-sm font-medium text-gray-700 hover:text-gray-900 mb-3 transition-colors"
        >
          <svg className={`w-4 h-4 mr-2 transform transition-transform ${showDetails ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          Technical Details
          <span className="ml-2 text-xs text-gray-500">
            ({showDetails ? 'Hide' : 'Show'})
          </span>
        </button>
        
        {showDetails && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <div className="text-sm font-medium text-gray-500 mb-1">Session ID</div>
                <div className="font-mono text-sm text-gray-900 bg-white px-2 py-1 rounded border">
                  {sessionData.sessionId}
                </div>
              </div>
              {sessionData.issuerId && (
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">Issuer ID</div>
                  <div className="font-mono text-sm text-gray-900 bg-white px-2 py-1 rounded border break-all">
                    {sessionData.issuerId}
                  </div>
                </div>
              )}
              {sessionData.credentialOfferUrl && (
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">Credential Offer URL</div>
                  <div className="font-mono text-xs text-gray-900 bg-white p-2 rounded border break-all">
                    {sessionData.credentialOfferUrl}
                  </div>
                </div>
              )}
              <div>
                <div className="text-sm font-medium text-gray-500 mb-1">QR Code Generated</div>
                <div className={`font-semibold ${sessionData.qrCodeGenerated ? 'text-green-600' : 'text-red-600'}`}>
                  {sessionData.qrCodeGenerated ? 'Yes' : 'No'}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500 mb-1">Start Time</div>
                <div className="text-gray-900 font-semibold">
                  {sessionData.startTime.toLocaleString()}
                </div>
              </div>
              {sessionData.endTime && (
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">End Time</div>
                  <div className="text-gray-900 font-semibold">
                    {sessionData.endTime.toLocaleString()}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Next Steps */}
      {sessionData.nextSteps.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Next Steps
          </h3>
          <ul className="space-y-2">
            {sessionData.nextSteps.map((step, index) => (
              <li key={index} className="flex items-start">
                <span className="flex-shrink-0 w-5 h-5 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-medium mr-3 mt-0.5">
                  {index + 1}
                </span>
                <span className="text-sm text-gray-700">{step}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Error Display */}
      {operationResult.errors && operationResult.errors.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-medium text-red-900 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            Errors Encountered
          </h3>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <ul className="space-y-1">
              {operationResult.errors.map((error, index) => (
                <li key={index} className="text-sm text-red-800">• {error}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col md:flex-row gap-4">
        <button
          onClick={onStartNew}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-4 px-6 rounded-md transition-colors flex items-center justify-center text-base"
        >
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Start New Session
        </button>
        
        <div className="flex gap-3">
          <select
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value as 'json' | 'text')}
            className="px-4 py-3 border border-gray-300 rounded-md text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="json">JSON</option>
            <option value="text">Text</option>
          </select>
          
          <button
            onClick={exportData}
            className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-6 rounded-md transition-colors flex items-center text-base"
          >
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export
          </button>
        </div>
      </div>
    </div>
  );
}