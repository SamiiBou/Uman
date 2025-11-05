import React from 'react';
import AdSense from './AdSense';

/**
 * Composant pour les publicités AdSense automatiques (responsive)
 * Utilisez ce composant pour des publicités qui s'adaptent automatiquement à l'espace disponible
 */
const AdSenseAuto = ({ slot, className = '', style = {} }) => {
  return (
    <AdSense
      slot={slot}
      format="auto"
      responsive={true}
      className={className}
      style={{ display: 'block', ...style }}
    />
  );
};

export default AdSenseAuto;

