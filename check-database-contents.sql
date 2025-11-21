-- SQL Queries to Check Database Contents
-- Run these after connecting: gcloud sql connect investment-proposal-db --user=app_user --database=investment_proposals

-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Count records in each table
SELECT 
    'strategies' as table_name, 
    COUNT(*) as record_count 
FROM strategies
UNION ALL
SELECT 
    'benchmarks' as table_name, 
    COUNT(*) as record_count 
FROM benchmarks
UNION ALL
SELECT 
    'proposals' as table_name, 
    COUNT(*) as record_count 
FROM proposals
UNION ALL
SELECT 
    'firm_settings' as table_name, 
    COUNT(*) as record_count 
FROM firm_settings;

-- View sample strategies
SELECT id, name, 
       jsonb_array_length(returns) as returns_count,
       asset_allocation
FROM strategies 
LIMIT 5;

-- View sample benchmarks
SELECT id, name, 
       jsonb_array_length(returns) as returns_count
FROM benchmarks 
LIMIT 5;

-- Check firm settings
SELECT id, 
       CASE WHEN logo_data IS NULL THEN 'No logo' ELSE 'Has logo' END as logo_status,
       jsonb_array_length(before_output_pages) as before_pages_count,
       jsonb_array_length(after_output_pages) as after_pages_count
FROM firm_settings;

-- Check for any data issues
SELECT 'strategies' as table_name, 
       COUNT(*) as total,
       COUNT(DISTINCT id) as unique_ids,
       COUNT(CASE WHEN name IS NULL OR name = '' THEN 1 END) as null_names
FROM strategies
UNION ALL
SELECT 'benchmarks' as table_name,
       COUNT(*) as total,
       COUNT(DISTINCT id) as unique_ids,
       COUNT(CASE WHEN name IS NULL OR name = '' THEN 1 END) as null_names
FROM benchmarks;

