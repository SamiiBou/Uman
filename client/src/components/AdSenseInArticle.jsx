import React from 'react';
import AdSense from './AdSense';

/**
 * Composant pour les publicités AdSense In-Article
 * Idéal pour placer des publicités au sein du contenu textuel
 * S'intègre naturellement dans le flux de lecture
 */
const AdSenseInArticle = ({ slot, className = '', style = {} }) => {
  return (
    <AdSense
      slot={slot}
      format="fluid"
      responsive={true}
      className={className}
      style={{ 
        display: 'block',
        textAlign: 'center',
        margin: '20px 0',
        ...style 
      }}
    />
  );
};

export default AdSenseInArticle;

