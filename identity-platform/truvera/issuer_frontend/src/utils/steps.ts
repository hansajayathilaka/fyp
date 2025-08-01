import { ProcessStep } from '../types';

export interface StepInfo {
  id: number;
  title: string;
  description: string;
  status: 'completed' | 'current' | 'upcoming';
}

export function getProgressSteps(currentStep: ProcessStep): StepInfo[] {
  const allSteps = [
    {
      id: 1,
      title: 'Connect Wallet',
      description: 'Link your MetaMask wallet',
      processStep: ProcessStep.WALLET_CONNECTION,
    },
    {
      id: 2,
      title: 'Fill Information',
      description: 'Provide your details',
      processStep: ProcessStep.FORM_SUBMISSION,
    },
    {
      id: 3,
      title: 'Receive Credential',
      description: 'Scan QR code with Truvera wallet',
      processStep: ProcessStep.QR_GENERATION,
    },
  ];

  // Define the order of process steps
  const stepOrder = [
    ProcessStep.WALLET_CONNECTION,
    ProcessStep.FORM_SUBMISSION,
    ProcessStep.QR_GENERATION,
    ProcessStep.WALLET_PAIRING, // Same as QR_GENERATION for UI purposes
    ProcessStep.CREDENTIAL_ISSUANCE,
    ProcessStep.COMPLETION,
  ];

  const currentStepIndex = stepOrder.indexOf(currentStep);

  return allSteps.map((step, index) => {
    let status: 'completed' | 'current' | 'upcoming';
    
    if (index < currentStepIndex || 
        (currentStep === ProcessStep.WALLET_PAIRING && index <= 1) ||
        (currentStep === ProcessStep.CREDENTIAL_ISSUANCE && index <= 2) ||
        (currentStep === ProcessStep.COMPLETION && index <= 2)) {
      status = 'completed';
    } else if (index === currentStepIndex || 
               (currentStep === ProcessStep.WALLET_PAIRING && index === 2) ||
               (currentStep === ProcessStep.CREDENTIAL_ISSUANCE && index === 2) ||
               (currentStep === ProcessStep.COMPLETION && index === 2)) {
      status = 'current';
    } else {
      status = 'upcoming';
    }

    return {
      id: step.id,
      title: step.title,
      description: step.description,
      status,
    };
  });
}