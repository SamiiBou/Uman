# 🚀 AdSense - Guide de Démarrage Rapide

## ✅ Déjà installé

✓ Script AdSense ajouté dans `index.html`  
✓ Composants AdSense créés  
✓ Exemple d'utilisation dans la page d'accueil  

---

## 🎯 3 étapes pour activer les publicités

### 1️⃣ Obtenez vos Slot IDs depuis AdSense

1. Allez sur [Google AdSense](https://www.google.com/adsense/)
2. **Annonces** → **Par unité publicitaire** → **Nouvelle unité publicitaire**
3. Créez une unité "Display responsive"
4. **Copiez le `data-ad-slot`** (ex: "1234567890")

### 2️⃣ Remplacez le Slot ID dans votre code

Dans `src/pages/Home.jsx`, ligne 446 :

```jsx
// AVANT
<AdSenseAuto slot="YOUR_AD_SLOT_ID" ... />

// APRÈS
<AdSenseAuto slot="1234567890" ... />
```

### 3️⃣ Testez en production

```bash
npm run build
npm run preview
```

**Note** : En développement (`npm run dev`), vous verrez un placeholder gris au lieu des vraies publicités.

---

## 📦 Composants disponibles

| Composant | Usage | Idéal pour |
|-----------|-------|------------|
| `AdSenseAuto` | Publicité responsive automatique | Bannières générales |
| `AdSenseInFeed` | Publicité dans les flux | Listes, résultats de recherche |
| `AdSenseInArticle` | Publicité dans le contenu | Articles, contenu textuel |
| `AdSense` | Composant de base personnalisable | Usage avancé |

---

## 💡 Exemple rapide : Ajouter une publicité ailleurs

```jsx
import AdSenseAuto from '../components/AdSenseAuto';

function MaPage() {
  return (
    <div>
      <h1>Titre</h1>
      
      <AdSenseAuto slot="VOTRE_SLOT_ID" />
      
      <p>Votre contenu...</p>
    </div>
  );
}
```

---

## ⚠️ Important

- **Ne cliquez jamais sur vos propres publicités** (risque de bannissement)
- **Maximum 3 publicités par page** (recommandation Google)
- **Attendez l'approbation AdSense** (24-48h après ajout du code)

---

**Pour plus de détails** : Consultez `ADSENSE_GUIDE.md`

