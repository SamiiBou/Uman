import cors from 'cors';
import dotenv from 'dotenv';
import passport from 'passport'; 
import session from 'express-session'; 
import MongoStore from 'connect-mongo'; 


// Importez la FONCTION de configuration Passport
import configurePassport from './config/passport.js';

// Importer la FONCTION qui crée les routes auth
import createAuthRoutes from './routes/auth.js';
// Import autres routes (si vous en avez)
import userRoutes from './routes/user.js';
import messageRoutes from './routes/message.js';
// import notificationRoutes from './routes/notifications.js';

import groupRoutes from './routes/group.js';
import statsRoutes from './routes/stats.js';
import adminRoutes from './routes/admin.js';





// Import des modèles
import User from './models/User.js';

// Charger les variables d'environnement depuis .env à la racine du projet
import path from 'path';

import airdropRoutes, { resumePendingTransactions } from './routes/airdrop.js'   

// 🆕 Import du service de distribution automatique
import { startAutoTokenDistribution } from './services/autoTokenDistributor.js';

import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Charger le .env depuis le répertoire racine du projet
const envFilePath = path.resolve(__dirname, '../.env');
console.log(`[SERVER] Chargement des variables d'environnement via: ${envFilePath}`);
dotenv.config({ path: envFilePath });

import s3Routes from './routes/s3.js';
import express from 'express';
import mongoose from 'mongoose';

// Initialiser l'application Express
const app = express();

const isRailwayRuntime = Object.keys(process.env).some((key) => key.startsWith('RAILWAY_'));
const sessionStoreMode = process.env.SESSION_STORE_MODE || (isRailwayRuntime ? 'memory' : 'mongo');

// Make models available to the app
app.set('models', { User });
const PORT = process.env.PORT || 3001;

app.set('trust proxy', 1);

const allowedOrigins = [
    process.env.CLIENT_URL,           // your prod frontend
    'http://localhost:3000',
    'https://uman-vit.vercel.app'           // your dev frontend
  ];

// Connexion à MongoDB
const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) {
    console.error('Erreur: MONGO_URI n\'est pas défini dans le fichier .env');
    process.exit(1);
}

mongoose.connect(MONGO_URI)
    .then(() => {
        console.log('MongoDB connecté avec succès.');

        resumePendingTransactions()
          .then((count) => {
            console.log(`[SERVER] Pending claims checked on startup: ${count}`);
          })
          .catch((error) => {
            console.error('[SERVER] Failed to resume pending claims on startup:', error);
          });
        
        // 🆕 Démarrer le service de distribution automatique après la connexion MongoDB
        console.log('[SERVER] Démarrage du service de distribution automatique...');
        startAutoTokenDistribution();
    })
    .catch(err => {
        console.error('Erreur de connexion MongoDB:', err);
        process.exit(1);
    });

// --- Configuration CORS ---
const clientUrl = process.env.CLIENT_URL;
if (!clientUrl) {
    console.warn('Avertissement: CLIENT_URL non défini dans .env. CORS pourrait bloquer les requêtes.');
}
console.log(`Configuration CORS pour l'origine: ${clientUrl || '* (par défaut, non recommandé)*'}`);
app.use(cors({
    origin: (origin, callback) => {
      // allow requests with no origin (like mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS policy: origin ${origin} not allowed`));
      }
    },
    credentials: true,
    methods: 'GET,POST,PUT,DELETE,OPTIONS',
    allowedHeaders: ['Content-Type','Authorization'],
    exposedHeaders: ['Set-Cookie']
  }));

// Middleware pour parser le JSON et les données URL-encodées
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Configuration de la Session Express ---
console.log('[SERVER] Configuration du middleware express-session...');
// DOIT être configuré AVANT passport.session()
const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
    console.error('Erreur: SESSION_SECRET non défini dans .env. La session ne sera pas sécurisée.');
    // process.exit(1); 
}

const sessionConfig = {
  secret: sessionSecret || 'un secret par défaut très faible', 
  resave: false, 
  // Save only sessions that have actually been modified.
  // This avoids filling MongoDB with anonymous/unused sessions.
  saveUninitialized: false,
  cookie: {
      secure: clientUrl ? clientUrl.startsWith('https://') : false, // Forcé à true si le clientUrl est en HTTPS
      httpOnly: true, 
      maxAge: 1000 * 60 * 60 * 24, 
      sameSite: 'none'  
  }
};

if (sessionStoreMode === 'mongo') {
  try {
    const mongoSessionStore = MongoStore.create({
      mongoUrl: MONGO_URI,
      collectionName: 'sessions',
      // Align DB session retention with the cookie lifetime.
      ttl: 24 * 60 * 60,
      // Avoid recreating a TTL index on every boot. Expired sessions are
      // instead cleaned periodically by the app.
      autoRemove: 'interval',
      autoRemoveInterval: 10,
      // Reduce write frequency for active sessions.
      touchAfter: 24 * 3600
    });

    mongoSessionStore.on('error', (error) => {
      console.error('[SERVER] Erreur du store de session MongoDB:', error);
    });

    sessionConfig.store = mongoSessionStore;
  } catch (error) {
    console.error('[SERVER] Impossible de configurer le store MongoDB pour les sessions. Fallback mémoire:', error);
  }
} else {
  console.warn(`[SERVER] SESSION_STORE_MODE=${sessionStoreMode}. Utilisation du store mémoire pour les sessions.`);
}

// Si le frontend est sur HTTPS (comme ngrok), nous devons forcer secure à true
if (clientUrl && clientUrl.startsWith('https://')) {
  // Force le cookie à être secure quand le frontend est en HTTPS
  sessionConfig.cookie.secure = true;
  console.log('[SERVER] Frontend en HTTPS détecté. Cookie session configuré en secure=true');
  
  // Ajout du proxy trust, important pour ngrok et autres proxys HTTPS
  app.set('trust proxy', 1);
}

// Si sameSite est 'none', secure doit être true selon les standards
if (sessionConfig.cookie.sameSite === 'none') {
  sessionConfig.cookie.secure = true;
  console.log('[SERVER] sameSite=none détecté. Cookie session configuré en secure=true par obligation');
}

const sessionMiddleware = session(sessionConfig);
app.use((req, res, next) => {
    console.log(`[SERVER SESSION MIDDLEWARE] Requête reçue: ${req.method} ${req.path}`);
    console.log('[SERVER SESSION MIDDLEWARE] Headers (origin, cookie): ', req.headers.origin, req.headers.cookie);
    sessionMiddleware(req, res, next);
});
console.log('[SERVER] Middleware express-session configuré.');

// --- Initialisation de Passport et Session Passport ---
console.log('[SERVER] Configuration de passport.initialize() et passport.session()...');
// Doit être APRES express-session
app.use(passport.initialize()); 
app.use(passport.session());    
// *** Appel de la configuration Passport ICI ***
configurePassport(passport); // Passe l'instance passport à la fonction de config
console.log('[SERVER] Middlewares Passport configurés.');

// --- Routes de l'API ---
console.log('[SERVER] Configuration des routes API...');
// Créer et monter les routes d'authentification en passant l'instance passport
const authRouter = createAuthRoutes(passport);
app.use('/api/auth', authRouter);
// Monter d'autres routes ici (ex: utilisateurs, etc.)
app.use('/api/users', userRoutes);
// Mount messaging API routes
app.use('/api/messages', messageRoutes);
console.log('[SERVER] Routes API configurées.');

app.use('/api/airdrop', airdropRoutes)
app.use('/api', groupRoutes);
app.use('/api/admin', adminRoutes);

// app.use('/api/notifications', notificationRoutes);


// Route de test simple
app.get('/', (req, res) => {
    console.log('Session sur /', req.session); 
    console.log('User sur /', req.user);     
    res.send(`API SocialID en cours d\'exécution! SessionID: ${req.sessionID}, Authentifié: ${req.isAuthenticated()}`);
});

app.get('/healthz', (req, res) => {
    res.status(200).json({
      status: 'ok',
      sessionStoreMode: sessionStoreMode === 'mongo' && sessionConfig.store ? 'mongo' : 'memory',
      mongodbReadyState: mongoose.connection.readyState
    });
});

app.get('/api/healthz', (req, res) => {
    res.status(200).json({
      status: 'ok',
      sessionStoreMode: sessionStoreMode === 'mongo' && sessionConfig.store ? 'mongo' : 'memory',
      mongodbReadyState: mongoose.connection.readyState
    });
});
app.use('/api/s3', s3Routes);
console.log('[SERVER] Routes S3 configurées.')
// --- Gestionnaire d'erreurs global (exemple simple) ---
// Doit être défini après toutes les routes
app.use((err, req, res, next) => {
    console.error("--- GESTIONNAIRE D'ERREURS GLOBAL ---");
    console.error("Message:", err.message);
    console.error("Status:", err.status);
    console.error("Stack:", err.stack);
    console.error("--- FIN GESTIONNAIRE D'ERREURS ---");
    res.status(err.status || 500).json({ 
        message: err.message || 'Erreur interne du serveur.',
        error: process.env.NODE_ENV === 'development' ? { message: err.message, stack: err.stack } : {}
     });
});

app.use('/api/stats', statsRoutes);
console.log('[SERVER] Routes Stats configured.');

// router.post("/request-airdrop", authenticateToken, async (req, res) => {
//     const { amount } = req.body;
//     const { walletAddress } = req.user;
//     // (ex. check KYC, pas déjà réclamé…)
//     const { voucher, signature } = await createVoucher(walletAddress, amount);
//     res.json({ voucher, signature });
//   });


// Démarrer le serveur
app.listen(PORT, () => {
    console.log(`---- SERVEUR SOCIALID ----`);
    console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
    if (clientUrl) {
      console.log(`🌐 Frontend attendu sur: ${clientUrl}`);
    } else {
      console.warn(`⚠️ CLIENT_URL non défini. Les redirections et CORS pourraient ne pas fonctionner.`);
    }
    console.log(`🔑 Secret de session ${sessionSecret ? 'défini' : 'NON DÉFINI (insécurisé)'}`);
    console.log(`🔒 Cookie de session: secure=${sessionConfig.cookie.secure}, httpOnly=${sessionConfig.cookie.httpOnly}, sameSite=${sessionConfig.cookie.sameSite}`);
    console.log(`💾 Sessions stockées dans MongoDB: ${sessionStoreMode === 'mongo' && sessionConfig.store ? 'Oui' : 'Non'}`);
    console.log(`🗂️ Mode de session: ${sessionStoreMode === 'mongo' && sessionConfig.store ? 'mongo' : 'memory'}`);
    console.log(`--------------------------`);

});
