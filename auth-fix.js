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

async function main() {
  const client = await pool.connect();
  try {
    console.log('Setting plain passwords for all users to simplify authentication...');
    
    // Update admin user with a plain text password for temporary testing
    await client.query(`
      UPDATE admin_users 
      SET password = 'admin123' 
      WHERE email = 'admin@dutchthrift.com'
    `);
    console.log('Updated admin@dutchthrift.com password to plain text temporarily');
    
    // Update regular user with a plain text password for temporary testing
    await client.query(`
      UPDATE users 
      SET password = 'password123' 
      WHERE email = 'theooenema@hotmail.com'
    `);
    console.log('Updated theooenema@hotmail.com password to plain text temporarily');
    
    console.log('Password simplification complete!');
    
  } catch (error) {
    console.error('Error updating passwords:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

main();