import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('App', () => {
  it('renders the main heading', () => {
    render(<App />);
    const heading = screen.getByText('SSI Issuing Platform');
    expect(heading).toBeInTheDocument();
  });

  it('renders the session initialization loading state', () => {
    render(<App />);
    const loadingText = screen.getByText('Initializing session...');
    expect(loadingText).toBeInTheDocument();
  });

  it('renders the progress stepper at the top', () => {
    render(<App />);
    const connectWalletSteps = screen.getAllByText('Connect Wallet');
    expect(connectWalletSteps.length).toBeGreaterThan(0); // Should find at least one (desktop and/or mobile)
  });
});
