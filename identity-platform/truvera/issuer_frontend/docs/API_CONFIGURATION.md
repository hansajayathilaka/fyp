# API Configuration Guide

This guide explains how to properly configure the `VITE_API_URL` environment variable for the frontend application.

## Overview

The frontend uses the `VITE_API_URL` environment variable to determine where to send API requests. This must be configured correctly for the application to work.

## Configuration Options

### 1. Local Development (Same Machine)

If you're running both frontend and backend on the same machine:

```env
VITE_API_URL=http://localhost:3001
```

### 2. Docker Development

If you're using Docker Compose, use your machine's IP address:

```env
VITE_API_URL=http://192.168.1.100:3001
```

Replace `192.168.1.100` with your actual machine's IP address.

### 3. Network Development

If you want to access the frontend from other devices on your network:

```env
VITE_API_URL=http://YOUR_MACHINE_IP:3001
```

## How to Configure

### Method 1: Automatic Setup (Recommended)

Run the setup script to automatically configure your environment:

```bash
cd frontend
node scripts/setup-env.js
```

This script will:
- Create a `.env` file from `.env.example`
- Automatically detect your machine's IP address
- Set the appropriate `VITE_API_URL`

### Method 2: Manual Setup

1. Copy the example environment file:
   ```bash
   cd frontend
   cp .env.example .env
   ```

2. Edit the `.env` file and update `VITE_API_URL`:
   ```env
   VITE_API_URL=http://YOUR_BACKEND_URL:3001
   ```

## Finding Your IP Address

### Windows
```cmd
ipconfig
```
Look for "IPv4 Address" under your active network adapter.

### macOS/Linux
```bash
ifconfig
```
Look for `inet` address under your active network interface (usually `en0` or `eth0`).

### Alternative Method
```bash
# On most systems
hostname -I
```

## Verification

After configuring, you can verify the setup by:

1. Starting the backend server
2. Starting the frontend development server
3. Opening browser developer tools
4. Checking the Network tab for API requests
5. Ensuring requests are going to the correct URL

## Common Issues

### Issue: API requests failing with CORS errors
**Solution**: Make sure the backend's `CORS_ORIGINS` includes your frontend URL.

### Issue: API requests going to wrong URL
**Solution**: 
- Check that `VITE_API_URL` is set correctly in `.env`
- Restart the development server after changing environment variables
- Ensure no trailing slash in the URL

### Issue: Environment variable not being read
**Solution**:
- Make sure the variable name starts with `VITE_`
- Restart the development server
- Check that the `.env` file is in the frontend root directory

## Docker Configuration

When using Docker Compose, the frontend container needs to reach the backend container. The `VITE_API_URL` should point to the host machine's IP address, not `localhost`, because `localhost` inside a container refers to the container itself.

Example docker-compose.yml configuration:

```yaml
services:
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - VITE_API_URL=http://192.168.1.100:3001
    depends_on:
      - backend
```

## Production Considerations

For production deployments:

1. Use HTTPS URLs when possible
2. Use proper domain names instead of IP addresses
3. Ensure the API URL is accessible from where users will access the frontend
4. Consider using environment-specific configuration files

## API Endpoints

The application uses these API endpoints:

- `POST /api/session/create` - Create a new session
- `POST /api/wallet/connect` - Connect wallet to session
- `POST /api/credentials/form` - Submit credential form
- `POST /api/credentials/validate` - Validate form data
- `POST /api/credentials/issue` - Issue credential
- `POST /api/credentials/qr-generate` - Generate QR code
- `GET /api/credentials/status/:sessionId` - Check credential status

All endpoints are automatically prefixed with the `VITE_API_URL` value.