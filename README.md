# SocialID

SocialID est une application qui permet aux utilisateurs de vérifier leur identité en connectant leurs comptes de réseaux sociaux (Twitter/X, Instagram, Google et Facebook) en un seul endroit via OAuth.

## Fonctionnalités

- Authentification des utilisateurs avec OAuth 2.0
- Connexion avec plusieurs plateformes sociales:
  - Twitter/X
  - Facebook
  - Instagram
  - Google
- Interface moderne et réactive avec le style des plateformes sociales
- Gestion des sessions et persistance utilisateur
- Déconnexion des comptes de réseaux sociaux

## Structure du Projet

```
SocialId/
├── client/              # Frontend React (port 5173)
│   ├── src/
│   │   ├── components/  # Composants UI réutilisables
│   │   ├── pages/       # Composants de pages
│   │   └── App.jsx      # Composant App principal
└── server/              # Backend Express (port 3001)
    ├── config/          # Fichiers de configuration
    ├── controllers/     # Gestionnaires de requêtes 
    ├── middleware/      # Middleware Express
    ├── models/          # Modèles de base de données
    ├── routes/          # Routes API
    └── server.js        # Point d'entrée
```

## Prérequis

- Node.js v18 ou supérieur
- MongoDB en cours d'exécution localement ou accessible via internet
- Clés API pour Twitter, Facebook, Instagram et Google (YouTube)

## Installation

1. Clonez ce dépôt
2. Installez les dépendances:

```bash
# Pour le frontend
cd client
npm install

# Pour le backend
cd ../server
npm install
```

3. Configurez les variables d'environnement:

```bash
# Dans le dossier server
cp .env.example .env
# Modifiez .env avec vos clés API et autres paramètres
```

4. Démarrez l'application:

```bash
# Pour le frontend
cd client
npm run dev

# Pour le backend (dans un autre terminal)
cd server
npm run dev
```

## Configuration OAuth

Pour utiliser les fonctionnalités OAuth avec les différentes plateformes, vous devez créer des applications sur chacune de ces plateformes et obtenir les clés API:

### Twitter/X
1. Inscrivez-vous sur le [Twitter Developer Portal](https://developer.twitter.com/)
2. Créez un nouveau projet et une application
3. Configurez les paramètres OAuth (activez l'OAuth à 3 pattes)
4. Ajoutez l'URL de callback: `http://https://03a5f6ad56ec.ngrok.app /api/auth/twitter/callback`
5. Récupérez votre clé API et votre secret API

### Facebook
1. Inscrivez-vous sur [Facebook Developers](https://developers.facebook.com/)
2. Créez une nouvelle application
3. Ajoutez le produit Facebook Login
4. Configurez les URI de redirection OAuth valides: `http://https://03a5f6ad56ec.ngrok.app /api/auth/facebook/callback`
5. Récupérez votre ID d'application et votre secret d'application

### Google
1. Inscrivez-vous sur [Google Cloud Console](https://console.cloud.google.com/)
2. Créez un nouveau projet
3. Configurez l'écran de consentement OAuth
4. Créez des identifiants d'ID client OAuth
5. Ajoutez l'URI de redirection autorisée: `http://https://03a5f6ad56ec.ngrok.app /api/auth/google/callback`
6. Récupérez votre ID client et votre secret client

### Instagram
1. Inscrivez-vous sur [Facebook Developers](https://developers.facebook.com/)
2. Créez une nouvelle application (ou utilisez votre application Facebook)
3. Ajoutez le produit Instagram Basic Display
4. Configurez les URI de redirection OAuth valides: `http://https://03a5f6ad56ec.ngrok.app /api/auth/instagram/callback`
5. Récupérez votre ID client et votre secret client

Ajoutez ensuite ces clés dans votre fichier `.env`.

## Licence

Ce projet est sous licence MIT.