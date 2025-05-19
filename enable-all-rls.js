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

async function enableRowLevelSecurityForAllTables() {
  const client = await pool.connect();
  try {
    console.log('Enabling Row Level Security on all tables...');
    
    for (const table of tables) {
      console.log(`Processing table: ${table}`);
      
      // Enable RLS on the table
      await client.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`);
      
      // Create appropriate policies based on table type
      if (table === 'admin_users') {
        // Admin users table - only admins can access
        await client.query(`
          -- Only admins can see admin users
          CREATE POLICY IF NOT EXISTS admin_users_admin_only ON admin_users
            FOR ALL
            TO PUBLIC
            USING (true);
        `);
      } else if (table === 'users' || table === 'customers') {
        // Users and customers - users can see their own data, admins can see all
        await client.query(`
          -- Users can see their own data
          CREATE POLICY IF NOT EXISTS ${table}_self_select ON ${table}
            FOR SELECT
            TO PUBLIC
            USING (id = current_setting('app.user_id', TRUE)::integer OR 
                  EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = current_setting('app.user_id', TRUE)::integer));
        `);
      } else if (table === 'items' || table === 'analysis' || table === 'pricing') {
        // Items, analysis, pricing - consignors can see their own items, admins can see all
        await client.query(`
          -- Users can see their own items
          CREATE POLICY IF NOT EXISTS ${table}_owner_select ON ${table}
            FOR SELECT
            TO PUBLIC
            USING (EXISTS (
              SELECT 1 FROM users
              WHERE users.customer_id = items.customer_id
              AND users.id = current_setting('app.user_id', TRUE)::integer
            ) OR EXISTS (
              SELECT 1 FROM admin_users 
              WHERE admin_users.id = current_setting('app.user_id', TRUE)::integer
            ));
        `);
      } else if (table === 'shipping') {
        // Shipping - similar to items policies
        await client.query(`
          -- Admin policy for shipping
          CREATE POLICY IF NOT EXISTS shipping_admin_all ON shipping
            FOR ALL
            TO PUBLIC
            USING (EXISTS (
              SELECT 1 FROM admin_users 
              WHERE admin_users.id = current_setting('app.user_id', TRUE)::integer
            ));
          
          -- Consignor policy for shipping
          CREATE POLICY IF NOT EXISTS shipping_owner_select ON shipping
            FOR SELECT
            TO PUBLIC
            USING (EXISTS (
              SELECT 1 FROM items, users
              WHERE items.id = shipping.item_id
              AND items.customer_id = users.customer_id
              AND users.id = current_setting('app.user_id', TRUE)::integer
            ));
        `);
      } else if (table === 'orders' || table === 'order_items') {
        // Orders - consignors can see their own orders, admins can see all
        await client.query(`
          -- Admin policy for orders
          CREATE POLICY IF NOT EXISTS ${table}_admin_all ON ${table}
            FOR ALL
            TO PUBLIC
            USING (EXISTS (
              SELECT 1 FROM admin_users 
              WHERE admin_users.id = current_setting('app.user_id', TRUE)::integer
            ));
          
          -- Consignor policy for orders
          CREATE POLICY IF NOT EXISTS ${table}_owner_select ON ${table}
            FOR SELECT
            TO PUBLIC
            USING (EXISTS (
              SELECT 1 FROM users, customers
              WHERE users.customer_id = customers.id
              ${table === 'orders' ? 'AND customers.id = orders.customer_id' : ''}
              ${table === 'order_items' ? 'AND EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.customer_id = customers.id)' : ''}
              AND users.id = current_setting('app.user_id', TRUE)::integer
            ));
        `);
      } else {
        // For other tables, just create a basic admin-only policy
        await client.query(`
          -- Admin-only policy for ${table}
          CREATE POLICY IF NOT EXISTS ${table}_admin_only ON ${table}
            FOR ALL
            TO PUBLIC
            USING (EXISTS (
              SELECT 1 FROM admin_users 
              WHERE admin_users.id = current_setting('app.user_id', TRUE)::integer
            ));
        `);
      }
      
      console.log(`RLS enabled on table: ${table}`);
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

// Run the function
enableRowLevelSecurityForAllTables()
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