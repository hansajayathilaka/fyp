'use client'

import { clsx } from 'clsx'

interface SkeletonLoaderProps {
  className?: string
  variant?: 'text' | 'rectangular' | 'circular'
  width?: string | number
  height?: string | number
  lines?: number
}

/**
 * Skeleton loader component for better loading states
 * Provides consistent loading animations across the application
 */
export function SkeletonLoader({ 
  className, 
  variant = 'rectangular',
  width,
  height,
  lines = 1
}: SkeletonLoaderProps) {
  const baseClasses = 'animate-pulse bg-gray-200'
  
  const variantClasses = {
    text: 'h-4 rounded',
    rectangular: 'rounded-md',
    circular: 'rounded-full'
  }

  const style = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height
  }

  if (variant === 'text' && lines > 1) {
    return (
      <div className={clsx('space-y-2', className)}>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={clsx(baseClasses, variantClasses.text)}
            style={{
              ...style,
              width: index === lines - 1 ? '75%' : '100%'
            }}
          />
        ))}
      </div>
    )
  }

  return (
    <div
      className={clsx(baseClasses, variantClasses[variant], className)}
      style={style}
    />
  )
}

/**
 * Portfolio-specific skeleton components
 */
export function PortfolioSkeleton() {
  return (
    <div className="max-w-6xl mx-auto p-8 space-y-8">
      {/* Header Skeleton */}
      <div className="flex justify-between items-center">
        <div>
          <SkeletonLoader variant="text" width="300px" height="32px" className="mb-2" />
          <SkeletonLoader variant="text" width="400px" height="20px" />
        </div>
        <SkeletonLoader variant="rectangular" width="150px" height="40px" />
      </div>

      {/* Summary Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="bg-white rounded-lg border p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <SkeletonLoader variant="text" width="80px" height="16px" className="mb-2" />
                <SkeletonLoader variant="text" width="60px" height="24px" className="mb-1" />
                <SkeletonLoader variant="text" width="100px" height="12px" />
              </div>
              <SkeletonLoader variant="circular" width="48px" height="48px" />
            </div>
          </div>
        ))}
      </div>

      {/* ETH Balance Section Skeleton */}
      <div className="bg-white rounded-lg border">
        <div className="p-6 border-b border-gray-200">
          <SkeletonLoader variant="text" width="120px" height="20px" className="mb-1" />
          <SkeletonLoader variant="text" width="300px" height="16px" />
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <SkeletonLoader variant="text" width="100px" height="16px" className="mb-1" />
                      <SkeletonLoader variant="text" width="80px" height="20px" className="mb-1" />
                      <SkeletonLoader variant="text" width="120px" height="12px" />
                    </div>
                    <SkeletonLoader variant="circular" width="40px" height="40px" />
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-4">
              <SkeletonLoader variant="text" width="150px" height="16px" className="mb-4" />
              <div className="space-y-3">
                <div>
                  <SkeletonLoader variant="text" width="120px" height="12px" className="mb-2" />
                  <div className="flex space-x-2">
                    <SkeletonLoader variant="rectangular" className="flex-1" height="40px" />
                    <SkeletonLoader variant="rectangular" width="80px" height="40px" />
                  </div>
                </div>
                <div>
                  <SkeletonLoader variant="text" width="140px" height="12px" className="mb-2" />
                  <div className="flex space-x-2">
                    <SkeletonLoader variant="rectangular" className="flex-1" height="40px" />
                    <SkeletonLoader variant="rectangular" width="80px" height="40px" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Token Holdings Section Skeleton */}
      <div className="bg-white rounded-lg border">
        <div className="p-6 border-b border-gray-200">
          <SkeletonLoader variant="text" width="140px" height="20px" className="mb-1" />
          <SkeletonLoader variant="text" width="280px" height="16px" />
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-6 border">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <SkeletonLoader variant="text" width="120px" height="18px" className="mb-1" />
                    <SkeletonLoader variant="text" width="160px" height="14px" />
                  </div>
                  <SkeletonLoader variant="circular" width="40px" height="40px" />
                </div>
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, lineIndex) => (
                    <div key={lineIndex} className="flex justify-between items-center">
                      <SkeletonLoader variant="text" width="80px" height="14px" />
                      <SkeletonLoader variant="text" width="60px" height="14px" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Token Holdings Card Skeleton
 */
export function TokenHoldingCardSkeleton() {
  return (
    <div className="bg-gray-50 rounded-lg p-6 border">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <SkeletonLoader variant="text" width="120px" height="18px" className="mb-1" />
          <SkeletonLoader variant="text" width="160px" height="14px" />
        </div>
        <SkeletonLoader variant="circular" width="40px" height="40px" />
      </div>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <SkeletonLoader variant="text" width="80px" height="14px" />
          <SkeletonLoader variant="text" width="60px" height="14px" />
        </div>
        <div className="flex justify-between items-center">
          <SkeletonLoader variant="text" width="60px" height="14px" />
          <SkeletonLoader variant="text" width="40px" height="14px" />
        </div>
        <div className="flex justify-between items-center">
          <SkeletonLoader variant="text" width="80px" height="14px" />
          <SkeletonLoader variant="text" width="50px" height="14px" />
        </div>
        <div className="pt-3 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <SkeletonLoader variant="text" width="70px" height="14px" />
            <SkeletonLoader variant="text" width="80px" height="14px" />
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * ETH Balance Section Skeleton
 */
export function ETHBalanceSkeleton() {
  return (
    <div className="bg-white rounded-lg border">
      <div className="p-6 border-b border-gray-200">
        <SkeletonLoader variant="text" width="120px" height="20px" className="mb-1" />
        <SkeletonLoader variant="text" width="300px" height="16px" />
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <SkeletonLoader variant="text" width="100px" height="16px" className="mb-1" />
                    <SkeletonLoader variant="text" width="80px" height="20px" className="mb-1" />
                    <SkeletonLoader variant="text" width="120px" height="12px" />
                  </div>
                  <SkeletonLoader variant="circular" width="40px" height="40px" />
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-4">
            <SkeletonLoader variant="text" width="150px" height="16px" className="mb-4" />
            <div className="space-y-3">
              <div>
                <SkeletonLoader variant="text" width="120px" height="12px" className="mb-2" />
                <div className="flex space-x-2">
                  <SkeletonLoader variant="rectangular" className="flex-1" height="40px" />
                  <SkeletonLoader variant="rectangular" width="80px" height="40px" />
                </div>
              </div>
              <div>
                <SkeletonLoader variant="text" width="140px" height="12px" className="mb-2" />
                <div className="flex space-x-2">
                  <SkeletonLoader variant="rectangular" className="flex-1" height="40px" />
                  <SkeletonLoader variant="rectangular" width="80px" height="40px" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}