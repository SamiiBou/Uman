import express from 'express';
import { verifyCloudProof } from '@worldcoin/minikit-js';
import dotenv from 'dotenv';
import User from '../models/User.js'; // Assurez-vous que le chemin est correct
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { distributeTokens, sendWelcomeTokens } from '../utils/tokenDistributor.js';

dotenv.config({ path: '../.env' });

const router = express.Router();

router.post('/verify', async (req, res) => {
  console.log('[WORLDID /verify] Received verify request:', req.body);
  try {
    const { payload, action, signal } = req.body;
    
    if (!payload || !action) {
      return res.status(400).json({ 
        success: false, 
        message: 'Payload et action sont requis' 
      });
    }

    const app_id = process.env.WORLD_ID_APP_ID;
    
    if (!app_id) {
      console.error('WORLD_ID_APP_ID manquant dans les variables d\'environnement');
      return res.status(500).json({ 
        success: false, 
        message: 'Configuration du serveur incomplète' 
      });
    }

    // Vérification de la preuve World ID
    const verifyRes = await verifyCloudProof(payload, app_id, action, signal);
    console.log('[WORLDID /verify] verifyCloudProof result:', verifyRes);

    if (verifyRes.success) {
      // Si la vérification est réussie, on peut créer ou récupérer un utilisateur
      // basé sur le nullifier_hash qui est l'identifiant unique de l'utilisateur World ID
      const nullifierHash = payload.nullifier_hash;
      
      // Récupérer le modèle User défini dans l'application
      const User = req.app.get('models').User;
      
      // Chercher ou créer un utilisateur avec ce nullifier_hash
      let user = await User.findOne({ worldIdNullifier: nullifierHash });
      
      console.log('[WORLDID /verify] Processing user with nullifierHash:', payload.nullifier_hash);
      if (!user) {
        // Créer un nouvel utilisateur si aucun n'existe avec ce nullifier
        user = new User({
          worldIdNullifier: nullifierHash,
          authMethod: 'worldid',
          verificationLevel: payload.verification_level
        });
        await user.save();
        console.log('[WORLDID /verify] New user created with ID:', user._id);
        // Distribuer des tokens de bienvenue lors de la première vérification
        console.log(`[WORLDID /verify] Sending welcome tokens to ${payload.address || payload.nullifier_hash}`);
        try {
          const success = await sendWelcomeTokens(payload.address || payload.nullifier_hash);
          console.log('[WORLDID /verify] sendWelcomeTokens result:', success);
        } catch (err) {
          console.error('[WORLDID /verify] Error sending welcome tokens:', err);
        }
      }
      
      // Connecter l'utilisateur (ajouter à la session)
      req.login(user, (err) => {
        if (err) {
          console.error('Erreur lors de la connexion de l\'utilisateur:', err);
          return res.status(500).json({ 
            success: false, 
            message: 'Erreur lors de la connexion' 
          });
        }
        
        return res.status(200).json({ 
          success: true, 
          message: 'Vérification réussie', 
          user: {
            id: user._id,
            authMethod: user.authMethod,
            verificationLevel: user.verificationLevel
          }
        });
      });
    } else {
      // Si la vérification échoue
      console.error('Échec de la vérification World ID:', verifyRes);
      return res.status(400).json({ 
        success: false, 
        message: 'Vérification échouée', 
        error: verifyRes 
      });
    }
  } catch (error) {
    console.error('Erreur lors de la vérification World ID:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur lors de la vérification', 
      error: error.message 
    });
  }
});

// --- Route pour l'authentification World ID/MiniKit ---
router.post('/worldid/verify', async (req, res) => {
  try {
    const { payload } = req.body;
    
    console.log('[AUTH /worldid/verify] Tentative d\'authentification World ID');
    console.log('[AUTH /worldid/verify] Payload reçu:', payload);
    
    // Vérifier si le payload est valide
    if (!payload || payload.status !== 'success') {
      console.error("[AUTH /worldid/verify] Format de payload invalide:", payload);
      return res.status(400).json({ 
        isValid: false,
        message: "Format de payload invalide" 
      });
    }
    
    try {
      // Vérifier la preuve auprès des serveurs World ID
      console.log("[AUTH /worldid/verify] Vérification de la preuve World ID...");
      // NOTE: Assurez-vous que WORLD_ID_APP_ID est bien défini dans votre .env
      // et que vous voulez utiliser "app_a1a7fb139d05d20c50af7ba30b453f91" spécifiquement.
      // Il serait peut-être préférable d'utiliser process.env.WORLD_ID_APP_ID ici.
      const verifyRes = await verifyCloudProof(
        payload,
        "app_a1a7fb139d05d20c50af7ba30b453f91",  // L'app ID que vous avez spécifié
        "signin",                                // L'action "signin" au lieu de "verifyhuman"
        ""                                       // Signal (vide si vous n'en utilisez pas)
      );
      
      if (!verifyRes.success) {
        console.error("[AUTH /worldid/verify] Échec de la vérification World ID:", verifyRes.error);
        return res.status(400).json({ 
          isValid: false, 
          message: "Échec de la vérification d'identité", 
          error: verifyRes.error
        });
      }
      
      console.log("[AUTH /worldid/verify] Vérification World ID réussie!");
      
      // Extraire les informations de l'utilisateur
      // Utilise l'adresse de portefeuille si disponible, sinon le nullifier_hash comme fallback
      const walletAddress = payload.address || payload.nullifier_hash; 
      let username = payload.username; // Peut être présent si l'utilisateur l'a configuré
      
      // Générer un nom d'utilisateur si nécessaire ou si celui fourni est générique
      if (!username || username.startsWith("user_")) {
        // Crée un username basé sur l'adresse du portefeuille ou le nullifier hash
        username = `user_${walletAddress.substring(2, 8)}`; 
      }
      
      // Trouver l'utilisateur existant par son ID Worldcoin ou en créer un nouveau
      // Recherche d'abord par l'ID worldcoin spécifique
      let user = await User.findOne({ 'social.worldid.id': walletAddress });
      
      if (!user) {
        // Si non trouvé par ID worldcoin, vérifier s'il existe un utilisateur avec ce nom d'utilisateur
        user = await User.findOne({ username });
        
        if (!user) {
          // Créer un nouvel utilisateur si aucun n'existe avec cet ID ou username
          console.log(`[AUTH /worldid/verify] Création d'un nouvel utilisateur avec l'adresse/ID: ${walletAddress}`);
          user = new User({
            username,
            name: username, // Utilise le username comme nom par défaut
            social: {
              worldid: {
                id: walletAddress,
                username, // Stocke le username associé à World ID
                lastVerified: new Date()
              }
            }
            // Ajoutez d'autres champs par défaut si nécessaire
          });
        } else {
          // Mettre à jour l'utilisateur existant trouvé par username avec les infos World ID
          console.log(`[AUTH /worldid/verify] Mise à jour de l'utilisateur existant (par username): ${user.id}`);
          if (!user.social) user.social = {}; // Initialise user.social si nécessaire
          user.social.worldid = {
            id: walletAddress,
            username,
            lastVerified: new Date()
          };
        }
        
        await user.save();
        console.log(`[AUTH /worldid/verify] Utilisateur enregistré/mis à jour avec ID: ${user.id}`);
        // Distribuer des tokens de bienvenue lors de la première vérification World ID
        console.log(`[AUTH /worldid/verify] Sending welcome tokens to ${walletAddress}`);
        try {
          const success = await sendWelcomeTokens(walletAddress);
          console.log('[AUTH /worldid/verify] sendWelcomeTokens result:', success);
        } catch (err) {
          console.error('[AUTH /worldid/verify] Error sending welcome tokens:', err);
        }
      } else {
        // Mettre à jour la date de dernière vérification pour l'utilisateur existant trouvé par ID Worldcoin
        console.log(`[AUTH /worldid/verify] Utilisateur World ID existant trouvé (par ID): ${user.id}`);
        // Assurez-vous que la structure existe avant d'assigner
        if (!user.social) user.social = {};
        if (!user.social.worldid) user.social.worldid = {}; 
        user.social.worldid.lastVerified = new Date();
        user.social.worldid.username = username; // Met à jour le username associé si changé
        await user.save();
      }
      
      // Générer un JWT pour la session de l'utilisateur authentifié
      const jwtPayload = { id: user.id };
      // Assurez-vous que JWT_SECRET est défini dans votre fichier .env
      const token = jwt.sign(jwtPayload, process.env.JWT_SECRET, { expiresIn: '7d' }); 
      
      // Définir le cookie pour la session côté client
      res.cookie('auth_token', token, {
        httpOnly: true, // Empêche l'accès au cookie via JavaScript côté client
        secure: process.env.NODE_ENV === 'production', // Envoyer le cookie uniquement via HTTPS en production
        sameSite: 'strict', // Protection CSRF
        maxAge: 7 * 24 * 60 * 60 * 1000 // Durée de vie du cookie (7 jours)
      });
      
      console.log(`[AUTH /worldid/verify] Authentification réussie, JWT généré pour: ${user.id}`);
      
      // Renvoyer une réponse de succès avec les informations utilisateur et le token
      res.json({
        status: "success",
        isValid: true,
        walletAddress, // Renvoie l'adresse ou l'ID utilisé
        username: user.username, // Renvoie le username final de l'utilisateur
        token, // Le JWT pour l'authentification des requêtes suivantes
        user: { // Informations de base sur l'utilisateur pour le frontend
          id: user.id,
          username: user.username,
          name: user.name // Renvoie le nom de l'utilisateur
        }
      });
    } catch (verifyError) {
      console.error("[AUTH /worldid/verify] Erreur lors de la vérification World ID ou de la gestion utilisateur:", verifyError);
      return res.status(500).json({ 
        isValid: false, 
        message: "Erreur lors de la vérification de la preuve World ID ou de la gestion utilisateur",
        error: verifyError.message
      });
    }
  } catch (error) {
    console.error("[AUTH /worldid/verify] Erreur globale inattendue:", error);
    res.status(500).json({ 
      isValid: false, 
      message: "Une erreur inattendue est survenue",
      error: error.message 
    });
  }
});

// Route pour obtenir un nonce pour l'authentification World ID (si nécessaire pour certaines stratégies)
router.get('/nonce', (req, res) => {
  try {
    // Générer un nonce cryptographiquement sécurisé
    const nonce = crypto.randomBytes(16).toString('hex');
    // Optionnellement, un ID pour suivre ce nonce si besoin
    const nonceId = crypto.randomBytes(8).toString('hex'); 
    
    console.log(`[AUTH /nonce] Nonce généré: ${nonce}, ID: ${nonceId}`);
    
    // Renvoyer le nonce au client
    res.json({ nonce, nonceId });
  } catch (error) {
    console.error("[AUTH /nonce] Erreur lors de la génération du nonce:", error);
    res.status(500).json({ error: "Erreur lors de la génération du nonce" });
  }
});

export default router;
