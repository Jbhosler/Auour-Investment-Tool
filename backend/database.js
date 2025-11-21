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
      before_output_pages TEXT,
      after_output_pages TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    INSERT OR IGNORE INTO firm_settings (id, before_output_pages, after_output_pages) 
    VALUES (1, '[]', '[]');
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
  
  // Initialize tables asynchronously (not blocking)
  const initPostgreSQL = async () => {
    if (initialized) return;
    
    try {
      console.log('Initializing PostgreSQL tables...');
      const initSQL = `
        CREATE TABLE IF NOT EXISTS strategies (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          returns JSONB NOT NULL,
          asset_allocation JSONB NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS benchmarks (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          returns JSONB NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS proposals (
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
        );

        CREATE TABLE IF NOT EXISTS firm_settings (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          logo_data TEXT,
          before_output_pages JSONB,
          after_output_pages JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        INSERT INTO firm_settings (id, before_output_pages, after_output_pages) 
        VALUES (1, '[]'::jsonb, '[]'::jsonb)
        ON CONFLICT (id) DO NOTHING;
      `;

      await db.query(initSQL);
      initialized = true;
      console.log('PostgreSQL tables initialized successfully');
    } catch (error) {
      console.error('Error initializing PostgreSQL tables:', error);
      // Don't exit - allow server to start and retry on first query
    }
  };
  
  // Initialize in background, don't block
  initPostgreSQL();
}

// Universal query interface
export const query = async (sql, params = []) => {
  // Ensure PostgreSQL is initialized before first query
  if (!USE_SQLITE && !initialized) {
    console.log('Waiting for PostgreSQL initialization...');
    await new Promise(resolve => setTimeout(resolve, 1000));
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

export default { query, getDb, isSQLite };
