import React from 'react';
import { X } from 'lucide-react';
import adImage from '../assets/stocks.png';

const AdModal = ({ isOpen, onClose }) => {
  const handleAdClick = () => {
    const umanAppUrl = "worldapp://mini-app?app_id=app_519146d170ce4e9eff6a6fa241878715";
    window.open(umanAppUrl, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div 
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 999999,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div 
        style={{ 
          position: 'relative',
          width: '320px',
          backgroundColor: '#1a1a1a',
          borderRadius: '20px',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            width: '28px',
            height: '28px',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            border: 'none',
            borderRadius: '50%',
            color: '#ffffff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1
          }}
        >
          <X size={14} />
        </button>

        <img
          src={adImage}
          alt="Investment"
          style={{ 
            width: '100%',
            height: 'auto',
            display: 'block',
            cursor: 'pointer'
          }}
          onClick={handleAdClick}
        />

        <div style={{ padding: '20px' }}>
          <button
            onClick={handleAdClick}
            style={{
              width: '100%',
              padding: '14px',
              backgroundColor: '#10b981',
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              marginBottom: '10px'
            }}
          >
            Start investing
          </button>

          <button
            onClick={onClose}
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: 'transparent',
              color: '#888',
              border: 'none',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdModal;