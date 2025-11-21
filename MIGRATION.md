# Migration Guide: From Google AI Studio to Full Stack

This guide helps you transition from the browser-only version to the full-stack application.

## Why Migrate?

The new version solves these problems:
- ❌ **Lost data when clearing browser cache**
- ❌ **Can't access from different computers**  
- ❌ **No collaboration with team members**
- ❌ **Limited scalability**

## Step-by-Step Migration

### Phase 1: Setup (15 minutes)

1. **Extract Your Current Data**
   
   Before switching, save your existing strategies and benchmarks:
   
   ```javascript
   // Open browser console on your current app
   // Copy strategies
   console.log(JSON.stringify(localStorage.getItem('strategies')));
   
   // Copy benchmarks
   console.log(JSON.stringify(localStorage.getItem('benchmarks')));
   
   // Copy firm settings
   console.log(JSON.stringify(localStorage.getItem('firmLogo')));
   console.log(JSON.stringify(localStorage.getItem('beforeOutputPages')));
   console.log(JSON.stringify(localStorage.getItem('pagesAfterOutput')));
   ```
   
   Save these outputs to a text file.

2. **Install the New Version**
   
   ```bash
   # Backend
   cd backend
   npm install
   cp .env.example .env
   npm run init-db  # Creates database with sample data
   npm run dev  # Start backend on port 3001
   
   # Frontend (new terminal)
   cd frontend
   npm install
   cp .env.example .env.local
   # Add your VITE_GEMINI_API_KEY to .env.local
   npm run dev  # Start frontend on port 5173
   ```

3. **Verify Everything Works**
   
   Visit `http://localhost:5173` and test:
   - ✅ Strategies load
   - ✅ Benchmarks load
   - ✅ Can create a report
   - ✅ Admin panel works

### Phase 2: Data Migration (10 minutes)

#### Option A: Manual Re-entry (Recommended for <10 items)

1. Switch to **Admin Mode** in the app
2. Delete sample strategies/benchmarks
3. Add your real strategies one by one
4. Upload your firm logo
5. Add your custom PDF pages

#### Option B: API Import (For many items)

Create a migration script:

```javascript
// migrate-data.js
const strategies = JSON.parse(/* paste your localStorage data */);
const benchmarks = JSON.parse(/* paste your localStorage data */);

async function migrate() {
  // Import strategies
  for (const strategy of strategies) {
    await fetch('http://localhost:3001/api/strategies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(strategy)
    });
  }
  
  // Import benchmarks
  for (const benchmark of benchmarks) {
    await fetch('http://localhost:3001/api/benchmarks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(benchmark)
    });
  }
  
  console.log('Migration complete!');
}

migrate();
```

Run it:
```bash
node migrate-data.js
```

### Phase 3: Customization (Optional)

Update your deployment:

1. **Custom Domain**: Point to your deployed backend
2. **Branding**: Update logo, colors in the code
3. **Add Users**: Implement authentication (see README)
4. **Analytics**: Track proposal generation

## Feature Comparison

| Feature | Old (Browser) | New (Full Stack) |
|---------|--------------|------------------|
| Data Storage | localStorage | Database (SQLite/PostgreSQL) |
| Data Persistence | ❌ Temporary | ✅ Permanent |
| Multi-device | ❌ No | ✅ Yes |
| Team Sharing | ❌ No | ✅ Yes |
| Proposal History | ❌ No | ✅ Yes |
| Scalability | ❌ Limited | ✅ Unlimited |
| API Access | ❌ No | ✅ Yes |
| Offline Mode | ✅ Yes | ❌ No (future feature) |

## Backwards Compatibility

The new version maintains the same:
- ✅ User interface
- ✅ Workflow
- ✅ Report format
- ✅ All calculations
- ✅ AI integration

**What's different**:
- Data loads from backend instead of localStorage
- Slightly faster with database indexing
- Can access from any device
- Team members can share data

## Rollback Plan

If you need to go back temporarily:

1. Keep the old version bookmarked
2. Export your new data:
   ```bash
   # Get all strategies
   curl http://localhost:3001/api/strategies > strategies.json
   
   # Get all benchmarks
   curl http://localhost:3001/api/benchmarks > benchmarks.json
   ```
3. Your old localStorage data still exists in your browser

## Common Migration Issues

### Issue: "Can't see my old data"
**Solution**: The new app uses a database, not localStorage. You need to manually migrate (see Phase 2).

### Issue: "Strategies not loading"
**Solution**: 
1. Ensure backend is running: `cd backend && npm run dev`
2. Check `.env.local` has correct API URL
3. Run database seed: `npm run init-db`

### Issue: "Different strategy IDs"
**Solution**: The new version generates UUIDs. This is normal and won't affect functionality.

### Issue: "Lost my firm logo"
**Solution**: The logo needs to be re-uploaded through Admin Panel → Firm Settings.

## Best Practices

After migration:

1. **Backup regularly**: Export data via API calls
2. **Use version control**: Commit your customizations to git
3. **Monitor performance**: Check server logs
4. **Update dependencies**: Run `npm update` monthly
5. **Test before updates**: Always test in development first

## Getting Help

Stuck? Check:
1. Main README.md for detailed setup
2. Console logs (browser DevTools + backend terminal)
3. GitHub issues
4. This migration guide

## Timeline Recommendation

- **Solo Adviser**: 30 minutes total
- **Small Team (2-5)**: 1 hour
- **Large Organization**: 2-4 hours + testing

## Next Steps

After successful migration:

1. ✅ Deploy to production (see README)
2. ✅ Set up automatic backups
3. ✅ Add team members
4. ✅ Customize branding
5. ✅ Configure authentication (if needed)

---

**Congratulations!** Your investment proposal tool is now database-backed and ready to scale. 🚀
