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
      className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4"
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 999999,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)'
      }}
      onClick={onClose}
    >
      <div 
        className="relative max-w-sm w-full mx-auto"
        style={{ 
          zIndex: 1000000,
          maxWidth: '320px',
          width: '320px'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            background: 'rgba(0,0,0,0.6)',
            border: 'none',
            color: '#ffffff',
            zIndex: 10,
            cursor: 'pointer'
          }}
        >
          <X size={16} />
        </button>

        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
        }}>
          <h2 style={{
            fontSize: '22px',
            fontWeight: '700',
            color: '#1f2937',
            textAlign: 'center',
            lineHeight: '1.3',
            margin: '24px 20px 8px',
            letterSpacing: '-0.02em'
          }}>
            Want to invest in stocks you can't access?
          </h2>
          
          <p style={{
            fontSize: '18px',
            fontWeight: '600',
            color: '#059669',
            textAlign: 'center',
            margin: '0 20px 24px'
          }}>
            We open the door.
          </p>

          <img
            src={adImage}
            alt="Invest in world's most valuable companies"
            style={{ 
              width: '100%',
              height: 'auto',
              display: 'block',
              cursor: 'pointer'
            }}
            onClick={handleAdClick}
          />

          <div style={{ padding: '24px 20px' }}>
            <button
              type="button"
              onClick={handleAdClick}
              style={{
                display: 'block',
                width: '100%',
                padding: '16px',
                borderRadius: '12px',
                background: '#059669',
                color: '#ffffff',
                fontSize: '16px',
                fontWeight: '600',
                textAlign: 'center',
                border: 'none',
                cursor: 'pointer',
                marginBottom: '12px',
                transition: 'background 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#047857';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = '#059669';
              }}
            >
              Start investing
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                display: 'block',
                width: '100%',
                padding: '12px',
                background: 'transparent',
                color: '#6b7280',
                fontSize: '14px',
                fontWeight: '500',
                textAlign: 'center',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdModal;