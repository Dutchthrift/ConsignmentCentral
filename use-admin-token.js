/**
 * Simple utility to use the admin token and direct to admin dashboard
 * Run this with: node use-admin-token.js
 */

import fs from 'fs';
import express from 'express';
import session from 'express-session';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create simple express app
const app = express();

// Configure session
app.use(session({
  secret: process.env.SESSION_SECRET || 'dutchthrift-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  }
}));

// Check if token exists
if (!fs.existsSync('admin-token.json')) {
  console.error('Admin token not found. Please run admin-direct-login.js first.');
  process.exit(1);
}

// Read token
const token = JSON.parse(fs.readFileSync('admin-token.json', 'utf8'));

// Set up route to login and redirect
app.get('/admin-login', (req, res) => {
  // Set session data
  req.session.userType = 'admin';
  req.session.userId = token.id;
  
  req.session.save((err) => {
    if (err) {
      console.error('Error saving session:', err);
      return res.send('Error logging in as admin');
    }
    
    // Redirect to admin dashboard
    res.redirect('/admin');
  });
});

// Start server
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Admin login server running at http://localhost:${PORT}/admin-login`);
  console.log('Open this URL in your browser to log in as admin');
});