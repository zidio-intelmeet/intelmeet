# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json tsconfig.app.json tsconfig.node.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src ./src
COPY index.html public ./

# Build React app
RUN npm run build

# Production stage - using nginx for optimal frontend serving
FROM nginx:alpine

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built app from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Create non-root user
RUN addgroup -g 101 -S nginx && \
    adduser -S nginx -u 101 2>/dev/null || true

USER nginx

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:80/index.html || exit 1

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
