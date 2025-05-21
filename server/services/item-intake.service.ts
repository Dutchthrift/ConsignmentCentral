/**
 * Item intake service for handling the consignment process
 * Creates orders and items with proper customer and order relationships
 */
import { pool } from '../db';
import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';

interface ItemData {
  title: string;
  description: string;
  category: string;
  brand?: string;
  color?: string;
  size?: string;
  condition: string;
  photos: string[];
  customer_id: number;
}

export class ItemIntakeService {
  /**
   * Process a new item submission:
   * 1. Create or get existing order
   * 2. Create the item and link to order
   * 3. Run AI analysis and store results
   */
  async processItemSubmission(itemData: ItemData) {
    console.log('Processing new item submission for customer:', itemData.customer_id);
    
    try {
      // Start a transaction
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');
        
        // 1. Get or create an open order for this customer
        const orderId = await this.getOrCreateOrder(client, itemData.customer_id);
        console.log('Using order ID for item submission:', orderId);
        
        // 2. Create the item record and link to order and customer
        const itemId = await this.createItem(client, itemData, orderId);
        console.log('Created new item with ID:', itemId);
        
        // 3. Run AI analysis on the item
        const analysisResult = await this.runItemAnalysis(client, itemId, itemData);
        console.log('AI analysis completed for item:', itemId);
        
        // Commit the transaction
        await client.query('COMMIT');
        
        return {
          success: true,
          item_id: itemId,
          order_id: orderId,
          analysis: analysisResult
        };
      } catch (error) {
        // Rollback transaction on error
        await client.query('ROLLBACK');
        console.error('Error processing item submission:', error);
        throw error;
      } finally {
        // Release the client back to the pool
        client.release();
      }
    } catch (error) {
      console.error('Error in item intake process:', error);
      throw error;
    }
  }
  
  /**
   * Get an existing "Awaiting Shipment" order or create a new one
   */
  private async getOrCreateOrder(client: any, customerId: number): Promise<number> {
    // Check for existing open order for this customer
    const existingOrderResult = await client.query(
      `SELECT id FROM orders WHERE customer_id = $1 AND status = $2 LIMIT 1`,
      [customerId, 'Awaiting Shipment']
    );
    
    // If an open order exists, use it
    if (existingOrderResult.rows.length > 0) {
      const orderId = existingOrderResult.rows[0].id;
      console.log('Found existing order:', orderId);
      return orderId;
    }
    
    // Otherwise, create a new order
    console.log('Creating new order for customer:', customerId);
    
    // Generate order reference 
    const orderNumber = this.generateOrderNumber();
    
    const newOrderResult = await client.query(
      `INSERT INTO orders (
        customer_id, order_number, status, created_at
      ) VALUES ($1, $2, $3, NOW()) RETURNING id`,
      [customerId, orderNumber, 'Awaiting Shipment']
    );
    
    const orderId = newOrderResult.rows[0].id;
    console.log('Created new order with ID:', orderId);
    
    return orderId;
  }
  
  /**
   * Create a new item record
   */
  private async createItem(client: any, itemData: ItemData, orderId: number): Promise<number> {
    // Generate reference ID for the item
    const referenceId = this.generateReferenceId();
    
    // Insert the item with customer_id and order_id
    const result = await client.query(
      `INSERT INTO items (
        customer_id, order_id, reference_id, title, description, category, 
        brand, color, size, condition, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW()) RETURNING id`,
      [
        itemData.customer_id,
        orderId,
        referenceId,
        itemData.title,
        itemData.description,
        itemData.category,
        itemData.brand || null,
        itemData.color || null,
        itemData.size || null,
        itemData.condition,
        'Intake Processing', // Initial status for items
        // Created at timestamp is handled by NOW()
      ]
    );
    
    const itemId = result.rows[0].id;
    
    // Store the item photos
    if (itemData.photos && itemData.photos.length > 0) {
      for (let i = 0; i < itemData.photos.length; i++) {
        await client.query(
          `INSERT INTO item_photos (item_id, photo_url, position) VALUES ($1, $2, $3)`,
          [itemId, itemData.photos[i], i]
        );
      }
    }
    
    // Create the relationship in the order_items table
    await client.query(
      `INSERT INTO order_items (order_id, item_id) VALUES ($1, $2)`,
      [orderId, itemId]
    );
    
    return itemId;
  }
  
  /**
   * Run AI analysis on the item and store results
   */
  private async runItemAnalysis(client: any, itemId: number, itemData: ItemData): Promise<any> {
    try {
      // Prepare the AI prompt with item details
      const prompt = `
        Analyze this consignment item:
        Title: ${itemData.title}
        Description: ${itemData.description}
        Category: ${itemData.category}
        Brand: ${itemData.brand || 'Unknown'}
        Color: ${itemData.color || 'Not specified'}
        Size: ${itemData.size || 'Not specified'}
        Condition: ${itemData.condition}
        
        Please provide the following in JSON format:
        1. Estimated retail value (in EUR)
        2. Recommended selling price (in EUR)
        3. Key value factors
        4. Condition assessment
        5. Authentication notes (if luxury brand)
        6. Potential issues or concerns
      `;
      
      // Call the AI service using OpenAI
      let aiResult = null;
      
      if (process.env.OPENAI_API_KEY) {
        console.log('Using OpenAI for item analysis');
        
        // Initialize OpenAI client
        const aiClient = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        });
        
        const response = await aiClient.chat.completions.create({
          model: "gpt-4", // Using GPT-4 for better accuracy
          messages: [
            { role: "system", content: "You are an expert appraiser for luxury consignment items. Provide professional valuations and assessments." },
            { role: "user", content: prompt }
          ],
          response_format: { type: "json_object" },
          temperature: 0.2,
        });
        
        try {
          const messageContent = response.choices[0].message.content;
          aiResult = messageContent ? JSON.parse(messageContent) : {};
        } catch (error) {
          console.error('Error parsing AI response:', error);
          aiResult = {
            error: "Could not parse AI response",
            raw_response: response.choices[0].message.content || ''
          };
        }
      } else {
        // Fallback if no API key
        console.log('No OpenAI API key found, using placeholder analysis');
        aiResult = {
          estimated_retail_value: 0,
          recommended_selling_price: 0,
          key_value_factors: "AI analysis not available",
          condition_assessment: itemData.condition,
          authentication_notes: "AI analysis not available",
          potential_issues: "AI analysis not available"
        };
      }
      
      // Store the analysis result
      const insertResult = await client.query(
        `INSERT INTO analysis (
          item_id, estimated_value, recommended_price, 
          key_factors, condition_assessment, authentication_notes, 
          potential_issues, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) RETURNING id`,
        [
          itemId,
          aiResult.estimated_retail_value || 0,
          aiResult.recommended_selling_price || 0,
          aiResult.key_value_factors || null,
          aiResult.condition_assessment || null,
          aiResult.authentication_notes || null,
          aiResult.potential_issues || null
        ]
      );
      
      const analysisId = insertResult.rows[0].id;
      console.log('Stored analysis with ID:', analysisId);
      
      return {
        analysis_id: analysisId,
        ...aiResult
      };
    } catch (error) {
      console.error('Error running item analysis:', error);
      // Store a basic placeholder analysis even on error
      const insertResult = await client.query(
        `INSERT INTO analysis (
          item_id, estimated_value, recommended_price, 
          key_factors, condition_assessment, created_at
        ) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id`,
        [
          itemId,
          0, // estimated_value
          0, // recommended_price
          "Analysis failed, please review manually", // key_factors
          itemData.condition, // condition_assessment
        ]
      );
      
      return {
        analysis_id: insertResult.rows[0].id,
        error: "Analysis failed, please review manually",
        estimated_retail_value: 0,
        recommended_selling_price: 0
      };
    }
  }
  
  /**
   * Generate a unique reference ID for an item
   */
  private generateReferenceId(): string {
    // Format: DT-[timestamp]-[random]
    const timestamp = Date.now().toString().substring(6); // Last 7 digits of timestamp
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `DT-${timestamp}-${random}`;
  }
  
  /**
   * Generate an order number
   */
  private generateOrderNumber(): string {
    // Format: ORD-[year][month][day]-[random]
    const now = new Date();
    const date = now.toISOString().slice(2, 10).replace(/-/g, ''); // YYMMDD
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `ORD-${date}-${random}`;
  }
}