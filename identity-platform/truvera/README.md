# SSI Issuing Platform

A Self-Sovereign Identity (SSI) issuing platform built with React and Node.js that enables users to connect their MetaMask wallet, establish a connection with their Truvera wallet, and receive verifiable credentials.

## Project Structure

```
├── frontend/          # React frontend with Vite and TypeScript
├── backend/           # Node.js backend with Express and TypeScript
├── .kiro/            # Kiro specifications and configuration
└── README.md         # This file
```

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- MetaMask browser extension
- Truvera wallet mobile app

## Quick Start

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment variables:
   ```bash
   cp .env.example .env
   ```

4. Update the `.env` file with your Truvera API credentials

5. Start the development server:
   ```bash
   npm run dev
   ```

The backend will be available at `http://localhost:3001`

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment variables:
   ```bash
   cp .env.example .env
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

The frontend will be available at `http://localhost:3000`

## Development

### Available Scripts

#### Frontend
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run format` - Format code with Prettier

#### Backend
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run format` - Format code with Prettier

## Environment Variables

### Backend (.env)
- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment (development/production)
- `FRONTEND_URL` - Frontend URL for CORS
- `SESSION_SECRET` - Session secret key
- `TRUVERA_API_URL` - Truvera API base URL
- `TRUVERA_API_KEY` - Truvera API key
- `ISSUER_DID` - Issuer DID for credentials
- `CREDENTIAL_SCHEMA_URL` - URL for credential schema

### Frontend (.env)
- `VITE_API_BASE_URL` - Backend API URL
- `VITE_APP_NAME` - Application name

## Technology Stack

### Frontend
- React 18 with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- Web3.js for MetaMask integration
- Axios for API communication
- Vitest for testing

### Backend
- Node.js with Express.js
- TypeScript
- Express-session for session management
- Helmet for security headers
- CORS middleware
- Jest for testing

## License

This project is licensed under the MIT License.