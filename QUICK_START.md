# 🚀 Quick Reference Card

## Installation (5 Minutes)

```bash
# Extract & setup
unzip investment-proposal-fullstack.zip
cd investment-proposal-fullstack
./setup.sh

# Add your Gemini API key
# Edit: frontend/.env.local
# Add: VITE_GEMINI_API_KEY=your_key_here
```

## Running (2 Terminals)

```bash
# Terminal 1 - Backend
cd backend
npm run dev
# Runs on http://localhost:3001

# Terminal 2 - Frontend  
cd frontend
npm run dev
# Runs on http://localhost:5173
```

## Common Commands

```bash
# Backend
npm run dev          # Start development server
npm run init-db      # Reset & seed database
npm start           # Production server

# Frontend
npm run dev          # Development server
npm run build        # Build for production
npm run preview      # Preview production build
```

## File Locations

```
backend/.env              # Backend config
frontend/.env.local       # Frontend config (add API key here!)
backend/*.db              # SQLite database
```

## API Quick Reference

```bash
# Get strategies
curl http://localhost:3001/api/strategies

# Get benchmarks
curl http://localhost:3001/api/benchmarks

# Get proposals
curl http://localhost:3001/api/proposals

# Health check
curl http://localhost:3001/health
```

## Configuration

### Backend (.env)
```bash
DB_TYPE=sqlite              # Use SQLite
# DATABASE_URL=postgres://  # Or PostgreSQL
PORT=3001
```

### Frontend (.env.local)
```bash
VITE_API_URL=http://localhost:3001/api
VITE_GEMINI_API_KEY=your_key_here
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Backend won't start | Check Node.js version (need v18+) |
| Frontend not connecting | Check VITE_API_URL in .env.local |
| No data | Run `npm run init-db` in backend |
| Port already in use | Change PORT in backend/.env |

## URLs

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001/api
- **Health Check**: http://localhost:3001/health

## Key Features

✅ Persistent database storage  
✅ Access from any device  
✅ Share strategies with team  
✅ Save all proposals  
✅ Professional deployment ready  
✅ Full REST API  

## Next Steps

1. ✅ Run `./setup.sh`
2. ✅ Add Gemini API key
3. ✅ Start both servers
4. ✅ Test at localhost:5173
5. 📖 Read README.md for details
6. 🚀 Deploy to production

## Support

- 📖 README.md - Full documentation
- 🔄 MIGRATION.md - Migrate old data
- 🌐 API.md - API reference
- 📋 PROJECT_SUMMARY.md - Overview

---

**Need help?** Check the docs above! 🎯
