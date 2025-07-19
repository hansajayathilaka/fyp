'use client';

import React from 'react';
import { useWeb3 } from '@/hooks/useWeb3';
import { formatAddress, isMetaMaskInstalled } from '@/lib/web3';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wallet, AlertCircle, Loader2 } from 'lucide-react';

export const WalletConnect: React.FC = () => {
  const { 
    account, 
    chainId, 
    isConnected, 
    connect, 
    disconnect, 
    isLoading, 
    error 
  } = useWeb3();

  if (!isMetaMaskInstalled()) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center sm:text-left">
          <CardTitle className="flex items-center justify-center sm:justify-start gap-2 text-lg sm:text-xl">
            <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-orange-500 flex-shrink-0" />
            <span className="break-words">MetaMask Required</span>
          </CardTitle>
          <CardDescription className="text-center sm:text-left">
            Please install MetaMask to connect your wallet
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <Button 
            onClick={() => window.open('https://metamask.io/download/', '_blank')}
            className="w-full text-sm sm:text-base py-2 sm:py-3"
          >
            Install MetaMask
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isConnected && account) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center sm:text-left">
          <CardTitle className="flex items-center justify-center sm:justify-start gap-2 text-lg sm:text-xl">
            <Wallet className="h-5 w-5 sm:h-6 sm:w-6 text-green-500 flex-shrink-0" />
            <span className="break-words">Wallet Connected</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-4 sm:px-6">
          <div className="text-center sm:text-left">
            <p className="text-sm text-muted-foreground mb-1">Address</p>
            <p className="font-mono text-sm break-all sm:break-normal">{formatAddress(account)}</p>
          </div>
          
          {chainId && (
            <div className="text-center sm:text-left">
              <p className="text-sm text-muted-foreground mb-2">Network</p>
              <div className="flex justify-center sm:justify-start">
                <Badge variant="outline" className="text-xs sm:text-sm">
                  Chain ID: {chainId}
                </Badge>
              </div>
            </div>
          )}
          
          <Button 
            onClick={disconnect}
            variant="outline"
            className="w-full text-sm sm:text-base py-2 sm:py-3"
          >
            Disconnect
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center sm:text-left">
        <CardTitle className="flex items-center justify-center sm:justify-start gap-2 text-lg sm:text-xl">
          <Wallet className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0" />
          <span className="break-words">Connect Wallet</span>
        </CardTitle>
        <CardDescription className="text-center sm:text-left">
          Connect your MetaMask wallet to get started
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 px-4 sm:px-6">
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <p className="text-sm text-red-600 dark:text-red-400 text-center sm:text-left break-words">
              {error}
            </p>
          </div>
        )}
        
        <Button 
          onClick={connect}
          disabled={isLoading}
          className="w-full text-sm sm:text-base py-2 sm:py-3"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin flex-shrink-0" />
              <span>Connecting...</span>
            </>
          ) : (
            'Connect MetaMask'
          )}
        </Button>
      </CardContent>
    </Card>
  );
};