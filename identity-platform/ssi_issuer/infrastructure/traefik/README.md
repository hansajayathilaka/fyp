# Traefik Reverse Proxy Configuration

This directory contains the Traefik reverse proxy configuration for the SSI Issuing Platform.

## Overview

Traefik is configured to handle:
- SSL certificate management with Let's Encrypt
- HTTP to HTTPS redirection
- Load balancing and service discovery
- Security headers and rate limiting
- CORS configuration for API endpoints

## Configuration Files

### Production Configuration

- **`traefik.yml`** - Main Traefik configuration for production
  - Docker provider for service discovery
  - Let's Encrypt ACME configuration
  - SSL/TLS settings
  - Entry points (HTTP/HTTPS)
  - API dashboard configuration

- **`dynamic.yml`** - Dynamic configuration for middlewares
  - Security headers middleware
  - Rate limiting middleware
  - CORS middleware for API
  - Compression middleware

### Development Configuration

- **`traefik.dev.yml`** - Development configuration
  - No SSL/HTTPS (uses HTTP only)
  - Debug logging enabled
  - Insecure dashboard access

## Domain Routing

### Production Domains
- **`ssi-issuer.${DOMAIN}`** - Public registration interface
- **`ssi-issuer-admin.${DOMAIN}`** - Admin dashboard
- **`ssi-issuer-api.${DOMAIN}`** - Backend API
- **`ssi-issuer-traefik.${DOMAIN}`** - Traefik dashboard

### Development Domains (when using Traefik)
- **`ssi-issuer.localhost`** - Public registration interface
- **`ssi-issuer-admin.localhost`** - Admin dashboard  
- **`ssi-issuer-api.localhost`** - Backend API
- **`localhost:8080`** - Traefik dashboard

### Development Direct Access (without Traefik)
- **`localhost:3002`** - Public registration interface
- **`localhost:3001`** - Admin dashboard
- **`localhost:3000`** - Backend API

## SSL Certificate Management

### Let's Encrypt Configuration
- Uses HTTP challenge for domain validation
- Certificates stored in `/certificates/acme.json`
- Automatic renewal
- Email notifications configured via `TRAEFIK_EMAIL` environment variable

### Certificate Storage
- Volume `traefik-certs` mounted to `/certificates`
- Persistent storage for certificate data
- Backup recommended for production

## Security Features

### Security Headers
- HSTS (HTTP Strict Transport Security)
- Content Security Policy headers
- X-Frame-Options: SAMEORIGIN
- X-Content-Type-Options: nosniff
- Referrer Policy: same-origin

### Rate Limiting
- General rate limit: 100 requests/minute (burst: 50)
- API rate limit: 50 requests/minute (burst: 20)
- Per-IP tracking

### CORS Configuration
- Configured for cross-origin requests between UI and API
- Allows credentials for authenticated requests
- Restricted to known origins

## Middleware Chain

### API Services (`ssi-api`)
1. `security-headers@file` - Security headers
2. `cors-api@file` - CORS configuration
3. `api-rate-limit@file` - API-specific rate limiting
4. `compression@file` - Response compression

### UI Services (`ssi-admin`, `ssi-public`)
1. `security-headers@file` - Security headers
2. `rate-limit@file` - General rate limiting
3. `compression@file` - Response compression

## Usage

### Production Deployment
```bash
# Start with Traefik profile
docker-compose --profile traefik --profile production up -d

# Or start all services
docker-compose --profile production up -d
```

### Development with Traefik
```bash
# Start development services with Traefik
docker-compose -f docker-compose.dev.yml --profile traefik-dev up -d

# Access services via Traefik
# - http://ssi-issuer.localhost (Public UI)
# - http://ssi-issuer-admin.localhost (Admin UI)
# - http://ssi-issuer-api.localhost (API)
# - http://localhost:8080 (Traefik Dashboard)
```

### Development without Traefik (Direct Access)
```bash
# Start development services without Traefik
docker-compose -f docker-compose.dev.yml up -d

# Access services directly
# - http://localhost:3002 (Public UI)
# - http://localhost:3001 (Admin UI)
# - http://localhost:3000 (API)
```

## Environment Variables

### Required for Production
- `DOMAIN` - Your domain name (e.g., example.com)
- `TRAEFIK_EMAIL` - Email for Let's Encrypt notifications

### Optional
- `NODE_ENV` - Environment (production/development)
- `JWT_SECRET` - JWT signing secret
- `CORS_ORIGINS` - Allowed CORS origins

## Monitoring

### Traefik Dashboard
- Available at `https://ssi-issuer-traefik.${DOMAIN}` (production)
- Available at `http://localhost:8080` (development)
- Shows service health, routing rules, and metrics

### Logs
- JSON format in production
- Common format in development
- Access logs enabled
- Configurable log levels

## Troubleshooting

### Certificate Issues
1. Check `TRAEFIK_EMAIL` environment variable
2. Verify domain DNS points to server
3. Check certificate storage volume
4. Review Traefik logs for ACME errors

### Routing Issues
1. Verify service labels in docker-compose files
2. Check network connectivity between services
3. Confirm Traefik can access Docker socket
4. Review dynamic configuration syntax

### Performance Issues
1. Adjust rate limiting settings
2. Enable/disable compression
3. Review middleware chain
4. Monitor resource usage

## Security Considerations

1. **Dashboard Access** - Restrict dashboard access in production
2. **Certificate Storage** - Secure certificate volume
3. **Rate Limiting** - Adjust limits based on usage patterns
4. **CORS Origins** - Keep CORS origins restrictive
5. **Security Headers** - Review and customize security headers
6. **Log Sanitization** - Sensitive data is redacted from logs