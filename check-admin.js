// Direct SQL query script to check admin user existence
import pg from 'pg';
const { Pool } = pg;

// Connection to the database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkAdminTables() {
  const client = await pool.connect();
  try {
    console.log("Checking database tables...");
    
    // Check if admin_users table exists and its structure
    const tableQuery = `
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'admin_users'
      ORDER BY ordinal_position;
    `;
    
    const tableResult = await client.query(tableQuery);
    console.log("\nAdmin table structure:");
    tableResult.rows.forEach(row => {
      console.log(`${row.column_name} (${row.data_type})`);
    });
    
    // Check admin users in the database
    const adminQuery = "SELECT * FROM admin_users";
    const adminResult = await client.query(adminQuery);
    
    console.log("\nAdmin users in database:", adminResult.rowCount);
    adminResult.rows.forEach(row => {
      // Filter out the password for security
      const { password, ...safeData } = row;
      console.log(JSON.stringify(safeData, null, 2));
    });
    
    return {
      tableExists: tableResult.rowCount > 0,
      adminCount: adminResult.rowCount,
      tableStructure: tableResult.rows,
      admins: adminResult.rows.map(row => {
        const { password, ...safeData } = row;
        return safeData;
      })
    };
  } catch (error) {
    console.error("Database error:", error);
    return { error: error.message };
  } finally {
    client.release();
    await pool.end();
  }
}

// Execute the check
checkAdminTables().then(result => {
  console.log("\nCheck completed.");
});