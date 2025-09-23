# Copyright 2025 Amazon.com, Inc. or its affiliates.
# SPDX-License-Identifier: MIT-0

# Build stage
FROM node:24-slim AS builder

# Set working directory
WORKDIR /app

# Copy package files for dependency installation (better layer caching)
COPY package*.json ./
COPY tsconfig.json ./
COPY shared/package*.json ./shared/
COPY backend/package*.json ./backend/

# Install all dependencies (including dev dependencies for building)
RUN npm ci --include=dev

# Copy source code
COPY shared/src ./shared/src
COPY shared/tsconfig.json ./shared/
COPY backend/src ./backend/src
COPY backend/tsconfig.json ./backend/

# Build shared package first
WORKDIR /app/shared
RUN npm run build

# Build backend
WORKDIR /app/backend
RUN npm run build

# Production stage
FROM node:24-slim AS runtime

# Install curl for health check
RUN apt-get update && apt-get install -y --no-install-recommends curl && apt-get clean && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -r appuser && useradd -r -g appuser -d /app -s /bin/false appuser

# Set working directory
WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Copy package files for production dependency installation
COPY package*.json ./
COPY shared/package*.json ./shared/
COPY backend/package*.json ./backend/

# Install only production dependencies
RUN npm ci --only=production --ignore-scripts

# Copy built artifacts from builder stage
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/shared/package.json ./shared/
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/package.json ./backend/

# Change ownership to non-root user
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Set working directory to backend
WORKDIR /app/backend

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start the application
CMD ["node", "dist/index.js"]
