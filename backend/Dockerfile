# Copyright 2025 Amazon.com, Inc. or its affiliates.
# SPDX-License-Identifier: MIT-0

FROM node:20-slim

# Install curl for health check
RUN apt-get update && apt-get install -y --no-install-recommends curl && apt-get clean && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -r appuser && useradd -r -g appuser -d /app -s /bin/false appuser

# Set working directory
WORKDIR /app

# Copy root tsconfig.json for workspace configuration
COPY tsconfig.json ./
COPY package*.json ./
RUN npm install

# Copy shared package and build it
WORKDIR /app/shared
COPY shared/*.json ./
COPY shared/src ./src
RUN npm install && npm run build

# Copy backend files
WORKDIR /app/backend
COPY backend/*.json ./
COPY backend/src ./src
RUN npm install && npm run build

# Change ownership to non-root user
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start the application
CMD ["node", "dist/index.js"]
