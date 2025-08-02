import { useState, useEffect } from 'react';
import { CredentialFormData, ValidationErrors } from '../types';
import { processFormData } from '../utils';

interface CredentialFormProps {
  onSubmit: (formData: CredentialFormData) => void;
  isLoading: boolean;
  errors?: Record<string, string>;
  initialData?: Partial<CredentialFormData>;
  walletAddress?: string;
}

export default function CredentialForm({ 
  onSubmit, 
  isLoading, 
  errors: externalErrors = {}, 
  initialData = {},
  walletAddress = ''
}: CredentialFormProps) {
  const [formData, setFormData] = useState<CredentialFormData>({
    firstName: initialData.firstName || '',
    lastName: initialData.lastName || '',
    nic: initialData.nic || '',
    country: initialData.country || '',
    email: initialData.email || '',
    walletAddress: initialData.walletAddress || walletAddress,
    investorType: initialData.investorType || 'Individual',
    kycLevel: initialData.kycLevel || 'basic',
    amlStatus: initialData.amlStatus || false,
  });
  
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  // Update wallet address when prop changes
  useEffect(() => {
    if (walletAddress && !formData.walletAddress) {
      setFormData(prev => ({
        ...prev,
        walletAddress: walletAddress
      }));
    }
  }, [walletAddress, formData.walletAddress]);

  // Combine external errors with validation errors
  const allErrors = { ...validationErrors, ...externalErrors };

  // Real-time validation function
  const validateForm = (): { isValid: boolean; sanitizedData: CredentialFormData } => {
    const result = processFormData(formData);
    setValidationErrors(result.validation.errors);
    return {
      isValid: result.validation.isValid,
      sanitizedData: result.sanitizedData,
    };
  };

  // Handle input changes with real-time validation
  const handleInputChange = (field: keyof CredentialFormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error for this field when user starts typing
    if (allErrors[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data
    const validationResult = validateForm();
    if (!validationResult.isValid) {
      return;
    }

    // Submit sanitized data
    onSubmit(validationResult.sanitizedData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Personal Information Section */}
      <div className="space-y-6">
        <h3 className="text-lg md:text-xl font-medium text-gray-900 border-b border-gray-200 pb-3">
          Personal Information
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
              First Name *
            </label>
            <input
              type="text"
              id="firstName"
              value={formData.firstName}
              onChange={(e) => handleInputChange('firstName', e.target.value)}
              className={`w-full px-4 py-3 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                allErrors.firstName ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter your first name"
              disabled={isLoading}
            />
            {allErrors.firstName && (
              <p className="mt-2 text-sm text-red-600">{allErrors.firstName}</p>
            )}
          </div>

          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
              Last Name *
            </label>
            <input
              type="text"
              id="lastName"
              value={formData.lastName}
              onChange={(e) => handleInputChange('lastName', e.target.value)}
              className={`w-full px-4 py-3 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                allErrors.lastName ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter your last name"
              disabled={isLoading}
            />
            {allErrors.lastName && (
              <p className="mt-2 text-sm text-red-600">{allErrors.lastName}</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="nic" className="block text-sm font-medium text-gray-700 mb-2">
            NIC (National Identity Card) *
          </label>
          <input
            type="text"
            id="nic"
            value={formData.nic}
            onChange={(e) => handleInputChange('nic', e.target.value)}
            className={`w-full px-4 py-3 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              allErrors.nic ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter your National Identity Card number"
            disabled={isLoading}
          />
          {allErrors.nic && (
            <p className="mt-2 text-sm text-red-600">{allErrors.nic}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address *
            </label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className={`w-full px-4 py-3 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                allErrors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter your email address"
              disabled={isLoading}
            />
            {allErrors.email && (
              <p className="mt-2 text-sm text-red-600">{allErrors.email}</p>
            )}
          </div>

          <div>
            <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-2">
              Country *
            </label>
            <input
              type="text"
              id="country"
              value={formData.country}
              onChange={(e) => handleInputChange('country', e.target.value)}
              className={`w-full px-4 py-3 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                allErrors.country ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter your country"
              disabled={isLoading}
            />
            {allErrors.country && (
              <p className="mt-2 text-sm text-red-600">{allErrors.country}</p>
            )}
          </div>
        </div>
      </div>

      {/* Investment Information Section */}
      <div className="space-y-6">
        <h3 className="text-lg md:text-xl font-medium text-gray-900 border-b border-gray-200 pb-3">
          Investment Information
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          <div>
            <label htmlFor="investorType" className="block text-sm font-medium text-gray-700 mb-2">
              Investor Type *
            </label>
            <select
              id="investorType"
              value={formData.investorType}
              onChange={(e) => handleInputChange('investorType', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            >
              <option value="Individual">Individual</option>
              <option value="Company">Company</option>
            </select>
            {allErrors.investorType && (
              <p className="mt-2 text-sm text-red-600">{allErrors.investorType}</p>
            )}
          </div>

          <div>
            <label htmlFor="kycLevel" className="block text-sm font-medium text-gray-700 mb-2">
              KYC Level *
            </label>
            <select
              id="kycLevel"
              value={formData.kycLevel}
              onChange={(e) => handleInputChange('kycLevel', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            >
              <option value="basic">Basic</option>
              <option value="advanced">Advanced</option>
            </select>
            {allErrors.kycLevel && (
              <p className="mt-2 text-sm text-red-600">{allErrors.kycLevel}</p>
            )}
          </div>
        </div>

        <div className="flex items-start">
          <input
            type="checkbox"
            id="amlStatus"
            checked={formData.amlStatus}
            onChange={(e) => handleInputChange('amlStatus', e.target.checked)}
            className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
            disabled={isLoading}
          />
          <label htmlFor="amlStatus" className="ml-3 block text-sm text-gray-700">
            I confirm that I have completed AML verification *
          </label>
        </div>
        {allErrors.amlStatus && (
          <p className="mt-2 text-sm text-red-600">{allErrors.amlStatus}</p>
        )}
      </div>

      {/* Blockchain Information Section */}
      <div className="space-y-6">
        <h3 className="text-lg md:text-xl font-medium text-gray-900 border-b border-gray-200 pb-3">
          Blockchain Information
        </h3>
        
        <div>
          <label htmlFor="walletAddress" className="block text-sm font-medium text-gray-700 mb-2">
            Wallet Address *
          </label>
          <input
            type="text"
            id="walletAddress"
            value={formData.walletAddress}
            readOnly
            className="w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-600 font-mono text-sm"
          />
          <p className="mt-2 text-sm text-gray-500">
            This is your connected MetaMask wallet address
          </p>
          {allErrors.walletAddress && (
            <p className="mt-2 text-sm text-red-600">{allErrors.walletAddress}</p>
          )}
        </div>
      </div>

      {/* Submit Button */}
      <div className="pt-6 flex justify-center">
        <button
          type="submit"
          disabled={isLoading}
          className="w-full md:w-auto md:min-w-[200px] bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-4 px-8 rounded-md transition-colors flex items-center justify-center text-base"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Submitting...
            </>
          ) : (
            'Continue to QR Code'
          )}
        </button>
        
        <p className="mt-4 text-sm text-gray-500 text-center max-w-2xl mx-auto">
          Your information will be securely processed and used to generate your DEIP Access Credential.
        </p>
      </div>
    </form>
  );
}