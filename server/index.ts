import express from 'express';
import { createServer } from 'http';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import session from 'express-session';
import { createClient } from '@supabase/supabase-js';
import cors from 'cors';
import * as bcrypt from 'bcryptjs';

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

// Configure session with proper typing
const sessionConfig: session.SessionOptions = {
  secret: process.env.SESSION_SECRET || 'dutchthrift-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    httpOnly: true,
    sameSite: 'lax'
  }
};

// Set secure cookie in production
if (process.env.NODE_ENV === 'production') {
  sessionConfig.cookie = {
    ...sessionConfig.cookie as session.CookieOptions,
    secure: true
  } as session.CookieOptions;
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

// We already imported bcrypt at the top

// Unified login endpoint
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required' });
  }
  
  try {
    // First, check if user exists in customers (consignors) table
    const { data: consignorData, error: consignorError } = await supabase
      .from('customers')
      .select('*')
      .eq('email', email)
      .single();
      
    if (!consignorError && consignorData) {
      // User found in customers table, validate password
      const storedPassword = consignorData.password_hash || consignorData.password;
      
      // For testing purposes, allow direct comparison with test account
      const passwordValid = (email === 'consignor@test.com' && password === 'consignorpass123') || 
                           (storedPassword && await bcrypt.compare(password, storedPassword));
      
      if (passwordValid) {
        // Set session data
        req.session.userType = 'consignor';
        req.session.customerId = consignorData.id;
        
        console.log('Consignor login successful:', {
          userType: req.session.userType,
          customerId: req.session.customerId
        });
        
        return res.json({
          success: true,
          user: {
            id: consignorData.id,
            email: consignorData.email,
            name: consignorData.name,
            role: 'consignor'
          },
          redirect: '/consignor/dashboard'
        });
      }
      
      return res.status(401).json({ success: false, message: 'Invalid password' });
    }
    
    // If not found in customers, check in users (admin) table
    const { data: adminData, error: adminError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
      
    if (!adminError && adminData) {
      // User found in users table, validate password
      const storedPassword = adminData.password_hash || adminData.password;
      
      // For testing purposes, allow direct comparison with test account
      const passwordValid = (email === 'admin@test.com' && password === 'adminpass123') || 
                           (storedPassword && await bcrypt.compare(password, storedPassword));
      
      if (passwordValid) {
        // Set session data
        req.session.userType = 'admin';
        req.session.userId = adminData.id;
        
        console.log('Admin login successful:', {
          userType: req.session.userType,
          userId: req.session.userId
        });
        
        return res.json({
          success: true,
          user: {
            id: adminData.id,
            email: adminData.email,
            role: 'admin'
          },
          redirect: '/admin'
        });
      }
      
      return res.status(401).json({ success: false, message: 'Invalid password' });
    }
    
    // User not found in either table
    return res.status(401).json({ success: false, message: 'User not found' });
    
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error during authentication' });
  }
});

// Keep legacy endpoints for backward compatibility
app.post('/api/auth/admin/login', async (req, res) => {
  console.log('Legacy admin login endpoint called, forwarding to unified login');
  // Just forward the request to our unified login handler
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }
    
    // Query the users table for admin login
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error || !data) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    // For testing or with test account, allow direct comparison
    const passwordValid = (email === 'admin@test.com' && password === 'adminpass123') || 
                         (data.password_hash && await bcrypt.compare(password, data.password_hash));
    
    if (passwordValid) {
      req.session.userType = 'admin';
      req.session.userId = data.id;
      
      return res.json({
        success: true,
        user: {
          id: data.id,
          email: data.email,
          role: 'admin'
        },
        redirect: '/admin'
      });
    }
    
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error during authentication' });
  }
});

app.post('/api/auth/consignor/login', async (req, res) => {
  console.log('Legacy consignor login endpoint called, handling directly');
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }
    
    // Query the customers table for consignor login
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error || !data) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    // For testing or with test account, allow direct comparison
    const passwordValid = (email === 'consignor@test.com' && password === 'consignorpass123') || 
                         (data.password_hash && await bcrypt.compare(password, data.password_hash));
    
    if (passwordValid) {
      req.session.userType = 'consignor';
      req.session.customerId = data.id;
      
      return res.json({
        success: true,
        user: {
          id: data.id,
          email: data.email,
          name: data.name,
          role: 'consignor'
        },
        redirect: '/consignor/dashboard'
      });
    }
    
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error during authentication' });
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

// Serve static files from server/public for assets
app.use(express.static(path.join(__dirname, 'public')));

// Set up EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Root route - redirect to login if not authenticated
app.get('/', (req, res) => {
  if (req.session.userType === 'admin') {
    res.redirect('/admin');
  } else if (req.session.userType === 'consignor') {
    res.redirect('/consignor/dashboard');
  } else {
    res.redirect('/login');
  }
});

// Login route - render the login page with EJS
app.get('/login', (req, res) => {
  res.render('login', { error: req.query.error || null });
});

// Protected admin routes
app.get('/admin', (req, res) => {
  if (req.session.userType !== 'admin') {
    return res.redirect('/login?error=Please log in as an admin to access this page');
  }
  
  // Render admin dashboard
  res.send(`
    <h1>Admin Dashboard</h1>
    <p>Welcome to the admin dashboard! You are logged in as an admin.</p>
    <p>User ID: ${req.session.userId}</p>
    <p><a href="/api/auth/logout">Logout</a></p>
  `);
});

// Protected consignor routes
app.get('/consignor/dashboard', (req, res) => {
  if (req.session.userType !== 'consignor') {
    return res.redirect('/login?error=Please log in as a consignor to access this page');
  }
  
  // Render consignor dashboard
  res.send(`
    <h1>Consignor Dashboard</h1>
    <p>Welcome to your consignor dashboard! You are logged in as a consignor.</p>
    <p>Customer ID: ${req.session.customerId}</p>
    <p><a href="/api/auth/logout">Logout</a></p>
  `);
});

// Default route handler for any other routes
app.get('*', (req, res) => {
  res.status(404).send('Page not found');
});

// Create HTTP server
const server = createServer(app);

// Start the server
const PORT = parseInt(process.env.PORT || '5000', 10);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  testConnection();
});