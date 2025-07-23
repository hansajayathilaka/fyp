import { render, screen } from '@testing-library/react'
import { TransactionFeedback, useEnhancedTransactionState } from '../TransactionFeedback'
import { ImmediateTransactionFeedback } from '../EtherscanLink'

// Mock wagmi hooks
jest.mock('wagmi', () => ({
  useWaitForTransactionReceipt: () => ({
    data: null,
    isError: false,
    isLoading: false,
    isSuccess: false
  })
}))

describe('TransactionFeedback', () => {
  it('renders immediate feedback when transaction is submitted', () => {
    const mockTransaction = {
      hash: '0x1234567890abcdef' as `0x${string}`,
      status: 'pending' as const,
      title: 'Test Transaction',
      description: 'Testing transaction feedback'
    }

    render(<TransactionFeedback transaction={mockTransaction} />)
    
    expect(screen.getByText('Test Transaction')).toBeInTheDocument()
    expect(screen.getByText(/transaction has been submitted/i)).toBeInTheDocument()
    expect(screen.getByText('0x1234567890abcdef')).toBeInTheDocument()
  })

  it('does not render when transaction is idle', () => {
    const mockTransaction = {
      status: 'idle' as const
    }

    const { container } = render(<TransactionFeedback transaction={mockTransaction} />)
    expect(container.firstChild).toBeNull()
  })
})

describe('ImmediateTransactionFeedback', () => {
  it('renders transaction hash and explorer link', () => {
    const hash = '0x1234567890abcdef' as `0x${string}`
    
    render(<ImmediateTransactionFeedback hash={hash} title="Test Transaction" />)
    
    expect(screen.getByText('Test Transaction')).toBeInTheDocument()
    expect(screen.getByText(hash)).toBeInTheDocument()
    expect(screen.getByText(/track transaction progress/i)).toBeInTheDocument()
  })
})

describe('useEnhancedTransactionState', () => {
  it('provides correct transaction state management', () => {
    let hookResult: ReturnType<typeof useEnhancedTransactionState>
    
    function TestComponent() {
      hookResult = useEnhancedTransactionState()
      return null
    }
    
    render(<TestComponent />)
    
    expect(hookResult!.transaction.status).toBe('idle')
    
    // Test setting transaction as submitting
    hookResult!.setTransactionSubmitting('Test Title', 'Test Description')
    expect(hookResult!.transaction.status).toBe('submitting')
    expect(hookResult!.transaction.title).toBe('Test Title')
    expect(hookResult!.transaction.description).toBe('Test Description')
    
    // Test setting transaction hash
    const hash = '0x1234567890abcdef' as `0x${string}`
    hookResult!.setTransactionHash(hash)
    expect(hookResult!.transaction.hash).toBe(hash)
    expect(hookResult!.transaction.status).toBe('pending')
    
    // Test setting error
    hookResult!.setTransactionError('Test Error', 'Error Title')
    expect(hookResult!.transaction.status).toBe('error')
    expect(hookResult!.transaction.error).toBe('Test Error')
    expect(hookResult!.transaction.title).toBe('Error Title')
    
    // Test reset
    hookResult!.resetTransaction()
    expect(hookResult!.transaction.status).toBe('idle')
  })
})