import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProgressStepper from './ProgressStepper';

describe('ProgressStepper', () => {
  const mockSteps = [
    {
      id: 1,
      title: 'Connect Wallet',
      description: 'Link your MetaMask wallet',
      status: 'completed' as const,
    },
    {
      id: 2,
      title: 'Fill Information',
      description: 'Provide your details',
      status: 'current' as const,
    },
    {
      id: 3,
      title: 'Receive Credential',
      description: 'Scan QR code with Truvera wallet',
      status: 'upcoming' as const,
    },
  ];

  it('renders all steps', () => {
    render(<ProgressStepper steps={mockSteps} />);
    
    // Use getAllByText since we have both desktop and mobile versions
    expect(screen.getAllByText('Connect Wallet')).toHaveLength(1);
    expect(screen.getAllByText('Fill Information')).toHaveLength(2); // Desktop + mobile current step
    expect(screen.getAllByText('Receive Credential')).toHaveLength(1);
  });

  it('shows step descriptions', () => {
    render(<ProgressStepper steps={mockSteps} />);
    
    expect(screen.getAllByText('Link your MetaMask wallet')).toHaveLength(1);
    expect(screen.getAllByText('Provide your details')).toHaveLength(2); // Desktop + mobile current step
    expect(screen.getAllByText('Scan QR code with Truvera wallet')).toHaveLength(1);
  });

  it('displays step numbers correctly', () => {
    render(<ProgressStepper steps={mockSteps} />);
    
    // Step 2 should show number 2 (current) - appears in both desktop and mobile
    expect(screen.getAllByText('2')).toHaveLength(2);
    
    // Step 3 should show number 3 (upcoming) - appears in both desktop and mobile
    expect(screen.getAllByText('3')).toHaveLength(2);
  });

  it('applies correct CSS classes for different step states', () => {
    const { container } = render(<ProgressStepper steps={mockSteps} />);
    
    // Check for completed step styling (green) - should appear in both desktop and mobile
    const completedSteps = container.querySelectorAll('.bg-green-500');
    expect(completedSteps.length).toBeGreaterThan(0);
    
    // Check for current step styling (blue) - should appear in both desktop and mobile
    const currentSteps = container.querySelectorAll('.bg-blue-500');
    expect(currentSteps.length).toBeGreaterThan(0);
    
    // Check for upcoming step styling (gray) - should appear in both desktop and mobile
    const upcomingSteps = container.querySelectorAll('.bg-gray-300');
    expect(upcomingSteps.length).toBeGreaterThan(0);
  });

  it('shows current step info in mobile view', () => {
    render(<ProgressStepper steps={mockSteps} />);
    
    // The mobile version should show the current step info
    const currentStepElements = screen.getAllByText('Fill Information');
    expect(currentStepElements.length).toBeGreaterThan(1); // Desktop + mobile
  });
});