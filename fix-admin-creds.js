// Script to fix admin credentials after Supabase migration
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL environment variable not set');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false // Required for SSL connections to Supabase
    }
  });

  try {
    // We'll use a simple, temporary approach - set plain text password
    // that will be recognized by the 'plain text password comparison' fallback
    const plainPassword = 'admin123';
    const adminEmail = 'admin@dutchthrift.com';
    
    // Update the admin password in a format our system will recognize
    const updateResult = await pool.query(
      'UPDATE admin_users SET password = $1 WHERE email = $2 RETURNING id, email',
      [plainPassword, adminEmail]
    );
    
    if (updateResult.rows.length === 0) {
      console.error('Admin user not found');
      process.exit(1);
    }
    
    console.log(`Updated credentials for ${updateResult.rows[0].email} (ID: ${updateResult.rows[0].id})`);
    console.log('You can now log in with:');
    console.log(`Email: ${adminEmail}`);
    console.log(`Password: ${plainPassword}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error updating admin credentials:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();