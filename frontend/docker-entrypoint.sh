#!/bin/sh
# Docker entrypoint script to replace API key in config.js at runtime

# Debug: Log to stderr (Cloud Run captures stderr)
echo "=== Entrypoint Script Starting ===" >&2

# Check if config.js exists
if [ ! -f /usr/share/nginx/html/config.js ]; then
    echo "ERROR: config.js not found at /usr/share/nginx/html/config.js!" >&2
    echo "Listing files in /usr/share/nginx/html/:" >&2
    ls -la /usr/share/nginx/html/ | head -20 >&2
    exit 1
fi

# Check if env var is set
if [ -z "$VITE_GEMINI_API_KEY" ]; then
    echo "WARNING: VITE_GEMINI_API_KEY environment variable is not set!" >&2
    echo "config.js will contain placeholder value." >&2
else
    echo "VITE_GEMINI_API_KEY is set (length: ${#VITE_GEMINI_API_KEY})" >&2
fi

# Show original content (first 100 chars) for debugging
echo "Original config.js content (first 100 chars):" >&2
head -c 100 /usr/share/nginx/html/config.js >&2
echo "" >&2

# Replace the placeholder with the actual API key from environment variable
if [ -n "$VITE_GEMINI_API_KEY" ]; then
    sed -i "s|REPLACE_WITH_API_KEY|${VITE_GEMINI_API_KEY}|g" /usr/share/nginx/html/config.js
    
    # Verify replacement
    if grep -q "REPLACE_WITH_API_KEY" /usr/share/nginx/html/config.js; then
        echo "ERROR: Replacement failed - placeholder still present!" >&2
        echo "Config.js content:" >&2
        cat /usr/share/nginx/html/config.js >&2
    else
        echo "SUCCESS: Replacement completed" >&2
        echo "New config.js content (first 100 chars):" >&2
        head -c 100 /usr/share/nginx/html/config.js >&2
        echo "" >&2
    fi
else
    echo "Skipping replacement - VITE_GEMINI_API_KEY not set" >&2
fi

# CRITICAL: Verify what HTML is actually being served
echo "=== VERIFYING HTML BEFORE NGINX STARTS ===" >&2
if [ -f /usr/share/nginx/html/index.html ]; then
    echo "index.html exists" >&2
    echo "Bundle reference in HTML:" >&2
    grep -o 'src="[^"]*index-[^"]*\.js"' /usr/share/nginx/html/index.html >&2 || echo "No bundle reference found" >&2
    echo "Checking for importmap:" >&2
    if grep -q 'importmap' /usr/share/nginx/html/index.html; then
        echo "❌❌❌ ERROR: IMPORTMAP FOUND IN RUNNING CONTAINER!" >&2
        grep -n 'importmap\|aistudiocdn' /usr/share/nginx/html/index.html >&2
        echo "Removing importmap..." >&2
        awk '/<script type="importmap">/,/<\/script>/ {next} {print}' /usr/share/nginx/html/index.html > /usr/share/nginx/html/index.html.tmp && \
        mv /usr/share/nginx/html/index.html.tmp /usr/share/nginx/html/index.html && \
        sed -i '/aistudiocdn\.com/d' /usr/share/nginx/html/index.html && \
        sed -i '/<script[^>]*type="importmap"/d' /usr/share/nginx/html/index.html
        echo "Importmap removed" >&2
    else
        echo "✅ No importmap found (correct)" >&2
    fi
    echo "All bundle files in assets:" >&2
    ls -la /usr/share/nginx/html/assets/index-*.js >&2 2>&1 || echo "No bundle files found" >&2
    echo "Checking for old bundle file index-C_9yjgEL.js:" >&2
    if [ -f /usr/share/nginx/html/assets/index-C_9yjgEL.js ]; then
        echo "❌❌❌ ERROR: OLD BUNDLE FILE EXISTS IN RUNNING CONTAINER!" >&2
        ls -lh /usr/share/nginx/html/assets/index-C_9yjgEL.js >&2
        echo "This should not exist - removing it..." >&2
        rm -f /usr/share/nginx/html/assets/index-C_9yjgEL.js >&2
        echo "Old file removed" >&2
    else
        echo "✅ Old bundle file does not exist (correct)" >&2
    fi
else
    echo "ERROR: index.html NOT FOUND!" >&2
    ls -la /usr/share/nginx/html/ >&2
fi

# Start nginx
echo "Starting nginx..." >&2
exec nginx -g "daemon off;"

