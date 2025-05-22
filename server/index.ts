import express from 'express';
import { createServer } from 'http';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import session from 'express-session';
import { createClient } from '@supabase/supabase-js';
import { Pool } from 'pg';

// Import routes
import * as fs from 'fs';
const supabaseAuthRoutes = fs.existsSync('./server/routes/auth/supabase-auth.routes.js') 
  ? await import('./routes/auth/supabase-auth.routes.js').then(m => m.default || m)
  : express.Router();
  
const supabaseAdminRoutes = fs.existsSync('./server/routes/admin/supabase-admin.routes.js')
  ? await import('./routes/admin/supabase-admin.routes.js').then(m => m.default || m)
  : express.Router();
  
const supabaseConsignorRoutes = fs.existsSync('./server/routes/consignor/supabase-consignor.routes.js')
  ? await import('./routes/consignor/supabase-consignor.routes.js').then(m => m.default || m)
  : express.Router();

// Load environment variables
dotenv.config();

// Validate Supabase credentials
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Please set SUPABASE_URL and SUPABASE_KEY in your .env file');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Setup Express app
const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Use JSON middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
  sessionConfig.cookie.secure = true;
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

// Setup authentication routes
app.use('/api/auth', supabaseAuthRoutes);

// Setup admin routes
app.use('/api/admin', supabaseAdminRoutes);

// Setup consignor routes
app.use('/api/consignor', supabaseConsignorRoutes);

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