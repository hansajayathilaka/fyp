'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { WalletConnect } from './WalletConnect'
import { getCurrentNetworkInfo } from '../lib/wagmi'
import { clsx } from 'clsx'
import { ClientOnly } from './ClientOnly'

const navigationItems = [
  { href: '/', label: 'Home', description: 'Project Overview' },
  { href: '/regulatory', label: 'Regulatory', description: 'User Management' },
  { href: '/tokens', label: 'Tokens', description: 'Equity Token Management' },
  { href: '/marketplace', label: 'Marketplace', description: 'Investment Interface' },
  { href: '/portfolio', label: 'Portfolio', description: 'Asset Overview' },
]



export function Navigation() {
  const pathname = usePathname()

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Title */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-12 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">DEIP</span>
              </div>
              <span className="text-xl font-semibold text-gray-900">
                Decentralized Equity Investment Platform
              </span>
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-1">
            {navigationItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  pathname === item.href
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                )}
                title={item.description}
              >
                {item.label}
              </Link>
            ))}

          </div>

          {/* Network Info and Wallet */}
          <div className="flex items-center space-x-4">
            {/* Network Indicator */}
            <ClientOnly fallback={
              <div className="hidden sm:flex items-center space-x-2 text-sm">
                <div className="w-2 h-2 rounded-full bg-gray-400" />
                <span className="text-gray-600">Loading...</span>
              </div>
            }>
              <NetworkIndicator />
            </ClientOnly>

            {/* Wallet Connection */}
            <WalletConnect />
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden pb-3">
          <div className="flex flex-wrap gap-2">
            {navigationItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'px-3 py-1 rounded-md text-sm font-medium transition-colors',
                  pathname === item.href
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                )}
              >
                {item.label}
              </Link>
            ))}

          </div>
        </div>
      </div>
    </nav>
  )
}

function NetworkIndicator() {
  const networkInfo = getCurrentNetworkInfo()

  return (
    <div className="hidden sm:flex items-center space-x-2 text-sm">
      <div className={clsx(
        'w-2 h-2 rounded-full',
        networkInfo.isLocal ? 'bg-yellow-400' : 'bg-green-400'
      )} />
      <span className="text-gray-600">
        {networkInfo.network === 'hardhat' ? 'Local' : 'Fantom Sonic Testnet'}
      </span>
    </div>
  )
}