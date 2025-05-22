import express from 'express';
import { createServer } from 'http';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import session from 'express-session';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config();

// Setup Express app
const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
console.log('Supabase client initialized');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set up session
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'dutchthrift-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    httpOnly: true,
    sameSite: 'lax'
  }
};

app.use(session(sessionConfig));

// Debug session info
app.use((req, res, next) => {
  const sessionInfo = {
    hasSession: !!req.session,
    userType: req.session?.userType,
    userId: req.session?.userId,
    customerId: req.session?.customerId
  };
  
  console.log('Session info:', sessionInfo);
  next();
});

// API Routes

// Authentication routes
app.post('/api/auth/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }
    
    // For demo admin login
    if (email === 'admin@test.com' && password === 'adminpass123') {
      const { data: admin } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();
      
      if (admin) {
        req.session.userId = admin.id;
        req.session.userType = 'admin';
        
        return res.status(200).json({
          success: true,
          data: {
            user: {
              id: admin.id,
              email: admin.email,
              role: 'admin'
            }
          }
        });
      }
    }
    
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

app.post('/api/auth/consignor/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }
    
    // For demo consignor login
    if (email === 'consignor@test.com' && password === 'consignorpass123') {
      const { data: consignor } = await supabase
        .from('customers')
        .select('*')
        .eq('email', email)
        .single();
      
      if (consignor) {
        req.session.customerId = consignor.id;
        req.session.userType = 'consignor';
        
        return res.status(200).json({
          success: true,
          data: {
            user: {
              id: consignor.id,
              email: consignor.email,
              name: consignor.name,
              role: 'consignor',
              customer: consignor
            }
          }
        });
      }
    }
    
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  } catch (error) {
    console.error('Consignor login error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Logout failed' });
    }
    res.status(200).json({ success: true, message: 'Logged out successfully' });
  });
});

app.get('/api/auth/me', async (req, res) => {
  console.log('GET /api/auth/me - Session:', req.session);
  
  if (!req.session || (!req.session.userId && !req.session.customerId)) {
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }
  
  try {
    if (req.session.userType === 'admin' && req.session.userId) {
      const { data: admin } = await supabase
        .from('users')
        .select('*')
        .eq('id', req.session.userId)
        .single();
      
      if (!admin) {
        return res.status(401).json({ success: false, message: 'User not found' });
      }
      
      const { password_hash, ...userData } = admin;
      return res.status(200).json({
        ...userData,
        role: 'admin'
      });
    } else if (req.session.userType === 'consignor' && req.session.customerId) {
      const { data: consignor } = await supabase
        .from('customers')
        .select('*')
        .eq('id', req.session.customerId)
        .single();
      
      if (!consignor) {
        return res.status(401).json({ success: false, message: 'User not found' });
      }
      
      const { password_hash, ...userData } = consignor;
      return res.status(200).json({
        ...userData,
        role: 'consignor',
        customer: userData
      });
    }
    
    return res.status(401).json({ success: false, message: 'Invalid session' });
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Admin routes
app.get('/api/admin/stats', async (req, res) => {
  try {
    // Get counts
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
    
    // Calculate totals
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
    res.status(500).json({ success: false, message: 'Failed to fetch stats' });
  }
});

app.get('/api/admin/items', async (req, res) => {
  try {
    const { data: items } = await supabase
      .from('items')
      .select(`
        *,
        orders (
          id,
          customer_id,
          status,
          customers (
            id,
            name,
            email
          )
        )
      `)
      .order('created_at', { ascending: false });
    
    res.json(items || []);
  } catch (error) {
    console.error('Error fetching admin items:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch items' });
  }
});

// Consignor routes
app.get('/api/consignor/dashboard', async (req, res) => {
  try {
    // For demo, return data for all consignors
    const customerId = req.session.customerId;
    
    // Get all orders
    const { data: orders } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    
    // Get items for these orders
    const { data: items } = await supabase
      .from('items')
      .select('*');
    
    // Calculate stats
    const itemsByStatus = items?.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {}) || {};
    
    const totalEstimatedValue = items?.reduce((sum, item) => sum + Number(item.estimated_value || 0), 0) || 0;
    const totalPayoutValue = items?.reduce((sum, item) => sum + Number(item.payout_value || 0), 0) || 0;
    
    // Get consignor data
    const { data: consignorData } = await supabase
      .from('customers')
      .select('*')
      .limit(1)
      .single();
    
    const consignor = consignorData ? {
      id: consignorData.id,
      name: consignorData.name,
      email: consignorData.email
    } : null;
    
    res.json({
      consignor,
      stats: {
        totalOrders: orders?.length || 0,
        totalItems: items?.length || 0,
        itemsByStatus,
        totalEstimatedValue: totalEstimatedValue.toFixed(2),
        totalPayoutValue: totalPayoutValue.toFixed(2),
      },
      recentOrders: orders?.slice(0, 5) || [],
    });
  } catch (error) {
    console.error('Error fetching consignor dashboard:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard data' });
  }
});

app.get('/api/consignor/items', async (req, res) => {
  try {
    const { data: items } = await supabase
      .from('items')
      .select(`
        *,
        orders (
          id,
          status,
          created_at
        )
      `)
      .order('created_at', { ascending: false });
    
    res.json(items || []);
  } catch (error) {
    console.error('Error fetching consignor items:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch items' });
  }
});

// Legacy route for backward compatibility
app.get('/api/orders-direct', async (req, res) => {
  try {
    const { data } = await supabase
      .from('orders')
      .select(`
        *,
        customers (id, name, email),
        items (*)
      `)
      .order('created_at', { ascending: false });
    
    res.json(data || []);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.json([]);
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Dutch Thrift API is running with Supabase integration' 
  });
});

// Serve static files from client/dist in production
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
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  
  // Test Supabase connection
  supabase
    .from('users')
    .select('*')
    .limit(1)
    .then(({ data, error }) => {
      if (error) {
        console.error('Supabase connection error:', error);
      } else {
        console.log('Supabase connection successful');
      }
    });
});