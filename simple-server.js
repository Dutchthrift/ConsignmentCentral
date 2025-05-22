import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import cors from 'cors';
import session from 'express-session';

// Load environment variables
dotenv.config();

// Initialize Express
const app = express();

// Enable CORS
app.use(cors());

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware
app.use(session({
  secret: 'dutchthrift-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials - please check your environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Home page
app.get('/', (req, res) => {
  res.send('Dutch Thrift API is running');
});

// Get all customers
app.get('/api/customers', async (req, res) => {
  const { data, error } = await supabase.from('customers').select('*');
  
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  
  const sanitizedData = data.map(({ password_hash, ...rest }) => rest);
  res.json(sanitizedData);
});

// Get all orders
app.get('/api/orders', async (req, res) => {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      customers (id, name, email)
    `);
  
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  
  res.json(data);
});

// Get orders with items
app.get('/api/orders-with-items', async (req, res) => {
  try {
    // Get all orders
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        *,
        customers (id, name, email)
      `);
    
    if (ordersError) {
      return res.status(500).json({ error: ordersError.message });
    }
    
    // For each order, get items
    for (const order of orders) {
      const { data: items, error: itemsError } = await supabase
        .from('items')
        .select('*')
        .eq('order_id', order.id);
      
      if (itemsError) {
        console.error('Error fetching items for order', order.id, itemsError);
      }
      
      order.items = items || [];
    }
    
    res.json(orders);
    
  } catch (error) {
    console.error('Error fetching orders with items:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all items
app.get('/api/items', async (req, res) => {
  const { data, error } = await supabase
    .from('items')
    .select(`
      *,
      orders (
        id,
        status,
        customers (id, name, email)
      )
    `);
  
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  
  res.json(data);
});

// Get admin stats
app.get('/api/admin/stats', async (req, res) => {
  try {
    // Get counts from all tables
    const [
      { count: customerCount } = { count: 0 },
      { count: orderCount } = { count: 0 },
      { count: itemCount } = { count: 0 },
    ] = await Promise.all([
      supabase.from('customers').select('*', { count: 'exact', head: true }),
      supabase.from('orders').select('*', { count: 'exact', head: true }),
      supabase.from('items').select('*', { count: 'exact', head: true }),
    ]);
    
    // Get recent orders
    const { data: recentOrders } = await supabase
      .from('orders')
      .select(`
        *,
        customers (id, name, email)
      `)
      .order('created_at', { ascending: false })
      .limit(5);
    
    // Calculate total values
    const { data: items } = await supabase
      .from('items')
      .select('estimated_value, payout_value');
    
    const totalItemValue = items?.reduce((sum, item) => sum + Number(item.estimated_value || 0), 0) || 0;
    const totalPayoutValue = items?.reduce((sum, item) => sum + Number(item.payout_value || 0), 0) || 0;
    
    res.json({
      consignorCount: customerCount,
      orderCount,
      itemCount,
      totalItemValue: totalItemValue.toFixed(2),
      totalPayoutValue: totalPayoutValue.toFixed(2),
      recentOrders,
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Auth endpoints simplified for demo
app.post('/api/auth/admin/login', (req, res) => {
  const { email, password } = req.body;
  
  // Simplified admin login for demo
  if (email === 'admin@test.com' && password === 'adminpass123') {
    req.session.userType = 'admin';
    req.session.userId = '1';
    
    return res.json({
      success: true,
      user: {
        id: 1,
        email: 'admin@test.com',
        role: 'admin'
      }
    });
  }
  
  res.status(401).json({ success: false, message: 'Invalid credentials' });
});

app.post('/api/auth/consignor/login', async (req, res) => {
  const { email, password } = req.body;
  
  // Simplified consignor login for demo
  if (email === 'consignor@test.com' && password === 'consignorpass123') {
    // Get the actual consignor ID from the database
    const { data: consignor } = await supabase
      .from('customers')
      .select('id, name')
      .eq('email', 'consignor@test.com')
      .single();
    
    if (consignor) {
      req.session.userType = 'consignor';
      req.session.customerId = consignor.id;
      
      return res.json({
        success: true,
        user: {
          id: consignor.id,
          email: 'consignor@test.com',
          name: consignor.name,
          role: 'consignor'
        }
      });
    }
  }
  
  res.status(401).json({ success: false, message: 'Invalid credentials' });
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Logout failed' });
    }
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

app.get('/api/auth/me', (req, res) => {
  if (!req.session.userId && !req.session.customerId) {
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }
  
  if (req.session.userType === 'admin') {
    return res.json({
      id: req.session.userId,
      email: 'admin@test.com',
      role: 'admin'
    });
  } else if (req.session.userType === 'consignor') {
    return res.json({
      id: req.session.customerId,
      email: 'consignor@test.com',
      role: 'consignor'
    });
  }
  
  res.status(401).json({ success: false, message: 'Invalid session' });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  
  // Test Supabase connection
  supabase
    .from('customers')
    .select('count')
    .then(result => {
      if (result.error) {
        console.error('Supabase connection error:', result.error);
      } else {
        console.log('Supabase connection successful');
      }
    });
});