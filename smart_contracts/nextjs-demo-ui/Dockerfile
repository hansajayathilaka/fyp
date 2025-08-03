# Multi-stage build for Next.js demo UI
FROM node:18-alpine AS builder

# Set working directory to match the expected structure
WORKDIR /smart_contracts

# Copy artifacts and deployment-info.json first
COPY artifacts/ ./artifacts/
COPY deployment-info.json ./deployment-info.json

# Set working directory for the Next.js app
WORKDIR /smart_contracts/nextjs-demo-ui

# Copy package files from nextjs-demo-ui directory
COPY nextjs-demo-ui/package*.json ./

# Install dependencies
RUN npm install

# Build arguments for environment variables
ARG NEXT_PUBLIC_SMART_CONTRACT_ADDRESS
ARG NEXT_PUBLIC_BLOCKCHAIN_RPC_URL
ARG NEXT_PUBLIC_DEFAULT_NETWORK=hardhat
ARG NEXT_PUBLIC_FALLBACK_DECIMALS=18
ARG NEXT_PUBLIC_SSI_SIGNIN_URL

# Set environment variables for build
ENV NEXT_PUBLIC_SMART_CONTRACT_ADDRESS=${NEXT_PUBLIC_SMART_CONTRACT_ADDRESS}
ENV NEXT_PUBLIC_BLOCKCHAIN_RPC_URL=${NEXT_PUBLIC_BLOCKCHAIN_RPC_URL}
ENV NEXT_PUBLIC_DEFAULT_NETWORK=${NEXT_PUBLIC_DEFAULT_NETWORK}
ENV NEXT_PUBLIC_FALLBACK_DECIMALS=${NEXT_PUBLIC_FALLBACK_DECIMALS}
ENV NEXT_PUBLIC_SSI_SIGNIN_URL=${NEXT_PUBLIC_SSI_SIGNIN_URL}

# Copy source code from nextjs-demo-ui directory
COPY nextjs-demo-ui/ ./

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Set working directory for production
WORKDIR /smart_contracts/nextjs-demo-ui

# Copy package files from nextjs-demo-ui directory
COPY nextjs-demo-ui/package*.json ./

# Install only production dependencies
RUN npm install && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder --chown=nodejs:nodejs /smart_contracts/nextjs-demo-ui/.next ./.next
COPY --from=builder --chown=nodejs:nodejs /smart_contracts/nextjs-demo-ui/public ./public
COPY --from=builder --chown=nodejs:nodejs /smart_contracts/nextjs-demo-ui/next.config.* ./

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]