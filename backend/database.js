import pg from 'pg';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const USE_SQLITE = process.env.DB_TYPE === 'sqlite' || !process.env.DATABASE_URL;

let db;
let initialized = false;

if (USE_SQLITE) {
  console.log('Using SQLite database');
  db = new Database(join(__dirname, 'investment_proposal.db'));
  
  // Enable foreign keys
  db.pragma('foreign_keys = ON');
  
  // Initialize tables for SQLite
  db.exec(`
    CREATE TABLE IF NOT EXISTS strategies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      returns TEXT NOT NULL,
      asset_allocation TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS benchmarks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      returns TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS proposals (
      id TEXT PRIMARY KEY,
      adviser_name TEXT,
      client_name TEXT,
      investment_amount TEXT,
      client_age TEXT,
      annual_distribution TEXT,
      risk_tolerance TEXT,
      allocations TEXT NOT NULL,
      selected_benchmark_id TEXT,
      ai_summary TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS firm_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      logo_data TEXT,
      secondary_logo_data TEXT,
      before_output_pages TEXT,
      after_output_pages TEXT,
      selected_before_page_ids TEXT,
      selected_after_page_ids TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS page_library (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      page_data TEXT NOT NULL,
      position_type TEXT NOT NULL CHECK (position_type IN ('before', 'after')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    INSERT OR IGNORE INTO firm_settings (id, before_output_pages, after_output_pages, selected_before_page_ids, selected_after_page_ids) 
    VALUES (1, '[]', '[]', '[]', '[]');
  `);
  
  initialized = true;

} else {
  console.log('Using PostgreSQL database');
  const { Pool } = pg;
  
  // Check if DATABASE_URL is defined
  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL environment variable is not set!');
    process.exit(1);
  }
  
  console.log('DATABASE_URL is set, creating connection pool...');
  
  db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
  
  // Initialize tables - run each CREATE TABLE separately for better error handling
  const initPostgreSQL = async () => {
    if (initialized) {
      console.log('Database already initialized');
      return;
    }
    
    try {
      console.log('Initializing PostgreSQL tables...');
      
      // Create tables one by one for better error reporting
      const tables = [
        `CREATE TABLE IF NOT EXISTS strategies (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          returns JSONB NOT NULL,
          asset_allocation JSONB NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS benchmarks (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          returns JSONB NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS proposals (
          id TEXT PRIMARY KEY,
          adviser_name TEXT,
          client_name TEXT,
          investment_amount TEXT,
          client_age TEXT,
          annual_distribution TEXT,
          risk_tolerance TEXT,
          allocations JSONB NOT NULL,
          selected_benchmark_id TEXT,
          ai_summary TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS firm_settings (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          logo_data TEXT,
          secondary_logo_data TEXT,
          before_output_pages JSONB,
          after_output_pages JSONB,
          selected_before_page_ids JSONB,
          selected_after_page_ids JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS page_library (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          page_data TEXT NOT NULL,
          position_type TEXT NOT NULL CHECK (position_type IN ('before', 'after')),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`
      ];

      // Create each table separately
      for (const tableSQL of tables) {
        try {
          await db.query(tableSQL);
          console.log(`Table created/verified: ${tableSQL.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1] || 'unknown'}`);
        } catch (tableError) {
          console.error(`Error creating table: ${tableError.message}`);
          console.error(`SQL: ${tableSQL.substring(0, 100)}...`);
          throw tableError; // Re-throw to stop initialization
        }
      }

      // Add missing columns to firm_settings if they don't exist
      // This is critical - must succeed
      try {
        // Check if columns exist
        const columnsCheck = await db.query(`
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
            await db.query('ALTER TABLE firm_settings ADD COLUMN selected_before_page_ids JSONB DEFAULT \'[]\'::jsonb');
            console.log('✅ Added selected_before_page_ids column');
          }
          if (needsAfter) {
            await db.query('ALTER TABLE firm_settings ADD COLUMN selected_after_page_ids JSONB DEFAULT \'[]\'::jsonb');
            console.log('✅ Added selected_after_page_ids column');
          }
          if (needsSecondaryLogo) {
            await db.query('ALTER TABLE firm_settings ADD COLUMN secondary_logo_data TEXT');
            console.log('✅ Added secondary_logo_data column');
          }
        } else {
          console.log('✅ Firm settings columns already exist');
        }
      } catch (alterError) {
        console.error('❌ CRITICAL: Error adding firm_settings columns:', alterError.message);
        console.error('Error details:', alterError);
        // Don't throw - allow server to start, but log the error
      }

      // Insert default firm settings
      try {
        // Check which columns exist before inserting
        const columnsCheck = await db.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'firm_settings' 
          AND column_name IN ('selected_before_page_ids', 'selected_after_page_ids')
        `);
        
        const hasSelectedColumns = columnsCheck.rows.length === 2;
        
        if (hasSelectedColumns) {
          await db.query(`
            INSERT INTO firm_settings (id, before_output_pages, after_output_pages, selected_before_page_ids, selected_after_page_ids) 
            VALUES (1, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb)
            ON CONFLICT (id) DO NOTHING
          `);
        } else {
          // Fallback for old table structure
          await db.query(`
            INSERT INTO firm_settings (id, before_output_pages, after_output_pages) 
            VALUES (1, '[]'::jsonb, '[]'::jsonb)
            ON CONFLICT (id) DO NOTHING
          `);
        }
        console.log('Firm settings initialized');
      } catch (settingsError) {
        console.error('Error initializing firm settings (non-critical):', settingsError.message);
      }

      initialized = true;
      console.log('✅ PostgreSQL tables initialized successfully');
      
      // Verify page_library table exists
      const verifyResult = await db.query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'page_library')");
      if (verifyResult.rows[0].exists) {
        console.log('✅ Verified: page_library table exists');
      } else {
        console.error('❌ ERROR: page_library table verification failed!');
      }
    } catch (error) {
      console.error('❌ CRITICAL: Error initializing PostgreSQL tables:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      // Don't exit - allow server to start, but initialization failed
      initialized = false;
    }
  };
  
  // Initialize immediately and wait for it
  console.log('Starting PostgreSQL initialization...');
  initPostgreSQL().catch(err => {
    console.error('Fatal error during initialization:', err);
  });
}

// Universal query interface
export const query = async (sql, params = []) => {
  // Ensure PostgreSQL is initialized before first query
  if (!USE_SQLITE && !initialized) {
    console.log('Waiting for PostgreSQL initialization...');
    // Wait up to 5 seconds for initialization
    for (let i = 0; i < 10 && !initialized; i++) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    if (!initialized) {
      console.error('WARNING: PostgreSQL initialization may not have completed');
    }
  }
  
  if (USE_SQLITE) {
    const stmt = db.prepare(sql);
    if (sql.trim().toUpperCase().startsWith('SELECT')) {
      return { rows: stmt.all(...params) };
    } else {
      const result = stmt.run(...params);
      return { rows: [], rowCount: result.changes };
    }
  } else {
    return await db.query(sql, params);
  }
};

export const getDb = () => db;
export const isSQLite = () => USE_SQLITE;
export const isInitialized = () => initialized; // Export getter for initialized flag

// Export initialization function for manual calls
export const initDatabase = async () => {
  if (USE_SQLITE) {
    return; // SQLite is initialized synchronously
  }
  if (initialized) {
    return; // Already initialized
  }
  
  // Re-run initialization
  const initPostgreSQL = async () => {
    try {
      console.log('Manual PostgreSQL initialization...');
      
      const pageLibrarySQL = `CREATE TABLE IF NOT EXISTS page_library (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        page_data TEXT NOT NULL,
        position_type TEXT NOT NULL CHECK (position_type IN ('before', 'after')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`;
      
      await db.query(pageLibrarySQL);
      console.log('✅ page_library table created/verified');
      
      // Verify
      const verifyResult = await db.query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'page_library')");
      if (verifyResult.rows[0].exists) {
        initialized = true;
        console.log('✅ Database initialization complete');
        return true;
      } else {
        console.error('❌ Table verification failed');
        return false;
      }
    } catch (error) {
      console.error('❌ Error in manual initialization:', error);
      throw error;
    }
  };
  
  return await initPostgreSQL();
};

export default { query, getDb, isSQLite, isInitialized, initDatabase };
