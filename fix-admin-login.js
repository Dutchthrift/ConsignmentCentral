import { Pool } from 'pg';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';

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

const scryptAsync = promisify(scrypt);

// Hash password for storage in the correct format for our app
async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString('hex')}.${salt}`;
}

async function main() {
  const client = await pool.connect();
  try {
    console.log('Getting current admin users...');
    const result = await client.query('SELECT * FROM admin_users');
    console.log(`Found ${result.rows.length} admin users`);
    
    // Check password format for each admin user
    for (const admin of result.rows) {
      // Check if password has the correct format (contains a dot to separate hash and salt)
      if (!admin.password || !admin.password.includes('.')) {
        console.log(`Admin user ${admin.email} has incorrect password format. Fixing...`);
        
        // Generate a new hashed password in the correct format for 'admin123'
        const newPassword = await hashPassword('admin123');
        
        // Update the admin user
        await client.query(
          'UPDATE admin_users SET password = $1 WHERE id = $2',
          [newPassword, admin.id]
        );
        
        console.log(`Updated password for admin user ${admin.email}`);
      } else {
        console.log(`Admin user ${admin.email} already has correct password format.`);
      }
    }
    
    // Do the same for regular users
    const usersResult = await client.query('SELECT * FROM users');
    console.log(`Found ${usersResult.rows.length} regular users`);
    
    for (const user of usersResult.rows) {
      if (!user.password || !user.password.includes('.')) {
        console.log(`User ${user.email} has incorrect password format. Fixing...`);
        
        // Generate a new hashed password in the correct format for 'password123'
        const newPassword = await hashPassword('password123');
        
        // Update the user
        await client.query(
          'UPDATE users SET password = $1 WHERE id = $2',
          [newPassword, user.id]
        );
        
        console.log(`Updated password for user ${user.email}`);
      } else {
        console.log(`User ${user.email} already has correct password format.`);
      }
    }
    
    console.log('Password formats fixed successfully!');
  } catch (error) {
    console.error('Error fixing admin passwords:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

main();