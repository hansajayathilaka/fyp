# Multi-stage build for verifier backend
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm install && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

# Copy deployment-info.json file
COPY --chown=nodejs:nodejs deployment-info.json ./

# Build arguments for environment variables
ARG PORT=4001
ARG NODE_ENV=production
ARG TRUVERA_API_URL
ARG TRUVERA_API_KEY
ARG FRONTEND_URL
ARG BLOCKCHAIN_ENABLED=true
ARG SMART_CONTRACT_ADDRESS
ARG BLOCKCHAIN_RPC_URL

# Set environment variables (excluding private keys)
ENV PORT=${PORT}
ENV NODE_ENV=${NODE_ENV}
ENV TRUVERA_API_URL=${TRUVERA_API_URL}
ENV TRUVERA_API_KEY=${TRUVERA_API_KEY}
ENV FRONTEND_URL=${FRONTEND_URL}
ENV BLOCKCHAIN_ENABLED=${BLOCKCHAIN_ENABLED}
ENV SMART_CONTRACT_ADDRESS=${SMART_CONTRACT_ADDRESS}
ENV BLOCKCHAIN_RPC_URL=${BLOCKCHAIN_RPC_URL}

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE ${PORT}

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:${PORT}/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]