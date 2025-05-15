import { Pool, neonConfig } from '@neondatabase/serverless';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';
import ws from 'ws';

// Configure WebSocket for Neon
neonConfig.webSocketConstructor = ws;

// Hash password function
const scryptAsync = promisify(scrypt);

async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString('hex')}.${salt}`;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL environment variable not set');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    console.log('Connecting to database...');
    
    // Define admin user info
    const adminEmail = 'admin@dutchthrift.com';
    const adminPassword = 'admin123'; // You can change this
    const adminName = 'Administrator';
    
    // Check if admin already exists
    const checkRes = await pool.query('SELECT * FROM admin_users WHERE email = $1', [adminEmail]);
    
    if (checkRes.rows.length > 0) {
      console.log('Admin user already exists');
      process.exit(0);
    }
    
    // Hash the password
    const hashedPassword = await hashPassword(adminPassword);
    
    // Insert new admin user
    const insertRes = await pool.query(
      `INSERT INTO admin_users (email, password, name, role, provider, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, email, name`,
      [adminEmail, hashedPassword, adminName, 'admin', 'local', new Date()]
    );
    
    console.log('Successfully created admin user:', insertRes.rows[0]);
    console.log('Email:', adminEmail);
    console.log('Password:', adminPassword);
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

main();