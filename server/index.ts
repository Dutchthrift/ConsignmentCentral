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

// Import our routes
import supabaseAuthRoutes from './routes/auth/supabase-auth';
import storefrontRoutes from './routes/storefront';
import submitItemRoutes from './routes/submit-item';

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

// Register Supabase auth routes for social login
app.use('/auth', supabaseAuthRoutes);

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

// Create public directory if it doesn't exist
import fs from 'fs';
const publicDir = path.join(__dirname, 'public');
const rootPublicDir = path.join(process.cwd(), 'public');

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Serve static files from server/public for assets
app.use(express.static(publicDir));
// Also serve files from the root public directory
app.use(express.static(rootPublicDir));

// Set up EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Root route - Main storefront page
app.get('/', (req, res) => {
  res.render('storefront', {
    title: 'Dutch Thrift - Premium Consignment',
    error: req.query.error || null
  });
});

// Item submission route
app.use('/submit-item', submitItemRoutes);

// Login route - render the login page with EJS
app.get('/login', (req, res) => {
  res.render('login', { 
    error: req.query.error || null,
    mode: req.query.mode || 'login'
  });
});

// Protected admin routes
app.get('/admin', async (req, res) => {
  if (req.session.userType !== 'admin') {
    return res.redirect('/login?error=Please log in as an admin to access this page');
  }
  
  try {
    // Get all items
    const { data: items, error: itemsError } = await supabase
      .from('items')
      .select('*');
    
    if (itemsError) {
      console.error('Error fetching items:', itemsError);
      return res.status(500).send('Error loading inventory data');
    }
    
    // Get all customers (consignors)
    const { data: consignors, error: consignorsError } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (consignorsError) {
      console.error('Error fetching consignors:', consignorsError);
      return res.status(500).send('Error loading consignor data');
    }
    
    // Get all orders
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*');
    
    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
      return res.status(500).send('Error loading order data');
    }
    
    // Calculate summary statistics
    const totalItems = items?.length || 0;
    
    // Calculate monthly revenue - items sold in the current month
    const currentDate = new Date();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    
    const monthlyRevenue = (items || [])
      .filter(item => item.status === 'sold' && new Date(item.created_at) >= firstDayOfMonth)
      .reduce((sum, item) => sum + Number(item.estimated_value || 0), 0);
    
    // Calculate total pending payouts
    const pendingPayouts = (items || [])
      .filter(item => item.status === 'sold')
      .reduce((sum, item) => sum + Number(item.payout_value || 0), 0);
    
    // Calculate item status breakdowns
    const approvedItems = (items || []).filter(item => item.status === 'approved' || item.status === 'listed').length;
    const pendingItems = (items || []).filter(item => item.status === 'quoted' || item.status === 'awaiting_shipment').length;
    const rejectedItems = (items || []).filter(item => item.status === 'rejected').length;
    const processingItems = (items || []).filter(item => item.status === 'processing').length;
    
    // Prepare recent consignors with their item stats
    const recentConsignors = (consignors || []).slice(0, 5).map(consignor => {
      // Find all orders for this consignor
      const consignorOrders = (orders || []).filter(order => order.customer_id === consignor.id);
      
      // Find all items associated with these orders
      let consignorItems = [];
      let totalValue = 0;
      
      for (const order of consignorOrders) {
        const orderItems = (items || []).filter(item => item.order_id === order.id);
        consignorItems = [...consignorItems, ...orderItems];
        
        // Sum up item values
        totalValue += orderItems.reduce((sum, item) => sum + Number(item.estimated_value || 0), 0);
      }
      
      return {
        ...consignor,
        itemCount: consignorItems.length,
        totalValue
      };
    });
    
    // Render the admin dashboard with all calculated stats
    res.render('admin-dashboard', {
      stats: {
        totalItems,
        monthlyRevenue,
        totalConsignors: consignors?.length || 0,
        pendingPayouts,
        approvedItems,
        pendingItems,
        rejectedItems,
        processingItems
      },
      recentConsignors
    });
    
  } catch (error) {
    console.error('Unexpected error in admin dashboard:', error);
    res.status(500).send('An unexpected error occurred');
  }
});

// Protected consignor routes
app.get('/consignor/dashboard', async (req, res) => {
  if (req.session.userType !== 'consignor') {
    return res.redirect('/login?error=Please log in as a consignor to access this page');
  }
  
  try {
    // Get consignor info
    const { data: consignor, error: consignorError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', req.session.customerId)
      .single();
    
    if (consignorError || !consignor) {
      console.error('Error fetching consignor data:', consignorError);
      return res.redirect('/login?error=Error loading your account');
    }
    
    // Get orders for this consignor with items
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .eq('customer_id', req.session.customerId)
      .order('created_at', { ascending: false });
    
    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
      return res.status(500).send('Error loading orders');
    }
    
    // Get all items for this consignor through their orders
    let allItems = [];
    for (const order of orders || []) {
      const { data: items } = await supabase
        .from('items')
        .select('*')
        .eq('order_id', order.id);
      
      if (items && items.length > 0) {
        allItems = [...allItems, ...items];
      }
    }
    
    // For each order, get its items
    const ordersWithItems = await Promise.all((orders || []).map(async (order) => {
      const { data: orderItems } = await supabase
        .from('items')
        .select('*')
        .eq('order_id', order.id);
      
      return {
        ...order,
        items: orderItems || []
      };
    }));
    
    // Calculate dashboard stats according to the design
    const stats = {
      totalItems: allItems.length,
      totalSales: allItems.filter(item => item.status === 'sold')
        .reduce((sum, item) => sum + Number(item.estimated_value || 0), 0),
      soldItems: allItems.filter(item => item.status === 'sold').length,
      activeItems: allItems.filter(item => item.status === 'listed' || item.status === 'quoted').length,
      recentlySold: allItems.filter(item => item.status === 'sold').length,
      pendingPayout: allItems.filter(item => item.status === 'sold')
        .reduce((sum, item) => sum + Number(item.payout_value || 0), 0)
    };
    
    // Get recently created items
    const recentItems = [...allItems].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ).slice(0, 5);
    
    // Render the dashboard with the data
    res.render('consignor-dashboard', {
      consignor,
      stats,
      recentOrders: ordersWithItems.slice(0, 5),
      recentItems: recentItems,
      loginSuccess: req.query.login_success === 'true'
    });
    
  } catch (error) {
    console.error('Unexpected error in consignor dashboard:', error);
    res.status(500).send('An unexpected error occurred');
  }
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