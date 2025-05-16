import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Check if we have a database URL
if (!process.env.DATABASE_URL) {
  console.error('Error: DATABASE_URL environment variable is not set.');
  console.error('Create a Supabase project and set the DATABASE_URL in your .env file');
  process.exit(1);
}

async function main() {
  console.log('Starting migration to Supabase...');
  
  // Create a connection pool
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 3,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  try {
    // Test database connection
    console.log('Testing database connection...');
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
      console.log('Database connection established successfully!');
    } finally {
      client.release();
    }

    // Initialize Drizzle
    const db = drizzle(pool);

    // Apply migrations
    console.log('Applying migrations...');
    await migrate(db, { migrationsFolder: './drizzle' });
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);