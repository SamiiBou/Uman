import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const Navbar = () => {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('[Navbar] Logout failed:', error);
    }
  };

  // Si c'est la page d'accueil ou la page de login, on n'affiche pas la navbar
  const path = window.location.pathname;
  if (path === '/' || path === '/login') {
    return null;
  }

  return (
    <header className="navbar">
      <div className="navbar-container">
        {isAuthenticated && (
          <button 
            onClick={handleLogout} 
            className="btn btn-outline navbar-logout"
          >
            <span className="navbar-logout-text">Logout</span>
          </button>
        )}
      </div>
      
      <style>{`
        .navbar {
          background-color: rgba(17, 35, 24, 0.9);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border-bottom: 1px solid var(--border-color);
          height: 60px;
          display: flex;
          justify-content: flex-end;
          align-items: center;
          position: sticky;
          top: 0;
          z-index: 999;
          padding: 0 1.5rem;
        }
        
        .navbar-container {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          width: 100%;
          max-width: 1200px;
        }
        
        .navbar-logout {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
        }
      `}</style>
    </header>
  );
};

export default Navbar;