import { createClient } from '@supabase/supabase-js';
import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);
const app = express();

// Allow JSON requests
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.send('Supabase Data Viewer is running');
});

// Get all users
app.get('/users', async (req, res) => {
  const { data, error } = await supabase.from('users').select('*');
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  res.json(data);
});

// Get all customers
app.get('/customers', async (req, res) => {
  const { data, error } = await supabase.from('customers').select('*');
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  res.json(data);
});

// Get all orders with items
app.get('/orders', async (req, res) => {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      customers (id, name, email),
      items (*)
    `);
  
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  res.json(data);
});

// Get all items
app.get('/items', async (req, res) => {
  const { data, error } = await supabase
    .from('items')
    .select(`
      *,
      orders (
        id, 
        status,
        customer_id,
        customers (id, name, email)
      )
    `);
  
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  res.json(data);
});

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Supabase Data Viewer running on port ${PORT}`);
});