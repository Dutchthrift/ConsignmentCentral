import express from 'express';
import { registerRoutes } from './routes.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

// Setup Express app
const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Setup routes with authentication
const server = registerRoutes(app);

// Serve static files from client/dist in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  
  // Handle client-side routing
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

// Start the server
const PORT = process.env.PORT || 3000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});