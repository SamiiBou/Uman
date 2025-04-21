import express from 'express';
import jwt from 'jsonwebtoken'; 
import { authenticateToken } from '../middleware/authMiddleware.js'; 
import User from '../models/User.js';
import crypto from 'crypto';
import { distributeTokens, sendWelcomeTokens, sendVerificationTokens } from '../utils/tokenDistributor.js';
import mongoose from 'mongoose';
import fetch from 'node-fetch'; // Assurez-vous d'avoir installé node-fetch: npm install node-fetch@2
import { SiweMessage } from 'siwe';
import { OAuth } from 'oauth';
import querystring from 'querystring';
import TwitterRequestToken from '../models/TwitterRequestToken.js';
import { verifySiweMessage } from "@worldcoin/minikit-js";

// Deep link base for World App mini-app
const APP_ID = process.env.APP_ID;
const WORLDAPP_DEEP_LINK = `worldapp://mini-app?app_id=${APP_ID}`;

// Middleware pour préparer la liaison des comptes sociaux
const prepareSocialLink = (req, res, next) => {
  console.log('[LINK MIDDLEWARE] Requête reçue avec query params:', req.query);
  console.log('[LINK MIDDLEWARE] Session avant traitement:', req.session);
  
  // Déterminer si c'est un flux de liaison en considérant à la fois la requête et la session
  const isLinkingQuery = req.query.linkMode === 'true';
  const isLinkingSession = req.session.linkMode === true && req.session.linkUserId;
  const isLinking = isLinkingQuery || isLinkingSession;
  
  if (isLinking) {
    // Déterminer l'ID utilisateur à partir de la requête ou de la session
    const userIdToLink = req.query.userId || (isLinkingSession ? req.session.linkUserId : null);
    if (userIdToLink) {
      console.log(`[LINK MIDDLEWARE] Mode liaison détecté pour userId: ${userIdToLink}`);
      req.session.linkUserId = userIdToLink;
      req.session.linkMode = true;
    } else if (req.user && req.user.id) {
      console.log(`[LINK MIDDLEWARE] ID utilisateur trouvé dans req.user: ${req.user.id}`);
      req.session.linkUserId = req.user.id;
      req.session.linkMode = true;
    } else {
      console.log('[LINK MIDDLEWARE] Tentative de liaison sans userId, redirection vers la page de connexion');
      return res.redirect(`${process.env.CLIENT_URL}/login?error=authentication_required`);
    }
  } else if (!isLinkingSession) {
    // Pas de liaison détectée et aucune liaison en session, effacer les données
    console.log('[LINK MIDDLEWARE] Mode liaison non détecté, effacement des données de session relatives à la liaison');
    req.session.linkUserId = null;
    req.session.linkMode = false;
  } else {
    // Liaison existante en session, conservation des données
    console.log('[LINK MIDDLEWARE] Liaison existante en session, conservation des données');
  }
  
  console.log('[LINK MIDDLEWARE] Session après traitement:', req.session);
  next();
};
const nonceStore = {};

// Créer un modèle temporaire pour stocker les états OAuth
const OAuthStateSchema = new mongoose.Schema({
  state: { type: String, required: true, unique: true },
  created: { type: Date, default: Date.now, expires: 600 } // expire après 10 minutes
});
const OAuthState = mongoose.model('OAuthState', OAuthStateSchema);


// Exporter une fonction qui prend passport en argument
export default function(passport) {
  const router = express.Router();

  // --- Routes Twitter (OAuth 1.0a sans session pour requestToken) ---

  // 1. Lancement de l'authentification Twitter
  router.get('/twitter', prepareSocialLink, async (req, res) => {
    const consumerKey = process.env.TWITTER_API_KEY || process.env.TWITTER_CONSUMER_KEY;
    const consumerSecret = process.env.TWITTER_API_SECRET_KEY || process.env.TWITTER_CONSUMER_SECRET;
    // Build dynamic callback URL to propagate linking parameters (state, token, etc.)
    const baseCallbackUrl = process.env.TWITTER_CALLBACK_URL;
    const qs = querystring.stringify(req.query);
    const callbackURL = qs ? `${baseCallbackUrl}?${qs}` : baseCallbackUrl;
    const oauthClient = new OAuth(
      'https://api.twitter.com/oauth/request_token',
      'https://api.twitter.com/oauth/access_token',
      consumerKey,
      consumerSecret,
      '1.0A',
      callbackURL,
      'HMAC-SHA1'
    );
    oauthClient.getOAuthRequestToken(async (err, oauthToken, oauthTokenSecret) => {
      if (err) {
        console.error('[AUTH /twitter] Erreur getOAuthRequestToken:', err);
        return res.redirect(`${process.env.CLIENT_URL}/login?error=twitter_req_token`);
      }
      try {
        await TwitterRequestToken.create({ oauthToken, oauthTokenSecret });
      } catch (dbErr) {
        console.error('[AUTH /twitter] Erreur enregistrement request token:', dbErr);
        return res.redirect(`${process.env.CLIENT_URL}/login?error=server_error`);
      }
      const redirectURL = `https://api.twitter.com/oauth/authenticate?oauth_token=${oauthToken}`;
      res.redirect(redirectURL);
    });
  });

  // 2. Callback de Twitter
  router.get('/twitter/callback', async (req, res) => {
    // Début du callback Twitter
    console.log('========== [AUTH /twitter/callback] DÉMARRAGE ==========');
    console.log('[AUTH /twitter/callback] Headers:', {
      origin: req.headers.origin,
      referer: req.headers.referer,
      'user-agent': req.headers['user-agent']
    });
    console.log('[AUTH /twitter/callback] Query params:', req.query);
    console.log('[AUTH /twitter/callback] Session avant authentification:', req.session);
    const { oauth_token: oauthToken, oauth_verifier: oauthVerifier, denied } = req.query;
    if (denied) {
      return res.redirect(`${process.env.CLIENT_URL}/login?error=twitter_access_denied`);
    }
    const record = await TwitterRequestToken.findOne({ oauthToken });
    if (!record) {
      console.error('[AUTH /twitter/callback] Request token non trouvé en base');
      return res.redirect(`${process.env.CLIENT_URL}/login?error=twitter_token_missing`);
    }
    const { oauthTokenSecret } = record;
    await TwitterRequestToken.deleteOne({ oauthToken });
    const consumerKey = process.env.TWITTER_API_KEY || process.env.TWITTER_CONSUMER_KEY;
    const consumerSecret = process.env.TWITTER_API_SECRET_KEY || process.env.TWITTER_CONSUMER_SECRET;
    const callbackURL = process.env.TWITTER_CALLBACK_URL;
    const oauthClient = new OAuth(
      'https://api.twitter.com/oauth/request_token',
      'https://api.twitter.com/oauth/access_token',
      consumerKey,
      consumerSecret,
      '1.0A',
      callbackURL,
      'HMAC-SHA1'
    );
    oauthClient.getOAuthAccessToken(
      oauthToken,
      oauthTokenSecret,
      oauthVerifier,
      async (err, accessToken, accessTokenSecret) => {
        console.log('[AUTH /twitter/callback] getOAuthAccessToken result:', { err: err || null, accessToken, accessTokenSecret });
        if (err) {
          console.error('[AUTH /twitter/callback] Erreur getOAuthAccessToken:', err);
          return res.redirect(`${process.env.CLIENT_URL}/login?error=twitter_access_token`);
        }
        oauthClient.get(
          'https://api.twitter.com/1.1/account/verify_credentials.json?include_email=true',
          accessToken,
          accessTokenSecret,
          async (err, data) => {
            if (err) {
              console.error('[AUTH /twitter/callback] Erreur verify_credentials:', err);
              return res.redirect(`${process.env.CLIENT_URL}/login?error=twitter_profile`);
            }
            let profile;
            try {
              profile = JSON.parse(data);
              console.log('[AUTH /twitter/callback] Profil Twitter reçu:', profile);
            } catch (parseErr) {
              console.error('[AUTH /twitter/callback] Erreur parsing profil:', parseErr);
              return res.redirect(`${process.env.CLIENT_URL}/login?error=server_error`);
            }
            const { id_str: id, screen_name: username, name: displayName, email, profile_image_url_https, description, followers_count, friends_count, verified, created_at } = profile;
            const profileImageUrl = profile_image_url_https?.replace('_normal', '');
            const descriptionText = description;
            const followersCount = followers_count;
            const followingCount = friends_count;
            const accountVerified = verified;
            const accountCreatedAt = created_at ? new Date(created_at) : undefined;
            console.log('[AUTH /twitter/callback] Détails du profil:', { id, username, displayName, email, profileImageUrl });
            try {
              // Déterminer si c'est un mode liaison (session ou token JWT)
              let linking = false;
              let linkUserId = null;
              if (req.session.linkMode && req.session.linkUserId) {
                linking = true;
                linkUserId = req.session.linkUserId;
              } else if (req.query.token) {
                try {
                  const decoded = jwt.verify(req.query.token, process.env.JWT_SECRET);
                  // payload may use 'id' or 'userId'
                  linkUserId = decoded.id || decoded.userId;
                  linking = true;
                } catch (e) {
                  console.error('[AUTH /twitter/callback] Jeton de liaison invalide:', e);
                }
              }
              if (linking && linkUserId) {
                const existingUser = await User.findById(linkUserId);
                if (!existingUser) {
                  return res.redirect(`${process.env.CLIENT_URL}/login?error=user_not_found`);
                }
                const duplicate = await User.findOne({
                  'social.twitter.id': id,
                  _id: { $ne: existingUser._id }
                });
                if (duplicate) {
                  return res.redirect(`${process.env.CLIENT_URL}/login?error=twitter_already_linked`);
                }
                if (!existingUser.social) existingUser.social = {};
                existingUser.social.twitter = {
                  id,
                  username,
                  name: displayName,
                  email,
                  profileImageUrl,
                  description: descriptionText,
                  followersCount,
                  followingCount,
                  verified: accountVerified,
                  createdAt: accountCreatedAt,
                  token: accessToken,
                  tokenSecret: accessTokenSecret,
                  lastUpdated: Date.now()
                };
                await existingUser.save();
                
                // MODIFICATION: Toujours envoyer les tokens si l'adresse de portefeuille existe
                if (existingUser.walletAddress) {
                  // Send verification tokens asynchronously without blocking the response
                  (async () => {
                    try {
                      const success = await sendVerificationTokens(existingUser.walletAddress);
                      if (success) {
                        console.log(
                          `[AUTH /twitter/callback] Tokens de vérification Twitter envoyés à ${existingUser.walletAddress}`
                        );
                        // Update verification status in database
                        await User.findByIdAndUpdate(
                          existingUser._id,
                          { $set: { 'socialVerifications.twitter': { verified: true, timestamp: new Date() } } }
                        );
                      } else {
                        console.error(
                          `[AUTH /twitter/callback] Échec envoi tokens vérification Twitter à ${existingUser.walletAddress}`
                        );
                      }
                    } catch (tokenErr) {
                      console.error(
                        '[AUTH /twitter/callback] Erreur envoi tokens vérification Twitter:',
                        tokenErr
                      );
                    }
                  })();
                }
                
                // Immediately redirect without waiting for token transfer
                return res.redirect(`${WORLDAPP_DEEP_LINK}&linked=twitter`);
              }
              // Flux d'authentification normal
              let user = await User.findOne({ 'social.twitter.id': id });
              if (user) {
                if (!user.social) user.social = {};
                user.social.twitter = {
                  id,
                  username,
                  name: displayName,
                  email,
                  profileImageUrl,
                  description: descriptionText,
                  followersCount,
                  followingCount,
                  verified: accountVerified,
                  createdAt: accountCreatedAt,
                  token: accessToken,
                  tokenSecret: accessTokenSecret,
                  lastUpdated: Date.now()
                };
                await user.save();
              } else {
                user = new User({
                  name: displayName,
                  username,
                  email,
                  social: {
                    twitter: {
                      id,
                      username,
                      name: displayName,
                      email,
                      profileImageUrl,
                      description: descriptionText,
                      followersCount,
                      followingCount,
                      verified: accountVerified,
                      createdAt: accountCreatedAt,
                      token: accessToken,
                      tokenSecret: accessTokenSecret,
                      lastUpdated: Date.now()
                    }
                  }
                });
                await user.save();
              }
              const jwtToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1d' });
              console.log('[AUTH /twitter/callback] Utilisateur authentifié:', { id: user.id, username: user.username, name: user.name });
              console.log('[AUTH /twitter/callback] Redirection vers le deep link avec JWT');
              // Redirect back to World App via deep link with JWT token
              return res.redirect(`${WORLDAPP_DEEP_LINK}&token=${jwtToken}`);
            } catch (dbErr) {
              console.error('[AUTH /twitter/callback] Erreur base :', dbErr);
              return res.redirect(`${process.env.CLIENT_URL}/login?error=server_error`);
            }
          }
        );
      }
    );
  });

  // --- Routes Discord (OAuth2) ---
  router.get('/discord', prepareSocialLink, (req, res, next) => {
    console.log('========== [AUTH /discord] DÉMARRAGE ==========');
    console.log('[AUTH /discord] Query params:', req.query, 'Session:', req.session);
    // Propagate OAuth2 state for linking/login
    const authOptions = { scope: ['identify', 'email'] };
    if (req.query.state) authOptions.state = req.query.state;
    passport.authenticate('discord', authOptions)(req, res, next);
  });

  router.get('/discord/callback',
    (req, res, next) => {
      console.log('========== [AUTH /discord/callback] DÉMARRAGE ==========');
      console.log('[AUTH /discord/callback] Query params:', req.query);
      next();
    },
    passport.authenticate('discord', {
      failureRedirect: `${process.env.CLIENT_URL}/login?error=discord_failed`,
      session: false
    }),
    async (req, res) => {
      console.log('[AUTH DISCORD CB] User:', req.user ? req.user.id : 'none');
      if (!req.user) {
        console.error('[AUTH DISCORD CB] Aucun utilisateur après succès Passport');
        return res.redirect(`${process.env.CLIENT_URL}/login?error=user_not_found`);
      }
      // Detect linking from OAuth2 state
      let wasLinking = false;
      if (req.query.state) {
        try {
          const decoded = Buffer.from(req.query.state, 'base64').toString();
          const stateData = JSON.parse(decoded);
          wasLinking = stateData.linkMode === true;
        } catch (e) {
          console.error('[AUTH DISCORD CB] Échec décodage state:', e);
        }
      }
      if (wasLinking) {
        console.log('[AUTH DISCORD CB] Liaison réussie, envoi tokens de vérification Discord');
        const existingUser = req.user;
        
        // MODIFICATION: Toujours envoyer les tokens si l'adresse de portefeuille existe
        if (existingUser.walletAddress) {
          // Send verification tokens asynchronously without blocking the response
          (async () => {
            try {
              const success = await sendVerificationTokens(existingUser.walletAddress);
              if (success) {
                console.log(
                  `[AUTH DISCORD CB] Tokens de vérification Discord envoyés à ${existingUser.walletAddress}`
                );
                // Update verification status in database
                await User.findByIdAndUpdate(
                  existingUser._id,
                  { $set: { 'socialVerifications.discord': { verified: true, timestamp: new Date() } } }
                );
              } else {
                console.error(
                  `[AUTH DISCORD CB] Échec envoi tokens vérification Discord à ${existingUser.walletAddress}`
                );
              }
            } catch (tokenErr) {
              console.error(
                '[AUTH DISCORD CB] Erreur envoi tokens vérification Discord:',
                tokenErr
              );
            }
          })();
        }
        
        // Immediately redirect without waiting for token transfer
        console.log('[AUTH DISCORD CB] Redirection vers World App après liaison réussie');
        return res.redirect(`${WORLDAPP_DEEP_LINK}&linked=discord`);
      }
      // Normal login flow: redirect with JWT to World App
      const jwtToken = jwt.sign({ id: req.user.id }, process.env.JWT_SECRET, { expiresIn: '1d' });
      console.log('[AUTH DISCORD CB] JWT generated, redirection vers World App');
      return res.redirect(`${WORLDAPP_DEEP_LINK}&token=${jwtToken}`);
    }
  );

  // --- Routes Telegram (Login via Telegram Widget) ---
  router.get('/telegram', prepareSocialLink, (req, res) => {
    const botUsername = process.env.TELEGRAM_BOT_USERNAME;
    const callbackBaseUrl = process.env.TELEGRAM_CALLBACK_URL;
    const qs = querystring.stringify(req.query);
  
    console.log('the bot username', botUsername);
    const callbackUrl = qs ? `${callbackBaseUrl}?${qs}` : callbackBaseUrl;
    
    res.send(`<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login with Telegram</title>
    <style>
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      }
      
      body {
        background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .auth-container {
        background-color: white;
        border-radius: 12px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        padding: 40px;
        width: 90%;
        max-width: 480px;
        text-align: center;
        overflow: hidden;
      }
      
      .logo {
        width: 120px;
        margin-bottom: 20px;
      }
      
      h1 {
        color: #333;
        margin-bottom: 12px;
        font-size: 1.8rem;
      }
      
      p {
        color: #666;
        margin-bottom: 30px;
        line-height: 1.5;
      }
      
      .telegram-btn {
        margin: 0 auto;
        display: flex;
        justify-content: center;
      }
      
      .footer {
        margin-top: 30px;
        color: #999;
        font-size: 0.8rem;
      }
      
      .brand-colors {
        height: 5px;
        width: 100%;
        background: linear-gradient(90deg, #0088cc, #31a9de);
        margin-bottom: 30px;
        border-radius: 3px;
      }
  
      @media (max-width: 480px) {
        .auth-container {
          padding: 25px;
          width: 95%;
        }
      }
    </style>
  </head>
  <body>
    <div class="auth-container">
      <div class="brand-colors"></div>
      <!-- Replace with your logo URL -->
      // <img src="./UMAN_LOGO.png" alt="Logo" class="logo">
      <h1>Login with Telegram</h1>
      <p>Click the button below to sign in with your Telegram account. This method is simple, fast, and secure.</p>
      
      <div class="telegram-btn">
        <script async src="https://telegram.org/js/telegram-widget.js?15"
          data-telegram-login="${botUsername}"
          data-size="large"
          data-userpic="true"
          data-auth-url="${callbackUrl}"
          data-radius="8"
          data-request-access="write">
        </script>
      </div>
      
      <div class="footer">
        <p>By logging in, you agree to our terms of service and privacy policy.</p>
      </div>
    </div>
  </body>
  </html>`);
  });

  router.get('/telegram/callback', async (req, res) => {
    try {
      // Extract only Telegram auth fields; ignore linking params (state, token) in hash verification
      const { hash, state, token, ...authData } = req.query;
      const dataCheckStrings = Object.keys(authData)
        .sort()
        .map((key) => `${key}=${authData[key]}`);
      const dataCheckString = dataCheckStrings.join('\n');
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      const secretKey = crypto.createHash('sha256').update(botToken).digest();
      const hmac = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
      if (hmac !== hash) {
        console.error('[AUTH /telegram/callback] Hash verification failed');
        return res.redirect(`${process.env.CLIENT_URL}/login?error=telegram_hash_mismatch`);
      }
      const telegramId = authData.id;
      const username = authData.username;
      const firstName = authData.first_name;
      const lastName = authData.last_name;
      const name = [firstName, lastName].filter(Boolean).join(' ');
      const profileImageUrl = authData.photo_url;
      const authDate = authData.auth_date ? new Date(Number(authData.auth_date) * 1000) : undefined;
      let linking = false;
      let linkUserId = null;
      if (req.session.linkMode && req.session.linkUserId) {
        linking = true;
        linkUserId = req.session.linkUserId;
      } else if (req.query.token) {
        try {
          const decoded = jwt.verify(req.query.token, process.env.JWT_SECRET);
          linkUserId = decoded.id || decoded.userId;
          linking = true;
        } catch (e) {
          console.error('[AUTH /telegram/callback] Invalid JWT for linking', e);
        }
      }
      if (linking && linkUserId) {
        const existingUser = await User.findById(linkUserId);
        if (!existingUser) {
          return res.redirect(`${process.env.CLIENT_URL}/login?error=user_not_found`);
        }
        const duplicate = await User.findOne({
          'social.telegram.id': telegramId,
          _id: { $ne: existingUser._id }
        });
        if (duplicate) {
          return res.redirect(`${process.env.CLIENT_URL}/login?error=telegram_already_linked`);
        }
        existingUser.social = existingUser.social || {};
        existingUser.social.telegram = {
          id: telegramId,
          username,
          firstName,
          lastName,
          name,
          profileImageUrl,
          authDate,
          lastUpdated: Date.now()
        };
        await existingUser.save();
        
        // MODIFICATION: Toujours envoyer les tokens si l'adresse de portefeuille existe
        if (existingUser.walletAddress) {
          // Send verification tokens asynchronously without blocking the response
          (async () => {
            try {
              const success = await sendVerificationTokens(existingUser.walletAddress);
              if (success) {
                console.log(
                  `[AUTH /telegram/callback] Tokens de vérification Telegram envoyés à ${existingUser.walletAddress}`
                );
                // Update verification status in database
                await User.findByIdAndUpdate(
                  existingUser._id,
                  { $set: { 'socialVerifications.telegram': { verified: true, timestamp: new Date() } } }
                );
              } else {
                console.error(
                  `[AUTH /telegram/callback] Échec envoi tokens vérification Telegram à ${existingUser.walletAddress}`
                );
              }
            } catch (tokenErr) {
              console.error(
                '[AUTH /telegram/callback] Erreur envoi tokens vérification Telegram:',
                tokenErr
              );
            }
          })();
        }
        
        // Immediately redirect without waiting for token transfer
        return res.redirect(`${WORLDAPP_DEEP_LINK}&linked=telegram`);
      }
      let user = await User.findOne({ 'social.telegram.id': telegramId });
      if (user) {
        user.social = user.social || {};
        user.social.telegram = {
          id: telegramId,
          username,
          firstName,
          lastName,
          name,
          profileImageUrl,
          authDate,
          lastUpdated: Date.now()
        };
        await user.save();
      } else {
        user = new User({
          name: name || username,
          username: username || `tg_${telegramId}`,
          social: {
            telegram: {
              id: telegramId,
              username,
              firstName,
              lastName,
              name,
              profileImageUrl,
              authDate,
              lastUpdated: Date.now()
            }
          }
        });
        await user.save();
      }
      const jwtToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1d' });
      return res.redirect(`${WORLDAPP_DEEP_LINK}&token=${jwtToken}`);
    } catch (err) {
      console.error('[AUTH /telegram/callback] Error processing Telegram callback', err);
      return res.redirect(`${process.env.CLIENT_URL}/login?error=server_error`);
    }
  });

  router.get('/generate-link-token', authenticateToken, async (req, res) => {
    const userId = req.user.id; // Récupéré via le middleware authenticateToken
    const linkToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // Expire dans 10 min
  
    // Stocker dans une nouvelle collection MongoDB
    const LinkToken = mongoose.model('LinkToken', new mongoose.Schema({
      token: { type: String, required: true, unique: true },
      userId: { type: String, required: true },
      expiresAt: { type: Date, required: true }
    }));
  
    await LinkToken.create({ token: linkToken, userId, expiresAt });
    res.json({ linkToken });
  });

  // Endpoint pour générer un nonce
  router.get('/nonce', (req, res) => {
    const nonce = crypto.randomUUID().replace(/-/g, "");
    const nonceId = crypto.randomUUID();
    nonceStore[nonceId] = nonce;
    res.json({ nonce, nonceId });
  });

  // Endpoint pour compléter l'authentification SIWE
  // Endpoint pour compléter l'authentification SIWE
  router.post('/complete-siwe', async (req, res) => {
    const { payload, nonce, nonceId, username, referralCode } = req.body;
    const storedNonce = nonceStore[nonceId];
    const requestOrigin = req.headers.origin || 'Unknown';
    console.log(`\n[SIWE AUTH] ===== SIWE Authentication Attempt =====`);
    console.log(`[SIWE AUTH] Request origin: ${requestOrigin}`);
    console.log(`[SIWE AUTH] ===== COMPLETE PAYLOAD =====`);
    console.log(JSON.stringify(payload, null, 2));
    console.log(`[SIWE AUTH] Username from request body: ${username}`);
  
    if (!storedNonce || nonce !== storedNonce) {
      console.log(`[SIWE AUTH] Invalid nonce: ${nonceId}`);
      return res.json({ status: 'error', isValid: false, message: 'Invalid nonce', requestOrigin });
    }
  
    try {
      console.log(`[SIWE AUTH] Verifying SIWE message...`);
      const validMessage = await verifySiweMessage(payload, nonce);
      delete nonceStore[nonceId];
  
      if (!validMessage.isValid) {
        console.log(`[SIWE AUTH] Invalid signature`);
        return res.json({ status: 'error', isValid: false, message: 'Invalid signature' });
      }
  
      const userAddress = payload.address;
      console.log(`[SIWE AUTH] Valid signature from wallet: ${userAddress}`);
  
      // Determine or generate username
      let usernameToUse = username;
      if (!usernameToUse) {
        usernameToUse = `user_${userAddress.substring(2, 8)}`;
        console.log(`[SIWE AUTH] No username provided, generated: ${usernameToUse}`);
      }
  
      // Check for linking
      const authHeader = req.headers.authorization;
      let isLinking = false;
      let existingUserId = null;
      if (authHeader?.startsWith('Bearer ')) {
        try {
          const decoded = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET);
          existingUserId = decoded.id;
          isLinking = true;
          console.log(`[SIWE AUTH] Linking mode for user ID: ${existingUserId}`);
        } catch (tokenError) {
          console.error('[SIWE AUTH] Error verifying token for linking:', tokenError);
        }
      }
  
      if (isLinking && existingUserId) {
        // Linking existing account
        const existingUser = await User.findById(existingUserId);
        if (!existingUser) {
          return res.json({ status: 'error', isValid: false, message: 'User not found for linking' });
        }
        // Prevent duplicate wallet link
        const duplicate = await User.findOne({ walletAddress: userAddress, _id: { $ne: existingUserId } });
        if (duplicate) {
          return res.json({ status: 'error', isValid: false, message: 'Wallet already linked to another user' });
        }
        existingUser.walletAddress = userAddress;
        await existingUser.save();
        return res.json({ status: 'success', isValid: true, message: 'Wallet linked successfully', walletAddress: userAddress, username: existingUser.username });
      }
  
      // Lookup or create user
      let user = await User.findOne({ walletAddress: userAddress });
      let userFoundMethod = user ? 'walletAddress' : null;
  
      if (!user && usernameToUse && !usernameToUse.startsWith('user_')) {
        const userByUsername = await User.findOne({ username: usernameToUse });
        if (userByUsername) {
          user = userByUsername;
          userFoundMethod = 'username';
          console.log(`[SIWE AUTH] User found by username: ${usernameToUse}`);
        }
      }
  
      if (user) {
        console.log(`[SIWE AUTH] User found by ${userFoundMethod}: ${user._id}`);
        if (userFoundMethod === 'walletAddress') {
          if (!usernameToUse.startsWith('user_') && user.username !== usernameToUse) {
            const existingUsername = await User.findOne({ username: usernameToUse, _id: { $ne: user._id } });
            if (!existingUsername) {
              console.log(`[SIWE AUTH] Updating username to ${usernameToUse}`);
              user.username = usernameToUse;
              await user.save();
            }
          }
        } else {
          if (user.walletAddress !== userAddress) {
            console.log(`[SIWE AUTH] Updating wallet to ${userAddress}`);
            user.walletAddress = userAddress;
            await user.save();
          }
        }
      } else {
        // Create new user
        console.log(`[SIWE AUTH] Creating new user: ${usernameToUse}`);
        user = new User({
          walletAddress: userAddress,
          username: usernameToUse,
          name: usernameToUse,
          dateCreated: new Date()
        });
        await user.save();
  
        // Token distribution en arrière-plan
        const distributeTokensInBackground = async (userAddress, referralCode) => {
          try {
            // 1) Welcome tokens
            const txWelcome = await distributeTokens(userAddress, '10.0');
            await txWelcome.wait();
            console.log('[SIWE AUTH] Welcome tokens sent');
  
            // 2) Referral bonus for new user & referrer
            if (referralCode) {
              // Only link bonus if referrer exists and is verified
              const referrer = await User.findOne({ referralCode});
              if (referrer) {
                // a) New user bonus
                const txNew = await distributeTokens(userAddress, '20.0');
                await txNew.wait();
                console.log('[SIWE AUTH] Referral tokens sent to new user');
                // b) Referrer bonus
                const txRef = await distributeTokens(referrer.walletAddress, '20.0');
                await txRef.wait();
                console.log('[SIWE AUTH] Referral tokens sent to referrer');
              } else {
                console.log(`[SIWE AUTH] Invalid referral code: ${referralCode}`);
              }
            }
          } catch (err) {
            console.error('[SIWE AUTH] Error distributing tokens:', err);
          }
        };
  
        // Lancer le processus sans attendre
        distributeTokensInBackground(userAddress, referralCode);
      }
  
      // JWT generation & cookie
      const token = jwt.sign({ walletAddress: userAddress, username: user.username, userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
      res.cookie('auth_token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 7*24*60*60*1000 });
      res.json({ status: 'success', isValid: true, walletAddress: userAddress, username: user.username, token, userId: user._id });
  
    } catch (error) {
      console.log(`[SIWE AUTH] Error during authentication: ${error.message}`);
      res.json({ status: 'error', isValid: false, message: error.message });
    }
  });

  // --- Route pour une connexion directe sans authentification sociale ---
  router.post('/auto-login', async (req, res) => {
    try {
      console.log('[API /auto-login] Requête de connexion automatique reçue');
      
      // Créer ou trouver un utilisateur temporaire
      let user = await User.findOne({ temporary: true });
      
      if (!user) {
        // Créer un utilisateur temporaire s'il n'existe pas
        console.log('[API /auto-login] Création d\'un utilisateur temporaire');
        user = new User({
          name: "Utilisateur Temporaire",
          email: `temp-${Date.now()}@example.com`,
          temporary: true,
          social: {}
        });
        
        await user.save();
        console.log(`[API /auto-login] Utilisateur temporaire créé: ${user.id}`);
      } else {
        console.log(`[API /auto-login] Utilisateur temporaire existant trouvé: ${user.id}`);
      }
      
      // Générer le JWT pour cet utilisateur
      const payload = { id: user.id };
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });
      
      // Retourner le token au client
      res.json({ 
        token, 
        message: 'Connexion automatique réussie',
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        }
      });
    } catch (error) {
      console.error('[API /auto-login] Erreur:', error);
      res.status(500).json({ message: 'Erreur interne lors de la connexion automatique' });
    }
  });

  // --- Route pour récupérer les données utilisateur via JWT --- (Protégée)
  router.get('/me', authenticateToken, async (req, res) => {
    if (!req.user || !req.user.id) {
        return res.status(401).json({ message: 'ID utilisateur non trouvé dans le token' });
    }
    try {
      console.log(`[API /me] Recherche de l'utilisateur ID: ${req.user.id}`);
      const user = await User.findById(req.user.id)
                         .select('-social.twitter.token -social.twitter.tokenSecret'); 

      if (!user) {
        console.log(`[API /me] Utilisateur non trouvé pour l'ID: ${req.user.id}`);
        return res.status(404).json({ message: 'Utilisateur non trouvé' });
      }
      console.log(`[API /me] Utilisateur trouvé: ${user.name}, renvoi des données.`);
      res.json(user);
    } catch (err) {
      console.error("[API /me] Erreur lors de la récupération des données utilisateur:", err);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  });

  // --- Route Logout --- (Protégée ou non, selon la logique)
  router.post('/logout', (req, res, next) => {
    console.log('[API /logout] Tentative de déconnexion.');
    req.logout(function(err) {
      if (err) {
          console.error('Erreur pendant req.logout:', err);
      }
      req.session.destroy(function (err) {
        if (err) { console.error('Erreur pendant session.destroy:', err); }
        res.clearCookie('connect.sid'); 
        console.log('[API /logout] Session détruite et cookie effacé.');
        res.status(200).json({ message: 'Déconnexion réussie côté serveur' });
      });
    });
  });

  return router; // Renvoyer le routeur configuré
}