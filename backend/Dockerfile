# Investment Proposal Tool - Backend Dockerfile
# This builds a production-ready Node.js backend container

FROM node:18-bookworm-slim

# Chromium prints the ULD proposal. TeX Gyre Pagella is the deck's typeface.
RUN apt-get update && apt-get install -y --no-install-recommends \
      chromium \
      fonts-texgyre \
      ca-certificates \
    && rm -rf /var/lib/apt/lists/*
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Set working directory
WORKDIR /app

# Copy package files first (for better caching)
COPY package*.json ./

# Install production dependencies
# Use npm install if package-lock.json doesn't exist, otherwise use npm ci
RUN if [ -f package-lock.json ]; then \
      npm ci --only=production; \
    else \
      npm install --production; \
    fi

# Copy application code
COPY . .

# Cloud Run uses the PORT environment variable
# We'll expose 8080 as default but Cloud Run will override
EXPOSE 8080

# Health check (optional but recommended)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 8080) + '/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "server.js"]
