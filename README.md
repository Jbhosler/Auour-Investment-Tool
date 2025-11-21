# Investment Proposal Tool - Full Stack Application

A professional investment proposal generator with backend database support. Mix investment strategies, compare against benchmarks, and generate client-ready reports with AI summaries.

## 🎯 What Changed from Google AI Studio Version

### Before (Browser Only)
- ❌ Data stored in browser localStorage (lost when cache cleared)
- ❌ No data persistence across devices
- ❌ Can't share strategies with team
- ❌ No proposal history
- ❌ Limited to single browser

### After (Full Stack)
- ✅ Persistent database storage (SQLite for dev, PostgreSQL for prod)
- ✅ Access data from any device
- ✅ Share strategies across your team
- ✅ Save and review all proposals
- ✅ Scalable backend API
- ✅ Production-ready architecture

## 🏗️ Architecture

```
investment-proposal-fullstack/
├── backend/              # Node.js + Express API
│   ├── server.js        # Main server with REST API
│   ├── database.js      # Database abstraction layer
│   ├── scripts/         # Database utilities
│   └── .env             # Environment configuration
│
└── frontend/            # React + Vite frontend
    ├── services/
    │   └── apiService.ts    # API client
    ├── hooks/
    │   └── useApiState.ts   # React hooks for API state
    ├── components/      # All your existing UI components
    └── .env             # Frontend configuration
```

## 📋 Prerequisites

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **PostgreSQL** (optional, for production)

## 📤 Uploading to GitHub

If you want to upload this project to GitHub, see [GITHUB_SETUP.md](./GITHUB_SETUP.md) for step-by-step instructions.

**Quick Summary:**
1. Install Git from https://git-scm.com/download/win
2. Create an empty GitHub repository
3. Run the commands in `GITHUB_SETUP.md`

## 🚀 Quick Start

### 1. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# The default configuration uses SQLite (no additional setup needed!)
# For PostgreSQL, edit .env and set DATABASE_URL

# Initialize database with sample data
npm run init-db

# Start the backend server
npm run dev
```

The backend will run on `http://localhost:3001`

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local

# Add your Gemini API key to .env.local (for local development)
# VITE_GEMINI_API_KEY=your_actual_api_key
#
# Note: For production (Cloud Run), the API key is injected at runtime
# via Docker entrypoint script - see GCP_DEPLOYMENT_GUIDE.md

# Start the development server
npm run dev
```

The frontend will run on `http://localhost:5173`

### 3. Open Your Browser

Visit `http://localhost:5173` and start creating proposals!

## 📚 API Endpoints

### Strategies
- `GET /api/strategies` - Get all strategies
- `GET /api/strategies/:id` - Get single strategy
- `POST /api/strategies` - Create strategy
- `PUT /api/strategies/:id` - Update strategy
- `DELETE /api/strategies/:id` - Delete strategy

### Benchmarks
- `GET /api/benchmarks` - Get all benchmarks
- `POST /api/benchmarks` - Create benchmark
- `PUT /api/benchmarks/:id` - Update benchmark
- `DELETE /api/benchmarks/:id` - Delete benchmark

### Proposals
- `GET /api/proposals` - Get all proposals
- `POST /api/proposals` - Save proposal

### Settings
- `GET /api/settings` - Get firm settings (logo, pages)
- `PUT /api/settings` - Update settings

## 🗄️ Database Options

### Development: SQLite (Default)
Perfect for local development and testing. No setup required!

```bash
# .env
DB_TYPE=sqlite
```

Database file: `backend/investment_proposal.db`

### Production: PostgreSQL
Recommended for production deployments.

```bash
# .env
# Comment out or remove DB_TYPE=sqlite
DATABASE_URL=postgresql://user:password@localhost:5432/investment_proposal
```

## 🔄 Data Migration

Your existing data in localStorage can be migrated:

1. **Export from browser**: Open browser DevTools → Application → localStorage
2. **Copy strategies and benchmarks**
3. **Use Admin Panel**: Add them through the admin interface, or
4. **API calls**: POST to `/api/strategies` and `/api/benchmarks`

## 🌐 Deployment

### Backend Deployment (Render, Railway, Heroku)

1. **Set environment variables**:
   ```
   DATABASE_URL=your_postgresql_connection_string
   NODE_ENV=production
   PORT=3001
   ```

2. **Deploy**:
   ```bash
   git push heroku main
   # or use Railway/Render GUI
   ```

3. **Initialize database**:
   ```bash
   npm run init-db
   ```

### Frontend Deployment

#### Option A: Vercel, Netlify, or Similar

1. **Update `.env` with production API URL**:
   ```
   VITE_API_URL=https://your-backend.herokuapp.com/api
   VITE_GEMINI_API_KEY=your_actual_key
   ```

2. **Build**:
   ```bash
   npm run build
   ```

3. **Deploy** using Vercel/Netlify GUI or CLI

#### Option B: Cloud Run (Recommended for GCP)

The frontend uses **runtime injection** for the Gemini API key for security:

1. **Store API key in Google Secret Manager**:
   ```bash
   echo -n "your_actual_api_key" | gcloud secrets create VITE_GEMINI_API_KEY_SECRET --data-file=-
   ```

2. **Build Docker image**:
   ```bash
   cd frontend
   gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/frontend
   ```

3. **Deploy to Cloud Run** (manual deployment):
   ```bash
   # Get the secret value
   GEMINI_KEY=$(gcloud secrets versions access latest --secret=VITE_GEMINI_API_KEY_SECRET)
   
   # Deploy with runtime injection
   gcloud run deploy frontend \
     --image gcr.io/YOUR_PROJECT_ID/frontend \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --memory 256Mi \
     --set-env-vars "VITE_GEMINI_API_KEY=$GEMINI_KEY"
   ```

   **Or use Cloud Build** (automated, see `frontend/cloudbuild.yaml`):
   ```bash
   gcloud builds submit --config frontend/cloudbuild.yaml
   ```

**How Runtime Injection Works:**
- The API key is injected at container startup via `docker-entrypoint.sh`
- The key replaces a placeholder (`REPLACE_WITH_API_KEY`) in `public/config.js`
- No API key is embedded in the build, improving security
- The entrypoint script reads `VITE_GEMINI_API_KEY` environment variable and injects it
- See `GCP_DEPLOYMENT_GUIDE.md` for detailed Cloud Run setup

## 🔒 Security Considerations

- **API Key Security**: For production (Cloud Run), API keys are injected at runtime via Docker entrypoint, not embedded in builds
- Add authentication (JWT, OAuth) for multi-user deployments
- Use HTTPS in production
- Implement rate limiting on API endpoints
- Add API key validation
- Secure your database credentials
- Consider CORS configuration for production
- Store sensitive keys in Secret Manager (GCP) or equivalent service

## 🛠️ Development Tips

### Running Both Servers Concurrently

Install `concurrently`:
```bash
npm install -g concurrently
```

Create a root `package.json`:
```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev --prefix backend\" \"npm run dev --prefix frontend\""
  }
}
```

Run both: `npm run dev`

### Database Management

**View SQLite data**:
```bash
# Install sqlite3
brew install sqlite3  # macOS
apt-get install sqlite3  # Linux

# Open database
sqlite3 backend/investment_proposal.db

# List tables
.tables

# Query data
SELECT * FROM strategies;
```

**PostgreSQL**:
```bash
# Connect
psql $DATABASE_URL

# List tables
\dt

# Query
SELECT * FROM strategies;
```

## 🧪 Testing

```bash
# Backend
cd backend
npm test  # When tests are added

# Frontend
cd frontend
npm test  # When tests are added
```

## 📦 Adding New Features

### Example: Add a "Favorites" Feature

1. **Update Database Schema** (`database.js`):
```sql
CREATE TABLE IF NOT EXISTS favorite_portfolios (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  allocations JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

2. **Add API Endpoint** (`server.js`):
```javascript
app.get('/api/favorites', async (req, res) => {
  const result = await query('SELECT * FROM favorite_portfolios');
  res.json(result.rows);
});
```

3. **Add Frontend Service** (`apiService.ts`):
```typescript
async getFavorites() {
  return this.request('/favorites');
}
```

4. **Use in Component**:
```typescript
const [favorites] = useApiState('favorites', []);
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - feel free to use this for your business!

## 🆘 Troubleshooting

### "Cannot connect to backend"
- Ensure backend is running on port 3001
- Check `VITE_API_URL` in frontend `.env.local`
- Verify firewall settings

### "Database error"
- For SQLite: Check file permissions
- For PostgreSQL: Verify DATABASE_URL is correct
- Run `npm run init-db` to reinitialize

### "Strategies not loading"
- Check browser console for errors
- Verify API endpoints are responding
- Ensure database was seeded: `npm run init-db`

### Gemini API / AI Summary Issues

#### Historical Issue: Importmap Conflict (Resolved)
**Problem**: The frontend was experiencing `(intermediate value).getGenerativeModel is not a function` errors in production, even though the code worked locally.

**Root Cause**: An importmap in `index.html` was mapping `@google/genai` (wrong package) from a CDN, which conflicted with the bundled `@google/generative-ai` package. The importmap was commented out in the source code, but Vite was uncommenting it during the build process, or an old `dist/index.html` file was being used.

**Solution**:
1. **Removed the importmap entirely** from `index.html` (not just commented it)
2. **Added Dockerfile steps** to remove any importmap from the built HTML after Vite processes it
3. **Fixed Cloud Build** to actually push the Docker image to the registry (it was building but not pushing)
4. **Verified deployed files** match what's in the Docker image

**Key Learnings**:
- **Always verify what's actually deployed**, not just what's in source code
- **Check the built output** (`dist/`) - it may differ from source
- **Docker layer caching** can cause old files to persist - use `--no-cache` when debugging
- **Cloud Build must push images** - building isn't enough, the image must be pushed to the registry
- **Browser caching** is often blamed, but build/deployment issues are more common
- **Use direct API calls** to test if library issues are masking API problems

**Debugging Process**:
1. Check what HTML is actually served (not just source)
2. Verify Docker image contents at each build stage
3. Check Cloud Run logs for runtime file contents
4. Compare bundle hashes between builds
5. Test with direct REST API calls to bypass library issues

#### Model Not Found (404) Errors - RESOLVED ✅
**Status**: This issue was resolved. The root cause was that the library was using v1beta API, but the direct REST API test revealed which models were actually available. The code now automatically discovers and uses available models.

**Solution Applied**:
- Added direct REST API call to test API key and list available models
- Code automatically tries available models from the API response
- Falls back to known model names if API listing fails
- Improved error messages to distinguish between API version issues and model availability

#### Rate Limit (429) Errors - OPTIMIZED ✅
**Status**: Optimized to minimize API calls and prevent rate limit issues.

**Optimizations Applied**:
- **Model caching**: Once a working model is found, it's cached in localStorage for 24 hours
- **Available models caching**: List of available models is cached to avoid repeated API discovery calls
- **Skip discovery on cache hit**: If a cached working model exists, we skip all API discovery calls
- **Only one API call per request**: After initial discovery, subsequent requests use cached model (no API calls until cache expires)

**If you're getting "Rate limit exceeded"**:

1. **Wait and retry**: Gemini API has rate limits to prevent abuse. Wait a few minutes and try again.
2. **Check your quota**: Visit [Google Cloud Console](https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com/quotas) to view your API quotas
3. **Free tier limits**: Free tier has lower rate limits. Consider upgrading if you need higher throughput
4. **Clear cache if needed**: If you suspect cache issues, clear localStorage: `localStorage.removeItem('gemini_working_model')` and `localStorage.removeItem('gemini_available_models')`

**Note**: Rate limit errors are actually a good sign - they mean your API key is working and models are accessible! The original "model not found" issue has been resolved. The caching optimization means you should rarely hit rate limits during normal use.

## 📚 Lessons Learned & Development Notes

This section documents key learnings from debugging and optimizing the application, particularly around the Gemini API integration and deployment process.

### Critical Deployment Issue: Cloud Build Image Push

**Problem**: Docker images were being built successfully but not pushed to the registry, causing Cloud Run to serve old cached images.

**Root Cause**: The `cloudbuild.yaml` was missing an explicit push step. Docker build was completing, but the image wasn't being pushed to Google Container Registry.

**Solution**: Added explicit push step in `cloudbuild.yaml`:
```yaml
# Push the image to Container Registry
- name: 'gcr.io/cloud-builders/docker'
  id: 'Push Frontend Image'
  args:
    - 'push'
    - '--all-tags'
    - 'gcr.io/$PROJECT_ID/frontend'
```

**Key Learning**: Always verify that Cloud Build is both building AND pushing images. Check image tags in Container Registry to confirm new images are being created.

### Importmap Conflict Resolution

**Problem**: `(intermediate value).getGenerativeModel is not a function` error in production despite working locally.

**Root Cause**: An importmap in `index.html` was mapping `@google/genai` (wrong package) from a CDN, conflicting with the bundled `@google/generative-ai`. Even though the importmap was commented out in source, it appeared in deployed HTML.

**Solution**:
1. Completely removed importmap from `index.html` (not just commented)
2. Added Dockerfile steps to strip any importmap from built HTML:
   ```dockerfile
   # Remove importmap after Vite build
   RUN awk '/<script type="importmap">/,/<\/script>/ {next} {print}' dist/index.html > dist/index.html.tmp
   ```
3. Added verification steps to confirm importmap removal at multiple build stages

**Key Learning**: 
- Vite may process commented HTML differently than expected
- Always verify the actual deployed files, not just source code
- Build artifacts (`dist/`) can differ from source in unexpected ways
- Use Dockerfile verification steps to inspect files at each stage

### API Optimization: Model Caching

**Problem**: Multiple API calls on each request were causing rate limit issues.

**Solution**: Implemented localStorage caching:
- Working model name cached for 24 hours
- Available models list cached for 24 hours
- Direct API discovery only runs if cache is missing or expired
- Subsequent requests use cached model (zero API calls until cache expires)

**Implementation**:
```typescript
const CACHE_KEY_WORKING_MODEL = 'gemini_working_model';
const CACHE_KEY_AVAILABLE_MODELS = 'gemini_available_models';
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
```

**Key Learning**: 
- Always cache API discovery calls that don't change frequently
- localStorage is perfect for client-side caching of API metadata
- Cache expiry prevents stale data while reducing API calls
- Rate limits are often caused by unnecessary repeated calls, not actual usage

### Debugging Methodology

When debugging deployment issues, follow this systematic approach:

1. **Verify Source vs Deployed**:
   - Check what's actually served (browser DevTools → Network → View Response)
   - Compare with source code
   - Use `curl` or PowerShell to fetch deployed HTML directly

2. **Inspect Build Artifacts**:
   - Check `dist/` folder after local build
   - Verify Docker image contents at each stage
   - Use `docker run` to inspect built images locally

3. **Check Deployment Pipeline**:
   - Verify Cloud Build logs show image push
   - Check Container Registry for new image tags
   - Confirm Cloud Run is using latest revision
   - Use `gcloud run revisions list` to see all revisions

4. **Test API Directly**:
   - Use direct REST API calls to bypass library issues
   - Test API key permissions independently
   - List available models via API to verify access

5. **Cache Verification**:
   - Check browser localStorage for cached values
   - Clear cache if debugging: `localStorage.clear()`
   - Verify cache expiry logic is working

### Architecture Decisions

**Runtime API Key Injection**:
- API key injected at container startup via `docker-entrypoint.sh`
- No API key in build artifacts (better security)
- Key stored in Google Secret Manager
- Injected into `config.js` at runtime

**Static vs Dynamic Imports**:
- Use static imports for production builds (better bundling)
- Vite handles code-splitting automatically
- Dynamic imports can cause module resolution issues in production

**Error Handling**:
- User-friendly error messages in UI
- Detailed logging to console for debugging
- No `alert()` calls in production (use UI error display)
- Rate limit errors provide helpful guidance

### Common Pitfalls to Avoid

1. **Assuming source code matches deployed code** - Always verify
2. **Blaming browser caching** - Usually a build/deployment issue
3. **Not checking if images are pushed** - Building ≠ Deploying
4. **Making unnecessary API calls** - Cache discovery results
5. **Using commented code as "disabled"** - Build tools may process it
6. **Not verifying at each build stage** - Add verification steps in Dockerfile

### Verification Commands

Use these commands to verify deployments:

```bash
# Check what HTML is actually served
curl https://your-frontend-url.run.app/ | grep -i "importmap\|index-.*\.js"

# List Cloud Run revisions
gcloud run revisions list --service frontend --region us-central1

# Check Container Registry images
gcloud container images list-tags gcr.io/PROJECT_ID/frontend

# View Cloud Run logs
gcloud run services logs read frontend --region us-central1 --limit=50

# Check if image was pushed (look for latest tag with recent timestamp)
gcloud container images list-tags gcr.io/PROJECT_ID/frontend --limit=5
```

## 📞 Support

For questions or issues:
1. Check this README
2. Review the code comments
3. Open an issue on GitHub

---

**Built with ❤️ for financial advisers**
