import React from 'react';
import AdSense from './AdSense';

/**
 * Composant pour les publicités AdSense In-Feed
 * Idéal pour intégrer des publicités dans des listes de contenu (flux, résultats de recherche, etc.)
 * Les publicités In-Feed s'adaptent au style de votre contenu
 */
const AdSenseInFeed = ({ slot, className = '', style = {} }) => {
  return (
    <AdSense
      slot={slot}
      format="fluid"
      responsive={true}
      className={className}
      style={{ 
        display: 'block',
        textAlign: 'center',
        ...style 
      }}
    />
  );
};

export default AdSenseInFeed;

