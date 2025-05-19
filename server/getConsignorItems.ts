import { db, pool } from './db';
import { items } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Direct database query function to get consignor items
// This avoids the complex joins that might cause SQL errors
export async function getConsignorItems(consignorId: number) {
  try {
    // Use direct SQL query to get items and their associated order information
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          i.id, 
          i.reference_id, 
          i.title, 
          i.description,
          i.status, 
          i.image_url,
          i.created_at, 
          i.updated_at,
          o.order_number
        FROM 
          items i
        LEFT JOIN 
          order_items oi ON i.id = oi.item_id
        LEFT JOIN 
          orders o ON oi.order_id = o.id
        WHERE 
          i.customer_id = $1
        ORDER BY 
          i.created_at DESC
      `, [consignorId]);
      
      // Return formatted items with order information
      return result.rows.map(item => ({
        id: item.id,
        referenceId: item.reference_id,
        title: item.title || 'Unnamed Item',
        description: item.description || '',
        status: item.status || 'pending',
        imageUrl: item.image_url || null,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        orderNumber: item.order_number || null
      }));
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error in getConsignorItems:', error);
    throw error;
  }
}

// Get all items with basic details for admin dashboard
export async function getAllItems() {
  try {
    // Use direct SQL query with joins to avoid the ORM layer issues
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          i.id, 
          i.reference_id, 
          i.title, 
          i.status, 
          i.created_at, 
          i.updated_at,
          c.id as customer_id, 
          c.name as customer_name, 
          c.email as customer_email,
          o.order_number
        FROM 
          items i
        LEFT JOIN 
          customers c ON i.customer_id = c.id
        LEFT JOIN 
          order_items oi ON i.id = oi.item_id
        LEFT JOIN 
          orders o ON oi.order_id = o.id
        ORDER BY 
          i.created_at DESC
        LIMIT 50
      `);
      
      return result.rows.map(row => ({
        id: row.id,
        referenceId: row.reference_id,
        title: row.title || 'Unnamed Item',
        status: row.status || 'pending',
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        customerName: row.customer_name,
        customerEmail: row.customer_email,
        customerId: row.customer_id,
        orderNumber: row.order_number || null
      }));
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error in getAllItems:', error);
    throw error;
  }
}

// Get single item details by reference ID
export async function getItemDetailsByReferenceId(referenceId: string) {
  try {
    const client = await pool.connect();
    try {
      // First get the item
      const itemResult = await client.query(`
        SELECT 
          i.*, 
          c.id as customer_id, 
          c.name as customer_name, 
          c.email as customer_email,
          c.phone as customer_phone
        FROM 
          items i
        LEFT JOIN 
          customers c ON i.customer_id = c.id
        WHERE 
          i.reference_id = $1
      `, [referenceId]);
      
      if (itemResult.rows.length === 0) {
        return null;
      }
      
      const item = itemResult.rows[0];
      
      // Get analysis if available
      const analysisResult = await client.query(`
        SELECT * FROM analysis WHERE item_id = $1
      `, [item.id]);
      
      // Get pricing if available
      const pricingResult = await client.query(`
        SELECT * FROM pricing WHERE item_id = $1
      `, [item.id]);
      
      // Construct the full item details
      return {
        id: item.id,
        referenceId: item.reference_id,
        title: item.title || 'Unnamed Item',
        description: item.description || '',
        status: item.status,
        createdAt: item.created_at,
        customer: {
          id: item.customer_id,
          name: item.customer_name,
          email: item.customer_email,
          phone: item.customer_phone
        },
        analysis: analysisResult.rows.length > 0 ? {
          id: analysisResult.rows[0].id,
          itemId: analysisResult.rows[0].item_id,
          materialAnalysis: analysisResult.rows[0].material_analysis || null,
          brandAnalysis: analysisResult.rows[0].brand_analysis || null,
          styleAnalysis: analysisResult.rows[0].style_analysis || null,
          authenticityScore: analysisResult.rows[0].authenticity_score || null,
          conditionScore: analysisResult.rows[0].condition_score || null,
          notes: analysisResult.rows[0].notes || null,
          createdAt: analysisResult.rows[0].created_at
        } : null,
        pricing: pricingResult.rows.length > 0 ? {
          id: pricingResult.rows[0].id,
          itemId: pricingResult.rows[0].item_id,
          suggestedPrice: pricingResult.rows[0].suggested_listing_price || null,
          estimatedValue: pricingResult.rows[0].estimated_value || null,
          listPrice: pricingResult.rows[0].final_listing_price || null,
          consignmentRate: pricingResult.rows[0].commission_rate || null,
          consignorPayout: pricingResult.rows[0].final_payout || null,
          notes: pricingResult.rows[0].notes || null,
          createdAt: pricingResult.rows[0].created_at
        } : null
      };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error in getItemDetailsByReferenceId:', error);
    throw error;
  }
}