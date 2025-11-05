# 🚀 Déployer votre site sur Vercel pour AdSense

## Pourquoi déployer ?

Google AdSense a besoin d'accéder à votre site publiquement sur Internet pour le vérifier.
Les sites en localhost ou avec des URLs temporaires (ngrok) ne peuvent PAS être vérifiés.

---

## Méthode 1 : Déploiement via le site Vercel (Le plus simple)

### Étape 1 : Préparer votre projet

```bash
cd "/Users/samiboudechicha/Desktop/untitled folder/Uman/client"

# Vérifier que tout compile
npm run build
```

### Étape 2 : Créer un compte Vercel

1. Allez sur [vercel.com](https://vercel.com)
2. Cliquez sur **Sign Up**
3. Connectez-vous avec GitHub, GitLab ou Email

### Étape 3 : Importer votre projet

1. Cliquez sur **Add New** → **Project**
2. Choisissez **Import Git Repository** OU **Upload project folder**
3. Si vous uploadez :
   - Glissez-déposez le dossier `client`
   - Vercel détectera automatiquement que c'est un projet Vite/React

### Étape 4 : Configurer le déploiement

Vercel détectera automatiquement les paramètres :
- **Framework Preset** : Vite
- **Build Command** : `npm run build`
- **Output Directory** : `dist`

Cliquez sur **Deploy** !

### Étape 5 : Obtenir votre URL

Une fois déployé, vous aurez une URL comme :
```
https://votre-projet.vercel.app
```

**C'est cette URL que vous devez ajouter dans Google AdSense !**

---

## Méthode 2 : Déploiement via CLI Vercel

```bash
# Installer Vercel CLI
npm install -g vercel

# Se connecter
vercel login

# Depuis le dossier client
cd "/Users/samiboudechicha/Desktop/untitled folder/Uman/client"

# Déployer
vercel

# Suivre les instructions :
# ? Set up and deploy "client"? [Y/n] y
# ? Which scope? [Votre compte]
# ? Link to existing project? [N]
# ? What's your project's name? uman-client
# ? In which directory is your code located? ./
```

Votre site sera déployé et vous aurez une URL publique !

---

## Méthode 3 : Netlify (Alternative)

### Via le site Netlify

1. Allez sur [netlify.com](https://netlify.com)
2. Créez un compte
3. Glissez-déposez le dossier `dist` (après avoir fait `npm run build`)
4. Votre site est en ligne !

### Via CLI

```bash
# Installer Netlify CLI
npm install -g netlify-cli

# Build
npm run build

# Déployer
netlify deploy --prod --dir=dist
```

---

## Après le déploiement

### 1. Ajouter votre domaine à AdSense

1. Copiez votre URL Vercel (ex: `https://uman-client.vercel.app`)
2. Allez sur [Google AdSense](https://www.google.com/adsense/)
3. Menu **Sites** → **Ajouter un site**
4. Collez votre URL
5. Suivez les instructions de vérification

### 2. Vérifier que le code AdSense est accessible

Ouvrez votre site déployé et vérifiez :
- Ctrl+U (voir la source)
- Cherchez `pagead2.googlesyndication.com`
- Le script doit être présent ✅

### 3. Attendre l'approbation

- ⏳ 24-48 heures pour la vérification
- 📧 Vous recevrez un email de Google
- Une fois approuvé, les publicités s'afficheront automatiquement

---

## ⚠️ Points importants

### Variables d'environnement

Si votre app utilise des variables d'environnement (API URLs, etc.), configurez-les dans Vercel :

1. Allez dans **Settings** → **Environment Variables**
2. Ajoutez vos variables :
   ```
   VITE_API_BASE_URL=https://votre-api.com
   ```

### Domaine personnalisé (Optionnel)

Si vous avez un domaine (ex: `monsite.com`) :

1. Dans Vercel : **Settings** → **Domains**
2. Ajoutez votre domaine personnalisé
3. Suivez les instructions DNS
4. Utilisez ce domaine pour AdSense

---

## 🐛 Problèmes courants

### "Site can't be reached"
→ Attendez quelques minutes après le déploiement

### "Build failed"
→ Vérifiez que `npm run build` fonctionne localement

### "AdSense can't verify"
→ Attendez 24h, puis essayez à nouveau

### "Environment variables not working"
→ Ajoutez-les dans Vercel Settings

---

## 📞 Support

- **Vercel Documentation** : https://vercel.com/docs
- **AdSense Help** : https://support.google.com/adsense/

---

**Temps estimé** : 10-15 minutes pour le déploiement
**Temps d'attente AdSense** : 24-48 heures pour l'approbation

