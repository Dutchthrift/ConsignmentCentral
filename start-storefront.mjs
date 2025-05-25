// Import required dependencies
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import bodyParser from 'body-parser';
import session from 'express-session';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Get current directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const port = process.env.PORT || 3000; // Gebruik de Replit PORT variabele

// Configure Express middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Configure session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'dutch-thrift-secret',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'public/uploads';
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: function (req, file, cb) {
    // Accept images only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
});

// Utility functions
function generateReferenceId() {
  return 'DT' + Date.now().toString().slice(-6) + Math.floor(Math.random() * 1000);
}

function calculateCommission(salePrice) {
  const commissionRate = 0.3; // 30% commission
  const commissionAmount = salePrice * commissionRate;
  const payoutAmount = salePrice - commissionAmount;
  
  return {
    commissionRate: commissionRate * 100, // as percentage
    commissionAmount,
    payoutAmount
  };
}

// API mock function for eBay price estimation
async function mockEbayPriceEstimation(item) {
  // In a real implementation, this would call the eBay API
  // For now, we'll generate a mock price based on the item
  const basePrice = Math.floor(Math.random() * 50) + 30; // €30 - €80
  let multiplier = 1;
  
  // Adjust price based on brand recognition
  if (item.brand && ['nike', 'adidas', 'zara', 'h&m'].includes(item.brand.toLowerCase())) {
    multiplier += 0.5;
  }
  
  // Adjust price based on condition
  if (item.condition === 'new') {
    multiplier += 0.7;
  } else if (item.condition === 'like new') {
    multiplier += 0.5;
  } else if (item.condition === 'good') {
    multiplier += 0.3;
  }
  
  const estimatedPrice = Math.round(basePrice * multiplier);
  return estimatedPrice;
}

// Routes

// Landing page
app.get('/', (req, res) => {
  res.render('index', {
    title: 'Dutch Thrift - Premium Consignment',
    user: req.session.user || null
  });
});

// Login page
app.get('/login', (req, res) => {
  const mode = req.query.mode || 'login';
  res.render('login', {
    title: mode === 'register' ? 'Registreren' : 'Inloggen',
    mode,
    error: null
  });
});

// Handle login
app.post('/login', async (req, res) => {
  const { email, password, name, mode } = req.body;
  
  try {
    if (mode === 'register') {
      // Register new user
      const { data: userData, error: registerError } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (registerError) throw new Error(registerError.message);
      
      // Create customer/consignor record
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .insert([
          { 
            name: name || email.split('@')[0],
            email: email.toLowerCase(),
            role: 'consignor',
            created_at: new Date().toISOString()
          }
        ])
        .select()
        .single();
      
      if (customerError) throw new Error(customerError.message);
      
      // Set session
      req.session.user = {
        id: customerData.id,
        email: customerData.email,
        name: customerData.name,
        role: 'consignor'
      };
      
      return res.redirect('/consignor/dashboard');
    } else {
      // Login
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (signInError) throw new Error(signInError.message);
      
      // Get customer data
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('email', email.toLowerCase())
        .single();
      
      if (customerError) throw new Error(customerError.message);
      
      // Set session
      req.session.user = {
        id: customerData.id,
        email: customerData.email,
        name: customerData.name,
        role: 'consignor'
      };
      
      return res.redirect('/consignor/dashboard');
    }
  } catch (error) {
    console.error('Authentication error:', error);
    return res.render('login', {
      title: mode === 'register' ? 'Registreren' : 'Inloggen',
      mode,
      error: error.message
    });
  }
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    res.redirect('/');
  });
});

// Storefront item submission page
app.get('/storefront/submit-item', (req, res) => {
  res.render('submit-item', {
    title: 'Item aanmelden',
    user: req.session.user || null
  });
});

// Handle item submission and AI analysis
app.post('/storefront/submit-item', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).render('submit-item', {
        title: 'Item aanmelden',
        error: 'Een afbeelding is verplicht',
        user: req.session.user || null
      });
    }
    
    const { title } = req.body;
    const imagePath = `/uploads/${req.file.filename}`;
    const fullImagePath = path.join(__dirname, 'public', imagePath);
    
    // Convert image to base64 for OpenAI API
    const imageBuffer = fs.readFileSync(fullImagePath);
    const base64Image = imageBuffer.toString('base64');
    
    // Analyze image with GPT-4 Vision
    const response = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyseer dit kledingstuk en geef de volgende details: producttype, merk (indien herkenbaar), kleur, conditie, en geschatte waarde in EUR. Geef je antwoord in JSON-formaat."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      max_tokens: 500
    });
    
    // Parse AI analysis
    const aiResponse = response.choices[0].message.content;
    let analysisResult;
    
    try {
      analysisResult = JSON.parse(aiResponse);
    } catch (e) {
      // If JSON parsing fails, use regex to extract key information
      analysisResult = {
        productType: aiResponse.match(/producttype:?\s*([^,\n]+)/i)?.[1]?.trim() || 'Onbekend',
        brand: aiResponse.match(/merk:?\s*([^,\n]+)/i)?.[1]?.trim() || 'Onbekend',
        color: aiResponse.match(/kleur:?\s*([^,\n]+)/i)?.[1]?.trim() || 'Onbekend',
        condition: aiResponse.match(/conditie:?\s*([^,\n]+)/i)?.[1]?.trim() || 'Gebruikt'
      };
    }
    
    // Get price estimation
    const estimatedPrice = await mockEbayPriceEstimation(analysisResult);
    const { commissionRate, commissionAmount, payoutAmount } = calculateCommission(estimatedPrice);
    
    // Create item record in session
    req.session.pendingItem = {
      title: title || analysisResult.productType || 'Onbekend item',
      image: imagePath,
      analysis: analysisResult,
      estimatedPrice,
      commissionRate,
      commissionAmount,
      payoutAmount,
      referenceId: generateReferenceId()
    };
    
    // Redirect to proposal page
    res.redirect('/storefront/proposal');
    
  } catch (error) {
    console.error('Item submission error:', error);
    res.status(500).render('submit-item', {
      title: 'Item aanmelden',
      error: 'Er is een fout opgetreden bij het analyseren van je item. Probeer het later opnieuw.',
      user: req.session.user || null
    });
  }
});

// Proposal page
app.get('/storefront/proposal', (req, res) => {
  if (!req.session.pendingItem) {
    return res.redirect('/storefront/submit-item');
  }
  
  res.render('proposal', {
    title: 'Ons voorstel',
    item: req.session.pendingItem,
    user: req.session.user || null
  });
});

// Handle proposal response
app.post('/storefront/proposal', async (req, res) => {
  const { decision } = req.body;
  
  if (!req.session.pendingItem) {
    return res.redirect('/storefront/submit-item');
  }
  
  if (decision === 'reject') {
    // Clear the pending item from session
    req.session.pendingItem = null;
    return res.render('thank-you', {
      title: 'Bedankt',
      message: 'We begrijpen je beslissing. Je kunt altijd terugkomen als je van gedachten verandert.',
      user: req.session.user || null
    });
  }
  
  try {
    // Check if user is logged in
    if (!req.session.user) {
      // Store the fact that there's a pending item for after login
      req.session.hasUnfinishedSubmission = true;
      return res.redirect('/login?mode=register');
    }
    
    const item = req.session.pendingItem;
    const userId = req.session.user.id;
    
    // Create order
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert([
        {
          customer_id: userId,
          status: 'awaiting_shipment',
          total_value: item.estimatedPrice * 100, // Store in cents
          total_payout: item.payoutAmount * 100, // Store in cents
          submission_date: new Date().toISOString()
        }
      ])
      .select()
      .single();
    
    if (orderError) throw new Error(orderError.message);
    
    // Create item record
    const { data: itemData, error: itemError } = await supabase
      .from('items')
      .insert([
        {
          customer_id: userId,
          title: item.title,
          reference_id: item.referenceId,
          image_url: item.image,
          status: 'pending',
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();
    
    if (itemError) throw new Error(itemError.message);
    
    // Create order-item relation
    const { error: relationError } = await supabase
      .from('order_items')
      .insert([
        {
          order_id: orderData.id,
          item_id: itemData.id
        }
      ]);
    
    if (relationError) throw new Error(relationError.message);
    
    // Create pricing record
    const { error: pricingError } = await supabase
      .from('pricing')
      .insert([
        {
          item_id: itemData.id,
          estimated_value: item.estimatedPrice * 100, // Store in cents
          commission_rate: item.commissionRate,
          commission_amount: item.commissionAmount * 100, // Store in cents
          payout_amount: item.payoutAmount * 100, // Store in cents
          created_at: new Date().toISOString()
        }
      ]);
    
    if (pricingError) throw new Error(pricingError.message);
    
    // Clear pending item from session
    req.session.pendingItem = null;
    req.session.hasUnfinishedSubmission = false;
    
    // Redirect to success page
    res.render('success', {
      title: 'Bestelling bevestigd',
      orderId: orderData.id,
      item: item,
      user: req.session.user
    });
    
  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).render('error', {
      title: 'Fout',
      message: 'Er is een fout opgetreden bij het verwerken van je bestelling. Probeer het later opnieuw.',
      error: process.env.NODE_ENV === 'development' ? error.message : null,
      user: req.session.user || null
    });
  }
});

// Consignor dashboard
app.get('/consignor/dashboard', async (req, res) => {
  // Check if user is logged in
  if (!req.session.user) {
    return res.redirect('/login');
  }
  
  try {
    const userId = req.session.user.id;
    
    // Get all items for this user
    const { data: items, error: itemsError } = await supabase
      .from('items')
      .select(`
        *,
        order_items (
          order_id,
          orders (
            id,
            status,
            total_value,
            total_payout
          )
        ),
        pricing (*)
      `)
      .eq('customer_id', userId)
      .order('created_at', { ascending: false });
    
    if (itemsError) throw new Error(itemsError.message);
    
    // Format items for display
    const formattedItems = items.map(item => {
      const order = item.order_items?.[0]?.orders || null;
      const pricing = item.pricing?.[0] || null;
      
      return {
        id: item.id,
        title: item.title,
        referenceId: item.reference_id,
        imageUrl: item.image_url,
        status: item.status,
        createdAt: new Date(item.created_at).toLocaleDateString('nl-NL'),
        order: order ? {
          id: order.id,
          status: order.status,
          totalValue: (order.total_value / 100).toFixed(2),
          totalPayout: (order.total_payout / 100).toFixed(2)
        } : null,
        pricing: pricing ? {
          estimatedValue: (pricing.estimated_value / 100).toFixed(2),
          commissionRate: pricing.commission_rate,
          payoutAmount: (pricing.payout_amount / 100).toFixed(2)
        } : null
      };
    });
    
    res.render('dashboard', {
      title: 'Mijn Dashboard',
      user: req.session.user,
      items: formattedItems || []
    });
    
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).render('error', {
      title: 'Fout',
      message: 'Er is een fout opgetreden bij het laden van je dashboard. Probeer het later opnieuw.',
      error: process.env.NODE_ENV === 'development' ? error.message : null,
      user: req.session.user
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', {
    title: 'Fout',
    message: 'Er is een fout opgetreden.',
    error: process.env.NODE_ENV === 'development' ? err.message : null,
    user: req.session.user || null
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Dutch Thrift storefront draait op poort ${port}`);
});