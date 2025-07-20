'use client'

import { ETHDepositForm } from '@/components/ETHDepositForm'

export default function DepositPage() {
  const handleDepositComplete = () => {
    console.log('Deposit completed successfully')
    // You could refresh balances or other data here
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Deposit Funds</h1>
      
      <div className="max-w-md">
        <ETHDepositForm 
          onDepositComplete={handleDepositComplete}
        />
        
        <div className="mt-8 bg-blue-50 p-4 rounded-lg">
          <h3 className="font-medium text-blue-800 mb-2">About Deposits</h3>
          <p className="text-sm text-blue-700">
            You can deposit funds using either {' '}
            <span className="font-semibold">ETH/HBAR</span> or {' '}
            <span className="font-semibold">wei/tinybar</span> units. 
            The system will automatically convert between units based on your selection.
          </p>
        </div>
      </div>
    </div>
  )
}