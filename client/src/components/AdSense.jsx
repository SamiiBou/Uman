import React, { useEffect, useRef, useState } from 'react';

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
  const adRef = useRef(null);
  const [adLoaded, setAdLoaded] = useState(false);

  useEffect(() => {
    const loadAd = () => {
      try {
        // Vérifier que le container existe et a des dimensions
        if (adRef.current && import.meta.env.MODE === 'production') {
          const rect = adRef.current.getBoundingClientRect();
          
          // S'assurer que l'élément est visible et a des dimensions
          if (rect.width > 0 && rect.height > 0) {
            // Attendre que le DOM soit complètement prêt
            if (window.adsbygoogle && !adLoaded) {
              (window.adsbygoogle = window.adsbygoogle || []).push({});
              setAdLoaded(true);
            }
          } else {
            // Si l'élément n'a pas de dimensions, réessayer après un court délai
            console.warn('AdSense: Container has no dimensions, retrying...');
            setTimeout(loadAd, 100);
          }
        }
      } catch (error) {
        console.error('Erreur AdSense:', error);
      }
    };

    // Attendre un court instant pour s'assurer que le DOM est rendu
    const timer = setTimeout(loadAd, 100);
    
    return () => clearTimeout(timer);
  }, [adLoaded]);

  // Ne pas afficher les publicités en mode développement
  if (import.meta.env.MODE !== 'production') {
    return (
      <div className={`border-2 border-dashed border-gray-300 p-4 text-center ${className}`} style={style}>
        <p className="text-gray-500 text-sm">AdSense Placeholder (Dev Mode)</p>
        <p className="text-gray-400 text-xs mt-1">Slot: {slot || 'Non spécifié'}</p>
      </div>
    );
  }

  return (
    <div 
      className={className} 
      style={{ 
        minWidth: '250px',
        minHeight: '50px',
        ...style 
      }}
    >
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ 
          display: 'block',
          minWidth: '250px',
          minHeight: '50px'
        }}
        data-ad-client="ca-pub-9377305341589290"
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive.toString()}
      />
    </div>
  );
};

export default AdSense;
