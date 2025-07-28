# SSI Issuing Platform

A standalone Self-Sovereign Identity (SSI) credential issuing platform built with KERIA and signify-ts.

## Project Structure

```
ssi_issuer/
├── backend/                 # Express.js API server with signify-ts integration
│   ├── src/                # TypeScript source code
│   ├── dist/               # Compiled JavaScript (generated)
│   └── package.json        # Backend dependencies
├── admin-ui/               # React admin dashboard
│   ├── src/                # React TypeScript source code
│   ├── public/             # Static assets
│   └── package.json        # Admin UI dependencies
├── public-ui/              # React public registration interface
│   ├── src/                # React TypeScript source code
│   ├── public/             # Static assets
│   └── package.json        # Public UI dependencies
├── infrastructure/         # Docker and deployment configuration
│   ├── traefik/           # Traefik reverse proxy configuration
│   └── keria/             # KERIA and witness configurations
├── config/                 # Environment and configuration files
│   ├── .env.example       # Example environment variables
│   └── .env.dev           # Development environment variables
├── data/                   # MongoDB data volumes (gitignored)
├── logs/                   # Application log files (gitignored)
├── docs/                   # Documentation
├── docker-compose.yml      # Production Docker Compose
├── docker-compose.dev.yml  # Development Docker Compose
└── README.md              # This file
```

## Components

### Backend API (`backend/`)
- Express.js server with TypeScript
- signify-ts integration for KERIA operations
- MongoDB database with Mongoose ODM for data persistence
- JWT authentication for admin access
- RESTful API endpoints for all operations

### Admin Dashboard (`admin-ui/`)
- React application with Material-UI
- Redux Toolkit for state management
- Admin authentication and authorization
- Schema management interface
- Registration review and approval
- Credential management and monitoring

### Public Registration Interface (`public-ui/`)
- React application for user registration
- Mobile-friendly responsive design
- QR code generation for wallet connections
- Registration status tracking

### Infrastructure (`infrastructure/`)
- Traefik reverse proxy configuration
- KERIA and witness Docker configurations
- SSL/TLS certificate management
- Production deployment scripts

## Quick Start

### Development Environment

1. Copy environment configuration:
   ```bash
   cp config/.env.dev config/.env
   ```

2. Start the development environment:
   ```bash
   docker-compose -f docker-compose.dev.yml up -d
   ```

3. Install dependencies and start services:
   ```bash
   # Backend
   cd backend && npm install && npm run dev
   
   # Admin UI (new terminal)
   cd admin-ui && npm install && npm run dev
   
   # Public UI (new terminal)
   cd public-ui && npm install && npm run dev
   ```

### Production Deployment

See the deployment documentation in `docs/deployment.md` for detailed production setup instructions.

## Architecture

The platform follows a microservices architecture with:
- **Reverse Proxy**: Traefik for routing and SSL termination
- **Frontend Services**: React applications for admin and public interfaces
- **Backend API**: Express.js server with signify-ts integration
- **Database**: MongoDB with Mongoose ODM for data persistence
- **Cryptographic Layer**: KERIA instance with witness network

## Documentation

- [Requirements](../../.kiro/specs/ssi-issuing-platform/requirements.md)
- [Design Document](../../.kiro/specs/ssi-issuing-platform/design.md)
- [Implementation Tasks](../../.kiro/specs/ssi-issuing-platform/tasks.md)
- [API Documentation](docs/api.md) (to be created)
- [Deployment Guide](docs/deployment.md) (to be created)

## License

MIT License - see LICENSE file for details.