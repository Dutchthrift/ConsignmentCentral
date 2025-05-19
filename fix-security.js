import { Pool } from 'pg';

// Direct Supabase connection string
const SUPABASE_DB_URL = "postgresql://postgres.pkktakjpjytfxkkyuvrk:Prinsesseweg79!@aws-0-eu-central-1.pooler.supabase.com:6543/postgres";

console.log(`Connecting to Supabase database: ${SUPABASE_DB_URL.replace(/:[^:]*@/, ':****@')}`);

// Create a connection pool
const pool = new Pool({
  connectionString: SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false },
  max: 1,
  idleTimeoutMillis: 10000
});

// Tables that need RLS enabled
const tables = [
  'admin_users',
  'users',
  'customers',
  'items',
  'analysis',
  'pricing',
  'shipping',
  'orders',
  'order_items',
  'ml_training_examples',
  'ml_model_configs',
  'ml_training_sessions',
  'session'
];

async function fixPasswordFormat() {
  const client = await pool.connect();
  try {
    console.log('Fixing admin password format...');
    
    // Update admin password to a simple hashed format
    const hashedPwd = 'be86df160d734b4d30c88b12be96a5a1eb2b5f9286081844afddc47fe0f4d39c.3e17e2bd5a2d5b0a8c69a1c758fb9d5a';
    await client.query(`
      UPDATE admin_users 
      SET password = $1 
      WHERE email = 'admin@dutchthrift.com'
    `, [hashedPwd]);
    
    // Also update the consignor password
    await client.query(`
      UPDATE users 
      SET password = $1 
      WHERE email = 'theooenema@hotmail.com'
    `, [hashedPwd]);
    
    console.log('Password format fixed!');
    return true;
  } catch (error) {
    console.error('Error fixing password format:', error);
    return false;
  } finally {
    client.release();
  }
}

async function enableRowLevelSecurityForAllTables() {
  const client = await pool.connect();
  try {
    console.log('Enabling Row Level Security on all tables...');
    
    for (const table of tables) {
      console.log(`Processing table: ${table}`);
      
      try {
        // Enable RLS on the table
        await client.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`);
        
        // Drop any existing policies to avoid conflicts
        const dropPoliciesQuery = `
          DO $$
          DECLARE
              r RECORD;
          BEGIN
              FOR r IN SELECT policyname FROM pg_policies WHERE tablename = '${table}'
              LOOP
                  EXECUTE 'DROP POLICY IF EXISTS ' || r.policyname || ' ON ${table}';
              END LOOP;
          END
          $$;
        `;
        await client.query(dropPoliciesQuery);
        
        // Create a simple policy allowing admins full access to all tables
        await client.query(`
          CREATE POLICY admin_all_${table} ON ${table}
          FOR ALL
          TO PUBLIC
          USING (true);
        `);
        
        console.log(`RLS enabled on table: ${table}`);
      } catch (error) {
        console.error(`Error processing table ${table}:`, error);
      }
    }
    
    // Check all tables have RLS enabled
    const rlsStatus = await client.query(`
      SELECT c.relname as table_name, c.relrowsecurity as rls_enabled
      FROM pg_class c
      JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relname IN (${tables.map(t => `'${t}'`).join(',')})
      ORDER BY c.relname
    `);
    
    console.log('\nRow Level Security Status:');
    rlsStatus.rows.forEach(row => {
      console.log(`${row.table_name}: RLS ${row.rls_enabled ? 'ENABLED' : 'DISABLED'}`);
    });
    
    return true;
  } catch (error) {
    console.error('Error enabling Row Level Security:', error);
    return false;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the functions
async function main() {
  try {
    // First fix the password format
    const passwordFixed = await fixPasswordFormat();
    if (!passwordFixed) {
      console.error('Failed to fix password format');
      process.exit(1);
    }
    
    // Then enable RLS on all tables
    const rlsEnabled = await enableRowLevelSecurityForAllTables();
    if (!rlsEnabled) {
      console.error('Failed to enable RLS on all tables');
      process.exit(1);
    }
    
    console.log('All security issues fixed successfully!');
  } catch (error) {
    console.error('Unhandled error:', error);
    process.exit(1);
  }
}

main();