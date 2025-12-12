import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { query, isSQLite, isInitialized } from './database.js';
import { randomUUID } from 'crypto';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'https://frontend-559675342331.us-central1.run.app',
      'https://frontend-phd2mjs6qa-uc.a.run.app',
      'http://localhost:5173'
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all for now to debug
    }
  },
  credentials: true
}));
// Log request details before JSON parsing
app.use((req, res, next) => {
  if (req.method === 'POST' && req.url.includes('/proposals')) {
    console.log('=== PROPOSAL REQUEST ===');
    console.log('URL:', req.url);
    console.log('Content-Type:', req.headers['content-type']);
    console.log('Content-Length:', req.headers['content-length']);
    console.log('========================');
  }
  next();
});

// JSON parser with error handling
app.use(express.json({ limit: '50mb' })); // For logo images

// Error handler for JSON parsing (must have 4 parameters)
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error('=== JSON PARSE ERROR ===');
    console.error('Error:', err.message);
    console.error('Request URL:', req.url);
    console.error('Request Method:', req.method);
    console.error('Content-Type:', req.headers['content-type']);
    console.error('Body exists:', !!req.body);
    console.error('========================');
    return res.status(400).json({ error: 'Invalid JSON in request body', details: err.message });
  }
  next(err);
});

// Helper to convert JSON fields for SQLite
const prepareForStorage = (data) => {
  if (isSQLite()) {
    const prepared = { ...data };
    if (prepared.returns) prepared.returns = JSON.stringify(prepared.returns);
    if (prepared.asset_allocation) prepared.asset_allocation = JSON.stringify(prepared.asset_allocation);
    if (prepared.assetAllocation) prepared.assetAllocation = JSON.stringify(prepared.assetAllocation);
    if (prepared.allocations) prepared.allocations = JSON.stringify(prepared.allocations);
    if (prepared.before_output_pages) prepared.before_output_pages = JSON.stringify(prepared.before_output_pages);
    if (prepared.after_output_pages) prepared.after_output_pages = JSON.stringify(prepared.after_output_pages);
    return prepared;
  }
  return data;
};

const prepareFromStorage = (data) => {
  if (isSQLite() && data) {
    const prepared = { ...data };
    if (typeof prepared.returns === 'string') prepared.returns = JSON.parse(prepared.returns);
    if (typeof prepared.asset_allocation === 'string') prepared.asset_allocation = JSON.parse(prepared.asset_allocation);
    if (typeof prepared.assetAllocation === 'string') prepared.assetAllocation = JSON.parse(prepared.assetAllocation);
    if (typeof prepared.allocations === 'string') prepared.allocations = JSON.parse(prepared.allocations);
    if (typeof prepared.before_output_pages === 'string') prepared.before_output_pages = JSON.parse(prepared.before_output_pages);
    if (typeof prepared.after_output_pages === 'string') prepared.after_output_pages = JSON.parse(prepared.after_output_pages);
    if (typeof prepared.selected_before_page_ids === 'string') prepared.selected_before_page_ids = JSON.parse(prepared.selected_before_page_ids);
    if (typeof prepared.selected_after_page_ids === 'string') prepared.selected_after_page_ids = JSON.parse(prepared.selected_after_page_ids);
    return prepared;
  }
  return data;
};

// ============ STRATEGIES ROUTES ============

// Get all strategies
app.get('/api/strategies', async (req, res) => {
  try {
    const result = await query('SELECT * FROM strategies ORDER BY created_at DESC');
    const strategies = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      returns: isSQLite() ? JSON.parse(row.returns) : row.returns,
      assetAllocation: isSQLite() ? JSON.parse(row.asset_allocation) : row.asset_allocation
    }));
    res.json(strategies);
  } catch (error) {
    console.error('Error fetching strategies:', error);
    res.status(500).json({ error: 'Failed to fetch strategies' });
  }
});

// Get single strategy
app.get('/api/strategies/:id', async (req, res) => {
  try {
    const result = await query('SELECT * FROM strategies WHERE id = ?', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Strategy not found' });
    }
    const row = result.rows[0];
    res.json({
      id: row.id,
      name: row.name,
      returns: isSQLite() ? JSON.parse(row.returns) : row.returns,
      assetAllocation: isSQLite() ? JSON.parse(row.asset_allocation) : row.asset_allocation
    });
  } catch (error) {
    console.error('Error fetching strategy:', error);
    res.status(500).json({ error: 'Failed to fetch strategy' });
  }
});

// Create strategy
app.post('/api/strategies', async (req, res) => {
  try {
	console.log('Received body:', JSON.stringify(req.body, null, 2));
    console.log('Returns type:', typeof req.body.returns);
    console.log('Returns value:', req.body.returns);

    const { id, name, returns, assetAllocation } = req.body;
    const strategyId = id || randomUUID();
    
    const sql = isSQLite()
      ? 'INSERT INTO strategies (id, name, returns, asset_allocation) VALUES (?, ?, ?, ?)'
      : 'INSERT INTO strategies (id, name, returns, asset_allocation) VALUES ($1, $2, $3, $4) RETURNING *';
    
   const params = isSQLite()
  	? [strategyId, name, JSON.stringify(returns), JSON.stringify(assetAllocation)]
	: [strategyId, name, JSON.stringify(returns), JSON.stringify(assetAllocation)];  // ← Same as SQLite!
    
    await query(sql, params);
    
    res.status(201).json({ 
      id: strategyId, 
      name, 
      returns, 
      assetAllocation 
    });
  } catch (error) {
    console.error('Error creating strategy:', error);
    res.status(500).json({ error: 'Failed to create strategy' });
  }
});

// Update strategy
app.put('/api/strategies/:id', async (req, res) => {
  try {
    const { name, returns, assetAllocation } = req.body;
    
    const sql = isSQLite()
      ? 'UPDATE strategies SET name = ?, returns = ?, asset_allocation = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
      : 'UPDATE strategies SET name = $1, returns = $2, asset_allocation = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *';
    
    const params = isSQLite()
      ? [name, JSON.stringify(returns), JSON.stringify(assetAllocation), req.params.id]
      : [name, JSON.stringify(returns), JSON.stringify(assetAllocation), req.params.id];
    
    const result = await query(sql, params);
    
    if (isSQLite() && result.rowCount === 0) {
      return res.status(404).json({ error: 'Strategy not found' });
    }
    
    res.json({ 
      id: req.params.id, 
      name, 
      returns, 
      assetAllocation 
    });
  } catch (error) {
    console.error('Error updating strategy:', error);
    res.status(500).json({ error: 'Failed to update strategy' });
  }
});

// Delete strategy
app.delete('/api/strategies/:id', async (req, res) => {
  try {
    const sql = isSQLite()
      ? 'DELETE FROM strategies WHERE id = ?'
      : 'DELETE FROM strategies WHERE id = $1';
    const result = await query(sql, [req.params.id]);
    
    if (isSQLite() && result.rowCount === 0) {
      return res.status(404).json({ error: 'Strategy not found' });
    }
    
    if (!isSQLite() && result.rowCount === 0) {
      return res.status(404).json({ error: 'Strategy not found' });
    }
    
    res.json({ message: 'Strategy deleted successfully' });
  } catch (error) {
    console.error('Error deleting strategy:', error);
    res.status(500).json({ error: 'Failed to delete strategy' });
  }
});

// ============ BENCHMARKS ROUTES ============

// Get all benchmarks
app.get('/api/benchmarks', async (req, res) => {
  try {
    const result = await query('SELECT * FROM benchmarks ORDER BY created_at DESC');
    const benchmarks = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      returns: isSQLite() ? JSON.parse(row.returns) : row.returns
    }));
    res.json(benchmarks);
  } catch (error) {
    console.error('Error fetching benchmarks:', error);
    res.status(500).json({ error: 'Failed to fetch benchmarks' });
  }
});

// Create benchmark
app.post('/api/benchmarks', async (req, res) => {
  try {
    const { id, name, returns } = req.body;
    const benchmarkId = id || randomUUID();
    
    const sql = isSQLite()
      ? 'INSERT INTO benchmarks (id, name, returns) VALUES (?, ?, ?)'
      : 'INSERT INTO benchmarks (id, name, returns) VALUES ($1, $2, $3) RETURNING *';
    
	const params = isSQLite()
  	? [benchmarkId, name, JSON.stringify(returns)]
  	: [benchmarkId, name, JSON.stringify(returns)];  // ← Same as SQLite!
    
    await query(sql, params);
    
    res.status(201).json({ 
      id: benchmarkId, 
      name, 
      returns 
    });
  } catch (error) {
    console.error('Error creating benchmark:', error);
    res.status(500).json({ error: 'Failed to create benchmark' });
  }
});

// Update benchmark
app.put('/api/benchmarks/:id', async (req, res) => {
  try {
    const { name, returns } = req.body;
    
    const sql = isSQLite()
      ? 'UPDATE benchmarks SET name = ?, returns = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
      : 'UPDATE benchmarks SET name = $1, returns = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *';
    
    const params = isSQLite()
      ? [name, JSON.stringify(returns), req.params.id]
      : [name, JSON.stringify(returns), req.params.id];
    
    await query(sql, params);
    
    res.json({ 
      id: req.params.id, 
      name, 
      returns 
    });
  } catch (error) {
    console.error('Error updating benchmark:', error);
    res.status(500).json({ error: 'Failed to update benchmark' });
  }
});

// Delete benchmark
app.delete('/api/benchmarks/:id', async (req, res) => {
  try {
    const sql = isSQLite()
      ? 'DELETE FROM benchmarks WHERE id = ?'
      : 'DELETE FROM benchmarks WHERE id = $1';
    const result = await query(sql, [req.params.id]);
    
    if (isSQLite() && result.rowCount === 0) {
      return res.status(404).json({ error: 'Benchmark not found' });
    }
    
    if (!isSQLite() && result.rowCount === 0) {
      return res.status(404).json({ error: 'Benchmark not found' });
    }
    
    res.json({ message: 'Benchmark deleted successfully' });
  } catch (error) {
    console.error('Error deleting benchmark:', error);
    res.status(500).json({ error: 'Failed to delete benchmark' });
  }
});

// ============ PROPOSALS ROUTES ============

// Get all proposals
app.get('/api/proposals', async (req, res) => {
  try {
    const result = await query('SELECT * FROM proposals ORDER BY created_at DESC');
    const proposals = result.rows.map(prepareFromStorage);
    res.json(proposals);
  } catch (error) {
    console.error('Error fetching proposals:', error);
    res.status(500).json({ error: 'Failed to fetch proposals' });
  }
});

// Create proposal
app.post('/api/proposals', async (req, res) => {
  try {
    // Log request for debugging
    console.log('Received proposal request, body type:', typeof req.body);
    console.log('Request body keys:', req.body ? Object.keys(req.body) : 'null');
    
    const proposalId = randomUUID();
    const {
      adviser_name,
      client_name,
      investment_amount,
      client_age,
      annual_distribution,
      risk_tolerance,
      allocations,
      selected_benchmark_id,
      ai_summary
    } = req.body;
    
    // Validate allocations
    if (!allocations || !Array.isArray(allocations)) {
      console.error('Invalid allocations:', allocations);
      return res.status(400).json({ error: 'Invalid allocations: must be an array' });
    }
    
    const sql = isSQLite()
      ? `INSERT INTO proposals (id, adviser_name, client_name, investment_amount, 
         client_age, annual_distribution, risk_tolerance, allocations, 
         selected_benchmark_id, ai_summary) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      : `INSERT INTO proposals (id, adviser_name, client_name, investment_amount, 
         client_age, annual_distribution, risk_tolerance, allocations, 
         selected_benchmark_id, ai_summary) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`;
    
    const params = [
      proposalId,
      adviser_name,
      client_name,
      investment_amount,
      client_age,
      annual_distribution,
      risk_tolerance,
      JSON.stringify(allocations),
      selected_benchmark_id,
      ai_summary
    ];
    
    await query(sql, params);
    
    res.status(201).json({ id: proposalId, ...req.body });
  } catch (error) {
    console.error('Error creating proposal:', error);
    res.status(500).json({ error: 'Failed to create proposal' });
  }
});

// ============ DIAGNOSTIC LOGGING ROUTE ============

// Log diagnostic information from frontend
app.post('/api/diagnostics', express.json(), (req, res) => {
  try {
    const { level, message, data, timestamp } = req.body;
    const logEntry = {
      timestamp: timestamp || new Date().toISOString(),
      level: level || 'info',
      message: message || 'No message',
      data: data || {}
    };
    
    // Log to console with formatting
    const logLine = `[${logEntry.timestamp}] [${logEntry.level.toUpperCase()}] ${logEntry.message}`;
    if (logEntry.level === 'error') {
      console.error(logLine);
      if (logEntry.data && Object.keys(logEntry.data).length > 0) {
        console.error('Data:', JSON.stringify(logEntry.data, null, 2));
      }
    } else {
      console.log(logLine);
      if (logEntry.data && Object.keys(logEntry.data).length > 0) {
        console.log('Data:', JSON.stringify(logEntry.data, null, 2));
      }
    }
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error logging diagnostic:', error);
    res.status(500).json({ error: 'Failed to log diagnostic' });
  }
});

// ============ FIRM SETTINGS ROUTES ============

// Get firm settings
app.get('/api/settings', async (req, res) => {
  try {
    const result = await query('SELECT * FROM firm_settings WHERE id = 1');
    if (result.rows.length === 0) {
      return res.json({
        logo_data: null,
        secondary_logo_data: null,
        before_output_pages: [],
        after_output_pages: [],
        selected_before_page_ids: [],
        selected_after_page_ids: []
      });
    }
    const settings = prepareFromStorage(result.rows[0]);
    res.json({
      logo_data: settings.logo_data || null,
      secondary_logo_data: settings.secondary_logo_data || null,
      before_output_pages: settings.before_output_pages || [],
      after_output_pages: settings.after_output_pages || [],
      selected_before_page_ids: settings.selected_before_page_ids || [],
      selected_after_page_ids: settings.selected_after_page_ids || []
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Update firm settings
app.put('/api/settings', async (req, res) => {
  try {
    const { logo_data, secondary_logo_data, before_output_pages, after_output_pages, selected_before_page_ids, selected_after_page_ids } = req.body;
    
    const sql = isSQLite()
      ? `UPDATE firm_settings SET logo_data = ?, secondary_logo_data = ?, before_output_pages = ?, 
         after_output_pages = ?, selected_before_page_ids = ?, selected_after_page_ids = ?, 
         updated_at = CURRENT_TIMESTAMP WHERE id = 1`
      : `UPDATE firm_settings SET logo_data = $1, secondary_logo_data = $2, before_output_pages = $3, 
         after_output_pages = $4, selected_before_page_ids = $5, selected_after_page_ids = $6, 
         updated_at = CURRENT_TIMESTAMP WHERE id = 1 RETURNING *`;
    
    const params = isSQLite()
      ? [
          logo_data,
          secondary_logo_data,
          JSON.stringify(before_output_pages || []),
          JSON.stringify(after_output_pages || []),
          JSON.stringify(selected_before_page_ids || []),
          JSON.stringify(selected_after_page_ids || [])
        ]
      : [
          logo_data,
          secondary_logo_data,
          JSON.stringify(before_output_pages) || [], 
          JSON.stringify(after_output_pages) || [],
          JSON.stringify(selected_before_page_ids) || [],
          JSON.stringify(selected_after_page_ids) || []
        ];
    
    await query(sql, params);
    
    res.json({ 
      logo_data: logo_data || null, 
      secondary_logo_data: secondary_logo_data || null,
      before_output_pages: before_output_pages || [], 
      after_output_pages: after_output_pages || [],
      selected_before_page_ids: selected_before_page_ids || [],
      selected_after_page_ids: selected_after_page_ids || []
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// ============ PAGE LIBRARY ROUTES ============

// Get all pages in library
app.get('/api/page-library', async (req, res) => {
  try {
    const { position_type } = req.query;
    let sql = 'SELECT * FROM page_library';
    const params = [];
    
    if (position_type) {
      sql += isSQLite() ? ' WHERE position_type = ?' : ' WHERE position_type = $1';
      params.push(position_type);
    }
    
    sql += ' ORDER BY created_at DESC';
    
    const result = await query(sql, params);
    const pages = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      page_data: row.page_data,
      position_type: row.position_type,
      created_at: row.created_at,
      updated_at: row.updated_at
    }));
    res.json(pages);
  } catch (error) {
    console.error('Error fetching page library:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to fetch page library',
      details: error.message,
      hint: 'Check if page_library table exists in database'
    });
  }
});

// Get single page from library
app.get('/api/page-library/:id', async (req, res) => {
  try {
    const sql = isSQLite()
      ? 'SELECT * FROM page_library WHERE id = ?'
      : 'SELECT * FROM page_library WHERE id = $1';
    const result = await query(sql, [req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Page not found' });
    }
    
    const row = result.rows[0];
    res.json({
      id: row.id,
      name: row.name,
      page_data: row.page_data,
      position_type: row.position_type,
      created_at: row.created_at,
      updated_at: row.updated_at
    });
  } catch (error) {
    console.error('Error fetching page:', error);
    res.status(500).json({ error: 'Failed to fetch page' });
  }
});

// Create page in library
app.post('/api/page-library', async (req, res) => {
  try {
    const { id, name, page_data, position_type } = req.body;
    
    if (!name || !page_data || !position_type) {
      return res.status(400).json({ error: 'Missing required fields: name, page_data, position_type' });
    }
    
    if (position_type !== 'before' && position_type !== 'after') {
      return res.status(400).json({ error: 'position_type must be "before" or "after"' });
    }
    
    const pageId = id || randomUUID();
    
    const sql = isSQLite()
      ? 'INSERT INTO page_library (id, name, page_data, position_type) VALUES (?, ?, ?, ?)'
      : 'INSERT INTO page_library (id, name, page_data, position_type) VALUES ($1, $2, $3, $4) RETURNING *';
    
    const params = [pageId, name, page_data, position_type];
    
    await query(sql, params);
    
    res.status(201).json({ 
      id: pageId, 
      name, 
      page_data, 
      position_type 
    });
  } catch (error) {
    console.error('Error creating page:', error);
    res.status(500).json({ error: 'Failed to create page' });
  }
});

// Update page in library
app.put('/api/page-library/:id', async (req, res) => {
  try {
    const { name, page_data, position_type } = req.body;
    
    if (position_type && position_type !== 'before' && position_type !== 'after') {
      return res.status(400).json({ error: 'position_type must be "before" or "after"' });
    }
    
    const updates = [];
    const params = [];
    let paramIndex = 1;
    
    if (name !== undefined) {
      updates.push(isSQLite() ? 'name = ?' : `name = $${paramIndex++}`);
      params.push(name);
    }
    if (page_data !== undefined) {
      updates.push(isSQLite() ? 'page_data = ?' : `page_data = $${paramIndex++}`);
      params.push(page_data);
    }
    if (position_type !== undefined) {
      updates.push(isSQLite() ? 'position_type = ?' : `position_type = $${paramIndex++}`);
      params.push(position_type);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    updates.push(isSQLite() ? 'updated_at = CURRENT_TIMESTAMP' : 'updated_at = CURRENT_TIMESTAMP');
    
    const sql = isSQLite()
      ? `UPDATE page_library SET ${updates.join(', ')} WHERE id = ?`
      : `UPDATE page_library SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    
    params.push(req.params.id);
    
    const result = await query(sql, params);
    
    if (isSQLite() && result.rowCount === 0) {
      return res.status(404).json({ error: 'Page not found' });
    }
    
    if (!isSQLite() && result.rowCount === 0) {
      return res.status(404).json({ error: 'Page not found' });
    }
    
    // Fetch updated page
    const fetchSql = isSQLite()
      ? 'SELECT * FROM page_library WHERE id = ?'
      : 'SELECT * FROM page_library WHERE id = $1';
    const fetchResult = await query(fetchSql, [req.params.id]);
    
    const row = fetchResult.rows[0];
    res.json({
      id: row.id,
      name: row.name,
      page_data: row.page_data,
      position_type: row.position_type,
      created_at: row.created_at,
      updated_at: row.updated_at
    });
  } catch (error) {
    console.error('Error updating page:', error);
    res.status(500).json({ error: 'Failed to update page' });
  }
});

// Delete page from library
app.delete('/api/page-library/:id', async (req, res) => {
  try {
    const sql = isSQLite()
      ? 'DELETE FROM page_library WHERE id = ?'
      : 'DELETE FROM page_library WHERE id = $1';
    const result = await query(sql, [req.params.id]);
    
    if (isSQLite() && result.rowCount === 0) {
      return res.status(404).json({ error: 'Page not found' });
    }
    
    if (!isSQLite() && result.rowCount === 0) {
      return res.status(404).json({ error: 'Page not found' });
    }
    
    res.json({ message: 'Page deleted successfully' });
  } catch (error) {
    console.error('Error deleting page:', error);
    res.status(500).json({ error: 'Failed to delete page' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', database: isSQLite() ? 'SQLite' : 'PostgreSQL' });
});

// Manual database initialization endpoint (for troubleshooting)
app.post('/api/init-database', async (req, res) => {
  if (isSQLite()) {
    return res.json({ message: 'SQLite database - initialization not needed' });
  }
  
  try {
    console.log('Manual database initialization requested...');
    
    // First, add missing columns to firm_settings if needed
    try {
      const columnsCheck = await query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'firm_settings' 
        AND column_name IN ('selected_before_page_ids', 'selected_after_page_ids', 'secondary_logo_data')
      `);
      
      const existingColumns = columnsCheck.rows.map(r => r.column_name);
      const needsBefore = !existingColumns.includes('selected_before_page_ids');
      const needsAfter = !existingColumns.includes('selected_after_page_ids');
      const needsSecondaryLogo = !existingColumns.includes('secondary_logo_data');
      
      if (needsBefore || needsAfter || needsSecondaryLogo) {
        console.log('Adding missing columns to firm_settings...');
        if (needsBefore) {
          await query('ALTER TABLE firm_settings ADD COLUMN selected_before_page_ids JSONB DEFAULT \'[]\'::jsonb');
          console.log('✅ Added selected_before_page_ids column');
        }
        if (needsAfter) {
          await query('ALTER TABLE firm_settings ADD COLUMN selected_after_page_ids JSONB DEFAULT \'[]\'::jsonb');
          console.log('✅ Added selected_after_page_ids column');
        }
        if (needsSecondaryLogo) {
          await query('ALTER TABLE firm_settings ADD COLUMN secondary_logo_data TEXT');
          console.log('✅ Added secondary_logo_data column');
        }
      } else {
        console.log('✅ Firm settings columns already exist');
      }
    } catch (alterError) {
      console.error('Error adding firm_settings columns:', alterError.message);
      // Continue anyway
    }
    
    // Import the initialization function
    const { initDatabase } = await import('./database.js');
    
    if (typeof initDatabase === 'function') {
      await initDatabase();
      res.json({ 
        success: true, 
        message: 'Database initialized successfully',
        initialized: isInitialized()
      });
    } else {
      // Fallback: run initialization SQL directly
      const initSQL = `
        CREATE TABLE IF NOT EXISTS page_library (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          page_data TEXT NOT NULL,
          position_type TEXT NOT NULL CHECK (position_type IN ('before', 'after')),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `;
      
      await query(initSQL);
      
      // Verify table exists
      const verifyResult = await query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'page_library')");
      
      res.json({ 
        success: verifyResult.rows[0].exists,
        message: verifyResult.rows[0].exists ? 'page_library table created successfully' : 'Table creation may have failed',
        tableExists: verifyResult.rows[0].exists
      });
    }
  } catch (error) {
    console.error('Error in manual initialization:', error);
    res.status(500).json({ 
      success: false,
      error: error.message,
      details: error.stack
    });
  }
});

// Ensure database is initialized before starting server
const startServer = async () => {
  if (!isSQLite()) {
    console.log('Waiting for PostgreSQL initialization...');
    // Wait up to 15 seconds for initialization
    let attempts = 0;
    while (attempts < 30 && !isInitialized()) {
      if (attempts % 4 === 0) { // Log every 2 seconds
        console.log(`Waiting for database initialization... (attempt ${attempts + 1}/30)`);
      }
      await new Promise(resolve => setTimeout(resolve, 500));
      attempts++;
    }
    
    if (!isInitialized()) {
      console.error('❌ WARNING: PostgreSQL initialization may not have completed');
      console.error('Server will start but database operations may fail');
    } else {
      console.log('✅ PostgreSQL initialization confirmed - server starting');
    }
  }
  
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`Database: ${isSQLite() ? 'SQLite' : 'PostgreSQL'}`);
    if (!isSQLite() && !isInitialized()) {
      console.error('⚠️  WARNING: Database not initialized - endpoints may fail');
    }
  });
};

startServer();
