import React, { useEffect } from 'react';

/**
 * Composant AdSense pour afficher des publicités Google AdSense
 * @param {string} slot - L'ID du slot publicitaire (data-ad-slot)
 * @param {string} format - Le format de la publicité (auto, rectangle, horizontal, vertical)
 * @param {boolean} responsive - Si la publicité doit être responsive (par défaut: true)
 * @param {string} className - Classes CSS supplémentaires
 * @param {string} style - Styles inline supplémentaires
 */
const AdSense = ({ 
  slot = '', 
  format = 'auto', 
  responsive = true,
  className = '',
  style = {}
}) => {
  useEffect(() => {
    try {
      // Initialiser AdSense après le montage du composant
      if (window.adsbygoogle && process.env.NODE_ENV === 'production') {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    } catch (error) {
      console.error('Erreur AdSense:', error);
    }
  }, []);

  // Ne pas afficher les publicités en mode développement
  if (process.env.NODE_ENV !== 'production') {
    return (
      <div className={`border-2 border-dashed border-gray-300 p-4 text-center ${className}`} style={style}>
        <p className="text-gray-500 text-sm">AdSense Placeholder (Dev Mode)</p>
        <p className="text-gray-400 text-xs mt-1">Slot: {slot || 'Non spécifié'}</p>
      </div>
    );
  }

  return (
    <div className={className} style={style}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block', ...style }}
        data-ad-client="ca-pub-9377305341589290"
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive.toString()}
      />
    </div>
  );
};

export default AdSense;
