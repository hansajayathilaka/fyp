import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import {
  ErrorState,
  ContractErrorState,
  WalletNotConnectedState,
  EmptyPortfolioState,
  NoEthState,
  PartialErrorState,
  NetworkStatusIndicator
} from '../PortfolioErrorStates'

describe('Portfolio Error States', () => {
  describe('ErrorState', () => {
    it('renders error state with title and message', () => {
      render(
        <ErrorState
          title="Test Error"
          message="This is a test error message"
        />
      )
      
      expect(screen.getByText('Test Error')).toBeInTheDocument()
      expect(screen.getByText('This is a test error message')).toBeInTheDocument()
    })

    it('renders custom actions when provided', () => {
      const mockAction = jest.fn()
      render(
        <ErrorState
          title="Test Error"
          message="Test message"
          actions={
            <button onClick={mockAction}>Custom Action</button>
          }
        />
      )
      
      const button = screen.getByText('Custom Action')
      expect(button).toBeInTheDocument()
      
      fireEvent.click(button)
      expect(mockAction).toHaveBeenCalled()
    })
  })

  describe('ContractErrorState', () => {
    it('renders network error correctly', () => {
      render(
        <ContractErrorState
          error="Network timeout error"
          onRetry={jest.fn()}
        />
      )
      
      expect(screen.getByText('Network Connection Error')).toBeInTheDocument()
      expect(screen.getByText(/Unable to connect to the blockchain network/)).toBeInTheDocument()
    })

    it('renders contract error correctly', () => {
      render(
        <ContractErrorState
          error="Contract execution reverted"
          onRetry={jest.fn()}
        />
      )
      
      expect(screen.getByText('Smart Contract Error')).toBeInTheDocument()
      expect(screen.getByText(/smart contract returned an error/)).toBeInTheDocument()
    })

    it('calls retry function when retry button is clicked', () => {
      const mockRetry = jest.fn()
      render(
        <ContractErrorState
          error="Test error"
          onRetry={mockRetry}
        />
      )
      
      const retryButton = screen.getByText('Retry')
      fireEvent.click(retryButton)
      expect(mockRetry).toHaveBeenCalled()
    })
  })

  describe('WalletNotConnectedState', () => {
    it('renders wallet connection prompt', () => {
      render(<WalletNotConnectedState />)
      
      expect(screen.getByText('Portfolio Overview')).toBeInTheDocument()
      expect(screen.getByText('Wallet Connection Required')).toBeInTheDocument()
      expect(screen.getByText(/Please connect your wallet/)).toBeInTheDocument()
    })
  })

  describe('EmptyPortfolioState', () => {
    it('renders empty portfolio state without ETH', () => {
      render(<EmptyPortfolioState hasEth={false} />)
      
      expect(screen.getByText('Empty Portfolio')).toBeInTheDocument()
      expect(screen.getByText(/don't have any assets yet/)).toBeInTheDocument()
    })

    it('renders no tokens state with ETH', () => {
      render(<EmptyPortfolioState hasEth={true} />)
      
      expect(screen.getByText('No Token Holdings')).toBeInTheDocument()
      expect(screen.getByText(/You have ETH but no tokens yet/)).toBeInTheDocument()
    })

    it('renders navigation links', () => {
      render(<EmptyPortfolioState />)
      
      expect(screen.getByText('Visit Marketplace')).toBeInTheDocument()
      expect(screen.getByText('Manage Tokens')).toBeInTheDocument()
    })
  })

  describe('NoEthState', () => {
    it('renders no ETH warning', () => {
      render(<NoEthState />)
      
      expect(screen.getByText('No ETH Balance')).toBeInTheDocument()
      expect(screen.getByText(/You need ETH to interact/)).toBeInTheDocument()
    })

    it('renders action buttons', () => {
      render(<NoEthState />)
      
      expect(screen.getByText('Get Test ETH')).toBeInTheDocument()
      expect(screen.getByText('Refresh Balance')).toBeInTheDocument()
    })
  })

  describe('PartialErrorState', () => {
    it('renders partial error with retry option', () => {
      const mockRetry = jest.fn()
      render(
        <PartialErrorState
          title="Partial Error"
          message="Some data failed to load"
          onRetry={mockRetry}
        />
      )
      
      expect(screen.getByText('Partial Error')).toBeInTheDocument()
      expect(screen.getByText('Some data failed to load')).toBeInTheDocument()
      
      const retryButton = screen.getByText('Retry')
      fireEvent.click(retryButton)
      expect(mockRetry).toHaveBeenCalled()
    })
  })

  describe('NetworkStatusIndicator', () => {
    it('does not render when online and connected', () => {
      const { container } = render(
        <NetworkStatusIndicator isOnline={true} isConnected={true} />
      )
      
      expect(container.firstChild).toBeNull()
    })

    it('renders offline indicator', () => {
      render(
        <NetworkStatusIndicator isOnline={false} isConnected={true} />
      )
      
      expect(screen.getByText('No Internet Connection')).toBeInTheDocument()
    })

    it('renders blockchain connection lost indicator', () => {
      render(
        <NetworkStatusIndicator isOnline={true} isConnected={false} />
      )
      
      expect(screen.getByText('Blockchain Connection Lost')).toBeInTheDocument()
    })
  })
})