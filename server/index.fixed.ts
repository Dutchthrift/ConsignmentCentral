import express from 'express';
import { createServer } from 'http';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import session from 'express-session';
import { createClient } from '@supabase/supabase-js';
import cors from 'cors';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Use JSON middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Validate Supabase credentials
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Please set SUPABASE_URL and SUPABASE_KEY in your .env file');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Configure session
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'dutchthrift-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    httpOnly: true,
    sameSite: 'lax' as 'lax'
  }
};

// Set secure cookie in production
if (process.env.NODE_ENV === 'production') {
  sessionConfig.cookie = {
    ...sessionConfig.cookie,
    secure: true
  };
}

// Use session middleware
app.use(session(sessionConfig));

// Log session info for debugging
app.use((req, res, next) => {
  // Debug session in development
  if (process.env.NODE_ENV !== 'production') {
    const sessionInfo = {
      hasSession: !!req.session,
      userType: req.session?.userType,
      userId: req.session?.userId,
      customerId: req.session?.customerId
    };
    
    console.log('Session in middleware:', sessionInfo);
  }
  next();
});

// Setup routes
console.log('Setting up Supabase-powered Dutch Thrift backend...');

// Auth routes
app.post('/api/auth/admin/login', async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required' });
  }
  
  try {
    // Query the users table for admin login
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error || !data) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    // For demo purposes, simplified password check
    // In production, you'd use proper bcrypt comparison
    if (email === 'admin@test.com' && password === 'adminpass123') {
      req.session.userType = 'admin';
      req.session.userId = data.id;
      
      return res.json({
        success: true,
        user: {
          id: data.id,
          email: data.email,
          role: 'admin'
        }
      });
    }
    
    res.status(401).json({ success: false, message: 'Invalid credentials' });
    
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.post('/api/auth/consignor/login', async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required' });
  }
  
  try {
    // Query the customers table for consignor login
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error || !data) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    // For demo purposes, simplified password check
    // In production, you'd use proper bcrypt comparison
    if (email === 'consignor@test.com' && password === 'consignorpass123') {
      req.session.userType = 'consignor';
      req.session.customerId = data.id;
      
      return res.json({
        success: true,
        user: {
          id: data.id,
          email: data.email,
          name: data.name,
          role: 'consignor'
        }
      });
    }
    
    res.status(401).json({ success: false, message: 'Invalid credentials' });
    
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
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

// Admin routes
app.get('/api/admin/stats', async (req, res) => {
  // Check if user is authenticated as admin
  if (req.session.userType !== 'admin') {
    return res.status(403).json({ success: false, message: 'Unauthorized' });
  }

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
      success: true,
      stats: {
        consignorCount: customerCount,
        orderCount,
        itemCount,
        totalItemValue: totalItemValue.toFixed(2),
        totalPayoutValue: totalPayoutValue.toFixed(2),
        recentOrders,
      }
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.get('/api/admin/orders', async (req, res) => {
  // Check if user is authenticated as admin
  if (req.session.userType !== 'admin') {
    return res.status(403).json({ success: false, message: 'Unauthorized' });
  }

  try {
    // Get all orders with customer info
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        customers (id, name, email)
      `)
      .order('created_at', { ascending: false });
    
    if (error) {
      throw error;
    }
    
    // For each order, get its items
    const ordersWithItems = await Promise.all(data.map(async (order) => {
      const { data: items } = await supabase
        .from('items')
        .select('*')
        .eq('order_id', order.id);
      
      return {
        ...order,
        items: items || []
      };
    }));
    
    res.json({ success: true, orders: ordersWithItems });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Consignor routes
app.get('/api/consignor/orders', async (req, res) => {
  // Check if user is authenticated as consignor
  if (req.session.userType !== 'consignor') {
    return res.status(403).json({ success: false, message: 'Unauthorized' });
  }

  try {
    // Get all orders for this consignor
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('customer_id', req.session.customerId)
      .order('created_at', { ascending: false });
    
    if (error) {
      throw error;
    }
    
    // For each order, get its items
    const ordersWithItems = await Promise.all(data.map(async (order) => {
      const { data: items } = await supabase
        .from('items')
        .select('*')
        .eq('order_id', order.id);
      
      return {
        ...order,
        items: items || []
      };
    }));
    
    res.json({ success: true, orders: ordersWithItems });
  } catch (error) {
    console.error('Error fetching consignor orders:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.get('/api/consignor/profile', async (req, res) => {
  // Check if user is authenticated as consignor
  if (req.session.userType !== 'consignor') {
    return res.status(403).json({ success: false, message: 'Unauthorized' });
  }

  try {
    // Get consignor profile
    const { data, error } = await supabase
      .from('customers')
      .select('id, name, email, created_at')
      .eq('id', req.session.customerId)
      .single();
    
    if (error) {
      throw error;
    }
    
    res.json({ success: true, profile: data });
  } catch (error) {
    console.error('Error fetching consignor profile:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Legacy routes for backward compatibility
app.get('/api/orders-direct', (req, res) => {
  res.status(200).json([]);
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Dutch Thrift API is running with Supabase integration' 
  });
});

// Test database connection
async function testConnection() {
  try {
    const { data, error } = await supabase.from('users').select('*').limit(1);
    
    if (error) {
      console.error('Database connection error:', error.message);
    } else {
      console.log('Database connection test successful');
    }
  } catch (error) {
    console.error('Unexpected error testing database connection:', error);
  }
}

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  
  // Handle client-side routing
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

// Create HTTP server
const server = createServer(app);

// Start the server
const PORT = process.env.PORT || 5000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  testConnection();
});