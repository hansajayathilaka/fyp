

export default function IssuancePage() {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 lg:p-8">
      <div className="text-center">
        <div className="mb-8">
          <div className="animate-spin rounded-full h-16 w-16 lg:h-20 lg:w-20 border-b-2 border-blue-600 mx-auto"></div>
        </div>
        
        <h2 className="text-xl md:text-2xl lg:text-3xl font-semibold text-gray-900 mb-4">
          Issuing Credential
        </h2>
        
        <p className="text-gray-600 text-base lg:text-lg mb-8 max-w-2xl mx-auto">
          Please wait while we create and deliver your credential to your Truvera wallet.
        </p>
        
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row items-center justify-center space-y-4 md:space-y-0 md:space-x-8">
            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              <span className="text-sm md:text-base text-gray-700 font-medium">Form Processed</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              <span className="text-sm md:text-base text-gray-700 font-medium">Wallet Connected</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 bg-blue-500 animate-pulse rounded-full"></div>
              <span className="text-sm md:text-base text-gray-700 font-medium">Creating Credential</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 bg-gray-300 rounded-full"></div>
              <span className="text-sm md:text-base text-gray-500">Delivery</span>
            </div>
          </div>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <p className="text-blue-800 text-sm md:text-base">
            <strong>Important:</strong> This process may take a few moments. Please do not close this window.
          </p>
        </div>
        
        {/* What's Happening Section */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h4 className="font-medium text-gray-900 mb-4 text-lg">
            What's Happening Now?
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm md:text-base text-gray-700">
            <div className="text-center">
              <div className="mb-3">
                <svg className="w-8 h-8 mx-auto text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="font-semibold text-gray-900 mb-2">Validating Information</p>
              <p>Verifying your submitted data and ensuring accuracy</p>
            </div>
            <div className="text-center">
              <div className="mb-3">
                <svg className="w-8 h-8 mx-auto text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <p className="font-semibold text-gray-900 mb-2">Creating Credential</p>
              <p>Generating your secure DEIP Access Credential</p>
            </div>
            <div className="text-center">
              <div className="mb-3">
                <svg className="w-8 h-8 mx-auto text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16l2.879-2.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="font-semibold text-gray-900 mb-2">Preparing Delivery</p>
              <p>Setting up secure delivery to your wallet</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}