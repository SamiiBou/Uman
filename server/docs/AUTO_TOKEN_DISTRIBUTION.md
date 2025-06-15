# Distribution Automatique de Tokens UMI

## Vue d'ensemble

Ce système distribue automatiquement **0.5 tokens UMI** à tous les utilisateurs éligibles **toutes les 2 heures**.

## Fonctionnalités

### 🤖 Distribution Automatique
- **Fréquence** : Toutes les 2 heures (00:00, 02:00, 04:00, 06:00, etc.)
- **Montant** : 0.5 tokens UMI par utilisateur
- **Critères d'éligibilité** :
  - User `temporary` ≠ `true`
  - User a une `walletAddress` valide

### 📊 Suivi et Historique
- Historique des distributions stocké dans `autoDistributionHistory`
- Logs détaillés de chaque distribution
- Statistiques en temps réel

### 🔧 Administration
- Routes d'administration pour surveiller le système
- Possibilité de déclencher des distributions manuelles
- Statistiques détaillées et historique

## Installation

### 1. Installer les dépendances
```bash
cd server
npm install
# ou 
yarn install
```

La dépendance `node-cron` a été ajoutée au `package.json`.

### 2. Configuration des variables d'environnement

Ajoutez ces variables à votre fichier `.env` :

```env
# Distribution automatique (optionnel)
AUTO_DISTRIBUTE_ON_START=false  # true pour distribution immédiate au démarrage
TIMEZONE=UTC                    # Fuseau horaire pour les tâches programmées

# Administration (obligatoire pour les routes admin)
ADMIN_WALLETS=0xYourAdminWallet1,0xYourAdminWallet2
```

### 3. Démarrage
Le service démarre automatiquement avec le serveur. Aucune configuration supplémentaire nécessaire.

## Routes d'Administration

### Authentification
Toutes les routes admin nécessitent :
1. **Authentification JWT** (`authenticateToken` middleware)
2. **Droits administrateur** (adresse wallet dans `ADMIN_WALLETS`)

### Endpoints Disponibles

#### `GET /api/admin/distribution/stats`
Obtient les statistiques de distribution :
```json
{
  "success": true,
  "data": {
    "eligibleUsers": 150,
    "totalTokensInSystem": 12750.5,
    "tokensPerDistribution": 0.5,
    "distributionAttempts": 75,
    "nextExecution": "2024-01-15T14:00:00.000Z",
    "isCurrentlyRunning": false
  }
}
```

#### `POST /api/admin/distribution/manual`
Déclenche une distribution manuelle :
```json
{
  "success": true,
  "message": "Distribution manuelle exécutée avec succès",
  "timestamp": "2024-01-15T12:34:56.789Z"
}
```

#### `GET /api/admin/users/token-summary`
Résumé des tokens par utilisateur avec pagination :
- Query params : `page`, `limit`, `sortBy`, `order`

#### `GET /api/admin/distribution/history`
Historique des distributions avec pagination :
- Query params : `page`, `limit`

## Architecture

### Service Principal
**Fichier** : `services/autoTokenDistributor.js`

**Fonctions principales** :
- `startAutoTokenDistribution()` : Démarre le service
- `distributeAutoTokens()` : Exécute une distribution
- `manualDistributeTokens()` : Distribution manuelle
- `getDistributionStats()` : Statistiques

### Modèle de Données

**Ajout au modèle User** :
```javascript
autoDistributionHistory: [{
  amount: { type: Number, min: 0, required: true },
  timestamp: { type: Date, default: Date.now },
  type: { type: String, enum: ['auto_hourly', 'manual_admin'], default: 'auto_hourly' }
}]
```

### Programmation Cron
```javascript
const DISTRIBUTION_INTERVAL = '0 */2 * * *'; // Toutes les 2 heures
```

## Logs et Monitoring

### Types de Logs
- **🚀 Début de distribution** : Informations sur le démarrage
- **📊 Statistiques** : Nombre d'utilisateurs éligibles
- **✅ Succès** : Résultats de la distribution
- **❌ Erreurs** : Problèmes rencontrés
- **🔓 Fin** : Libération du verrou

### Exemple de Log
```
[AUTO DISTRIBUTOR] 🚀 Début de la distribution automatique de 0.5 tokens UMI à 2024-01-15T12:00:00.000Z
[AUTO DISTRIBUTOR] 📊 150 utilisateurs éligibles trouvés
[AUTO DISTRIBUTOR] ✅ Distribution terminée avec succès !
[AUTO DISTRIBUTOR] 📈 150 utilisateurs récompensés
[AUTO DISTRIBUTOR] 💰 Total distribué: 75.00 tokens UMI
[AUTO DISTRIBUTOR] ⏱️ Durée: 1234ms
```

## Sécurité

### Protection contre les Doublons
- Verrou avec `isRunning` pour éviter les exécutions simultanées
- Gestion d'erreur robuste avec retry logic

### Performance
- Utilisation de `updateMany()` pour la mise à jour en lot
- Sélection optimisée des champs avec `.select()`
- Pagination pour les routes d'administration

### Accès Administrateur
- Vérification de l'adresse wallet dans `ADMIN_WALLETS`
- Routes protégées par authentification JWT

## Développement et Tests

### Test Manuel
```bash
# 1. Définir AUTO_DISTRIBUTE_ON_START=true dans .env
# 2. Redémarrer le serveur
# 3. La distribution se déclenche après 5 secondes

# OU utiliser la route admin :
curl -X POST http://localhost:3001/api/admin/distribution/manual \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Logs de Développement
En mode `NODE_ENV=development`, les logs incluent :
- Liste détaillée des utilisateurs récompensés (10 premiers)
- Informations sur les balances mises à jour

## Personnalisation

### Modifier la Fréquence
Dans `services/autoTokenDistributor.js`, changez :
```javascript
const DISTRIBUTION_INTERVAL = '0 */1 * * *'; // Toutes les heures
// ou
const DISTRIBUTION_INTERVAL = '0 0 */6 * *'; // Toutes les 6 heures
```

### Modifier le Montant
```javascript
const AUTO_REWARD_AMOUNT = 1.0; // 1 token au lieu de 0.5
```

### Ajouter des Critères d'Éligibilité
Dans la fonction `distributeAutoTokens()`, modifiez le filtre :
```javascript
const users = await User.find({ 
  temporary: { $ne: true },
  walletAddress: { $exists: true, $ne: null },
  verified: true, // Ajouter : seulement les utilisateurs vérifiés
  'dailyLogin.currentStreak': { $gte: 3 } // Ajouter : streak ≥ 3 jours
});
```

## Dépannage

### La distribution ne fonctionne pas
1. Vérifiez les logs du serveur au démarrage
2. Confirmez que MongoDB est connecté
3. Vérifiez le format du cron : `'0 */2 * * *'`

### Erreurs d'autorisation admin
1. Vérifiez que `ADMIN_WALLETS` est défini
2. Confirmez que votre adresse wallet est dans la liste
3. Testez avec un JWT valide

### Performance lente
1. Vérifiez les index MongoDB sur `walletAddress` et `temporary`
2. Réduisez la limite de pagination si nécessaire
3. Surveillez les logs de durée des distributions

## Roadmap

### Fonctionnalités Futures
- [ ] Interface d'administration web
- [ ] Notifications push lors des distributions
- [ ] Système de bonus basé sur l'activité
- [ ] Distribution différenciée par niveau d'utilisateur
- [ ] Intégration avec des événements externes

### Optimisations
- [ ] Cache Redis pour les statistiques
- [ ] Archivage automatique de l'historique ancien
- [ ] Métriques de performance avancées
- [ ] Alertes automatiques en cas d'échec 