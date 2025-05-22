import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Please set SUPABASE_URL and SUPABASE_KEY in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const app = express();

// Enable CORS
app.use(cors());

// Allow JSON requests
app.use(express.json());

// Dashboard data viewer
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Dutch Thrift Data Viewer</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; max-width: 1200px; margin: 0 auto; }
        h1, h2, h3 { color: #2c3e50; }
        .container { display: flex; flex-wrap: wrap; gap: 20px; }
        .card { background: #f8f9fa; border-radius: 8px; padding: 20px; flex: 1; min-width: 300px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
        pre { background: #f1f1f1; padding: 10px; border-radius: 4px; overflow: auto; max-height: 400px; }
        button { background: #4CAF50; color: white; border: none; padding: 10px 15px; border-radius: 4px; cursor: pointer; margin-right: 10px; }
        button:hover { background: #45a049; }
        .status { margin-bottom: 20px; padding: 10px; border-radius: 4px; }
        .success { background: #d4edda; color: #155724; }
        .error { background: #f8d7da; color: #721c24; }
      </style>
    </head>
    <body>
      <h1>Dutch Thrift Data Viewer</h1>
      <p>View your Supabase data directly.</p>
      
      <div class="status" id="status"></div>
      
      <div class="actions" style="margin-bottom: 20px;">
        <button onclick="loadAllData()">Load All Data</button>
        <button onclick="loadCustomers()">Load Customers</button>
        <button onclick="loadOrders()">Load Orders</button>
        <button onclick="loadItems()">Load Items</button>
      </div>
      
      <div class="container">
        <div class="card">
          <h2>Customers</h2>
          <pre id="customers">Click "Load Customers" to view data</pre>
        </div>
        
        <div class="card">
          <h2>Orders</h2>
          <pre id="orders">Click "Load Orders" to view data</pre>
        </div>
        
        <div class="card">
          <h2>Items</h2>
          <pre id="items">Click "Load Items" to view data</pre>
        </div>
      </div>
      
      <script>
        function setStatus(message, type = 'success') {
          const statusEl = document.getElementById('status');
          statusEl.textContent = message;
          statusEl.className = 'status ' + type;
        }
        
        function loadCustomers() {
          setStatus('Loading customers...');
          fetch('/customers')
            .then(response => response.json())
            .then(data => {
              document.getElementById('customers').textContent = JSON.stringify(data, null, 2);
              setStatus('Customers loaded successfully!');
            })
            .catch(error => {
              setStatus('Error loading customers: ' + error.message, 'error');
            });
        }
        
        function loadOrders() {
          setStatus('Loading orders...');
          fetch('/orders')
            .then(response => response.json())
            .then(data => {
              document.getElementById('orders').textContent = JSON.stringify(data, null, 2);
              setStatus('Orders loaded successfully!');
            })
            .catch(error => {
              setStatus('Error loading orders: ' + error.message, 'error');
            });
        }
        
        function loadItems() {
          setStatus('Loading items...');
          fetch('/items')
            .then(response => response.json())
            .then(data => {
              document.getElementById('items').textContent = JSON.stringify(data, null, 2);
              setStatus('Items loaded successfully!');
            })
            .catch(error => {
              setStatus('Error loading items: ' + error.message, 'error');
            });
        }
        
        function loadAllData() {
          loadCustomers();
          loadOrders();
          loadItems();
        }
      </script>
    </body>
    </html>
  `);
});

// Get customers (consignors)
app.get('/customers', async (req, res) => {
  try {
    const { data, error } = await supabase.from('customers').select('*');
    
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    
    // Remove password hashes for security
    const sanitizedData = data.map(({ password_hash, ...rest }) => rest);
    res.json(sanitizedData);
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all orders with customers and items
app.get('/orders', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id,
        customer_id,
        total_estimated_value,
        total_payout_value,
        status,
        shipping_label_url,
        created_at,
        customers (id, name, email)
      `)
      .order('created_at', { ascending: false });
    
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    
    // For each order, get its items
    for (const order of data) {
      const { data: items } = await supabase
        .from('items')
        .select('*')
        .eq('order_id', order.id);
      
      order.items = items || [];
    }
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all items with their orders
app.get('/items', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('items')
      .select(`
        id,
        order_id,
        title,
        image_urls,
        estimated_value,
        payout_value,
        commission_rate,
        status,
        created_at,
        orders (
          id, 
          status,
          customer_id,
          customers (id, name, email)
        )
      `)
      .order('created_at', { ascending: false });
    
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start the server
const PORT = 3333;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Data Viewer running on port ${PORT}. Open http://localhost:${PORT} in your browser.`);
});