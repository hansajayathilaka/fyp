# Frontend API Services

This directory contains the API service layer and TypeScript types for the credential verifier frontend.

## Overview

The API service layer provides a clean interface for communicating with the verifier backend, handling errors, retries, and providing type-safe operations.

## Key Components

### Types (`../types/index.ts`)
- **ProofRequestConfig**: Configuration for creating proof requests
- **ProofRequest**: Proof request data structure
- **CredentialPresentation**: Credential presentation from wallet
- **VerificationResult**: Results of credential verification
- **ErrorState**: Standardized error handling
- **VerificationSession**: Complete verification session state

### API Service (`api.ts`)
Low-level HTTP client with:
- Automatic retries for recoverable errors
- Request/response interceptors
- Standardized error handling
- Type-safe API methods

### Verification Service (`verification.ts`)
High-level verification operations:
- Proof request creation and monitoring
- Status polling with automatic cleanup
- Verification result processing
- Custom action integration

## Usage Examples

### Basic Proof Request
```typescript
import { verificationService } from './services';

const { proofRequest, error } = await verificationService.createProofRequest({
  name: 'Access Verification',
  credentialTypes: ['DEIPAccessCredential'],
  requiredFields: [
    { path: 'credentialSubject.id', required: true }
  ]
});
```

### Status Monitoring
```typescript
verificationService.startStatusMonitoring(
  proofRequestId,
  (status) => console.log('Status:', status),
  (error) => console.error('Error:', error)
);
```

### Verification
```typescript
const { result, error } = await verificationService.verifyPresentation(presentation);
if (result) {
  const formatted = verificationService.formatVerificationResult(result);
  console.log(formatted.summary);
}
```

## Configuration

Set environment variables in `.env`:
- `VITE_API_URL`: Backend API URL
- `VITE_CUSTOM_INTEGRATION_ENABLED`: Enable custom actions
- `VITE_DEFAULT_TIMEOUT_MINUTES`: Default proof request timeout

## Error Handling

All services return standardized error objects with:
- `type`: Error category (network, validation, verification, integration)
- `code`: Specific error code
- `message`: User-friendly message
- `recoverable`: Whether retry is possible

Use the error handling utilities in `../utils/errorHandling.ts` for consistent error display and logging.