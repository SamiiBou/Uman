import React from 'react';
import AdSenseAuto from './AdSenseAuto';
import AdSenseInFeed from './AdSenseInFeed';
import AdSenseInArticle from './AdSenseInArticle';
import AdSense from './AdSense';

/**
 * Fichier d'exemples pour les différents types de publicités AdSense
 * Ce fichier n'est pas utilisé dans l'app, c'est juste pour référence
 */

// ========================================
// Exemple 1 : Bannière responsive simple
// ========================================
export const BannerExample = () => (
  <div className="container">
    <h2>Mon titre</h2>
    
    <AdSenseAuto 
      slot="VOTRE_SLOT_ID"
      style={{ margin: '20px 0', maxWidth: '728px' }}
    />
    
    <p>Votre contenu ici...</p>
  </div>
);

// ========================================
// Exemple 2 : Publicité dans une liste
// ========================================
export const InFeedListExample = ({ items }) => (
  <div className="list-container">
    {items.map((item, index) => (
      <React.Fragment key={item.id}>
        <div className="list-item">
          <h3>{item.title}</h3>
          <p>{item.description}</p>
        </div>
        
        {/* Insérer une publicité tous les 5 éléments */}
        {(index + 1) % 5 === 0 && (
          <AdSenseInFeed 
            slot="VOTRE_SLOT_ID"
            className="my-4"
          />
        )}
      </React.Fragment>
    ))}
  </div>
);

// ========================================
// Exemple 3 : Publicité dans un article
// ========================================
export const ArticleExample = () => (
  <article>
    <h1>Titre de l'article</h1>
    
    <p>Premier paragraphe...</p>
    <p>Deuxième paragraphe...</p>
    
    {/* Publicité au milieu de l'article */}
    <AdSenseInArticle slot="VOTRE_SLOT_ID" />
    
    <p>Suite de l'article...</p>
    <p>Conclusion...</p>
  </article>
);

// ========================================
// Exemple 4 : Sidebar avec publicité
// ========================================
export const SidebarExample = () => (
  <div className="layout">
    <main className="content">
      <h1>Contenu principal</h1>
      <p>Texte...</p>
    </main>
    
    <aside className="sidebar">
      <h3>À propos</h3>
      <p>Info...</p>
      
      {/* Publicité verticale dans la sidebar */}
      <AdSense
        slot="VOTRE_SLOT_ID"
        format="vertical"
        responsive={true}
        style={{ 
          display: 'block',
          minWidth: '160px',
          minHeight: '600px'
        }}
      />
    </aside>
  </div>
);

// ========================================
// Exemple 5 : Publicité responsive avec format personnalisé
// ========================================
export const CustomFormatExample = () => (
  <div>
    {/* Rectangle fixe (300x250) */}
    <AdSense
      slot="VOTRE_SLOT_ID"
      format="rectangle"
      responsive={false}
      style={{ 
        display: 'inline-block',
        width: '300px',
        height: '250px'
      }}
    />
    
    {/* Bannière horizontale responsive */}
    <AdSense
      slot="VOTRE_SLOT_ID"
      format="horizontal"
      responsive={true}
      style={{ 
        display: 'block',
        margin: '20px auto'
      }}
    />
  </div>
);

// ========================================
// Exemple 6 : Publicité conditionnelle
// ========================================
export const ConditionalAdExample = ({ isPremiumUser }) => (
  <div>
    <h2>Contenu</h2>
    
    {/* Afficher la publicité seulement pour les utilisateurs gratuits */}
    {!isPremiumUser && (
      <AdSenseAuto 
        slot="VOTRE_SLOT_ID"
        className="my-6"
      />
    )}
    
    <p>Suite du contenu...</p>
  </div>
);

// ========================================
// Exemple 7 : Plusieurs publicités sur une page
// ========================================
export const MultipleAdsExample = () => (
  <div className="page">
    <header>
      <h1>Ma Page</h1>
      
      {/* Publicité 1 : En haut de page */}
      <AdSenseAuto 
        slot="SLOT_ID_1"
        style={{ maxWidth: '728px', margin: '20px auto' }}
      />
    </header>
    
    <main>
      <section>
        <h2>Section 1</h2>
        <p>Contenu...</p>
      </section>
      
      {/* Publicité 2 : Au milieu */}
      <AdSenseInArticle slot="SLOT_ID_2" />
      
      <section>
        <h2>Section 2</h2>
        <p>Contenu...</p>
      </section>
    </main>
    
    <footer>
      {/* Publicité 3 : En bas de page */}
      <AdSenseAuto 
        slot="SLOT_ID_3"
        style={{ maxWidth: '728px', margin: '20px auto' }}
      />
    </footer>
  </div>
);

// ========================================
// Exemple 8 : Publicité mobile vs desktop
// ========================================
export const ResponsiveAdExample = () => {
  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 768);
  
  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  return (
    <div>
      <h2>Contenu</h2>
      
      {/* Format différent selon l'écran */}
      <AdSenseAuto 
        slot={isMobile ? "SLOT_ID_MOBILE" : "SLOT_ID_DESKTOP"}
        style={{ 
          maxWidth: isMobile ? '320px' : '728px',
          margin: '20px auto'
        }}
      />
    </div>
  );
};

export default {
  BannerExample,
  InFeedListExample,
  ArticleExample,
  SidebarExample,
  CustomFormatExample,
  ConditionalAdExample,
  MultipleAdsExample,
  ResponsiveAdExample
};

