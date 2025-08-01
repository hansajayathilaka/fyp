#!/usr/bin/env node

/**
 * Environment setup script for the frontend
 * Helps users configure their VITE_API_URL based on their network setup
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

function getLocalIPAddress() {
  const interfaces = os.networkInterfaces();
  
  for (const name of Object.keys(interfaces)) {
    for (const interface of interfaces[name]) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      if (interface.family === 'IPv4' && !interface.internal) {
        return interface.address;
      }
    }
  }
  
  return 'localhost';
}

function createEnvFile() {
  const envPath = path.join(__dirname, '..', '.env');
  const envExamplePath = path.join(__dirname, '..', '.env.example');
  
  // Check if .env already exists
  if (fs.existsSync(envPath)) {
    console.log('✅ .env file already exists');
    
    // Read current .env and check VITE_API_URL
    const envContent = fs.readFileSync(envPath, 'utf8');
    const apiUrlMatch = envContent.match(/VITE_API_URL=(.+)/);
    
    if (apiUrlMatch) {
      console.log(`📡 Current API URL: ${apiUrlMatch[1]}`);
    }
    
    return;
  }
  
  // Copy from .env.example if it exists
  if (fs.existsSync(envExamplePath)) {
    let envContent = fs.readFileSync(envExamplePath, 'utf8');
    
    // Get local IP address
    const localIP = getLocalIPAddress();
    const apiUrl = `http://${localIP}:3001`;
    
    // Replace localhost with local IP
    envContent = envContent.replace(
      'VITE_API_URL=http://localhost:3001',
      `VITE_API_URL=${apiUrl}`
    );
    
    fs.writeFileSync(envPath, envContent);
    
    console.log('✅ Created .env file from .env.example');
    console.log(`📡 Set API URL to: ${apiUrl}`);
    console.log('');
    console.log('💡 Tips:');
    console.log('  - If using Docker, make sure the API URL matches your Docker setup');
    console.log('  - For local development, you might want to use http://localhost:3001');
    console.log('  - For network access, use your machine\'s IP address');
    
  } else {
    console.error('❌ .env.example file not found');
    process.exit(1);
  }
}

function main() {
  console.log('🔧 Setting up frontend environment...');
  console.log('');
  
  createEnvFile();
  
  console.log('');
  console.log('🎉 Environment setup complete!');
  console.log('');
  console.log('Next steps:');
  console.log('  1. Review the .env file and adjust VITE_API_URL if needed');
  console.log('  2. Make sure your backend is running on the configured URL');
  console.log('  3. Run "npm run dev" to start the development server');
}

if (require.main === module) {
  main();
}

module.exports = { getLocalIPAddress, createEnvFile };