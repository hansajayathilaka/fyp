import React from 'react';

interface Step {
  id: number;
  title: string;
  description: string;
  status: 'completed' | 'current' | 'upcoming';
}

interface ProgressStepperProps {
  steps: Step[];
  className?: string;
}

export default function ProgressStepper({ steps, className = '' }: ProgressStepperProps) {
  return (
    <div className={`w-full ${className}`}>
      {/* Desktop stepper */}
      <div className="hidden md:block">
        <div className="flex items-center justify-center">
          {steps.map((step, index) => (
            <React.Fragment key={step.id}>
              {/* Step circle */}
              <div className="flex flex-col items-center">
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors
                    ${step.status === 'completed' 
                      ? 'bg-green-500 text-white' 
                      : step.status === 'current'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-300 text-gray-500'
                    }
                  `}
                >
                  {step.status === 'completed' ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    step.id
                  )}
                </div>
                
                {/* Step label */}
                <div className="mt-2 text-center">
                  <div className={`text-sm font-medium ${
                    step.status === 'current' ? 'text-blue-600' : 
                    step.status === 'completed' ? 'text-green-600' : 'text-gray-500'
                  }`}>
                    {step.title}
                  </div>
                  <div className="text-xs text-gray-500 mt-1 max-w-24">
                    {step.description}
                  </div>
                </div>
              </div>
              
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className={`
                  flex-1 h-0.5 mx-4 transition-colors
                  ${step.status === 'completed' ? 'bg-green-500' : 'bg-gray-300'}
                `} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Mobile stepper */}
      <div className="md:hidden">
        <div className="flex items-center justify-center space-x-2">
          {steps.map((step, index) => (
            <React.Fragment key={step.id}>
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors
                  ${step.status === 'completed' 
                    ? 'bg-green-500 text-white' 
                    : step.status === 'current'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-300 text-gray-500'
                  }
                `}
              >
                {step.status === 'completed' ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  step.id
                )}
              </div>
              
              {index < steps.length - 1 && (
                <div className={`
                  w-8 h-0.5 transition-colors
                  ${step.status === 'completed' ? 'bg-green-500' : 'bg-gray-300'}
                `} />
              )}
            </React.Fragment>
          ))}
        </div>
        
        {/* Current step info for mobile */}
        {(() => {
          const currentStep = steps.find(step => step.status === 'current');
          return currentStep ? (
            <div className="text-center mt-3">
              <div className="text-sm font-medium text-blue-600">{currentStep.title}</div>
              <div className="text-xs text-gray-500 mt-1">{currentStep.description}</div>
            </div>
          ) : null;
        })()}
      </div>
    </div>
  );
}