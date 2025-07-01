import React from 'react';
import { X } from 'lucide-react';
import adImage from '../assets/ad_K.png';

const AdModal = ({ isOpen, onClose }) => {
  console.log('🔥 AdModal rendering with isOpen:', isOpen, 'onClose:', !!onClose);
  
  const handleAdClick = () => {
    const umanAppUrl = "worldapp://mini-app?app_id=app_f6f3209bce9f1cea7d219bed96170e46";
    window.open(umanAppUrl, '_blank');
  };

  if (!isOpen) {
    console.log('🔥 AdModal NOT rendering - isOpen is false');
    return null;
  }

  console.log('🔥 AdModal IS rendering - about to return JSX');

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4"
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)'
      }}
      onClick={onClose}
    >
      <div 
        className="relative shadow-2xl max-w-xs w-full mx-auto transform transition-all duration-300 ease-out scale-100 hover:scale-105"
        style={{ 
          zIndex: 1000000,
          borderRadius: '24px',
          maxWidth: '200px',
          width: '200px'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative">
          <img
            src={adImage}
            alt="Advertisement"
            className="w-full h-auto cursor-pointer transition-transform duration-300 hover:scale-[1.02]"
            onClick={handleAdClick}
            style={{ 
              display: 'block', 
              maxWidth: '100%',
              borderRadius: '24px',
              maxHeight: '160px',
              objectFit: 'cover'
            }}
          />
          <button
            onClick={onClose}
            className="absolute top-2 right-2 w-5 h-5 bg-gray-600 bg-opacity-70 text-gray-300 rounded-full flex items-center justify-center hover:bg-gray-500 hover:text-white transition-all duration-200"
            style={{ zIndex: 1000001 }}
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdModal;