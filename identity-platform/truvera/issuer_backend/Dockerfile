# Multi-stage build for issuer backend
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init curl

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm install --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

# Build arguments for environment variables
ARG PORT=3001
ARG NODE_ENV=production
ARG TRUVERA_API_URL
ARG TRUVERA_API_KEY
ARG SESSION_SECRET
ARG ISSUER_DID
ARG CREDENTIAL_SCHEMA_URL
ARG CORS_ORIGINS

# Set environment variables
ENV PORT=${PORT}
ENV NODE_ENV=${NODE_ENV}
ENV TRUVERA_API_URL=${TRUVERA_API_URL}
ENV TRUVERA_API_KEY=${TRUVERA_API_KEY}
ENV SESSION_SECRET=${SESSION_SECRET}
ENV ISSUER_DID=${ISSUER_DID}
ENV CREDENTIAL_SCHEMA_URL=${CREDENTIAL_SCHEMA_URL}
ENV CORS_ORIGINS=${CORS_ORIGINS}

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE ${PORT}

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:${PORT}/health || exit 1

# Start the application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]