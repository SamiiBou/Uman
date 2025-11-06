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

  const isProduction = import.meta.env.MODE === 'production';

  useEffect(() => {
    // Ne charger les pubs que en production
    if (!isProduction) return;
    
    const loadAd = () => {
      try {
        // Vérifier que le container existe et a des dimensions
        if (adRef.current) {
          const rect = adRef.current.getBoundingClientRect();
          
          // S'assurer que l'élément est visible et a des dimensions
          if (rect.width > 0 && rect.height > 0) {
            // Attendre que le DOM soit complètement prêt
            if (window.adsbygoogle && !adLoaded) {
              (window.adsbygoogle = window.adsbygoogle || []).push({});
              setAdLoaded(true);
              console.log('AdSense: Ad loaded successfully');
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
  }, [adLoaded, isProduction]);

  // En mode développement, afficher un placeholder visible
  if (!isProduction) {
    return (
      <div 
        className={className} 
        style={{ 
          minWidth: '250px',
          minHeight: '100px',
          backgroundColor: '#f0f0f0',
          border: '2px dashed #ccc',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '8px',
          padding: '1rem',
          ...style 
        }}
      >
        <p style={{ margin: '0 0 0.5rem 0', color: '#666', fontSize: '14px', fontWeight: 'bold' }}>
          📢 AdSense Placeholder
        </p>
        <p style={{ margin: 0, color: '#999', fontSize: '12px' }}>
          (Mode: {import.meta.env.MODE})
        </p>
        {slot && (
          <p style={{ margin: '0.5rem 0 0 0', color: '#999', fontSize: '11px' }}>
            Slot: {slot}
          </p>
        )}
      </div>
    );
  }

  // En production, afficher la vraie publicité AdSense
  return (
    <div 
      className={className} 
      style={{ 
        minWidth: '250px',
        minHeight: '100px',
        display: 'block',
        ...style 
      }}
    >
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ 
          display: 'block',
          minWidth: '250px',
          minHeight: '100px'
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
