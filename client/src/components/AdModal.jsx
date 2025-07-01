import React from 'react';
import { X } from 'lucide-react';
import adImage from '../assets/ad_K.png';

const AdModal = ({ isOpen, onClose }) => {
  console.log('🔵 AdModal - Props reçues:', { isOpen, onClose: !!onClose });
  console.log('🔵 AdImage imported:', adImage);

  const handleAdClick = () => {
    console.log('🔵 Ad clicked!');
    const umanAppUrl = "worldapp://mini-app?app_id=app_f6f3209bce9f1cea7d219bed96170e46";
    window.open(umanAppUrl, '_blank');
  };

  const handleImageLoad = () => {
    console.log('✅ Image loaded successfully!');
  };

  const handleImageError = (e) => {
    console.error('❌ Failed to load image:', e);
    console.error('❌ Image src:', adImage);
  };

  if (!isOpen) {
    console.log('🔵 AdModal - Not rendering (isOpen=false)');
    return null;
  }

  console.log('✅ AdModal - Rendering modal!');

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0, 
        zIndex: 9999,
        backgroundColor: 'rgba(0,0,0,0.7)'
      }}
    >
      <div className="relative max-w-md w-full" style={{ zIndex: 10000 }}>
        <button
          onClick={onClose}
          className="absolute -top-2 -right-2 z-10 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
          style={{ zIndex: 10001 }}
        >
          <X className="h-5 w-5 text-gray-600" />
        </button>
        
        <div className="bg-white rounded-2xl overflow-hidden shadow-2xl">
          {/* Fallback content pour debug */}
          <div style={{ 
            minHeight: '200px', 
            backgroundColor: '#f0f0f0', 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            justifyContent: 'center',
            padding: '20px'
          }}>
            <p style={{ color: 'black', marginBottom: '10px' }}>🔵 MODAL DE DEBUG</p>
            <p style={{ color: 'black', fontSize: '12px' }}>Image source: {adImage}</p>
          </div>
          
          <img
            src={adImage}
            alt="Advertisement"
            className="w-full h-auto cursor-pointer hover:scale-[1.02] transition-transform duration-300"
            onClick={handleAdClick}
            onLoad={handleImageLoad}
            onError={handleImageError}
            style={{ display: 'block', maxWidth: '100%' }}
          />
        </div>
      </div>
    </div>
  );
};

export default AdModal;