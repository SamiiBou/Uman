import { Strategy as TwitterStrategy } from 'passport-twitter';
import { Strategy as DiscordStrategy } from 'passport-discord';
import User from '../models/User.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Charger les variables d'environnement depuis le .env à la racine du projet
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Détermination du chemin vers .env à la racine du projet
const envPath = path.resolve(__dirname, '..', '..', '.env');
console.log(`[PASSPORT CONFIG] Chargement du fichier .env via: ${envPath}`);
dotenv.config({ path: envPath });
// Affichage de l'état des variables d'environnement Twitter pour débogage
console.log(`[PASSPORT CONFIG] Environnement Twitter:
  TWITTER_CONSUMER_KEY (legacy) = ${!!process.env.TWITTER_CONSUMER_KEY},
  TWITTER_API_KEY = ${!!process.env.TWITTER_API_KEY},
  TWITTER_CONSUMER_SECRET (legacy) = ${!!process.env.TWITTER_CONSUMER_SECRET},
  TWITTER_API_SECRET_KEY = ${!!process.env.TWITTER_API_SECRET_KEY},
  TWITTER_CALLBACK_URL = ${!!process.env.TWITTER_CALLBACK_URL}`);

// Export d'une fonction qui prend l'instance passport en argument
export default function(passportInstance) {
  console.log('[PASSPORT CONFIG] Démarrage de la configuration...');
  
  // --- Sérialisation / Désérialisation (POUR LES SESSIONS) ---
  // Nécessaire pour que passport.session() fonctionne (utilisé par Twitter OAuth 1.0a)
  passportInstance.serializeUser((user, done) => {
    console.log('[PASSPORT serializeUser] Début. User ID:', user.id);
    // Stocke seulement l'ID utilisateur dans la session
    done(null, user.id);
  });
  
  passportInstance.deserializeUser(async (id, done) => {
    console.log('[PASSPORT deserializeUser] Début. Recherche ID:', id);
    try {
      const user = await User.findById(id);
      if (user) {
        console.log('[PASSPORT deserializeUser] Utilisateur trouvé:', user.id, user.name);
      } else {
        console.log('[PASSPORT deserializeUser] Utilisateur NON trouvé pour ID:', id);
      }
      // Attache l'objet User complet à req.user pour les requêtes authentifiées par session
      done(null, user); // Passer l'utilisateur trouvé (ou null s'il n'existe plus)
    } catch (err) {
      console.error('[PASSPORT deserializeUser] Erreur lors de la recherche:', err);
      done(err, null);
    }
  });

  // --- Stratégie Twitter (OAuth 1.0a) ---
  console.log('[PASSPORT CONFIG] Configuration de la stratégie Twitter...');
  if (!process.env.TWITTER_CONSUMER_KEY || !process.env.TWITTER_CONSUMER_SECRET || !process.env.TWITTER_CALLBACK_URL) {
    console.warn('*** ATTENTION: Variables d\'environnement Twitter manquantes ou incomplètes. ***');
  } else {
    console.log('[PASSPORT CONFIG] Clés API Twitter trouvées. Configuration de la stratégie.');
    passportInstance.use('twitter', new TwitterStrategy({
      // OAuth 1.0a keys: prefer API key/secret, fallback to consumer key/secret
      consumerKey: process.env.TWITTER_API_KEY || process.env.TWITTER_CONSUMER_KEY,
      consumerSecret: process.env.TWITTER_API_SECRET_KEY || process.env.TWITTER_CONSUMER_SECRET,
      callbackURL: process.env.TWITTER_CALLBACK_URL,
      passReqToCallback: true,
      includeEmail: true // Si autorisé dans votre app Twitter
    },
    async (req, token, tokenSecret, profile, done) => {
      console.log('---------- [PASSPORT Twitter Strategy] Exécution ----------');
      
      // DÉCODAGE DU STATE DIRECTEMENT DE L'URL (stateless approach)
      let stateData = {};
      let isLinking = false;
      let linkUserId = null;
      let userToken = null;
      
      if (req.query.state) {
        try {
          // Décodage du state Base64 → JSON
          const stateStr = Buffer.from(req.query.state, 'base64').toString();
          stateData = JSON.parse(stateStr);
          console.log('[PASSPORT Twitter Strategy] État décodé:', stateData);
          
          // Extraire les informations de liaison
          isLinking = stateData.linkMode === true;
          linkUserId = stateData.userId;
          userToken = stateData.token;
        } catch (e) {
          console.error('[PASSPORT Twitter Strategy] Erreur décodage state:', e);
        }
      }
      
      console.log('[PASSPORT Twitter Strategy] Profile ID:', profile.id);
      console.log('[PASSPORT Twitter Strategy] Profile Display Name:', profile.displayName);
      console.log('[PASSPORT Twitter Strategy] Profile Username:', profile.username);
      
      const email = profile.emails?.[0]?.value; // Twitter peut fournir l'email si autorisé
      const profileImageUrl = profile.photos?.[0]?.value?.replace('_normal', ''); // Taille normale
      
      try {
        // MODE LIAISON - Utiliser les données du state
        if (isLinking && linkUserId) {
          console.log(`[PASSPORT Twitter Strategy] MODE LIAISON pour utilisateur: ${linkUserId}`);
          
          // Trouver l'utilisateur existant par ID
          const existingUser = await User.findById(linkUserId);
          
          if (!existingUser) {
            console.error(`[PASSPORT Twitter Strategy] Utilisateur non trouvé pour liaison: ${linkUserId}`);
            return done(null, false, { message: 'Utilisateur non trouvé pour la liaison de compte' });
          }
          
          // Vérifier si ce compte Twitter est déjà lié à un autre utilisateur
          const duplicate = await User.findOne({
            'social.twitter.id': profile.id,
            _id: { $ne: existingUser._id }
          });
          
          if (duplicate) {
            console.error(`[PASSPORT Twitter Strategy] Ce compte Twitter est déjà lié à un autre utilisateur`);
            return done(null, false, { message: 'Ce compte Twitter est déjà connecté à un autre utilisateur' });
          }
          
          // Initialiser l'objet social si nécessaire
          if (!existingUser.social) existingUser.social = {};
          
          // Lier le compte Twitter
          existingUser.social.twitter = {
            id: profile.id,
            username: profile.username,
            displayName: profile.displayName,
            email: email,
            profileImageUrl: profileImageUrl,
            token: token,
            tokenSecret: tokenSecret,
            lastUpdated: Date.now()
          };
          
          await existingUser.save();
          console.log('[PASSPORT Twitter Strategy] Compte Twitter lié avec succès');
          
          // Ajouter une propriété spéciale pour indiquer que c'était une liaison
          existingUser.wasLinking = true;
          return done(null, existingUser);
        }
        
        // FLUX NORMAL
        let user = await User.findOne({ 'social.twitter.id': profile.id });
        
        if (user) {
          // Mise à jour des infos Twitter
          if (!user.social) user.social = {};
          user.social.twitter = {
            id: profile.id,
            username: profile.username,
            displayName: profile.displayName,
            email: email,
            profileImageUrl: profileImageUrl,
            token: token,
            tokenSecret: tokenSecret,
            lastUpdated: Date.now()
          };
          await user.save();
          console.log('[PASSPORT Twitter Strategy] Utilisateur mis à jour.');
          return done(null, user);
        } else {
          // Créer un nouvel utilisateur
          const newUser = new User({
            name: profile.displayName,
            username: profile.username,
            email: email,
            social: {
              twitter: {
                id: profile.id,
                username: profile.username,
                displayName: profile.displayName,
                email: email,
                profileImageUrl: profileImageUrl,
                token: token,
                tokenSecret: tokenSecret,
                lastUpdated: Date.now()
              }
            }
          });
          await newUser.save();
          console.log(`[PASSPORT Twitter Strategy] Nouvel utilisateur créé (ID: ${newUser.id}).`);
          return done(null, newUser);
        }
      } catch (err) {
        console.error('[PASSPORT Twitter Strategy] ERREUR:', err);
        return done(err, null);
      }
    }));
    console.log('[PASSPORT CONFIG] Stratégie Twitter configurée avec succès.');
  }

  // --- Stratégie Discord (OAuth2) ---
  console.log('[PASSPORT CONFIG] Configuration de la stratégie Discord...');
  if (!process.env.DISCORD_CLIENT_ID || !process.env.DISCORD_CLIENT_SECRET || !process.env.DISCORD_CALLBACK_URL) {
    console.warn('*** ATTENTION: Variables d\'environnement Discord manquantes ou incomplètes. ***');
  } else {
    console.log('[PASSPORT CONFIG] Clés API Discord trouvées. Configuration de la stratégie.');
    passportInstance.use('discord', new DiscordStrategy({
      clientID: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
      callbackURL: process.env.DISCORD_CALLBACK_URL,
      passReqToCallback: true,
      scope: ['identify', 'email']
    },
    async (req, accessToken, refreshToken, profile, done) => {
      console.log('---------- [PASSPORT Discord Strategy] Exécution ----------');
      let stateData = {}, isLinking = false, linkUserId = null, userToken = null;
      if (req.query.state) {
        try {
          const decoded = Buffer.from(req.query.state, 'base64').toString();
          stateData = JSON.parse(decoded);
          isLinking = stateData.linkMode === true;
          linkUserId = stateData.userId;
          userToken = stateData.token;
        } catch (e) {
          console.error('[PASSPORT Discord Strategy] Erreur décodage state:', e);
        }
      }
      console.log('[PASSPORT Discord Strategy] Profile ID:', profile.id);
      console.log('[PASSPORT Discord Strategy] Profile:', profile.username, '#', profile.discriminator);
      const email = profile.email;
      const avatar = profile.avatar;
      try {
        if (isLinking && linkUserId) {
          console.log(`[PASSPORT Discord Strategy] MODE LIAISON pour utilisateur: ${linkUserId}`);
          const existingUser = await User.findById(linkUserId);
          if (!existingUser) {
            return done(null, false, { message: 'Utilisateur non trouvé pour la liaison' });
          }
          const duplicate = await User.findOne({
            'social.discord.id': profile.id,
            _id: { $ne: existingUser._id }
          });
          if (duplicate) {
            return done(null, false, { message: 'Compte Discord déjà lié à un autre utilisateur' });
          }
          existingUser.social = existingUser.social || {};
          existingUser.social.discord = {
            id: profile.id,
            username: profile.username,
            discriminator: profile.discriminator,
            email,
            avatar,
            token: accessToken,
            refreshToken,
            lastUpdated: Date.now()
          };
          await existingUser.save();
          existingUser.wasLinking = true;
          return done(null, existingUser);
        }
        let user = await User.findOne({ 'social.discord.id': profile.id });
        if (user) {
          user.social = user.social || {};
          user.social.discord = {
            id: profile.id,
            username: profile.username,
            discriminator: profile.discriminator,
            email,
            avatar,
            token: accessToken,
            refreshToken,
            lastUpdated: Date.now()
          };
          user.name = user.name || `${profile.username}#${profile.discriminator}`;
          await user.save();
          return done(null, user);
        }
        const newUser = new User({
          name: `${profile.username}#${profile.discriminator}`,
          username: profile.username,
          email,
          social: {
            discord: {
              id: profile.id,
              username: profile.username,
              discriminator: profile.discriminator,
              email,
              avatar,
              token: accessToken,
              refreshToken,
              lastUpdated: Date.now()
            }
          }
        });
        await newUser.save();
        return done(null, newUser);
      } catch (err) {
        console.error('[PASSPORT Discord Strategy] ERREUR:', err);
        return done(err, null);
      }
    }));
    console.log('[PASSPORT CONFIG] Stratégie Discord configurée avec succès.');
  }

  console.log('[PASSPORT CONFIG] Configuration terminée.');
  // Débogage: afficher les stratégies Passport enregistrées
  console.log(
    '[PASSPORT CONFIG] Stratégies enregistrées:',
    Object.keys(passportInstance._strategies || {}).join(', ')
  );
}