import React, { useState, useEffect } from 'react';
import { X, TrendingUp, Star, Zap } from 'lucide-react';
import adImage from '../assets/stocks.png';

const AdModal = ({ isOpen, onClose }) => {
  const [showPulse, setShowPulse] = useState(false);
  
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setShowPulse(true), 500);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleAdClick = () => {
    const umanAppUrl = "worldapp://mini-app?app_id=app_519146d170ce4e9eff6a6fa241878715";
    window.open(umanAppUrl, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 999999,
        background: 'radial-gradient(ellipse at center, rgba(16, 185, 129, 0.15) 0%, rgba(0, 0, 0, 0.85) 70%)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)'
      }}
      onClick={onClose}
    >
      <div 
        className="relative transform transition-all duration-500 ease-out"
        style={{ 
          zIndex: 1000000,
          maxWidth: '380px',
          width: '380px',
          animation: isOpen ? 'modalSlideUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <style>
          {`
            @keyframes modalSlideUp {
              0% { transform: translateY(100px) scale(0.9); opacity: 0; }
              100% { transform: translateY(0) scale(1); opacity: 1; }
            }
            @keyframes pulse {
              0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
              50% { transform: scale(1.02); box-shadow: 0 0 0 15px rgba(16, 185, 129, 0); }
            }
            .pulse-animation {
              animation: pulse 2s infinite;
            }
          `}
        </style>
        
        <button
          type="button"
          aria-label="Fermer"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            width: 40,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            background: 'rgba(0, 0, 0, 0.8)',
            border: '2px solid rgba(255, 255, 255, 0.2)',
            color: '#ffffff',
            backdropFilter: 'blur(8px)',
            transition: 'all 0.3s ease',
            zIndex: 10
          }}
          onMouseEnter={(e) => {
            e.target.style.background = 'rgba(239, 68, 68, 0.9)';
            e.target.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'rgba(0, 0, 0, 0.8)';
            e.target.style.transform = 'scale(1)';
          }}
        >
          <X size={20} />
        </button>

        <div style={{
          background: 'linear-gradient(145deg, #1f2937 0%, #111827 100%)',
          borderRadius: '28px',
          padding: '0',
          border: '2px solid rgba(16, 185, 129, 0.3)',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)',
          overflow: 'hidden',
          position: 'relative'
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: 'linear-gradient(90deg, #10b981, #059669, #047857, #10b981)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 2s linear infinite'
          }} />
          
          <style>
            {`
              @keyframes shimmer {
                0% { background-position: -200% 0; }
                100% { background-position: 200% 0; }
              }
            `}
          </style>

          <div style={{ padding: '32px 28px 0 28px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px'
            }}>
              <div style={{
                background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                borderRadius: '12px',
                padding: '8px',
                marginRight: '8px'
              }}>
                <Star size={20} color="#ffffff" />
              </div>
              <span style={{
                color: '#fbbf24',
                fontSize: '14px',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}>
                OPPORTUNITÉ EXCLUSIVE
              </span>
            </div>

            <h2 style={{
              fontSize: '28px',
              fontWeight: '900',
              color: '#ffffff',
              textAlign: 'center',
              lineHeight: '1.2',
              marginBottom: '12px',
              background: 'linear-gradient(135deg, #ffffff 0%, #10b981 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              Want to invest in stocks you can't access?
            </h2>
            
            <p style={{
              fontSize: '18px',
              fontWeight: '700',
              color: '#10b981',
              textAlign: 'center',
              marginBottom: '20px',
              textShadow: '0 0 10px rgba(16, 185, 129, 0.3)'
            }}>
              We open the door.
            </p>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginBottom: '24px',
              padding: '12px',
              background: 'rgba(16, 185, 129, 0.1)',
              borderRadius: '16px',
              border: '1px solid rgba(16, 185, 129, 0.2)'
            }}>
              <TrendingUp size={18} color="#10b981" />
              <span style={{
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: '600'
              }}>
                Accès instantané aux actions Tesla, Amazon, Apple & plus
              </span>
            </div>
          </div>

          <img
            src={adImage}
            alt="Investir dans les plus grandes entreprises"
            style={{ 
              width: '100%',
              height: 'auto',
              maxHeight: '200px',
              objectFit: 'cover',
              cursor: 'pointer'
            }}
            onClick={handleAdClick}
          />

          <div style={{ padding: '24px 28px 28px 28px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              marginBottom: '20px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                color: '#10b981',
                fontSize: '13px',
                fontWeight: '600'
              }}>
                <Zap size={16} />
                <span>Commission 0%</span>
              </div>
              <div style={{ width: '1px', height: '16px', background: '#374151' }} />
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                color: '#10b981',
                fontSize: '13px',
                fontWeight: '600'
              }}>
                <TrendingUp size={16} />
                <span>Trading instantané</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleAdClick}
              className={showPulse ? 'pulse-animation' : ''}
              style={{
                display: 'block',
                width: '100%',
                padding: '18px 24px',
                borderRadius: '20px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)',
                color: '#ffffff',
                fontSize: '18px',
                fontWeight: '800',
                textAlign: 'center',
                letterSpacing: '0.5px',
                border: 'none',
                boxShadow: '0 15px 35px rgba(16, 185, 129, 0.4), 0 5px 15px rgba(0, 0, 0, 0.3)',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                textTransform: 'uppercase',
                marginBottom: '16px',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 20px 40px rgba(16, 185, 129, 0.5), 0 8px 20px rgba(0, 0, 0, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 15px 35px rgba(16, 185, 129, 0.4), 0 5px 15px rgba(0, 0, 0, 0.3)';
              }}
            >
              🚀 COMMENCER À INVESTIR
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                display: 'block',
                width: '100%',
                padding: '12px',
                background: 'transparent',
                color: '#9ca3af',
                fontSize: '14px',
                fontWeight: '500',
                textAlign: 'center',
                border: 'none',
                cursor: 'pointer',
                transition: 'color 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.color = '#ffffff';
              }}
              onMouseLeave={(e) => {
                e.target.style.color = '#9ca3af';
              }}
            >
              Plus tard
            </button>

            <div style={{
              textAlign: 'center',
              marginTop: '12px',
              fontSize: '12px',
              color: '#6b7280'
            }}>
              ⚡ Offre limitée dans le temps
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdModal;