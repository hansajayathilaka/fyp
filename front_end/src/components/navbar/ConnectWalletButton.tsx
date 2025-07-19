'use client';

import React, { useState } from 'react';
import { ConnectWalletButtonType } from "@/types/navBar";
import { Button } from "../ui/button";
import { useWeb3 } from '@/hooks/useWeb3';
import { formatAddress, isMetaMaskInstalled } from '@/lib/web3';
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, AlertCircle, Loader2, Copy, ExternalLink, LogOut } from 'lucide-react';
import { toast } from 'sonner';

export const ConnectWalletButton = ({ styles }: ConnectWalletButtonType) => {
  const [isOpen, setIsOpen] = useState(false);
  const { 
    account, 
    chainId, 
    isConnected, 
    connect, 
    disconnect, 
    isLoading, 
    error 
  } = useWeb3();

  const handleConnect = async () => {
    try {
      await connect();
      setIsOpen(false);
      toast.success('Wallet connected successfully!');
    } catch (err) {
      console.error('Connection failed:', err);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setIsOpen(false);
    toast.info('Wallet disconnected');
  };

  const copyAddress = () => {
    if (account) {
      navigator.clipboard.writeText(account);
      toast.success('Address copied to clipboard!');
    }
  };

  const openEtherscan = () => {
    if (account) {
      const baseUrl = chainId === 1 ? 'https://etherscan.io' : 'https://sepolia.etherscan.io';
      window.open(`${baseUrl}/address/${account}`, '_blank');
    }
  };

  // If connected, show connected state
  if (isConnected && account) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button className={`bg-green-600 dark:bg-green-600 dark:text-white dark:hover:bg-green-700 hover:bg-green-700 font-bold text-sm sm:text-lg ${styles} rounded-lg flex items-center gap-2`}>
            <Wallet className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="hidden sm:inline">{formatAddress(account)}</span>
            <span className="sm:hidden">Connected</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <Card className="border-0 shadow-none">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2 text-xl">
                <Wallet className="h-6 w-6 text-green-500" />
                Wallet Connected
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Address</p>
                <div className="flex items-center justify-center gap-2 p-3 bg-muted rounded-lg">
                  <p className="font-mono text-sm break-all">{account}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copyAddress}
                    className="h-8 w-8 p-0"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {chainId && (
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">Network</p>
                  <Badge variant="outline" className="text-sm">
                    Chain ID: {chainId}
                  </Badge>
                </div>
              )}
              
              <div className="flex gap-2">
                <Button 
                  onClick={openEtherscan}
                  variant="outline"
                  className="flex-1"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View on Explorer
                </Button>
                <Button 
                  onClick={handleDisconnect}
                  variant="outline"
                  className="flex-1"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Disconnect
                </Button>
              </div>
            </CardContent>
          </Card>
        </DialogContent>
      </Dialog>
    );
  }

  // If not connected, show connect button
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className={`bg-darkSecondary dark:bg-darkSecondary dark:text-lightBackGround dark:hover:bg-buttonHover hover:bg-buttonHover font-bold text-sm sm:text-lg ${styles} rounded-lg flex items-center gap-2`}>
          <Wallet className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="hidden sm:inline">Connect Wallet</span>
          <span className="sm:hidden">Connect</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <Card className="border-0 shadow-none">
          {!isMetaMaskInstalled() ? (
            <>
              <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center gap-2 text-xl">
                  <AlertCircle className="h-6 w-6 text-orange-500" />
                  MetaMask Required
                </CardTitle>
                <CardDescription>
                  Please install MetaMask to connect your wallet
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => {
                    window.open('https://metamask.io/download/', '_blank');
                    setIsOpen(false);
                  }}
                  className="w-full"
                >
                  Install MetaMask
                </Button>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center gap-2 text-xl">
                  <Wallet className="h-6 w-6" />
                  Connect Wallet
                </CardTitle>
                <CardDescription>
                  Connect your MetaMask wallet to get started
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                    <p className="text-sm text-red-600 dark:text-red-400 text-center break-words">
                      {error}
                    </p>
                  </div>
                )}
                
                <Button 
                  onClick={handleConnect}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Wallet className="mr-2 h-4 w-4" />
                      Connect MetaMask
                    </>
                  )}
                </Button>
              </CardContent>
            </>
          )}
        </Card>
      </DialogContent>
    </Dialog>
  );
};
