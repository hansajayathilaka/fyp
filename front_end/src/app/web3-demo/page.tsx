'use client';

import React from 'react';
import { WalletConnect } from '@/components/WalletConnect';
import { ContractExample } from '@/components/ContractExample';

export default function Web3DemoPage() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">Web3 Integration Demo</h1>
        <p className="text-muted-foreground">
          Connect your wallet and interact with smart contracts
        </p>
      </div>
      
      <div className="flex justify-center">
        <WalletConnect />
      </div>
      
      <div className="max-w-4xl mx-auto">
        <ContractExample />
      </div>
    </div>
  );
}