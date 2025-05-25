import express from 'express';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Demo storefront route
router.get('/demo', (req, res) => {
  // Send the demo HTML page
  const demoPath = path.join(process.cwd(), 'public', 'storefront-demo.html');
  
  if (fs.existsSync(demoPath)) {
    res.sendFile(demoPath);
  } else {
    res.status(404).send('Demo page not found');
  }
});

// Main storefront landing page
router.get('/', (req, res) => {
  res.render('storefront', { title: 'Dutch Thrift - Premium Consignment' });
});

// Item submission page
router.get('/submit-item', (req, res) => {
  res.render('submit-item', { title: 'Upload je item - Dutch Thrift' });
});

// Proposal review page
router.get('/proposal/:id', (req, res) => {
  res.render('proposal', { 
    title: 'Bekijk ons voorstel - Dutch Thrift',
    proposalId: req.params.id
  });
});

export default router;