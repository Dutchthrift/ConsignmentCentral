import 'dotenv/config';
import pg from 'pg';
const { Pool } = pg;

async function testDatabaseConnection() {
  console.log('Testing database connection with the following URL:');
  // Display the URL with password obscured for security
  const dbUrl = process.env.DATABASE_URL;
  const maskedUrl = dbUrl.replace(/:([^:@]+)@/, ':****@');
  console.log(maskedUrl);

  try {
    // Create a simple connection pool with minimal configuration
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      // Very short timeouts for quick feedback
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 10000,
      max: 1
    });

    // Test the connection with a simple query
    console.log('Attempting to connect to the database...');
    const result = await pool.query('SELECT NOW() as current_time');
    console.log('Connection successful!');
    console.log('Server time:', result.rows[0].current_time);
    
    // Test if we can access specific tables
    console.log('\nTesting access to admin_users table...');
    try {
      const adminResult = await pool.query('SELECT COUNT(*) FROM admin_users');
      console.log('Admin users count:', adminResult.rows[0].count);
    } catch (error) {
      console.error('Could not access admin_users table:', error.message);
    }

    // Close the connection pool
    await pool.end();
    console.log('\nDatabase connection test completed.');
  } catch (error) {
    console.error('Database connection failed:', error);
    
    // Provide more specific error information based on the error type
    if (error.code === 'ENOTFOUND') {
      console.error('DNS lookup failed. The hostname could not be resolved.');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('Connection timed out. The server may be down or blocking connections.');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('Connection refused. The server may not be accepting connections on that port.');
    }
  }
}

// Run the test
testDatabaseConnection().catch(err => {
  console.error('Uncaught error:', err);
  process.exit(1);
});