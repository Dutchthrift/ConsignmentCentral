/**
 * This script fixes the query that fetches order details to properly include items
 */

import pg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pg;
dotenv.config();

// Ensure DATABASE_URL is available
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for SSL connections to Supabase
  }
});

async function fixOrdersQuery() {
  const client = await pool.connect();
  
  try {
    console.log('Creating orders_with_items view...');
    
    // Create a view that properly joins orders, items, and related tables
    await client.query(`
      CREATE OR REPLACE VIEW orders_with_items AS
      SELECT 
        o.id AS order_id,
        o.order_number,
        o.customer_id,
        o.status AS order_status,
        o.submission_date,
        o.tracking_code,
        o.total_value,
        o.total_payout,
        c.name AS customer_name,
        c.email AS customer_email,
        i.id AS item_id,
        i.reference_id,
        i.title,
        i.category,
        i.status AS item_status,
        i.created_at AS intake_date,
        a.id AS analysis_id,
        a.brand_analysis,
        a.style_analysis,
        a.material_analysis,
        p.id AS pricing_id,
        p.suggested_listing_price,
        p.commission_rate,
        p.suggested_payout AS payout_amount
      FROM 
        orders o
      JOIN 
        customers c ON o.customer_id = c.id
      LEFT JOIN 
        order_items oi ON o.id = oi.order_id
      LEFT JOIN 
        items i ON oi.item_id = i.id
      LEFT JOIN 
        analysis a ON i.id = a.item_id
      LEFT JOIN 
        pricing p ON i.id = p.item_id
    `);
    
    console.log('View created successfully');
    
    // Create a function to get order with items
    console.log('Creating get_order_with_items function...');
    await client.query(`
      CREATE OR REPLACE FUNCTION get_order_with_items(order_id_param INTEGER)
      RETURNS TABLE (
        order_data JSON,
        items_data JSON
      ) AS $$
      DECLARE
        order_record RECORD;
        items_json JSON;
      BEGIN
        -- Get the order details
        SELECT 
          json_build_object(
            'id', o.id,
            'order_number', o.order_number,
            'customer_id', o.customer_id,
            'status', o.status,
            'submission_date', o.submission_date,
            'tracking_code', o.tracking_code,
            'total_value', o.total_value,
            'total_payout', o.total_payout,
            'customer_name', c.name,
            'customer_email', c.email
          ) INTO order_data
        FROM 
          orders o
        JOIN 
          customers c ON o.customer_id = c.id
        WHERE 
          o.id = order_id_param;
          
        -- Get all items for this order
        SELECT 
          json_agg(
            json_build_object(
              'id', i.id,
              'reference_id', i.reference_id,
              'title', i.title,
              'category', i.category,
              'status', i.status,
              'intake_date', i.created_at,
              'analysis_id', a.id,
              'brand_analysis', a.brand_analysis,
              'style_analysis', a.style_analysis,
              'material_analysis', a.material_analysis,
              'pricing_id', p.id,
              'suggested_listing_price', p.suggested_listing_price,
              'commission_rate', p.commission_rate,
              'payout_amount', p.suggested_payout
            )
          ) INTO items_data
        FROM 
          order_items oi
        JOIN 
          items i ON oi.item_id = i.id
        LEFT JOIN 
          analysis a ON i.id = a.item_id
        LEFT JOIN 
          pricing p ON i.id = p.item_id
        WHERE 
          oi.order_id = order_id_param;
          
        -- Return the data
        RETURN NEXT;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    console.log('Function created successfully');
    
    console.log('Order query fixes completed successfully');
  } catch (error) {
    console.error('Error fixing order queries:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Execute the function
fixOrdersQuery()
  .then(() => {
    console.log('Completed successfully');
    pool.end();
  })
  .catch(error => {
    console.error('Script failed:', error);
    pool.end();
    process.exit(1);
  });