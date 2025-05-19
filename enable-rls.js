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

async function enableRowLevelSecurity() {
  const client = await pool.connect();
  try {
    // Enable Row Level Security on the shipping table
    console.log('Enabling Row Level Security on shipping table...');
    await client.query(`
      -- Enable RLS on shipping table
      ALTER TABLE shipping ENABLE ROW LEVEL SECURITY;
      
      -- Create policy for admins (can see all records)
      CREATE POLICY admin_all ON shipping
        FOR ALL
        TO PUBLIC
        USING (EXISTS (
          SELECT 1 FROM admin_users WHERE admin_users.id = current_setting('app.user_id', TRUE)::integer
        ));
      
      -- Create policy for consignors (can only see their own shipments)
      CREATE POLICY consignor_select ON shipping
        FOR SELECT
        TO PUBLIC
        USING (EXISTS (
          SELECT 1 FROM items, users
          WHERE items.id = shipping.item_id
          AND items.customer_id = users.customer_id
          AND users.id = current_setting('app.user_id', TRUE)::integer
        ));
    `);
    
    // Check if RLS is enabled on shipping table
    const rlsCheck = await client.query(`
      SELECT c.relrowsecurity
      FROM pg_class c
      JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE c.relname = 'shipping' AND n.nspname = 'public'
    `);
    
    if (rlsCheck.rows.length > 0 && rlsCheck.rows[0].relrowsecurity) {
      console.log('Row Level Security is now ENABLED on the shipping table');
    } else {
      console.log('Failed to enable Row Level Security on the shipping table');
    }
    
    // List all policies on shipping table
    const policies = await client.query(`
      SELECT polname, polcmd, polpermissive, polroles
      FROM pg_policy
      WHERE polrelid = 'public.shipping'::regclass::oid
    `);
    
    if (policies.rows.length > 0) {
      console.log('Policies on shipping table:');
      policies.rows.forEach(policy => {
        console.log(`- ${policy.polname} (${policy.polcmd})`);
      });
    } else {
      console.log('No policies found on shipping table');
    }
    
    return true;
  } catch (error) {
    console.error('Error enabling Row Level Security:', error);
    return false;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the function
enableRowLevelSecurity()
  .then(success => {
    if (success) {
      console.log('Security configuration completed successfully!');
    } else {
      console.error('Failed to configure security');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });