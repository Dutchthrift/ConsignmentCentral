import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Configureer multer voor bestandsuploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    // Zorg ervoor dat de map bestaat
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Maak een unieke bestandsnaam met timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'item-' + uniqueSuffix + ext);
  }
});

// Filter voor alleen afbeeldingsbestanden
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Alleen afbeeldingsbestanden zijn toegestaan!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // max 5MB
  }
});

// Route voor het verwerken van de item upload
router.post('/', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send('Geen afbeelding geüpload.');
    }

    const title = req.body.title || 'Onbekend item';
    const imageUrl = `/uploads/${path.basename(req.file.path)}`;

    // Hier zou normaal gesproken de AI-analyse plaatsvinden
    // en het item in de database worden opgeslagen

    // Voor nu simuleren we dit door direct naar een resultaatpagina te redirecten
    res.render('item-submitted', {
      title: 'Item Ingediend - Dutch Thrift',
      item: {
        title: title,
        imageUrl: imageUrl,
        dateSubmitted: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error uploading item:', error);
    res.status(500).render('storefront', {
      title: 'Dutch Thrift - Premium Consignment',
      error: 'Er is een fout opgetreden bij het uploaden van je item. Probeer het later opnieuw.'
    });
  }
});

export default router;