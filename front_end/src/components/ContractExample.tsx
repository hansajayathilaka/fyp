'use client';

import React, { useState, useEffect } from 'react';
import { useContract } from '@/hooks/useContract';
import { useWeb3 } from '@/hooks/useWeb3';
import { parseEther, formatEther } from '@/lib/web3';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

// Example ERC20 ABI (minimal)
const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "event Transfer(address indexed from, address indexed to, uint256 value)"
];

interface ContractExampleProps {
  contractAddress?: string;
}

export const ContractExample: React.FC<ContractExampleProps> = ({
  contractAddress = "0x..." // Replace with your contract address
}) => {
  const { isConnected, account } = useWeb3();
  const [transferTo, setTransferTo] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [tokenInfo, setTokenInfo] = useState<{
    name: string;
    symbol: string;
    decimals: number;
    totalSupply: string;
    balance: string;
  } | null>(null);

  const contract = useContract({
    address: contractAddress,
    abi: ERC20_ABI
  });

  // Load token information
  useEffect(() => {
    if (!isConnected || !contract) return;

    const loadTokenInfo = async () => {
      try {
        const [name, symbol, decimals, totalSupply, balance] = await Promise.all([
          contract.read('name'),
          contract.read('symbol'),
          contract.read('decimals'),
          contract.read('totalSupply'),
          account ? contract.read('balanceOf', account) : Promise.resolve(BigInt(0))
        ]);

        setTokenInfo({
          name,
          symbol,
          decimals: Number(decimals),
          totalSupply: formatEther(totalSupply),
          balance: formatEther(balance)
        });
      } catch (error) {
        console.error('Failed to load token info:', error);
      }
    };

    loadTokenInfo();
  }, [isConnected, contract, account]);

  // Handle transfer
  const handleTransfer = async () => {
    if (!transferTo || !transferAmount) return;

    try {
      const amount = parseEther(transferAmount);
      const { transaction, receipt } = await contract.write('transfer', [transferTo, amount]);

      console.log('Transfer successful:', {
        txHash: transaction.hash,
        blockNumber: receipt.blockNumber
      });

      // Refresh balance
      if (account) {
        const newBalance = await contract.read('balanceOf', account);
        setTokenInfo(prev => prev ? { ...prev, balance: formatEther(newBalance) } : null);
      }

      // Clear form
      setTransferTo('');
      setTransferAmount('');
    } catch (error) {
      console.error('Transfer failed:', error);
    }
  };

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Contract Interaction</CardTitle>
          <CardDescription>Connect your wallet to interact with contracts</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Token Information */}
      <Card>
        <CardHeader>
          <CardTitle>Token Information</CardTitle>
        </CardHeader>
        <CardContent>
          {tokenInfo ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Name</Label>
                <p className="font-mono text-sm">{tokenInfo.name}</p>
              </div>
              <div>
                <Label>Symbol</Label>
                <p className="font-mono text-sm">{tokenInfo.symbol}</p>
              </div>
              <div>
                <Label>Total Supply</Label>
                <p className="font-mono text-sm">{tokenInfo.totalSupply}</p>
              </div>
              <div>
                <Label>Your Balance</Label>
                <p className="font-mono text-sm">{tokenInfo.balance}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading token information...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transfer Form */}
      <Card>
        <CardHeader>
          <CardTitle>Transfer Tokens</CardTitle>
          <CardDescription>Send tokens to another address</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="transferTo">Recipient Address</Label>
            <Input
              id="transferTo"
              placeholder="0x..."
              value={transferTo}
              onChange={(e) => setTransferTo(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="transferAmount">Amount</Label>
            <Input
              id="transferAmount"
              type="number"
              placeholder="0.0"
              value={transferAmount}
              onChange={(e) => setTransferAmount(e.target.value)}
            />
          </div>

          <Button
            onClick={handleTransfer}
            disabled={!transferTo || !transferAmount || contract.isLoading}
            className="w-full"
          >
            {contract.isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Transfer'
            )}
          </Button>

          {contract.error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{contract.error}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};