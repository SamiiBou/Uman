import React from 'react';
import { 
  FaTwitter, 
  FaGoogle, 
  FaFacebookF, 
  FaInstagram, 
  FaLinkedinIn, 
  FaYoutube 
} from 'react-icons/fa';

const SocialButton = ({ provider, connected, onConnect, onDisconnect }) => {
  // Configuration pour différents réseaux sociaux
  const providerConfig = {
    twitter: {
      icon: <FaTwitter />,
      name: 'X (Twitter)'
    },
    google: {
      icon: <FaGoogle />,
      name: 'Google'
    },
    facebook: {
      icon: <FaFacebookF />,
      name: 'Facebook'
    },
    instagram: {
      icon: <FaInstagram />,
      name: 'Instagram'
    },
    linkedin: {
      icon: <FaLinkedinIn />,
      name: 'LinkedIn'
    },
    youtube: {
      icon: <FaYoutube />,
      name: 'YouTube'
    },
    // Vous pourrez ajouter d'autres réseaux sociaux ici plus tard
  };

  // Récupérer la configuration pour le provider actuel
  const providerInfo = providerConfig[provider.toLowerCase()] || {
    icon: <FaTwitter />,
    name: provider
  };

  const buttonStyles = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    padding: '0.75rem 1.25rem',
    borderRadius: '50px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.95rem',
    fontWeight: '500',
    color: '#fff',
    backgroundColor: connected ? '#e74c3c' : '#1a352a', // Fond vert foncé
    transition: 'all 0.2s ease',
    margin: '0.5rem 0',
    width: 'auto',
    minWidth: '200px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
    borderLeft: connected ? 'none' : '2px solid #00ff66', // Bordure verte fluo
  };

  const iconStyles = {
    fontSize: '18px',
    color: connected ? '#fff' : '#00ff66' // Icône verte fluo si pas connecté
  };

  const handleClick = () => {
    if (connected) {
      onDisconnect(provider.toLowerCase());
    } else {
      onConnect(provider.toLowerCase());
    }
  };

  return (
    <button
      style={buttonStyles}
      onClick={handleClick}
      onMouseOver={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 255, 102, 0.2)';
        e.currentTarget.style.backgroundColor = connected ? '#c0392b' : '#112318';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.3)';
        e.currentTarget.style.backgroundColor = connected ? '#e74c3c' : '#1a352a';
      }}
    >
      <span style={iconStyles}>{providerInfo.icon}</span>
      <span>{connected ? `Déconnecter` : `Connecter`}</span>
    </button>
  );
};

export default SocialButton;