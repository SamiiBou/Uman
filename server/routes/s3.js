// Fichier complet routes/s3.js avec les corrections

import express from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import * as fs from 'fs';  // Importation correcte de fs pour ES modules
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getPresignedUrl, uploadToS3, getPresignedChallengeUrl, uploadToChallengeS3 } from '../aws.js';  // Ajuste le chemin si nécessaire
import jwt from 'jsonwebtoken';


// Create ES modules __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

console.log("Chemin vers .env:", path.resolve(__dirname, '../.env'));

console.log('AWS Config Check:',
  process.env.AWS_ACCESS_KEY_ID ? 'AWS_ACCESS_KEY_ID ✓' : 'AWS_ACCESS_KEY_ID ✗',
  process.env.AWS_SECRET_ACCESS_KEY ? 'AWS_SECRET_ACCESS_KEY ✓' : 'AWS_SECRET_ACCESS_KEY ✗',
  process.env.AWS_REGION ? 'AWS_REGION ✓' : 'AWS_REGION ✗',
  process.env.S3_BUCKET_NAME ? 'S3_BUCKET_NAME ✓' : 'S3_BUCKET_NAME ✗'
);

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'sa-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

// Fonction pour télécharger un fichier depuis S3
async function downloadFromS3(key, localPath) {
  try {
    console.log(`[downloadFromS3] Tentative de téléchargement - Key: ${key}, Path: ${localPath}`);
    
    const params = {
      Bucket: process.env.S3_BUCKET_NAME || 'uman-id-cards',
      Key: key
    };
    
    console.log(`[downloadFromS3] Paramètres S3: Bucket=${params.Bucket}, Key=${params.Key}`);
    
    // Vérification que GetObjectCommand est disponible
    if (typeof GetObjectCommand !== 'function') {
      console.error('[downloadFromS3] GetObjectCommand n\'est pas une fonction!');
      console.log('[downloadFromS3] Type de GetObjectCommand:', typeof GetObjectCommand);
      throw new Error('GetObjectCommand is not properly defined');
    }
    
    const command = new GetObjectCommand(params);
    const response = await s3Client.send(command);
    
    console.log(`[downloadFromS3] Réponse S3 reçue, création du dossier: ${path.dirname(localPath)}`);
    
    // Créer le dossier de destination s'il n'existe pas
    const dir = path.dirname(localPath);
    if (!fs.existsSync(dir)) {
      console.log(`[downloadFromS3] Création du dossier: ${dir}`);
      fs.mkdirSync(dir, { recursive: true });
    }
    
    console.log(`[downloadFromS3] Création du writeStream vers: ${localPath}`);
    
    // Écrire le stream dans un fichier local
    const writeStream = fs.createWriteStream(localPath);
    
    // Transformer le Readable Stream en pipeline vers le fichier
    return new Promise((resolve, reject) => {
      const stream = response.Body;
      
      stream.pipe(writeStream)
        .on('error', (err) => {
          console.error(`[downloadFromS3] Erreur durant le stream:`, err);
          reject(err);
        })
        .on('finish', () => {
          console.log(`[downloadFromS3] Téléchargement terminé: ${localPath}`);
          resolve({
            success: true,
            path: localPath,
            message: `Fichier téléchargé avec succès vers ${localPath}`
          });
        });
    });
  } catch (error) {
    console.error('[downloadFromS3] Erreur lors du téléchargement depuis S3:', error);
    throw error;
  }
}

// Middleware pour vérifier l'authentification
// Middleware simple d'authentification par token
// Dans routes/s3.js, modifiez la fonction isAuthenticated:
function isAuthenticated(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token manquant' });
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // On récupère à la fois l’ID et le username
    req.user = {
      id: decoded.userId || decoded.id || decoded._id || decoded.sub,
      username: decoded.username
    };
    return next();
  } catch (err) {
    return res.status(401).json({ message: 'Token invalide' });
  }
}


// Route pour obtenir une URL présignée pour visualiser une image
router.get('/image/:key', isAuthenticated, async (req, res) => {
  try {
    const url = await getPresignedUrl(req.params.key);
    res.json({ url });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'URL d\'image:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération de l\'image' });
  }
});

// Route pour télécharger une image vers S3
router.post('/upload', isAuthenticated, (req, res, next) => {
  console.log("[S3] Route upload appelée - Auth:", !!req.headers.authorization);
  console.log("[S3] UserId trouvé dans le token:", req.user?.id);
  
  // Passer au middleware multer
  next();
}, upload.single('image'), async (req, res) => {
  console.log("[S3] Après middleware multer - Fichier reçu:", !!req.file);
  
  if (!req.file) {
    console.log("[S3] Erreur: Aucun fichier n'a été trouvé dans la requête");
    return res.status(400).json({ message: 'Aucun fichier fourni' });
  }
  
  console.log("[S3] Fichier info:", {
    originalname: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.buffer.length
  });
  
  try {
    // Générer un nom de fichier unique
      const fileExtension = req.file.originalname.split('.').pop();
      const username = req.user.username || req.user.id;
      // Si tu ne veux pas de dossier, tu peux supprimer `${username}/`
      const key = `${username}_card.${fileExtension}`;
      console.log("[S3] Clé S3 générée:", key);
    
    // Télécharger le fichier vers S3
    console.log("[S3] Début upload vers S3...");
    await uploadToS3(req.file.buffer, key, req.file.mimetype);
    console.log("[S3] Upload S3 terminé avec succès");
    
    // Générer une URL présignée pour visualiser l'image
    console.log("[S3] Génération URL présignée...");
    const url = await getPresignedUrl(key);
    console.log("[S3] URL présignée générée:", url.substring(0, 50) + "...");
    
    console.log("[S3] Envoi réponse réussie au client");
    res.json({ key, url });
  } catch (error) {
    console.error('[S3] Erreur upload:', error);
    res.status(500).json({ 
      message: 'Erreur serveur lors du téléchargement de l\'image',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

router.get('/test', async (req, res) => {
  try {
    // Return basic info about S3 config (without exposing sensitive data)
    res.json({
      message: 'S3 router is working',
      bucket: process.env.S3_BUCKET_NAME || 'uman-id-cards',
      region: process.env.AWS_REGION || 'sa-east-1',
      configured: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY)
    });
  } catch (error) {
    console.error('Error in S3 test route:', error);
    res.status(500).json({ message: 'S3 test route error', error: error.message });
  }
});

router.post('/test-upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Aucun fichier téléchargé' });
    }

    // Log des informations sur le fichier
    console.log('Fichier reçu:', {
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    });

    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: `uploads/${Date.now()}-${req.file.originalname}`,
      Body: req.file.buffer,
      ContentType: req.file.mimetype
    };

    console.log('Envoi vers S3 avec paramètres:', {
      Bucket: params.Bucket,
      Key: params.Key,
      ContentType: params.ContentType
    });

    const command = new PutObjectCommand(params);
    const uploadResult = await s3Client.send(command);
    
    console.log('Upload réussi:', uploadResult);
    return res.status(200).json({ 
      message: 'Fichier téléchargé avec succès',
      fileUrl: `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${params.Key}`
    });
  } catch (error) {
    console.error('Erreur lors du téléchargement vers S3:', error);
    return res.status(500).json({ message: 'Erreur serveur pendant le téléchargement' });
  }
});

// NOUVELLE ROUTE pour télécharger une image depuis S3 vers le serveur
router.get('/download/:key(*)', isAuthenticated, async (req, res) => {
  try {
    const key = req.params.key;
    const username = req.user.username || req.user.id;
    const extension = path.extname(key) || '.png';
    const filename = `${username}_card${extension}`;

    // Préparer les headers HTTP pour forcer le download côté client
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/octet-stream');

    // Récupérer l’objet depuis S3
    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key
    });
    const s3Response = await s3Client.send(command);

    // Streamer directement le corps de la réponse S3 vers le client
    s3Response.Body.pipe(res)
      .on('error', err => {
        console.error('[download] Erreur de stream vers le client :', err);
        if (!res.headersSent) res.status(500).end();
      })
      .on('finish', () => {
        console.log(`[download] Fichier "${key}" servi à "${username}". Aucune trace locale laissée.`);
        // Aucune suppression nécessaire, on n’a pas créé de fichier local
      });
  } catch (error) {
    console.error('[download] Erreur lors de la récupération depuis S3 :', error);
    res.status(500).json({ message: 'Erreur serveur lors du téléchargement du fichier', error: error.message });
  }
});

// NOUVELLE ROUTE pour télécharger directement une image dans le navigateur
router.get('/download-file/:key(*)', async (req, res) => {
  try {
    console.log(`[Route /download-file] Demande reçue pour clé: ${req.params.key}`);
    
    const key = req.params.key;
    
    const params = {
      Bucket: process.env.S3_BUCKET_NAME || 'uman-id-cards',
      Key: key
    };
    
    console.log(`[Route /download-file] Paramètres: Bucket=${params.Bucket}, Key=${params.Key}`);
    
    const command = new GetObjectCommand(params);
    const response = await s3Client.send(command);
    
    // Configurer les en-têtes pour le téléchargement
    res.setHeader('Content-Disposition', `attachment; filename=${path.basename(key)}`);
    res.setHeader('Content-Type', response.ContentType || 'application/octet-stream');
    
    // Streamer directement la réponse au client
    response.Body.pipe(res);
  } catch (error) {
    console.error('[Route /download-file] Erreur:', error);
    res.status(500).json({ 
      message: 'Erreur serveur lors du téléchargement du fichier',
      error: error.message 
    });
  }
});

// TEMPORARY TEST CODE - REMOVE AFTER TESTING
router.get('/test-image/:key', async (req, res) => {
  try {
    const url = await getPresignedUrl(req.params.key);
    res.json({ url });
  } catch (error) {
    console.error('Error retrieving image URL:', error);
    res.status(500).json({ message: 'Server error retrieving image' });
  }
});

// Routes pour les images de défis (challenges)
router.post('/challenge/upload', isAuthenticated, upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Aucun fichier fourni' });
  }
  const fileExtension = req.file.originalname.split('.').pop();
  const username = req.user.username || req.user.id;
  const key = `challenges/${username}_${uuidv4()}.${fileExtension}`;
  try {
    await uploadToChallengeS3(req.file.buffer, key, req.file.mimetype);
    const url = await getPresignedChallengeUrl(key);
    res.json({ key, url });
  } catch (error) {
    console.error('[S3] Erreur upload challenge S3:', error);
    res.status(500).json({
      message: 'Erreur serveur lors du téléchargement de l\'image de défi',
      error: error.message
    });
  }
});

router.get('/challenge/image/:key', isAuthenticated, async (req, res) => {
  try {
    const url = await getPresignedChallengeUrl(req.params.key);
    res.json({ url });
  } catch (error) {
    console.error('[S3] Erreur récupération URL challenge:', error);
    res.status(500).json({ message: 'Erreur serveur de récupération de l\'image de défi', error: error.message });
  }
});

export default router;