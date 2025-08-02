import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';
import { ProcessStep } from '../types';
import { apiConfig } from '../config/api';

// MetaMask detection and connection states
type ConnectionState = 'not_detected' | 'detected' | 'connecting' | 'connected' | 'error';

interface MetaMaskConnectionProps {
  onConnectionSuccess?: (address: string) => void;
}

export default function MetaMaskConnection({ onConnectionSuccess }: MetaMaskConnectionProps) {
  const [connectionState, setConnectionState] = useState<ConnectionState>('not_detected');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isInstallPromptShown, setIsInstallPromptShown] = useState(false);
  
  const { state, setWalletAddress, setStep, setErrorState } = useAppContext();
  const navigate = useNavigate();

  // Check if MetaMask is installed
  useEffect(() => {
    const checkMetaMask = () => {
      if (typeof window !== 'undefined' && window.ethereum) {
        setConnectionState('detected');
      } else {
        setConnectionState('not_detected');
      }
    };

    checkMetaMask();
    
    // Listen for MetaMask installation
    const handleEthereum = () => {
      checkMetaMask();
    };

    window.addEventListener('ethereum#initialized', handleEthereum, {
      once: true,
    });

    // If MetaMask is not detected, check again after a short delay
    if (!window.ethereum) {
      setTimeout(checkMetaMask, 1000);
    }

    return () => {
      window.removeEventListener('ethereum#initialized', handleEthereum);
    };
  }, []);

  // Handle account changes
  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          // User disconnected
          setConnectionState('detected');
          setWalletAddress('');
          setErrorState({ hasError: true, error: 'MetaMask wallet was disconnected', code: 'WALLET_DISCONNECTED' });
        } else if (accounts[0] !== state.walletAddress) {
          // Account changed
          setWalletAddress(accounts[0]);
          onConnectionSuccess?.(accounts[0]);
        }
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);

      return () => {
        if (window.ethereum) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        }
      };
    }
  }, [state.walletAddress, setWalletAddress, setErrorState, onConnectionSuccess]);

  const connectWallet = async () => {
    if (!window.ethereum) {
      setErrorMessage('MetaMask is not installed');
      return;
    }

    setConnectionState('connecting');
    setErrorMessage('');

    try {
      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (accounts.length === 0) {
        throw new Error('No accounts found. Please make sure MetaMask is unlocked.');
      }

      const address = accounts[0];
      
      // Set wallet address in backend session
      if (state.sessionId) {
        const connectResponse = await fetch(apiConfig.endpoints.wallet.connect, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId: state.sessionId,
            walletAddress: address,
          }),
        });

        if (!connectResponse.ok) {
          throw new Error(`Failed to connect wallet to session: ${connectResponse.status}`);
        }

        const connectData = await connectResponse.json();
        
        if (!connectData.success) {
          throw new Error(connectData.error?.message || 'Failed to connect wallet to session');
        }
      }
      
      // Set wallet address in frontend state
      setWalletAddress(address);
      setConnectionState('connected');
      
      // Call success callback
      onConnectionSuccess?.(address);
      
      // Move to next step
      setStep(ProcessStep.FORM_SUBMISSION);
      navigate('/credential-form');

    } catch (error: any) {
      console.error('Failed to connect wallet:', error);
      setConnectionState('error');
      
      // Handle specific error cases
      if (error.code === 4001) {
        setErrorMessage('Connection rejected. Please approve the connection request.');
      } else if (error.code === -32002) {
        setErrorMessage('Connection request is already pending. Please check MetaMask.');
      } else {
        setErrorMessage(error.message || 'Failed to connect to MetaMask');
      }
      
      setErrorState({ 
        hasError: true, 
        error: `MetaMask connection failed: ${error.message || 'Unknown error'}`,
        code: 'METAMASK_CONNECTION_FAILED'
      });
    }
  };

  const openMetaMaskInstall = () => {
    window.open('https://metamask.io/download/', '_blank');
    setIsInstallPromptShown(true);
  };

  const retryConnection = () => {
    setConnectionState('detected');
    setErrorMessage('');
    setErrorState({ hasError: false });
  };

  // Render different states
  if (connectionState === 'not_detected') {
    return (
      <div className="text-center">
        <div className="mb-8">
          <svg
            className="mx-auto h-16 w-16 lg:h-20 lg:w-20 text-orange-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>
        
        <h3 className="text-lg md:text-xl lg:text-2xl font-semibold text-gray-900 mb-3">
          MetaMask Not Detected
        </h3>
        
        <p className="text-gray-600 text-base lg:text-lg mb-8 max-w-2xl mx-auto">
          MetaMask is required to connect your wallet. Please install MetaMask to continue.
        </p>
        
        <div className="flex flex-col md:flex-row items-center justify-center space-y-4 md:space-y-0 md:space-x-4 mb-8">
          <button
            onClick={openMetaMaskInstall}
            className="w-full md:w-auto bg-orange-600 hover:bg-orange-700 text-white font-medium py-4 px-8 rounded-md transition-colors flex items-center justify-center text-base"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l3.09 6.26L22 9l-5 4.87L18.18 22 12 18.77 5.82 22 7 13.87 2 9l6.91-.74L12 2z"/>
            </svg>
            Install MetaMask
          </button>
          
          {isInstallPromptShown && (
            <button
              onClick={() => window.location.reload()}
              className="w-full md:w-auto bg-gray-600 hover:bg-gray-700 text-white font-medium py-4 px-8 rounded-md transition-colors text-base"
            >
              I've Installed MetaMask - Refresh
            </button>
          )}
        </div>
        
        <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg max-w-2xl mx-auto">
          <p className="text-sm md:text-base text-blue-800">
            <strong>What is MetaMask?</strong><br />
            MetaMask is a secure wallet that allows you to interact with blockchain applications. 
            It's required to connect your wallet and receive credentials.
          </p>
        </div>
      </div>
    );
  }

  if (connectionState === 'connected') {
    return (
      <div className="text-center">
        <div className="mb-8">
          <svg
            className="mx-auto h-16 w-16 lg:h-20 lg:w-20 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        
        <h3 className="text-lg md:text-xl lg:text-2xl font-semibold text-gray-900 mb-4">
          Wallet Connected Successfully
        </h3>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8 max-w-2xl mx-auto">
          <p className="text-sm md:text-base text-green-800 mb-3">
            <strong>Connected Address:</strong>
          </p>
          <p className="text-xs md:text-sm font-mono text-green-700 break-all">
            {state.walletAddress}
          </p>
        </div>
        
        <p className="text-gray-600 text-base lg:text-lg">
          Proceeding to the next step...
        </p>
      </div>
    );
  }

  if (connectionState === 'error') {
    return (
      <div className="text-center">
        <div className="mb-8">
          <svg
            className="mx-auto h-16 w-16 lg:h-20 lg:w-20 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>
        
        <h3 className="text-lg md:text-xl lg:text-2xl font-semibold text-gray-900 mb-4">
          Connection Failed
        </h3>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8 max-w-2xl mx-auto">
          <p className="text-sm md:text-base text-red-800">
            {errorMessage}
          </p>
        </div>
        
        <div className="flex flex-col md:flex-row items-center justify-center space-y-4 md:space-y-0 md:space-x-4 mb-8">
          <button
            onClick={retryConnection}
            className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-md transition-colors text-base"
          >
            Try Again
          </button>
          
          <button
            onClick={openMetaMaskInstall}
            className="w-full md:w-auto bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-6 rounded-md transition-colors text-base"
          >
            Reinstall MetaMask
          </button>
        </div>
        
        <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg max-w-2xl mx-auto">
          <p className="text-sm md:text-base text-blue-800">
            <strong>Troubleshooting Tips:</strong><br />
            • Make sure MetaMask is unlocked<br />
            • Check that you have at least one account in MetaMask<br />
            • Try refreshing the page and connecting again
          </p>
        </div>
      </div>
    );
  }

  // Default state: detected but not connected
  return (
    <div className="text-center">
      <div className="mb-8">
        <svg
          className="mx-auto h-16 w-16 lg:h-20 lg:w-20 text-blue-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      </div>
      
      <h3 className="text-lg md:text-xl lg:text-2xl font-semibold text-gray-900 mb-3">
        Connect Your MetaMask Wallet
      </h3>
      
      <p className="text-gray-600 text-base lg:text-lg mb-8 max-w-2xl mx-auto">
        Click the button below to connect your MetaMask wallet and begin the credential issuance process.
      </p>
      
      <div className="flex justify-center mb-8">
        <button
          onClick={connectWallet}
          disabled={connectionState === 'connecting'}
          className="w-full md:w-auto md:min-w-[200px] bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-4 px-8 rounded-md transition-colors flex items-center justify-center text-base"
        >
        {connectionState === 'connecting' ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
            Connecting...
          </>
        ) : (
          <>
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
            </svg>
            Connect MetaMask
          </>
        )}
        </button>
      </div>
      
      <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg max-w-2xl mx-auto">
        <p className="text-sm md:text-base text-gray-700">
          <strong>Why do we need your wallet?</strong><br />
          Your wallet address will be included in the credential to verify your identity 
          and ensure the credential is issued to the correct person.
        </p>
      </div>
    </div>
  );
}