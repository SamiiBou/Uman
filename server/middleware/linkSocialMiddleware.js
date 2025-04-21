// Middleware pour préparer la liaison des comptes sociaux
export const prepareSocialLink = (req, res, next) => {
    console.log('[LINK MIDDLEWARE] Requête reçue avec query params:', req.query);
    console.log('[LINK MIDDLEWARE] Headers:', req.headers);
    console.log('[LINK MIDDLEWARE] Session avant traitement:', req.session);
    
    let isLinking = false;
    let userId = null;
    
    // 1. Vérifier le paramètre state (contient peut-être des informations de liaison encodées)
    if (req.query.state) {
        try {
            // Essayer de décoder le paramètre state s'il s'agit d'un JSON encodé en Base64
            const stateStr = Buffer.from(req.query.state, 'base64').toString();
            console.log('[LINK MIDDLEWARE] État décodé (brut):', stateStr);
            
            try {
                const stateData = JSON.parse(stateStr);
                console.log(`[LINK MIDDLEWARE] Données décodées du state:`, stateData);
                
                if (stateData.linkMode === true) {
                    isLinking = true;
                    
                    // Si userId est présent dans les données state, l'utiliser
                    if (stateData.userId) {
                        userId = stateData.userId;
                        console.log(`[LINK MIDDLEWARE] ID utilisateur récupéré du state: ${userId}`);
                    }
                }
            } catch (jsonError) {
                console.error('[LINK MIDDLEWARE] Erreur lors du parsing JSON du state décodé:', jsonError);
            }
        } catch (e) {
            console.error('[LINK MIDDLEWARE] Erreur lors du décodage Base64 du paramètre state:', e);
        }
    }
    
    // Reste du code inchangé...
    
    // Vérification plus stricte avant de réinitialiser le mode liaison
    if (!isLinking && !userId) {
        // Seulement effacer les données de liaison si on n'a pas détecté de mode liaison
        console.log('[LINK MIDDLEWARE] Mode liaison non détecté, effacement des données de session');
        req.session.linkUserId = null;
        req.session.linkMode = false;
    } else if (isLinking && userId) {
        // Si on a détecté un mode liaison, forcer la mise à jour de la session
        console.log(`[LINK MIDDLEWARE] Mode liaison détecté, forçage des paramètres de session: userId=${userId}`);
        req.session.linkMode = true;
        req.session.linkUserId = userId;
        // Forcer l'enregistrement de la session immédiatement
        req.session.save();
    }
    
    console.log('[LINK MIDDLEWARE] Session après traitement:', req.session);
    next();
};