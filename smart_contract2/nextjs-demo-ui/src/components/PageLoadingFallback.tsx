'use client'

import { LoadingSpinner } from './LoadingSpinner'

interface PageLoadingFallbackProps {
  title: string
  description?: string
  className?: string
}

export function PageLoadingFallback({ 
  title, 
  description = 'Initializing blockchain connection...', 
  className = '' 
}: PageLoadingFallbackProps) {
  return (
    <div className={`max-w-6xl mx-auto p-8 ${className}`}>
      <div className="text-center py-12">
        <div className="mb-6">
          <LoadingSpinner size="lg" className="mx-auto" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
        <p className="text-gray-600">{description}</p>
        <div className="mt-4 text-sm text-gray-500">
          This should only take a moment...
        </div>
      </div>
    </div>
  )
}