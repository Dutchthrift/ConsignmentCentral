import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Validate the DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

// Create connection pool with more conservative settings
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  max: 1,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000
});

const createUsersTable = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'consignor',
  provider VARCHAR(50) NOT NULL DEFAULT 'local',
  last_login TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  customer_id INTEGER NULL,
  external_id VARCHAR(255) NULL,
  profile_image_url TEXT NULL
)`;

async function createTables() {
  const client = await pool.connect();
  try {
    console.log('Creating users table...');
    await client.query(createUsersTable);
    console.log('Users table created successfully');

    // Add test users
    const adminExistsResult = await client.query("SELECT id FROM admin_users WHERE email = 'admin@dutchthrift.com'");
    if (adminExistsResult.rowCount === 0) {
      console.log('Adding admin user...');
      const adminPassword = 'be86df160d734b4d30c88b12be96a5a1eb2b5f9286081844afddc47fe0f4d39c.3e17e2bd5a2d5b0a8c69a1c758fb9d5a';
      await client.query(
        `INSERT INTO admin_users (email, password, name, role) 
         VALUES ($1, $2, $3, 'admin')`,
        ['admin@dutchthrift.com', adminPassword, 'Admin User']
      );
      console.log('Admin user added');
    } else {
      console.log('Admin user already exists');
    }

    const userExistsResult = await client.query("SELECT id FROM users WHERE email = 'theooenema@hotmail.com'");
    if (userExistsResult.rowCount === 0) {
      console.log('Adding test consignor user...');
      const userPassword = 'be86df160d734b4d30c88b12be96a5a1eb2b5f9286081844afddc47fe0f4d39c.3e17e2bd5a2d5b0a8c69a1c758fb9d5a';
      await client.query(
        `INSERT INTO users (email, password, name, role) 
         VALUES ($1, $2, $3, 'consignor')`,
        ['theooenema@hotmail.com', userPassword, 'Theo Oenema']
      );
      console.log('Test consignor user added');
    } else {
      console.log('Test consignor user already exists');
    }

    console.log('Database setup completed successfully!');
  } catch (error) {
    console.error('Error creating tables:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
createTables().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});