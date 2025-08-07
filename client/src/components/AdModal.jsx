import React from 'react';
import { X } from 'lucide-react';
import adImage from '../assets/stocks.png';

const AdModal = ({ isOpen, onClose }) => {
  console.log('🔥 AdModal rendering with isOpen:', isOpen, 'onClose:', !!onClose);
  
  const handleAdClick = () => {
    const umanAppUrl = "worldapp://mini-app?app_id=app_519146d170ce4e9eff6a6fa241878715";
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
        className="relative shadow-2xl max-w-sm w-full mx-auto transform transition-all duration-300 ease-out scale-100 hover:scale-105"
        style={{ 
          zIndex: 1000000,
          borderRadius: '24px',
          maxWidth: '320px',
          width: '320px'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={adImage}
          alt="Advertisement"
          className="w-full h-auto cursor-pointer transition-transform duration-300 hover:scale-[1.02]"
          onClick={handleAdClick}
          style={{ 
            display: 'block', 
            maxWidth: '100%',
            borderRadius: '24px',
            maxHeight: '280px',
            objectFit: 'cover'
          }}
        />
        <button
          type="button"
          aria-label="Trade stocks"
          onClick={handleAdClick}
          className="w-full cursor-pointer transition-transform duration-300 hover:scale-[1.02]"
          style={{
            display: 'block',
            width: '100%',
            marginTop: '24px',
            padding: '14px 16px',
            borderRadius: '24px',
            background: 'linear-gradient(180deg, #1a1a1a 0%, #0f0f10 100%)',
            color: '#e6ffe6',
            fontSize: '16px',
            fontWeight: 700,
            textAlign: 'center',
            letterSpacing: '0.3px',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 10px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)'
          }}
        >
          trade stocks
        </button>
      </div>
    </div>
  );
};

export default AdModal;