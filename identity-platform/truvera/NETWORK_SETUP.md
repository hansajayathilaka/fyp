# Network Setup Guide

This guide helps you configure the SSI Issuing Platform for external access from other devices on your network.

## Quick Setup

### Automatic Configuration (Recommended)

**For Windows:**
```bash
scripts\setup-network.bat
```

**For Linux/macOS:**
```bash
chmod +x scripts/setup-network.sh
./scripts/setup-network.sh
```

### Manual Configuration

1. **Find your machine's IP address:**
   - Windows: `ipconfig` (look for IPv4 Address)
   - Linux: `hostname -I`
   - macOS: `ifconfig | grep inet`

2. **Update frontend configuration:**
   ```bash
   # frontend/.env
   VITE_API_URL=http://YOUR_IP_ADDRESS:3001
   ```

3. **Update backend configuration:**
   ```bash
   # backend/.env
   FRONTEND_URL=http://YOUR_IP_ADDRESS:3000
   CORS_ORIGINS=http://localhost:3000,http://YOUR_IP_ADDRESS:3000,http://127.0.0.1:3000
   ```

## Starting the Services

### Development Mode
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend  
cd frontend
npm run dev
```

### Docker Mode
```bash
# Copy environment variables
cp backend/.env .env

# Start with Docker Compose
docker-compose up --build
```

## Access Points

- **Local access:** http://localhost:3000
- **Network access:** http://YOUR_IP_ADDRESS:3000
- **API endpoint:** http://YOUR_IP_ADDRESS:3001

## Firewall Configuration

### Windows Firewall
1. Open Windows Defender Firewall
2. Click "Allow an app or feature through Windows Defender Firewall"
3. Click "Change Settings" → "Allow another app"
4. Add Node.js or allow ports 3000 and 3001

### Linux (UFW)
```bash
sudo ufw allow 3000
sudo ufw allow 3001
```

### macOS
```bash
# Add firewall rules if needed
sudo pfctl -f /etc/pf.conf
```

## Troubleshooting

### Common Issues

1. **CORS Errors:**
   - Ensure your device's IP is in the CORS_ORIGINS list
   - Check that the frontend .env has the correct API URL

2. **Connection Refused:**
   - Verify firewall settings
   - Check that services are running on 0.0.0.0 (all interfaces)
   - Ensure ports 3000 and 3001 are not blocked

3. **Mobile Access Issues:**
   - Make sure mobile device is on the same network
   - Try accessing http://YOUR_IP_ADDRESS:3000 directly
   - Check if your router blocks inter-device communication

### Network Diagnostics

```bash
# Test backend connectivity
curl http://YOUR_IP_ADDRESS:3001/health

# Test frontend accessibility
curl http://YOUR_IP_ADDRESS:3000

# Check if ports are listening
netstat -an | grep :3000
netstat -an | grep :3001
```

## Security Considerations

- This configuration is for development/testing only
- For production, use proper SSL certificates
- Consider using a reverse proxy (nginx/Apache)
- Implement proper authentication and authorization
- Use environment-specific configurations

## Advanced Configuration

### Custom Port Configuration
```bash
# Backend
PORT=8080

# Frontend (vite.config.ts)
server: {
  port: 8081
}
```

### Multiple Network Interfaces
```bash
# Allow specific network ranges
CORS_ORIGINS=http://192.168.1.*:3000,http://10.0.0.*:3000
```

### Production Deployment
```bash
# Use environment variables
export NODE_ENV=production
export FRONTEND_URL=https://your-domain.com
export CORS_ORIGINS=https://your-domain.com
```

## Support

If you encounter issues:
1. Check the console logs for error messages
2. Verify network connectivity between devices
3. Ensure all environment variables are set correctly
4. Test with curl or Postman first before using the web interface