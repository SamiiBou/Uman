import jwt from 'jsonwebtoken';

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  // Le format attendu est "Bearer TOKEN"
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) {
    console.log('[AuthMiddleware] Token manquant');
    // Pas de token fourni
    return res.status(401).json({ message: 'Accès non autorisé: Token manquant' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, userPayload) => {
    if (err) {
      console.log('[AuthMiddleware] Token invalide:', err.message);
      // Token invalide ou expiré
      return res.status(403).json({ message: 'Accès interdit: Token invalide ou expiré' });
    }
    // Si le token contient userId au lieu de id, unifier sous la propriété id
    if (userPayload && userPayload.userId && !userPayload.id) {
      userPayload.id = userPayload.userId;
    }
    console.log('[AuthMiddleware] Token valide. Payload:', userPayload);
    // Stocke le payload décodé (contenant maintenant id) dans req.user
    req.user = userPayload;
    next(); // Passe à la route suivante
  });
};
