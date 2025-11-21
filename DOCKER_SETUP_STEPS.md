# Step-by-Step: Setting Up Docker Files (Windows)

## Overview
You need to add 5 Docker-related files to your project:
- Backend: Dockerfile + .dockerignore
- Frontend: Dockerfile + .dockerignore + nginx.conf

## 📥 Step 1: Download the Docker Files

I've created all the necessary files for you. Download these files from Claude:

1. **backend-Dockerfile** - Backend container configuration
2. **backend-dockerignore** - Backend files to exclude
3. **frontend-Dockerfile** - Frontend container configuration  
4. **frontend-dockerignore** - Frontend files to exclude
5. **nginx.conf** - Web server configuration for React app
6. **setup-docker-files.bat** - Automated setup script

Save all 6 files to your Downloads folder.

## 📂 Step 2: Locate Your Project

Open Command Prompt and navigate to your extracted project:

```cmd
cd C:\Users\JosephHosler\Downloads\investment-proposal-fullstack
```

Or wherever you extracted the zip file. You should see these folders:
```
investment-proposal-fullstack\
├── backend\
├── frontend\
├── README.md
└── ... other files
```

## 🚀 Step 3: Run the Setup Script (Automated)

### Option A: Use the Automated Script (Easiest)

1. Move the 6 downloaded files to your project root:
```cmd
move C:\Users\JosephHosler\Downloads\backend-Dockerfile .
move C:\Users\JosephHosler\Downloads\backend-dockerignore .
move C:\Users\JosephHosler\Downloads\frontend-Dockerfile .
move C:\Users\JosephHosler\Downloads\frontend-dockerignore .
move C:\Users\JosephHosler\Downloads\nginx.conf .
move C:\Users\JosephHosler\Downloads\setup-docker-files.bat .
```

2. Run the setup script:
```cmd
setup-docker-files.bat
```

This will automatically copy all files to the correct locations!

### Option B: Manual Setup (If Script Doesn't Work)

If the script doesn't work, copy files manually:

**Backend files:**
```cmd
copy backend-Dockerfile backend\Dockerfile
copy backend-dockerignore backend\.dockerignore
```

**Frontend files:**
```cmd
copy frontend-Dockerfile frontend\Dockerfile
copy frontend-dockerignore frontend\.dockerignore
copy nginx.conf frontend\nginx.conf
```

## ✅ Step 4: Verify Files Are in Place

Check that everything is created:

```cmd
dir backend\Dockerfile
dir backend\.dockerignore
dir frontend\Dockerfile
dir frontend\.dockerignore
dir frontend\nginx.conf
```

Each command should show the file exists (not "File Not Found").

## 🔧 Step 5: Update Backend to Use PORT Environment Variable

Cloud Run provides a `PORT` environment variable. Update your backend to use it.

**Edit `backend\server.js`:**

Find this line (usually near the bottom):
```javascript
const PORT = 3000;
app.listen(PORT, () => {
```

Replace it with:
```javascript
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
```

**Important:** The `'0.0.0.0'` binding is crucial for Cloud Run!

## 🧪 Step 6: Test Docker Builds Locally (Optional but Recommended)

Before deploying to GCP, test that your Docker containers build successfully.

### Test Backend:
```cmd
cd backend
docker build -t investment-backend .
```

Should end with: `Successfully tagged investment-backend:latest`

### Test Frontend:
```cmd
cd ..\frontend
docker build -t investment-frontend .
```

Should end with: `Successfully tagged investment-frontend:latest`

### If Builds Fail:
- Check that Node.js dependencies are listed in package.json
- Ensure `npm run build` works for frontend locally
- Review error messages carefully

## 📋 What Each File Does

### Backend Dockerfile
- Starts with Node.js 18 Alpine (lightweight)
- Installs production dependencies
- Copies your backend code
- Exposes port 8080
- Runs `node server.js`

### Backend .dockerignore
- Excludes node_modules (installed fresh in container)
- Excludes .env files (use secrets instead)
- Excludes database files
- Excludes git/documentation

### Frontend Dockerfile
- **Stage 1:** Builds React app with Vite
- **Stage 2:** Serves with nginx web server
- Results in tiny production container
- Multi-stage keeps image small

### Frontend .dockerignore
- Similar to backend
- Excludes build artifacts (created fresh)
- Excludes development files

### nginx.conf
- Configures nginx to serve React SPA
- Handles client-side routing (React Router)
- Enables gzip compression
- Sets up caching for static assets
- Exposes health check endpoint

## 🎯 Project Structure After Setup

```
investment-proposal-fullstack\
│
├── backend\
│   ├── server.js           (modified for PORT)
│   ├── Dockerfile          ← NEW
│   ├── .dockerignore       ← NEW
│   ├── package.json
│   └── ... other files
│
├── frontend\
│   ├── Dockerfile          ← NEW
│   ├── .dockerignore       ← NEW
│   ├── nginx.conf          ← NEW
│   ├── package.json
│   └── ... other files
│
└── ... documentation
```

## ✅ Checklist

Before proceeding to deployment:

- [ ] Downloaded all 6 Docker files
- [ ] Moved files to project root
- [ ] Ran setup-docker-files.bat (or copied manually)
- [ ] Verified all 5 files exist in correct locations
- [ ] Updated backend/server.js to use PORT env var
- [ ] (Optional) Tested Docker builds locally
- [ ] Ready for GCP deployment!

## 🚀 Next Steps

You're now ready to deploy! The next steps are:

1. **Set up Cloud SQL database** - Create PostgreSQL instance
2. **Store secrets** - Add API keys to Secret Manager
3. **Build containers** - Use Google Cloud Build
4. **Deploy to Cloud Run** - Deploy both services
5. **Configure environment** - Set up environment variables
6. **Test** - Verify everything works!

## 🆘 Troubleshooting

### "File not found" when running setup script
- Make sure you're in the project root directory
- Verify all 6 files were downloaded
- Try manual copy commands instead

### Docker build fails - "npm: not found"
- The Dockerfile uses Node.js 18 image which includes npm
- This error means Docker isn't using the right base image
- Verify your Dockerfile matches the one provided

### Frontend build fails - missing dependencies
- Make sure package.json exists in frontend folder
- All dependencies should be listed in package.json
- Build will install them fresh in the container

### Backend won't connect to database
- Don't worry about this yet!
- We'll configure Cloud SQL connection during deployment
- For now, just ensure Docker builds successfully

## 💡 Pro Tips

1. **Don't commit .env files** - .dockerignore excludes them
2. **Use multi-stage builds** - Frontend Dockerfile does this automatically
3. **Test locally first** - Catch issues before deploying
4. **Keep images small** - Alpine Linux base is tiny
5. **Use .dockerignore** - Speeds up builds significantly

## 📞 Need Help?

If you get stuck:
1. Check that files are in the correct locations
2. Verify Dockerfile syntax (no typos)
3. Test Docker builds locally to catch errors early
4. Review error messages carefully
5. Check Docker Desktop is running (for local testing)

---

**Ready?** Once all files are in place and backend/server.js is updated, you're ready to deploy to GCP! 🎉
