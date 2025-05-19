import pg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pg;
dotenv.config();

// Initialize PostgreSQL pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Seeds test data for a consignor (in this case, using Theo Oenema's consignor ID 12)
async function seedConsignorItems() {
  const client = await pool.connect();
  
  try {
    console.log('Adding test items for consignor...');
    
    // Get the consignor ID for Theo Oenema (theooenema@hotmail.com)
    const consignorResult = await client.query(
      "SELECT id FROM customers WHERE email = 'theooenema@hotmail.com'"
    );
    
    if (consignorResult.rows.length === 0) {
      throw new Error('Consignor account not found. Please ensure theooenema@hotmail.com exists in the database.');
    }
    
    const consignorId = consignorResult.rows[0].id;
    console.log(`Found consignor with ID: ${consignorId}`);
    
    // Items to add for the consignor - with various statuses to test different views
    const items = [
      {
        title: 'Vintage Omega Seamaster Watch',
        description: 'Excellent condition vintage Omega Seamaster automatic watch from the 1960s with original box and papers.',
        status: 'pending',
        referenceId: `DT-2023-C${consignorId}-101`
      },
      {
        title: 'Louis Vuitton Neverfull Bag',
        description: 'Authentic Louis Vuitton Neverfull MM in Damier Ebene canvas. Good condition with minor signs of use.',
        status: 'analyzing',
        referenceId: `DT-2023-C${consignorId}-102`
      },
      {
        title: 'Levi\'s Vintage 501 Jeans',
        description: 'Original Levi\'s 501 jeans from the 1980s, selvage denim, excellent vintage condition',
        status: 'approved',
        referenceId: `DT-2023-C${consignorId}-103`
      },
      {
        title: 'Nike Dunk Low Retro "Panda"',
        description: 'Unworn Nike Dunk Low Black and White (Panda) sneakers, size EU 42, with original box',
        status: 'listed',
        referenceId: `DT-2023-C${consignorId}-104`
      },
      {
        title: 'Sony Walkman TPS-L2',
        description: 'Rare original Sony Walkman TPS-L2 from 1979 in working condition. The first portable cassette player.',
        status: 'sold',
        referenceId: `DT-2023-C${consignorId}-105`
      }
    ];
    
    // Add items
    for (const item of items) {
      const result = await client.query(
        `INSERT INTO items (customer_id, title, description, status, reference_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         RETURNING id`,
        [consignorId, item.title, item.description, item.status, item.referenceId]
      );
      
      const itemId = result.rows[0].id;
      console.log(`Added item "${item.title}" with ID ${itemId} and reference ID ${item.referenceId}`);
      
      // Only add pricing/analysis data for items that are past the "analyzing" stage
      if (['approved', 'listed', 'sold'].includes(item.status)) {
        // Add analysis
        await client.query(
          `INSERT INTO analysis (item_id, authenticity_score, condition_score, market_demand_score, style_analysis, 
                               material_analysis, brand_analysis, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
          [
            itemId,
            Math.floor(Math.random() * 30) + 70, // authenticity score 70-100
            Math.floor(Math.random() * 20) + 80, // condition score 80-100
            Math.floor(Math.random() * 50) + 50, // market demand score 50-100
            `This item follows current market trends and has good resale value in the Dutch market.`,
            item.title.includes('Levi') ? 'Premium denim fabric in excellent condition.' : 
              item.title.includes('Louis Vuitton') ? 'Authentic Damier Ebene canvas with leather trim.' :
              item.title.includes('Omega') ? 'Stainless steel case with original bracelet.' :
              item.title.includes('Nike') ? 'Premium leather uppers in black and white colorway.' :
              'Good quality materials that show minor signs of use but overall excellent condition.',
            item.title.includes('Levi') ? 'Levi Strauss & Co. is known for their iconic denim.' :
              item.title.includes('Louis Vuitton') ? 'Louis Vuitton is a luxury fashion house founded in 1854.' :
              item.title.includes('Omega') ? 'Omega is a prestigious Swiss watchmaker founded in 1848.' :
              item.title.includes('Nike') ? 'Nike Dunks have seen a significant resurgence in popularity.' :
              item.title.includes('Sony') ? 'The Sony Walkman revolutionized portable music players.' :
              'This brand has good recognition and resale value.'
          ]
        );
        
        console.log(`Added analysis for item ${itemId}`);
        
        // Calculate price tiers based on item
        let basePrice = 0;
        if (item.title.includes('Omega')) basePrice = 1200;
        else if (item.title.includes('Louis Vuitton')) basePrice = 850;
        else if (item.title.includes('Levi')) basePrice = 120;
        else if (item.title.includes('Nike')) basePrice = 150;
        else if (item.title.includes('Sony')) basePrice = 350;
        
        const estimatedValue = basePrice;
        const suggestedPrice = Math.round(basePrice * 1.2); // 20% markup
        const finalPrice = item.status === 'sold' ? suggestedPrice : null;
        
        // Add pricing
        await client.query(
          `INSERT INTO pricing (item_id, estimated_value, suggested_listing_price, commission_rate, 
                               final_listing_price, final_payout, notes, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
          [
            itemId,
            estimatedValue * 100, // stored in cents
            suggestedPrice * 100, // stored in cents
            item.status === 'sold' ? 40 : // 40% commission
              item.title.includes('Omega') || item.title.includes('Louis Vuitton') ? 30 : 50, // vary commission by item value
            finalPrice ? finalPrice * 100 : null, // stored in cents
            finalPrice ? Math.round(finalPrice * 0.6) * 100 : null, // 60% of final price, stored in cents (assuming 40% commission)
            `Pricing based on market research and current trends. ${
              item.title.includes('Omega') ? 'Vintage Omega watches continue to appreciate in value.' :
              item.title.includes('Louis Vuitton') ? 'Louis Vuitton bags maintain strong resale value.' :
              item.title.includes('Levi') ? 'Vintage Levi\'s have a dedicated collector market.' :
              item.title.includes('Nike') ? 'The Panda colorway remains highly sought after.' :
              item.title.includes('Sony') ? 'Original Walkman models are becoming collector\'s items.' :
              'Good market demand for this item.'
            }`
          ]
        );
        
        console.log(`Added pricing for item ${itemId}`);
      }
    }
    
    console.log('Successfully added test items for the consignor!');
    
  } catch (error) {
    console.error('Error seeding consignor items:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the function
seedConsignorItems().then(() => {
  console.log('Done!');
  process.exit(0);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});