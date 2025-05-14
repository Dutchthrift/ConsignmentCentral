import { pool, db } from './server/db';
import * as schema from './shared/schema';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('Starting database migration...');
  
  try {
    // Create tables
    console.log('Creating tables...');
    
    // Create customers table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        phone TEXT,
        address TEXT,
        city TEXT,
        state TEXT,
        postal_code TEXT,
        country TEXT
      );
    `);
    console.log('Created customers table');
    
    // Create items table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS items (
        id SERIAL PRIMARY KEY,
        status TEXT NOT NULL,
        reference_id TEXT NOT NULL UNIQUE,
        customer_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        image_url TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        FOREIGN KEY (customer_id) REFERENCES customers (id)
      );
    `);
    console.log('Created items table');
    
    // Create analyses table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS analyses (
        id SERIAL PRIMARY KEY,
        item_id INTEGER NOT NULL UNIQUE,
        brand TEXT,
        product_type TEXT,
        model TEXT,
        condition TEXT,
        accessories JSONB,
        additional_notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        FOREIGN KEY (item_id) REFERENCES items (id)
      );
    `);
    console.log('Created analyses table');
    
    // Create pricing table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS pricing (
        id SERIAL PRIMARY KEY,
        item_id INTEGER NOT NULL UNIQUE,
        average_market_price DECIMAL,
        suggested_listing_price DECIMAL,
        suggested_payout DECIMAL,
        commission_rate DECIMAL,
        payout_type TEXT,
        final_sale_price DECIMAL,
        final_payout DECIMAL,
        store_credit_amount DECIMAL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        FOREIGN KEY (item_id) REFERENCES items (id)
      );
    `);
    console.log('Created pricing table');
    
    // Create shipping table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS shipping (
        id SERIAL PRIMARY KEY,
        item_id INTEGER NOT NULL UNIQUE,
        label_url TEXT,
        tracking_number TEXT,
        carrier TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        FOREIGN KEY (item_id) REFERENCES items (id)
      );
    `);
    console.log('Created shipping table');
    
    // Create ml_training_examples table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ml_training_examples (
        id SERIAL PRIMARY KEY,
        item_id INTEGER,
        image_url TEXT,
        image_data TEXT,
        product_type TEXT NOT NULL,
        brand TEXT,
        model TEXT,
        condition TEXT,
        market_value DECIMAL,
        is_verified BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        FOREIGN KEY (item_id) REFERENCES items (id)
      );
    `);
    console.log('Created ml_training_examples table');
    
    // Create ml_model_configs table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ml_model_configs (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        model_id TEXT,
        base_model TEXT NOT NULL,
        training_params JSONB,
        specialization TEXT NOT NULL,
        accuracy DECIMAL,
        is_active BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);
    console.log('Created ml_model_configs table');
    
    // Create ml_training_sessions table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ml_training_sessions (
        id SERIAL PRIMARY KEY,
        model_config_id INTEGER,
        started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        completed_at TIMESTAMP WITH TIME ZONE,
        status TEXT NOT NULL,
        training_example_count INTEGER,
        validation_example_count INTEGER,
        training_loss TEXT,
        validation_loss TEXT,
        notes TEXT,
        result_data JSONB,
        FOREIGN KEY (model_config_id) REFERENCES ml_model_configs (id)
      );
    `);
    console.log('Created ml_training_sessions table');
    
    console.log('Database migration completed successfully');
  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);