# Investment Proposal Tool - Frontend Dockerfile
# Multi-stage build: Build React app, then serve with nginx

# Stage 1: Build the React application
FROM node:18-alpine AS builder

WORKDIR /app

# Build-time arguments
# VITE_API_URL is needed at build time (used via import.meta.env)
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Note: VITE_GEMINI_API_KEY uses runtime injection, so build-time is optional
# ARG VITE_GEMINI_API_KEY
# ENV VITE_GEMINI_API_KEY=$VITE_GEMINI_API_KEY

# Copy package files
COPY package*.json ./

# Install all dependencies - use npm install instead of npm ci
RUN npm install

# Copy source code (dist is excluded by .dockerignore)
# List what we're copying to verify dist is not included
RUN echo "=== Checking what will be copied ===" && \
    echo "Files in current directory before COPY:" && \
    ls -la | head -20

COPY . .

# Verify dist was NOT copied (should not exist yet)
RUN if [ -d dist ]; then \
        echo "❌ WARNING: dist folder exists before build - this should not happen!"; \
        echo "Contents:"; \
        ls -la dist/; \
        rm -rf dist; \
        echo "Removed dist folder"; \
    else \
        echo "✅ dist folder does not exist (as expected)"; \
    fi

# Verify public/config.js exists before build
RUN ls -la public/ || echo "public directory check"

# Remove any existing dist folder to ensure clean build
RUN rm -rf dist || echo "No dist folder to remove"

# Verify index.html exists before build
RUN echo "=== Pre-build check ===" && \
    echo "Checking for index.html:" && \
    ls -la index.html && \
    echo "First 20 lines of index.html:" && \
    head -20 index.html

# Build the production app
# This creates the /app/dist directory with optimized static files
# Note: API key will be injected at runtime via entrypoint script
RUN npm run build

# CRITICAL FIX: Remove any importmap from the built HTML
# The importmap maps @google/genai (wrong package) which conflicts with our bundled @google/generative-ai
# Use awk for reliable multiline removal (works in Alpine without perl)
RUN echo "=== Removing importmap from built HTML ===" && \
    if [ -f dist/index.html ]; then \
        echo "Before removal:" && \
        grep -n "importmap\|aistudiocdn" dist/index.html || echo "No importmap found (good)"; \
        # Use awk to remove the entire importmap script block (handles multiline correctly)
        awk '/<script type="importmap">/,/<\/script>/ {next} {print}' dist/index.html > dist/index.html.tmp && \
        mv dist/index.html.tmp dist/index.html; \
        # Also remove any lines containing aistudiocdn as backup
        sed -i '/aistudiocdn\.com/d' dist/index.html; \
        # Remove any remaining importmap script tags (single line version)
        sed -i '/<script[^>]*type="importmap"/d' dist/index.html; \
        echo "After removal:" && \
        grep -n "importmap\|aistudiocdn" dist/index.html || echo "✅ Importmap removed successfully"; \
        echo "First 30 lines of final HTML:" && \
        head -30 dist/index.html; \
        echo "Checking for importmap script tag:" && \
        grep -c '<script type="importmap">' dist/index.html || echo "✅ No importmap script tag found"; \
    else \
        echo "ERROR: dist/index.html not found!"; \
    fi

# Verify the build output
RUN echo "=== Checking build output ===" && \
    echo "Contents of dist/:" && \
    ls -la dist/ && \
    echo "" && \
    echo "Contents of dist/assets/:" && \
    ls -la dist/assets/ || echo "No assets folder" && \
    if [ -f dist/index.html ]; then \
        echo "✅ dist/index.html exists"; \
        echo "Bundle reference in HTML:"; \
        grep -o 'src="[^"]*index-[^"]*\.js"' dist/index.html || echo "No bundle reference found"; \
    else \
        echo "❌ dist/index.html NOT FOUND - checking if Vite created it with different name"; \
        find dist -name "*.html" || echo "No HTML files found"; \
    fi

# Verify config.js was copied to dist (Vite should copy public/ files automatically)
RUN if [ -f dist/config.js ]; then echo "✅ config.js found in dist/"; else echo "❌ WARNING: config.js NOT in dist/ - manually copying"; cp public/config.js dist/config.js || echo "Failed to copy config.js"; fi

# FINAL VERIFICATION: Check what will be copied to nginx
RUN echo "=== FINAL CHECK BEFORE COPY TO NGINX ===" && \
    echo "All files in /app/dist:" && \
    find /app/dist -type f && \
    echo "" && \
    echo "ALL bundle files in assets (including old ones):" && \
    find /app/dist/assets -name "*.js" -type f -exec ls -lh {} \; && \
    echo "" && \
    echo "Specifically looking for index-*.js files:" && \
    ls -la /app/dist/assets/index-*.js 2>&1 || echo "No index-*.js files found" && \
    echo "" && \
    echo "HTML file that will be copied:" && \
    cat /app/dist/index.html | grep -o 'src="[^"]*index-[^"]*\.js"' || echo "No bundle reference in HTML!" && \
    echo "" && \
    echo "Checking for old bundle file index-C_9yjgEL.js:" && \
    if [ -f /app/dist/assets/index-C_9yjgEL.js ]; then \
        echo "❌ WARNING: OLD BUNDLE FILE STILL EXISTS!"; \
        ls -lh /app/dist/assets/index-C_9yjgEL.js; \
        echo "Removing old bundle file..."; \
        rm -f /app/dist/assets/index-C_9yjgEL.js; \
        echo "Old file removed"; \
    else \
        echo "✅ Old bundle file does not exist (good)"; \
    fi

# Stage 2: Serve with nginx
FROM nginx:alpine

# Copy built static files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# FINAL REMOVAL: Remove importmap from HTML in nginx stage (in case it was added during copy or Vite regenerated it)
RUN echo "=== FINAL IMPORTMAP REMOVAL IN NGINX STAGE ===" && \
    if [ -f /usr/share/nginx/html/index.html ]; then \
        echo "Checking for importmap before final removal:" && \
        grep -n "importmap\|aistudiocdn" /usr/share/nginx/html/index.html || echo "No importmap found"; \
        # Use awk to remove importmap script block (works in Alpine)
        awk '/<script type="importmap">/,/<\/script>/ {next} {print}' /usr/share/nginx/html/index.html > /usr/share/nginx/html/index.html.tmp && \
        mv /usr/share/nginx/html/index.html.tmp /usr/share/nginx/html/index.html; \
        # Remove any aistudiocdn references
        sed -i '/aistudiocdn\.com/d' /usr/share/nginx/html/index.html; \
        sed -i '/<script[^>]*type="importmap"/d' /usr/share/nginx/html/index.html; \
        echo "After final removal:" && \
        grep -n "importmap\|aistudiocdn" /usr/share/nginx/html/index.html || echo "✅ Importmap completely removed"; \
        echo "Bundle reference in final HTML:" && \
        grep -o 'src="[^"]*index-[^"]*\.js"' /usr/share/nginx/html/index.html || echo "No bundle reference"; \
    fi

# CRITICAL: Verify what was actually copied into the nginx image
RUN echo "=== VERIFYING DEPLOYED FILES ===" && \
    echo "Files in /usr/share/nginx/html:" && \
    ls -la /usr/share/nginx/html/ && \
    echo "" && \
    echo "Files in /usr/share/nginx/html/assets:" && \
    ls -la /usr/share/nginx/html/assets/ && \
    echo "" && \
    echo "=== CHECKING index.html ===" && \
    if [ -f /usr/share/nginx/html/index.html ]; then \
        echo "✅ index.html exists"; \
        echo "Bundle reference in deployed HTML:"; \
        grep -o 'src="[^"]*index-[^"]*\.js"' /usr/share/nginx/html/index.html || echo "No bundle reference found"; \
        echo "First 30 lines of deployed HTML:"; \
        head -30 /usr/share/nginx/html/index.html; \
    else \
        echo "❌ index.html NOT FOUND in deployed image!"; \
        exit 1; \
    fi && \
    echo "" && \
    echo "=== CHECKING BUNDLE FILES ===" && \
    echo "Looking for bundle files:" && \
    find /usr/share/nginx/html/assets -name "index-*.js" -type f && \
    echo "" && \
    echo "Bundle file sizes:" && \
    ls -lh /usr/share/nginx/html/assets/index-*.js 2>/dev/null || echo "No bundle files found!"

# Explicitly ensure config.js is present (it should be in dist, but verify)
RUN if [ ! -f /usr/share/nginx/html/config.js ]; then echo "ERROR: config.js missing!"; ls -la /usr/share/nginx/html/ | head -20; exit 1; else echo "✅ config.js found in nginx html directory"; fi

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Expose port 8080 (Cloud Run expects this)
EXPOSE 8080

# Set environment variable (will be passed from Cloud Run)
ENV VITE_GEMINI_API_KEY=""

# Use entrypoint script to inject API key at runtime
ENTRYPOINT ["/docker-entrypoint.sh"]
