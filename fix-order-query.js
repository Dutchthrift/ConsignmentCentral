import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function fixOrdersQuery() {
  try {
    console.log("Checking for and fixing any SQL queries related to orders...");
    
    // Check if the getOrderSummaries function exists in the database
    const queryResult = await pool.query(`
      SELECT routine_definition
      FROM information_schema.routines
      WHERE routine_name = 'get_order_summaries'
      AND routine_type = 'FUNCTION'
    `);
    
    if (queryResult.rows.length > 0) {
      console.log("Found getOrderSummaries function in database, updating it...");
      
      // Update the function to use total_value and total_payout instead of total_amount
      await pool.query(`
        CREATE OR REPLACE FUNCTION get_order_summaries()
        RETURNS SETOF json AS $$
        BEGIN
          RETURN QUERY
          SELECT json_agg(
            json_build_object(
              'id', o.id,
              'orderNumber', o.order_number,
              'customerId', o.customer_id,
              'customerName', c.name,
              'customerEmail', c.email,
              'submissionDate', o.submission_date,
              'status', o.status,
              'trackingCode', o.tracking_code,
              'totalValue', o.total_value,
              'totalPayout', o.total_payout,
              'itemCount', (
                SELECT COUNT(*)
                FROM order_items oi
                WHERE oi.order_id = o.id
              )
            )
          )
          FROM orders o
          JOIN customers c ON o.customer_id = c.id;
        END;
        $$ LANGUAGE plpgsql;
      `);
      
      console.log("✅ Updated getOrderSummaries function to use correct column names");
    } else {
      console.log("No stored function found, no update needed");
    }
    
    console.log("✅ All orders query fixes completed successfully");
  } catch (error) {
    console.error("Error fixing orders query:", error);
  } finally {
    await pool.end();
  }
}

fixOrdersQuery();