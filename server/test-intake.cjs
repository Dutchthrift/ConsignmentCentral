/**
 * This script tests the full consignment intake process
 * - Creates a test item
 * - Analyzes it with OpenAI Vision
 * - Gets pricing information
 * - Saves to the database
 * - Verifies the result
 */

require('dotenv').config();
const { Pool } = require('pg');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Sample test data
const testItem = {
  title: "Canon AE-1 Program",
  description: "Vintage film camera in good condition",
  category: "Cameras",
  condition: "Used - Good",
  customerId: 1 // Theo Oenema's customer ID
};

// Sample image data - could be a base64 string
const testImagePath = path.join(__dirname, '../attached_assets/image_1747682898725.png');

async function executeQuery(query, params = []) {
  const client = await pool.connect();
  try {
    const result = await client.query(query, params);
    return result;
  } finally {
    client.release();
  }
}

// Mock the OpenAI Vision analysis for testing
async function mockAnalyzeItem(item, imageBase64) {
  console.log(`Analyzing item "${item.title}" with image data`);
  
  // Simulated OpenAI Vision analysis result
  return {
    brand: "Canon",
    productType: "Film Camera",
    model: "AE-1 Program",
    condition: "Good",
    category: "Photography Equipment",
    features: {
      "lens": "50mm f/1.8",
      "shutter": "1/1000 - 1 sec",
      "metering": "TTL center-weighted"
    },
    accessories: "None visible",
    manufactureYear: "1981",
    color: "Black",
    dimensions: "Approximately 14 x 9 x 5 cm",
    weight: "About 620g",
    materials: "Metal body, plastic parts",
    authenticity: "Authentic Canon product",
    rarity: "Common but desirable model",
    additionalNotes: "Popular student and enthusiast camera from the early 1980s",
    analysisSummary: "Canon AE-1 Program 35mm film camera in good condition. A classic film camera from the early 1980s with a 50mm lens.",
    confidenceScore: 0.92
  };
}

// Mock eBay price lookup
async function mockEbayPrices(item, analysis) {
  console.log(`Looking up prices for ${analysis.brand} ${analysis.model}`);
  
  // Simulated eBay price data
  return {
    averagePrice: 189.99,
    priceRange: {
      low: 149.99,
      high: 249.99
    },
    condition: "Used - Good",
    soldItems: 15,
    recommendedPrice: 189.99
  };
}

// Calculate commission and payout
function calculatePayouts(price) {
  // 30% commission rate
  const commissionRate = 0.30;
  const commission = price * commissionRate;
  const payout = price - commission;
  
  return {
    salePrice: price,
    commissionRate: commissionRate,
    commissionAmount: commission,
    payoutAmount: payout
  };
}

// Generate a reference ID
function generateReferenceId() {
  const date = new Date();
  const year = date.getFullYear().toString().slice(2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  
  // Add random numbers for uniqueness
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  
  // Add millisecond precision for high-volume submissions
  const ms = date.getMilliseconds().toString().padStart(3, '0');
  
  return `CS-${year}${month}${day}-${random}-${ms}`;
}

async function testIntakeProcess() {
  try {
    console.log('Starting consignment intake test process');
    
    // Read the test image
    const imageBuffer = fs.readFileSync(testImagePath);
    const imageBase64 = imageBuffer.toString('base64');
    
    // 1. Analyze the item with OpenAI Vision (mocked)
    console.log('Step 1: Analyzing item with AI Vision');
    const analysisResult = await mockAnalyzeItem(testItem, imageBase64);
    console.log('Analysis complete:', analysisResult);
    
    // 2. Get pricing information (mocked)
    console.log('Step 2: Getting price information');
    const priceData = await mockEbayPrices(testItem, analysisResult);
    console.log('Price data:', priceData);
    
    // 3. Calculate payout and commission
    console.log('Step 3: Calculating payout');
    const payoutInfo = calculatePayouts(priceData.recommendedPrice);
    console.log('Payout information:', payoutInfo);
    
    // 4. Generate a reference ID
    const referenceId = generateReferenceId();
    console.log('Generated reference ID:', referenceId);
    
    // 5. Store the item in the database
    console.log('Step 4: Storing item in database');
    
    // Create the item first
    const createItemQuery = `
      INSERT INTO items (
        title, 
        description, 
        category, 
        condition, 
        reference_id, 
        customer_id,
        status,
        image_url,
        image_urls
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    
    const itemParams = [
      testItem.title,
      testItem.description,
      testItem.category,
      testItem.condition,
      referenceId,
      testItem.customerId,
      'received', // Initial status
      imageBase64,
      imageBase64
    ];
    
    const itemResult = await executeQuery(createItemQuery, itemParams);
    const savedItem = itemResult.rows[0];
    console.log('Item stored successfully:', savedItem);
    
    // 6. Store the analysis results
    console.log('Step 5: Storing analysis results');
    
    // Check which columns exist in the analysis table
    const columnsQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'analysis'
    `;
    
    const columnsResult = await executeQuery(columnsQuery);
    const existingColumns = columnsResult.rows.map(row => row.column_name);
    console.log('Available columns in analysis table:', existingColumns);
    
    // Filter analysis data to match existing columns
    const analysisData = {};
    analysisData.item_id = savedItem.id;
    
    // Map camelCase fields to snake_case for database columns
    if (existingColumns.includes('brand')) analysisData.brand = analysisResult.brand;
    if (existingColumns.includes('product_type')) analysisData.product_type = analysisResult.productType;
    if (existingColumns.includes('model')) analysisData.model = analysisResult.model;
    if (existingColumns.includes('condition')) analysisData.condition = analysisResult.condition;
    if (existingColumns.includes('category')) analysisData.category = analysisResult.category;
    if (existingColumns.includes('features')) analysisData.features = JSON.stringify(analysisResult.features);
    if (existingColumns.includes('accessories')) analysisData.accessories = analysisResult.accessories;
    if (existingColumns.includes('manufacture_year')) analysisData.manufacture_year = analysisResult.manufactureYear;
    if (existingColumns.includes('color')) analysisData.color = analysisResult.color;
    if (existingColumns.includes('dimensions')) analysisData.dimensions = analysisResult.dimensions;
    if (existingColumns.includes('weight')) analysisData.weight = analysisResult.weight;
    if (existingColumns.includes('materials')) analysisData.materials = analysisResult.materials;
    if (existingColumns.includes('authenticity')) analysisData.authenticity = analysisResult.authenticity;
    if (existingColumns.includes('rarity')) analysisData.rarity = analysisResult.rarity;
    if (existingColumns.includes('additional_notes')) analysisData.additional_notes = analysisResult.additionalNotes;
    if (existingColumns.includes('analysis_summary')) analysisData.analysis_summary = analysisResult.analysisSummary;
    if (existingColumns.includes('confidence_score')) analysisData.confidence_score = analysisResult.confidenceScore;
    
    // Build the dynamic INSERT query based on available columns
    const columns = Object.keys(analysisData).join(', ');
    const placeholders = Object.keys(analysisData).map((_, i) => `$${i + 1}`).join(', ');
    const values = Object.values(analysisData);
    
    const analysisQuery = `
      INSERT INTO analysis (${columns})
      VALUES (${placeholders})
      RETURNING *
    `;
    
    console.log('Executing analysis insertion with data:', analysisData);
    console.log('SQL:', analysisQuery, 'Values:', values);
    
    const analysisResult2 = await executeQuery(analysisQuery, values);
    const savedAnalysis = analysisResult2.rows[0];
    console.log('Analysis data stored successfully:', savedAnalysis);
    
    // 7. Store pricing information
    console.log('Step 6: Storing pricing information');
    
    const pricingQuery = `
      INSERT INTO pricing (
        item_id,
        market_price,
        sale_price,
        commission_rate,
        commission_amount,
        payout_amount
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const pricingParams = [
      savedItem.id,
      priceData.averagePrice,
      payoutInfo.salePrice,
      payoutInfo.commissionRate,
      payoutInfo.commissionAmount,
      payoutInfo.payoutAmount
    ];
    
    const pricingResult = await executeQuery(pricingQuery, pricingParams);
    const savedPricing = pricingResult.rows[0];
    console.log('Pricing data stored successfully:', savedPricing);
    
    // 8. Return the complete result
    const finalResult = {
      item: savedItem,
      analysis: savedAnalysis,
      pricing: savedPricing,
      referenceId: referenceId,
      customerId: testItem.customerId
    };
    
    console.log('Complete test intake process finished successfully!');
    return finalResult;
    
  } catch (error) {
    console.error('Error during intake test process:', error);
    throw error;
  } finally {
    // Close the connection pool
    await pool.end();
  }
}

// Run the test
testIntakeProcess()
  .then(result => {
    console.log('TEST SUCCESSFUL - Summary:');
    console.log('------------------------');
    console.log(`Item: ${result.item.title} (ID: ${result.item.id})`);
    console.log(`Reference ID: ${result.referenceId}`);
    console.log(`Analysis: ${result.analysis.brand} ${result.analysis.model} (${result.analysis.condition})`);
    console.log(`Pricing: €${result.pricing.sale_price} (Commission: ${result.pricing.commission_rate * 100}%, Payout: €${result.pricing.payout_amount})`);
    console.log(`Customer ID: ${result.customerId}`);
  })
  .catch(error => {
    console.error('TEST FAILED:', error);
  });