

export default function IssuancePage() {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="text-center">
        <div className="mb-6">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
        </div>
        
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Issuing Credential
        </h2>
        
        <p className="text-gray-600 mb-6">
          Please wait while we create and deliver your credential to your Truvera wallet.
        </p>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-800 text-sm">
            This process may take a few moments. Please do not close this window.
          </p>
        </div>
      </div>
    </div>
  );
}