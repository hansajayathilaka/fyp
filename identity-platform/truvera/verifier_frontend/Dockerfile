# Multi-stage build for verifier frontend
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Build arguments for environment variables
ARG VITE_API_URL
ARG VITE_TRUVERA_API_URL
ARG VITE_CUSTOM_INTEGRATION_ENABLED=false
ARG VITE_DEFAULT_TIMEOUT_MINUTES=15
ARG VITE_NODE_ENV=production

# Set environment variables for build
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_TRUVERA_API_URL=${VITE_TRUVERA_API_URL}
ENV VITE_CUSTOM_INTEGRATION_ENABLED=${VITE_CUSTOM_INTEGRATION_ENABLED}
ENV VITE_DEFAULT_TIMEOUT_MINUTES=${VITE_DEFAULT_TIMEOUT_MINUTES}
ENV VITE_NODE_ENV=${VITE_NODE_ENV}

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage with nginx
FROM nginx:alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy default nginx configuration if custom one doesn't exist
RUN echo 'events { worker_connections 1024; } \
http { \
    include /etc/nginx/mime.types; \
    default_type application/octet-stream; \
    sendfile on; \
    keepalive_timeout 65; \
    server { \
        listen 80; \
        server_name localhost; \
        location / { \
            root /usr/share/nginx/html; \
            index index.html index.htm; \
            try_files $uri $uri/ /index.html; \
        } \
        error_page 500 502 503 504 /50x.html; \
        location = /50x.html { \
            root /usr/share/nginx/html; \
        } \
    } \
}' > /etc/nginx/nginx.conf

# Copy built application from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Create app user (nginx group already exists in nginx:alpine)
RUN adduser -S appuser -u 1001

# Set proper permissions
RUN chown -R appuser:nginx /usr/share/nginx/html
RUN chown -R appuser:nginx /var/cache/nginx
RUN chown -R appuser:nginx /var/log/nginx
RUN chown -R appuser:nginx /etc/nginx/conf.d
RUN touch /var/run/nginx.pid
RUN chown -R appuser:nginx /var/run/nginx.pid

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# Start nginx
ENTRYPOINT ["dumb-init", "--"]
CMD ["nginx", "-g", "daemon off;"]