# Configuration des variables d'environnement

## Production (Vercel)

L'application utilise automatiquement l'URL de production : **https://uman.onrender.com**

Aucune configuration supplémentaire n'est nécessaire pour la production.

## Développement Local

Pour le développement local, créez un fichier `.env.local` à la racine du dossier `client/` :

```bash
# Backend API URLs (choisir une option)

# Option 1: Serveur local
VITE_API_BASE_URL=http://localhost:3000/api
VITE_BACKEND_URL=http://localhost:3000

# Option 2: Serveur ngrok (pour tester sur mobile)
# VITE_API_BASE_URL=https://votre-url-ngrok.ngrok.app/api
# VITE_BACKEND_URL=https://votre-url-ngrok.ngrok.app

# Option 3: Serveur de production (pour tester)
# VITE_API_BASE_URL=https://uman.onrender.com/api
# VITE_BACKEND_URL=https://uman.onrender.com

# Token contract address
VITE_TOKEN_CONTRACT_ADDRESS=0x41Da2F787e0122E2e6A72fEa5d3a4e84263511a8

# Worldcoin App ID (optionnel)
VITE_WORLDCOIN_APP_ID=
```

## Utilisation avec ngrok

Si vous développez localement et voulez tester sur votre téléphone :

1. Démarrez votre serveur backend localement
2. Lancez ngrok : `ngrok http 3000`
3. Copiez l'URL ngrok générée (ex: `https://abc123.ngrok.app`)
4. Dans `.env.local`, remplacez les URLs par votre URL ngrok
5. Redémarrez votre application frontend

## Variables disponibles

- `VITE_API_BASE_URL` : URL de base pour les appels API (avec `/api`)
- `VITE_BACKEND_URL` : URL du backend (sans `/api`)
- `VITE_TOKEN_CONTRACT_ADDRESS` : Adresse du contrat de token
- `VITE_WORLDCOIN_APP_ID` : ID de l'application Worldcoin

## Fichiers de configuration

- `src/config.js` : Configuration centralisée (ne pas modifier directement)
- `.env.local` : Variables d'environnement locales (ignoré par git)
- `.env.example` : Exemple de fichier de configuration

## Priorité des variables

1. Variables d'environnement (`.env.local`)
2. Valeurs par défaut dans `config.js` (production : Render)

## Notes importantes

⚠️ **Ne jamais commiter `.env.local`** - Il est automatiquement ignoré par git

✅ **En production**, l'application utilise automatiquement `https://uman.onrender.com`

🔧 **Pour le développement**, créez `.env.local` et configurez vos URLs locales


