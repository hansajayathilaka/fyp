'use client'

import Link from 'next/link'
import { useAccount } from 'wagmi'
import { getCurrentNetworkInfo } from '../lib/wagmi'
import { CONTRACT_ADDRESSES, DEPLOYMENT_INFO, validateContractAddresses } from '../contracts/addresses'
import { ClientOnly } from '../components/ClientOnly'

export default function Home() {
  return (
    <ClientOnly fallback={<HomeLoadingFallback />}>
      <HomeContent />
    </ClientOnly>
  )
}

function HomeLoadingFallback() {
  return (
    <div className="max-w-6xl mx-auto">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-100 px-8 py-16">
        <div className="text-center space-y-6">
          <h1 className="text-5xl font-bold text-gray-900">
            Decentralized Equity Investment Platform
          </h1>
          <p className="text-xl text-gray-700 max-w-3xl mx-auto">
            A decentralized, transparent, and secure platform for equity investment using blockchain technology. 
            Experience the future of investment markets with built-in compliance and real-time verification.
          </p>
          <div className="flex justify-center space-x-4 pt-4">
            <div className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium animate-pulse">
              Loading...
            </div>
            <a 
              href="#how-it-works"
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Learn More
            </a>
          </div>
        </div>
      </div>

      {/* System Status - Static version */}
      <div className="px-8 py-6 bg-white border-b">
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-gray-400 animate-pulse" />
            <span className="text-gray-600">
              Smart Contracts: Checking...
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-gray-400 animate-pulse" />
            <span className="text-gray-600">
              Network: Connecting...
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-gray-400 animate-pulse" />
            <span className="text-gray-600">
              Wallet: Initializing...
            </span>
          </div>
        </div>
      </div>

      {/* Rest of the static content can be shown immediately */}
      <StaticContent />
    </div>
  )
}

function StaticContent() {
  return (
    <>
      {/* How It Works Section */}
      <div id="how-it-works" className="px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            How DEIP Works
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Our platform combines traditional equity investment with blockchain technology to create 
            a transparent, secure, and regulated investment marketplace.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900">Regulatory Compliance</h3>
            <p className="text-gray-600">
              All users must register and be verified before trading. Administrators can manage 
              compliance requirements and suspend non-compliant users.
            </p>
          </div>

          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900">Equity Token Creation</h3>
            <p className="text-gray-600">
              Verified companies can create equity tokens representing ownership stakes. 
              Each token includes metadata about the company and equity details.
            </p>
          </div>

          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900">Secure Investment</h3>
            <p className="text-gray-600">
              Invest in equity tokens through a regulated marketplace with transparent order books, 
              automatic compliance checks, and blockchain-verified transactions.
            </p>
          </div>
        </div>
      </div>

      {/* Demo Sections */}
      <div className="px-8 py-16 bg-gray-50">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Explore the Platform
          </h2>
          <p className="text-lg text-gray-600">
            Navigate through different sections to see the complete equity investment ecosystem in action.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="bg-white rounded-xl shadow-sm border p-8 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Regulatory Management
            </h3>
            <p className="text-gray-600 mb-6">
              Manage user registration, verification, and compliance. See how administrators 
              control access and maintain regulatory standards.
            </p>
            <Link 
              href="/regulatory"
              className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
            >
              Explore Regulatory →
            </Link>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-8 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-6">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Equity Token Management
            </h3>
            <p className="text-gray-600 mb-6">
              Create and manage equity tokens for companies. Mint tokens, set metadata, 
              and control token distribution with built-in compliance.
            </p>
            <Link 
              href="/tokens"
              className="inline-flex items-center text-green-600 hover:text-green-700 font-medium"
            >
              Manage Tokens →
            </Link>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-8 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-6">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Investment Marketplace
            </h3>
            <p className="text-gray-600 mb-6">
              Invest in equity tokens through a secure marketplace. Place buy and sell orders, 
              view order books, and execute trades with real-time verification.
            </p>
            <Link 
              href="/marketplace"
              className="inline-flex items-center text-purple-600 hover:text-purple-700 font-medium"
            >
              Start Trading →
            </Link>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-8 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-6">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Portfolio Overview
            </h3>
            <p className="text-gray-600 mb-6">
              View your complete asset portfolio including ETH balances and token holdings 
              across wallet and marketplace with quick transfer options.
            </p>
            <Link 
              href="/portfolio"
              className="inline-flex items-center text-orange-600 hover:text-orange-700 font-medium"
            >
              View Portfolio →
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}

function HomeContent() {
  const { isConnected } = useAccount()
  const networkInfo = getCurrentNetworkInfo()
  const contractsValid = validateContractAddresses()

  return (
    <div className="max-w-6xl mx-auto">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-100 px-8 py-16">
        <div className="text-center space-y-6">
          <h1 className="text-5xl font-bold text-gray-900">
            Decentralized Equity Investment Platform
          </h1>
          <p className="text-xl text-gray-700 max-w-3xl mx-auto">
            A decentralized, transparent, and secure platform for equity investment using blockchain technology. 
            Experience the future of investment markets with built-in compliance and real-time verification.
          </p>
          <div className="flex justify-center space-x-4 pt-4">
            <Link 
              href="/regulatory"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Start Demo
            </Link>
            <a 
              href="#how-it-works"
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Learn More
            </a>
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="px-8 py-6 bg-white border-b">
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${contractsValid ? 'bg-green-400' : 'bg-red-400'}`} />
            <span className="text-gray-600">
              Smart Contracts: {contractsValid ? 'Deployed' : 'Not Available'}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${networkInfo.isLocal ? 'bg-yellow-400' : 'bg-green-400'}`} />
            <span className="text-gray-600">
              Network: {networkInfo.network === 'hardhat' ? 'Local Development' : 'Hedera Testnet'}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-400' : 'bg-gray-400'}`} />
            <span className="text-gray-600">
              Wallet: {isConnected ? 'Connected' : 'Not Connected'}
            </span>
          </div>
        </div>
      </div>

      {/* Static content is now shown immediately */}
      <StaticContent />

      {/* Technical Details */}
      <div className="px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Built on Modern Technology
          </h2>
          <p className="text-lg text-gray-600">
            Leveraging cutting-edge blockchain technology for security, transparency, and compliance.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="flex items-start space-x-4">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Smart Contract Security</h3>
                <p className="text-gray-600">
                  All transactions are secured by audited smart contracts with built-in compliance checks 
                  and regulatory controls.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Real-time Transparency</h3>
                <p className="text-gray-600">
                  Every transaction is recorded on the blockchain with immediate verification 
                  through block explorers and transaction hashes.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 2v8h10V6H5z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Modern Web Interface</h3>
                <p className="text-gray-600">
                  Built with Next.js, TypeScript, and Tailwind CSS for a responsive, 
                  fast, and user-friendly experience.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 rounded-xl p-8 text-white">
            <h3 className="text-xl font-semibold mb-6">System Status</h3>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Network</span>
                <span className="font-mono">
                  {networkInfo.network === 'hardhat' ? 'Local Development' : 'Hedera Testnet'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Chain ID</span>
                <span className="font-mono">{DEPLOYMENT_INFO.chainId}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Contracts</span>
                <span className={`font-mono ${contractsValid ? 'text-green-400' : 'text-red-400'}`}>
                  {contractsValid ? 'Deployed' : 'Not Available'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Wallet</span>
                <span className={`font-mono ${isConnected ? 'text-green-400' : 'text-yellow-400'}`}>
                  {isConnected ? 'Connected' : 'Not Connected'}
                </span>
              </div>
              {contractsValid && (
                <div className="pt-4 border-t border-gray-700">
                  <p className="text-xs text-gray-400 mb-2">Contract Addresses:</p>
                  <div className="space-y-1 text-xs font-mono">
                    <div className="truncate">
                      <span className="text-gray-400">Regulatory:</span> {CONTRACT_ADDRESSES.REGULATORY_MANAGEMENT}
                    </div>
                    <div className="truncate">
                      <span className="text-gray-400">Token:</span> {CONTRACT_ADDRESSES.REGULATED_ERC1155_TOKEN}
                    </div>
                    <div className="truncate">
                      <span className="text-gray-400">Market:</span> {CONTRACT_ADDRESSES.REGULATED_MARKETPLACE}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="px-8 py-16 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-center">
        <h2 className="text-3xl font-bold mb-4">
          Ready to Experience the Future of Equity Investment?
        </h2>
        <p className="text-xl mb-8 text-blue-100">
          Connect your wallet and explore the complete decentralized equity investment ecosystem.
        </p>
        <div className="flex justify-center space-x-4">
          <Link 
            href="/regulatory"
            className="px-8 py-3 bg-white text-blue-600 rounded-lg hover:bg-gray-100 transition-colors font-medium"
          >
            Start Demo
          </Link>
          {!isConnected && (
            <button className="px-8 py-3 border border-white text-white rounded-lg hover:bg-white hover:text-blue-600 transition-colors font-medium">
              Connect Wallet First
            </button>
          )}
        </div>
      </div>
    </div>
  )
}