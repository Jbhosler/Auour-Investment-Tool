# GCP Deployment Guide - Investment Proposal Tool

Complete guide to deploy your full-stack Investment Proposal Tool on Google Cloud Platform.

## 📋 Table of Contents

1. [Why GCP is Perfect for This Project](#why-gcp)
2. [Architecture Overview](#architecture)
3. [Prerequisites](#prerequisites)
4. [Option A: Cloud Run (Recommended)](#option-a-cloud-run)
5. [Option B: App Engine](#option-b-app-engine)
6. [Database Setup](#database-setup)
7. [Domain & SSL Configuration](#domain-ssl)
8. [Monitoring & Logging](#monitoring)
9. [Cost Estimation](#costs)
10. [Troubleshooting](#troubleshooting)

---

## 🎯 Why GCP is Perfect for This Project {#why-gcp}

✅ **Native Gemini AI Integration** - Your app already uses Gemini, so staying in Google's ecosystem is seamless
✅ **Cloud Run** - Perfect for containerized Node.js + React apps
✅ **Cloud SQL PostgreSQL** - Fully managed, auto-scaling database
✅ **Simple Deployment** - Less complex than AWS for this use case
✅ **Cost Effective** - Pay only for what you use, scales to zero

---

## 🏗️ Architecture Overview {#architecture}

```
┌─────────────────────────────────────────────────────┐
│                   GCP Project                        │
│                                                      │
│  ┌──────────────┐      ┌──────────────┐            │
│  │  Cloud Run   │      │  Cloud Run   │            │
│  │  (Frontend)  │◄────►│  (Backend)   │            │
│  │  React/Vite  │      │  Node/Express│            │
│  └──────────────┘      └──────────────┘            │
│         │                      │                    │
│         │                      ▼                    │
│         │              ┌──────────────┐            │
│         │              │  Cloud SQL   │            │
│         │              │  PostgreSQL  │            │
│         │              └──────────────┘            │
│         │                      │                    │
│         └──────────────────────┴────────────────►  │
│                                                      │
│                     Gemini API                       │
└─────────────────────────────────────────────────────┘
```

**What we'll deploy:**
- Frontend: Cloud Run container (React build)
- Backend: Cloud Run container (Node.js API)
- Database: Cloud SQL PostgreSQL
- Secrets: Secret Manager (API keys)
- Static Assets: Cloud Storage (optional)

---

## ✅ Prerequisites {#prerequisites}

### 1. Install GCP CLI

**macOS:**
```bash
brew install google-cloud-sdk
```

**Windows:**
Download from: https://cloud.google.com/sdk/docs/install

**Linux:**
```bash
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
```

### 2. Install Docker

**macOS/Windows:**
Download Docker Desktop: https://www.docker.com/products/docker-desktop

**Linux:**
```bash
sudo apt-get update
sudo apt-get install docker.io docker-compose
```

### 3. Verify Installations

```bash
gcloud --version
docker --version
node --version  # Should be v18+
```

### 4. Authenticate with GCP

```bash
# Login to GCP
gcloud auth login

# Create a new project (or use existing)
gcloud projects create investment-proposal-prod --name="Investment Proposal Tool"

# Set as default project
gcloud config set project investment-proposal-prod

# Enable billing (required - do this in console)
# Go to: https://console.cloud.google.com/billing
```

### 5. Enable Required APIs

```bash
# Enable all necessary GCP services
gcloud services enable \
  run.googleapis.com \
  sql-component.googleapis.com \
  sqladmin.googleapis.com \
  compute.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com \
  artifactregistry.googleapis.com
```

---

## 🚀 Option A: Cloud Run (Recommended) {#option-a-cloud-run}

Cloud Run is serverless, auto-scaling, and perfect for your stack.

### Step 1: Prepare Your Application

#### 1.1 Create Dockerfiles

**Backend Dockerfile** (`backend/Dockerfile`):
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Expose port (Cloud Run uses PORT env var)
EXPOSE 8080

# Start the application
CMD ["node", "server.js"]
```

**Frontend Dockerfile** (`frontend/Dockerfile`):
```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage - serve with nginx
FROM nginx:alpine

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
```

**Frontend nginx config** (`frontend/nginx.conf`):
```nginx
server {
    listen 8080;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Enable gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # SPA routing - serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

#### 1.2 Create .dockerignore files

**Backend .dockerignore:**
```
node_modules
npm-debug.log
.env
.env.local
*.db
*.sqlite
.git
.gitignore
README.md
```

**Frontend .dockerignore:**
```
node_modules
npm-debug.log
.env
.env.local
.env.development
dist
.git
.gitignore
README.md
```

### Step 2: Set Up Cloud SQL (PostgreSQL)

```bash
# Create PostgreSQL instance
gcloud sql instances create investment-proposal-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --root-password=YOUR_STRONG_PASSWORD_HERE

# Create the database
gcloud sql databases create investment_proposals \
  --instance=investment-proposal-db

# Create a user for the application
gcloud sql users create app_user \
  --instance=investment-proposal-db \
  --password=YOUR_APP_PASSWORD_HERE
```

**Note the connection details:**
```bash
gcloud sql instances describe investment-proposal-db
```

### Step 3: Store Secrets in Secret Manager

```bash
# Store Gemini API Key
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets create gemini-api-key --data-file=-

# Store Database Password
echo -n "YOUR_APP_PASSWORD_HERE" | gcloud secrets create db-password --data-file=-

# Store Database URL (format: postgresql://user:password@/dbname?host=/cloudsql/PROJECT:REGION:INSTANCE)
echo -n "postgresql://app_user:YOUR_APP_PASSWORD_HERE@/investment_proposals?host=/cloudsql/investment-proposal-prod:us-central1:investment-proposal-db" | \
  gcloud secrets create database-url --data-file=-
```

### Step 4: Deploy Backend to Cloud Run

```bash
cd backend

# Build and push container to Google Container Registry
gcloud builds submit --tag gcr.io/investment-proposal-prod/backend

# Deploy to Cloud Run with Cloud SQL connection
gcloud run deploy backend \
  --image gcr.io/investment-proposal-prod/backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --add-cloudsql-instances investment-proposal-prod:us-central1:investment-proposal-db \
  --set-env-vars "NODE_ENV=production,PORT=8080" \
  --set-secrets "DATABASE_URL=database-url:latest" \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10
```

**Note the backend URL** (e.g., `https://backend-xxxxx-uc.a.run.app`)

### Step 5: Initialize Database Schema

```bash
# Connect to Cloud SQL to run initialization
gcloud sql connect investment-proposal-db --user=app_user

# Then in psql, copy your schema from backend/scripts/initDatabase.js
# Or use Cloud SQL proxy to run your Node.js initialization script
```

**Option: Use Cloud SQL Proxy locally:**
```bash
# Download and run Cloud SQL Proxy
cloud_sql_proxy -instances=investment-proposal-prod:us-central1:investment-proposal-db=tcp:5432

# In another terminal, set DATABASE_URL and run init script
export DATABASE_URL="postgresql://app_user:YOUR_APP_PASSWORD_HERE@localhost:5432/investment_proposals"
cd backend
npm run init-db
```

### Step 6: Deploy Frontend to Cloud Run

First, update your frontend environment variables with the backend URL:

**frontend/.env.production:**
```env
VITE_API_URL=https://backend-xxxxx-uc.a.run.app
VITE_GEMINI_API_KEY=YOUR_GEMINI_API_KEY
```

Then build and deploy:

```bash
cd frontend

# Build with production env vars
npm run build

# Build and push container
gcloud builds submit --tag gcr.io/investment-proposal-prod/frontend

# Deploy to Cloud Run
gcloud run deploy frontend \
  --image gcr.io/investment-proposal-prod/frontend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 256Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 5
```

**Note the frontend URL** (e.g., `https://frontend-xxxxx-uc.a.run.app`)

### Step 7: Update CORS Settings

Update your backend to allow the frontend URL:

In `backend/server.js`, update CORS configuration:
```javascript
const cors = require('cors');

app.use(cors({
  origin: [
    'https://frontend-xxxxx-uc.a.run.app',  // Your Cloud Run frontend
    'http://localhost:5173',  // Local development
  ],
  credentials: true
}));
```

Redeploy backend:
```bash
cd backend
gcloud builds submit --tag gcr.io/investment-proposal-prod/backend
gcloud run deploy backend --image gcr.io/investment-proposal-prod/backend
```

### Step 8: Test Your Deployment

```bash
# Get your URLs
BACKEND_URL=$(gcloud run services describe backend --region us-central1 --format 'value(status.url)')
FRONTEND_URL=$(gcloud run services describe frontend --region us-central1 --format 'value(status.url)')

echo "Backend URL: $BACKEND_URL"
echo "Frontend URL: $FRONTEND_URL"

# Test backend health
curl $BACKEND_URL/health

# Open frontend in browser
open $FRONTEND_URL
```

---

## 🔧 Option B: App Engine (Alternative) {#option-b-app-engine}

If you prefer not to use Docker, App Engine offers a simpler approach.

### Backend on App Engine

**Create `backend/app.yaml`:**
```yaml
runtime: nodejs18

env_variables:
  NODE_ENV: "production"

instance_class: F1

automatic_scaling:
  min_instances: 0
  max_instances: 10
  target_cpu_utilization: 0.65
```

**Deploy:**
```bash
cd backend
gcloud app deploy
```

### Frontend on App Engine

**Create `frontend/app.yaml`:**
```yaml
runtime: nodejs18

handlers:
  - url: /assets
    static_dir: dist/assets
    secure: always

  - url: /.*
    static_files: dist/index.html
    upload: dist/index.html
    secure: always

automatic_scaling:
  min_instances: 0
  max_instances: 5
```

**Build and deploy:**
```bash
cd frontend
npm run build
gcloud app deploy
```

---

## 💾 Database Setup Details {#database-setup}

### Production Recommendations

**For Light Usage (< 100 users):**
- **Tier:** db-f1-micro (shared CPU, 0.6 GB RAM)
- **Storage:** 10 GB SSD
- **Cost:** ~$7/month

**For Medium Usage (100-1000 users):**
- **Tier:** db-g1-small (shared CPU, 1.7 GB RAM)
- **Storage:** 20 GB SSD
- **Cost:** ~$25/month

**For Heavy Usage (1000+ users):**
- **Tier:** db-custom-2-7680 (2 vCPU, 7.5 GB RAM)
- **Storage:** 50 GB SSD
- **Cost:** ~$100/month

### Backup Configuration

```bash
# Enable automated backups
gcloud sql instances patch investment-proposal-db \
  --backup-start-time=03:00 \
  --enable-bin-log

# Create manual backup
gcloud sql backups create \
  --instance=investment-proposal-db
```

### Connection Pooling

Update `backend/database.js` for production:

```javascript
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,  // Maximum pool connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

module.exports = pool;
```

---

## 🌐 Domain & SSL Configuration {#domain-ssl}

### Map Custom Domain to Cloud Run

```bash
# Add domain mapping for frontend
gcloud run domain-mappings create \
  --service frontend \
  --domain www.yourcompany.com \
  --region us-central1

# Add domain mapping for backend API
gcloud run domain-mappings create \
  --service backend \
  --domain api.yourcompany.com \
  --region us-central1
```

### Configure DNS

Add these records to your DNS provider:
```
Type: CNAME
Name: www
Value: ghs.googlehosted.com

Type: CNAME
Name: api
Value: ghs.googlehosted.com
```

### SSL Certificates

Cloud Run automatically provisions SSL certificates for custom domains (free with Let's Encrypt).

---

## 📊 Monitoring & Logging {#monitoring}

### Set Up Cloud Monitoring

```bash
# View logs
gcloud run services logs read backend --region us-central1
gcloud run services logs read frontend --region us-central1

# Set up log-based metrics
gcloud logging metrics create error-rate \
  --description="Rate of application errors" \
  --log-filter='resource.type="cloud_run_revision"
    severity="ERROR"'
```

### Create Uptime Checks

```bash
# Create uptime check for backend
gcloud monitoring uptime create backend-uptime \
  --resource-type=uptime-url \
  --host=backend-xxxxx-uc.a.run.app \
  --path=/health
```

### Set Up Alerts

In GCP Console:
1. Go to **Monitoring** > **Alerting**
2. Create alert for:
   - High error rates
   - Slow response times
   - Database connection issues
   - High CPU/memory usage

---

## 💰 Cost Estimation {#costs}

### Monthly Cost Breakdown (Estimated)

#### Minimal Usage (Personal/Testing)
```
Cloud Run Backend:    $0-5   (mostly idle)
Cloud Run Frontend:   $0-3   (mostly idle)
Cloud SQL (f1-micro): $7     (always running)
Cloud Storage:        $0-1   (minimal storage)
Networking:           $0-2   (low traffic)
─────────────────────────────
TOTAL:                ~$10-18/month
```

#### Production Usage (100-500 users)
```
Cloud Run Backend:    $15-30  (moderate traffic)
Cloud Run Frontend:   $5-10   (moderate traffic)
Cloud SQL (g1-small): $25     (better performance)
Cloud Storage:        $1-3    (more storage)
Networking:           $5-15   (more traffic)
Secret Manager:       $0-1    (API keys)
─────────────────────────────
TOTAL:                ~$50-85/month
```

#### High Usage (1000+ users)
```
Cloud Run Backend:    $50-150  (high traffic)
Cloud Run Frontend:   $15-30   (high traffic)
Cloud SQL (custom):   $100+    (dedicated resources)
Cloud Storage:        $5-20    (significant storage)
Networking:           $20-50   (high traffic)
Load Balancer:        $18      (if using)
─────────────────────────────
TOTAL:                ~$200-400/month
```

### Cost Optimization Tips

1. **Use Cloud Run's scale-to-zero** - Pay only when running
2. **Right-size your database** - Start small, scale as needed
3. **Enable caching** - Reduce database queries
4. **Use Cloud CDN** - For static assets (frontend)
5. **Set max instances** - Prevent runaway costs
6. **Monitor usage** - Set up billing alerts

```bash
# Set budget alert
gcloud billing budgets create \
  --billing-account YOUR_BILLING_ACCOUNT \
  --display-name "Monthly Budget" \
  --budget-amount 100
```

---

## 🔧 Environment Variables Reference {#env-vars}

### Backend Environment Variables

```env
# Required
NODE_ENV=production
PORT=8080
DATABASE_URL=postgresql://user:pass@/db?host=/cloudsql/project:region:instance

# Optional
LOG_LEVEL=info
MAX_POOL_SIZE=20
```

### Frontend Environment Variables

```env
# Required
VITE_API_URL=https://backend-xxxxx-uc.a.run.app
VITE_GEMINI_API_KEY=your_gemini_api_key

# Optional
VITE_ENVIRONMENT=production
```

---

## 🛠️ Troubleshooting {#troubleshooting}

### Common Issues

#### 1. "Cloud Run service not accessible"

```bash
# Check if service is public
gcloud run services describe backend --region us-central1 --format="get(metadata.name)"

# Make service public
gcloud run services add-iam-policy-binding backend \
  --region us-central1 \
  --member="allUsers" \
  --role="roles/run.invoker"
```

#### 2. "Database connection failed"

```bash
# Verify Cloud SQL instance is running
gcloud sql instances describe investment-proposal-db

# Check Cloud SQL connection in Cloud Run
gcloud run services describe backend --region us-central1 --format="get(spec.template.spec.containers[0].env)"

# Test connection with Cloud SQL Proxy
cloud_sql_proxy -instances=PROJECT:REGION:INSTANCE=tcp:5432
```

#### 3. "Frontend can't reach backend (CORS)"

Update backend CORS to include your frontend URL:
```javascript
app.use(cors({
  origin: ['https://frontend-xxxxx-uc.a.run.app'],
  credentials: true
}));
```

#### 4. "Out of memory errors"

```bash
# Increase memory allocation
gcloud run services update backend \
  --memory 1Gi \
  --region us-central1
```

#### 5. "Build fails on Cloud Build"

```bash
# Check build logs
gcloud builds list --limit=5

# View specific build
gcloud builds log BUILD_ID
```

### Debug Commands

```bash
# View backend logs (live)
gcloud run services logs tail backend --region us-central1

# View recent errors
gcloud logging read "resource.type=cloud_run_revision AND severity=ERROR" \
  --limit 50 \
  --format json

# Check service status
gcloud run services describe backend \
  --region us-central1 \
  --format="table(status.conditions.type,status.conditions.status,status.conditions.reason)"

# Test database connectivity
gcloud sql connect investment-proposal-db --user=app_user --database=investment_proposals
```

---

## 🚀 Deployment Checklist

### Pre-Deployment
- [ ] All code committed to git
- [ ] Environment variables documented
- [ ] Database schema finalized
- [ ] API endpoints tested locally
- [ ] Frontend builds successfully
- [ ] Secrets prepared

### GCP Setup
- [ ] GCP project created
- [ ] Billing enabled
- [ ] APIs enabled
- [ ] gcloud CLI configured
- [ ] Docker installed

### Database
- [ ] Cloud SQL instance created
- [ ] Database and user created
- [ ] Schema initialized
- [ ] Sample data loaded (optional)
- [ ] Backups configured

### Backend Deployment
- [ ] Dockerfile created
- [ ] Environment variables set
- [ ] Secrets stored in Secret Manager
- [ ] Cloud SQL connection configured
- [ ] Service deployed to Cloud Run
- [ ] Health endpoint verified

### Frontend Deployment
- [ ] Production build tested
- [ ] API URL configured
- [ ] Dockerfile and nginx config created
- [ ] Service deployed to Cloud Run
- [ ] Routes working correctly

### Post-Deployment
- [ ] End-to-end testing completed
- [ ] CORS configured correctly
- [ ] Custom domain mapped (optional)
- [ ] SSL certificate active
- [ ] Monitoring and alerts set up
- [ ] Cost monitoring enabled
- [ ] Documentation updated

---

## 📚 Additional Resources

### GCP Documentation
- [Cloud Run Docs](https://cloud.google.com/run/docs)
- [Cloud SQL Docs](https://cloud.google.com/sql/docs)
- [Secret Manager](https://cloud.google.com/secret-manager/docs)
- [Cloud Build](https://cloud.google.com/build/docs)

### Tutorials
- [Deploy Node.js on Cloud Run](https://cloud.google.com/run/docs/quickstarts/build-and-deploy/deploy-nodejs-service)
- [Connect Cloud Run to Cloud SQL](https://cloud.google.com/sql/docs/postgres/connect-run)

### Tools
- [Cloud SQL Proxy](https://cloud.google.com/sql/docs/postgres/sql-proxy)
- [GCP Console](https://console.cloud.google.com)
- [GCP Pricing Calculator](https://cloud.google.com/products/calculator)

---

## 🎯 Quick Deploy Script

Save this as `deploy-to-gcp.sh`:

```bash
#!/bin/bash

# Configuration
PROJECT_ID="investment-proposal-prod"
REGION="us-central1"
BACKEND_IMAGE="gcr.io/$PROJECT_ID/backend"
FRONTEND_IMAGE="gcr.io/$PROJECT_ID/frontend"

# Set project
gcloud config set project $PROJECT_ID

# Build and deploy backend
echo "Building backend..."
cd backend
gcloud builds submit --tag $BACKEND_IMAGE

echo "Deploying backend..."
gcloud run deploy backend \
  --image $BACKEND_IMAGE \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated

# Build and deploy frontend
echo "Building frontend..."
cd ../frontend
gcloud builds submit --tag $FRONTEND_IMAGE

echo "Deploying frontend..."
gcloud run deploy frontend \
  --image $FRONTEND_IMAGE \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated

echo "Deployment complete!"
echo "Backend URL: $(gcloud run services describe backend --region $REGION --format 'value(status.url)')"
echo "Frontend URL: $(gcloud run services describe frontend --region $REGION --format 'value(status.url)')"
```

Make it executable:
```bash
chmod +x deploy-to-gcp.sh
./deploy-to-gcp.sh
```

---

## 🎉 Success!

You've now deployed your Investment Proposal Tool to Google Cloud Platform!

**Next Steps:**
1. Test all features in production
2. Set up monitoring and alerts
3. Configure custom domain
4. Plan for backups
5. Monitor costs

**Need Help?**
- Check GCP Console logs
- Review this guide's troubleshooting section
- Consult GCP documentation

Good luck with your deployment! 🚀
