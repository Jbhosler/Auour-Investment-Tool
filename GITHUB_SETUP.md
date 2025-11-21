# GitHub Setup Instructions

## Step 1: Install Git

Git is not currently installed on your system. Install it first:

**Option A: Download Installer (Recommended)**
1. Go to: https://git-scm.com/download/win
2. Download the installer
3. Run the installer with default settings
4. **Important**: Restart your terminal/PowerShell after installation

**Option B: Using winget (if available)**
```powershell
winget install Git.Git
```

**Verify Installation:**
Open a NEW terminal/PowerShell window and run:
```powershell
git --version
```
You should see something like `git version 2.x.x`

## Step 2: Create GitHub Repository

1. Go to: https://github.com/new
2. Create an empty repository:
   - **Repository name**: (your choice, e.g., `investment-proposal-fullstack`)
   - **Visibility**: Public or Private (your choice)
   - **DO NOT** check "Add a README file"
   - **DO NOT** check "Add .gitignore"
   - **DO NOT** check "Choose a license"
3. Click "Create repository"
4. **Copy the repository URL** shown on the next page
   - It will look like: `https://github.com/yourusername/repo-name.git`
   - Or SSH: `git@github.com:yourusername/repo-name.git`

## Step 3: Initialize and Push to GitHub

Open PowerShell or Command Prompt in your project directory:

```powershell
# Navigate to project directory (if not already there)
cd C:\Users\JosephHosler\investment-proposal-fullstack

# Initialize git repository
git init

# Configure git (if not already configured - replace with your info)
git config user.name "Your Name"
git config user.email "your.email@example.com"

# Add all files (respects .gitignore - won't add node_modules, .env, etc.)
git add .

# Check what will be committed (optional - review the list)
git status

# Create initial commit
git commit -m "Initial commit: Investment Proposal Tool - Full Stack Application"

# Add your GitHub repository as remote (REPLACE WITH YOUR ACTUAL URL)
git remote add origin https://github.com/yourusername/your-repo-name.git

# Rename default branch to main (if needed)
git branch -M main

# Push to GitHub
git push -u origin main
```

## If Git Authentication is Required

If you're prompted for credentials:

1. **For HTTPS**: Use a Personal Access Token instead of password
   - Go to: https://github.com/settings/tokens
   - Generate new token (classic) with `repo` scope
   - Use token as password when prompted

2. **For SSH** (alternative):
   ```powershell
   # Change remote to SSH
   git remote set-url origin git@github.com:yourusername/your-repo-name.git
   ```

## Verify Upload

After pushing, check your GitHub repository to confirm all files are uploaded.

## Important Notes

- **Never commit**:
  - `.env` files (contain API keys)
  - `node_modules/` (too large, install via `npm install`)
  - `*.db` files (database files)
  - `dist/` or `build/` folders (build artifacts)

- **Files excluded by .gitignore**:
  - All environment files (`.env`, `.env.local`)
  - Database files (`*.db`)
  - Build outputs (`dist/`, `build/`)
  - Dependencies (`node_modules/`)
  - IDE files (`.vscode/`, `.idea/`)
  - Backup files (`*.backup`, `*.bak`)

## Future Updates

To push future changes:

```powershell
# Check what changed
git status

# Add changed files
git add .

# Commit changes
git commit -m "Description of changes"

# Push to GitHub
git push
```

