# SSI Issuer Platform - Docker Setup Guide

## Overview

The SSI Issuer Platform uses a modular Docker Compose setup with separate files for different components and environments:

- `docker-compose.yml` - Main production configuration with Traefik
- `docker-compose.dev.yml` - Development configuration with exposed ports
- `docker-compose.keria.yml` - KERIA instance configuration
- `docker-compose.witnesses.yml` - 6 witness services configuration
- `docker-compose.services.yml` - Application services (API, Admin UI, Public UI)

## Architecture

### Production Environment
```
Internet → Traefik (SSL/TLS) → [ssi-network] → Services
                                    ↓
                              KERIA + 6 Witnesses
```

### Development Environment
```
localhost:ports → [ssi-dev-network] → Services
                        ↓
                  KERIA + 6 Witnesses
```

## Traefik Reverse Proxy Configuration

### Production Routing
- **`ssi-issuer.${DOMAIN}`** - Public registration interface
- **`ssi-issuer-admin.${DOMAIN}`** - Admin dashboard
- **`ssi-issuer-api.${DOMAIN}`** - Backend API
- **`ssi-issuer-traefik.${DOMAIN}`** - Traefik dashboard

### Development Routing Options

#### Option 1: Direct Port Access (Default)
- **`localhost:3002`** - Public registration interface
- **`localhost:3001`** - Admin dashboard
- **`localhost:3000`** - Backend API

#### Option 2: Traefik Development Routing (Same subdomains as production)
- **`ssi-issuer.localhost`** - Public registration interface
- **`ssi-issuer-admin.localhost`** - Admin dashboard
- **`ssi-issuer-api.localhost`** - Backend API
- **`localhost:8080`** - Traefik dashboard

### SSL Certificate Management
- **Let's Encrypt**: Automatic certificate provisioning and renewal
- **HTTP Challenge**: Domain validation method
- **Certificate Storage**: Persistent volume (`traefik-certs`)
- **HTTPS Redirect**: Automatic HTTP to HTTPS redirection

### Security Features
- **Security Headers**: HSTS, CSP, X-Frame-Options
- **Rate Limiting**: API and general request limiting
- **CORS Configuration**: Cross-origin request handling
- **Compression**: Response compression middleware

## Network Configuration

### Production Network (`ssi-network`)
- **Type**: Bridge network
- **Purpose**: Secure internal communication between services
- **External Access**: Only through Traefik reverse proxy

### Development Network (`ssi-dev-network`)
- **Type**: Bridge network
- **Purpose**: Local development with direct port access
- **External Access**: Direct port mapping to localhost

## KERIA and Witness Configuration

### KERIA Instance
- **Production**: Internal access only (through ssi-network)
- **Development**: Exposed on ports 3901 (admin) and 3903 (boot)
- **Health Check**: HTTP endpoint monitoring
- **Dependencies**: Waits for all 6 witnesses to be healthy

### Witness Network (6 Witnesses)
- **witness-0**: Port 5621
- **witness-1**: Port 5622
- **witness-2**: Port 5623
- **witness-3**: Port 5624
- **witness-4**: Port 5625
- **witness-5**: Port 5626

### Witness Configuration
- **Threshold**: 4 of 6 witnesses required for operations
- **Storage**: Persistent volumes for witness data
- **Health Checks**: HTTP endpoint monitoring
- **Network**: Internal communication within Docker network

## Volume Management

### Production Volumes
- `keria-data`: KERIA instance data persistence
- `witness-data`: Shared witness data storage
- `mongodb-data`: MongoDB database storage
- `traefik-certs`: SSL certificate storage

### Development Volumes
- `keria-dev-data`: Development KERIA data
- `witness-dev-data`: Development witness data
- `mongodb-dev-data`: Development MongoDB database

## Usage

### Production Deployment
```bash
# Start all production services
docker-compose --profile production up -d

# Start only KERIA and witnesses
docker-compose --profile keria --profile witness up -d

# Start with Traefik
docker-compose --profile traefik --profile production up -d
```

### Development Environment

#### Option 1: Direct Port Access (Recommended for Development)
```bash
# Start development environment with direct port access
docker-compose -f docker-compose.dev.yml up -d

# Access services directly:
# - http://localhost:3002 (Public UI)
# - http://localhost:3001 (Admin UI)
# - http://localhost:3000 (API)
```

#### Option 2: Development with Traefik Routing
```bash
# Start development environment with Traefik
docker-compose -f docker-compose.dev.yml --profile traefik-dev up -d

# Access services via Traefik:
# - http://ssi-issuer.localhost (Public UI)
# - http://ssi-issuer-admin.localhost (Admin UI)
# - http://ssi-issuer-api.localhost (API)
# - http://localhost:8080 (Traefik Dashboard)
```

#### KERIA and Witnesses Only
```bash
# Start only KERIA and witnesses for development
docker-compose -f docker-compose.dev.yml up -d keria-dev witness-0-dev witness-1-dev witness-2-dev witness-3-dev witness-4-dev witness-5-dev
```

### Individual Components
```bash
# Start only witnesses
docker-compose --profile witness up -d

# Start only KERIA
docker-compose --profile keria up -d

# Start only application services
docker-compose --profile api --profile admin --profile public up -d
```

## Environment Configuration

### Required Environment Variables
```bash
# Domain configuration (production)
DOMAIN=yourdomain.com
TRAEFIK_EMAIL=admin@yourdomain.com

# Database configuration
MONGODB_URI=mongodb://admin:secure-password@mongodb:27017/ssi_issuer?authSource=admin
MONGODB_ROOT_USERNAME=admin
MONGODB_ROOT_PASSWORD=secure-password

# KERIA configuration
KERIA_IMAGE=weboftrust/keria:1.2.0-dev4

# Security
JWT_SECRET=your-secure-jwt-secret

# Node environment
NODE_ENV=production
```

### Development Environment
```bash
# Copy development environment
cp config/.env.dev .env

# Or use example configuration
cp config/.env.example .env
```

## Health Monitoring

### Health Check Endpoints
- **KERIA**: `http://localhost:3901/health` (development)
- **Witnesses**: `http://localhost:562X/health` (where X is 1-6)
- **MongoDB**: `http://localhost:27017` (development)
- **API**: `http://localhost:3000/health` (development)

### Service Dependencies
- **KERIA** waits for all witnesses to be healthy
- **Application services** wait for MongoDB and KERIA to be ready
- **MongoDB** provides persistent data storage with connection pooling
- **Traefik** manages SSL and routing automatically

## Troubleshooting

### Common Issues

1. **Witnesses not starting**
   ```bash
   # Check witness logs
   docker-compose logs witness-0
   
   # Restart witnesses
   docker-compose restart witness-0 witness-1 witness-2 witness-3 witness-4 witness-5
   ```

2. **KERIA connection issues**
   ```bash
   # Check KERIA logs
   docker-compose logs keria
   
   # Verify witness connectivity
   docker-compose exec keria curl http://witness-0:5621/health
   ```

3. **Network connectivity**
   ```bash
   # Inspect network
   docker network inspect ssi-issuer-prod_ssi-network
   
   # Test internal connectivity
   docker-compose exec keria ping witness-0
   ```

### Log Management
- **Log Rotation**: Configured for 10MB max size, 3 files
- **Log Location**: JSON format for structured logging
- **Debug Mode**: Set `LOG_LEVEL=debug` in environment

## Security Considerations

### Network Security
- Internal Docker network isolates services
- Only Traefik exposes services externally
- Witnesses communicate only within network

### Data Security
- Persistent volumes for data integrity
- Separate development and production data
- Health checks prevent unhealthy service exposure

### SSL/TLS
- Automatic Let's Encrypt certificates
- HTTP to HTTPS redirection
- Secure headers via Traefik middleware