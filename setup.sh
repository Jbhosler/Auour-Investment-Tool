#!/bin/bash

# Investment Proposal Tool - Quick Setup Script
# This script sets up both backend and frontend

set -e  # Exit on error

echo "🚀 Investment Proposal Tool - Quick Setup"
echo "=========================================="
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js v18+ first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js $(node --version) detected"
echo ""

# Setup Backend
echo "📦 Setting up backend..."
cd backend

if [ ! -f ".env" ]; then
    echo "   Creating .env file..."
    cp .env.example .env
    echo "   ✅ Created .env (using SQLite by default)"
else
    echo "   ℹ️  .env already exists, skipping..."
fi

echo "   Installing backend dependencies..."
npm install --silent

echo "   Initializing database with sample data..."
npm run init-db

echo "✅ Backend setup complete!"
echo ""

# Setup Frontend
echo "📦 Setting up frontend..."
cd ../frontend

if [ ! -f ".env.local" ]; then
    echo "   Creating .env.local file..."
    cp .env.example .env.local
    echo "   ⚠️  Remember to add your VITE_GEMINI_API_KEY to .env.local"
else
    echo "   ℹ️  .env.local already exists, skipping..."
fi

echo "   Installing frontend dependencies..."
npm install --silent

echo "✅ Frontend setup complete!"
echo ""

echo "=========================================="
echo "✨ Setup Complete!"
echo "=========================================="
echo ""
echo "📝 Next Steps:"
echo ""
echo "1. Add your Gemini API key:"
echo "   Edit: frontend/.env.local"
echo "   Set: VITE_GEMINI_API_KEY=your_actual_key"
echo ""
echo "2. Start the backend (Terminal 1):"
echo "   cd backend"
echo "   npm run dev"
echo ""
echo "3. Start the frontend (Terminal 2):"
echo "   cd frontend"
echo "   npm run dev"
echo ""
echo "4. Open your browser:"
echo "   http://localhost:5173"
echo ""
echo "📚 Documentation:"
echo "   - README.md - Full documentation"
echo "   - MIGRATION.md - Migrate from old version"
echo ""
echo "🎉 Happy investing!"
