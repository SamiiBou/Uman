import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  FaSearch,
  FaCheckCircle,
  FaTrophy,
  FaUser,
  FaDashcube
} from 'react-icons/fa';

const BottomNavbar = () => {
  const location = useLocation();
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Detect iOS device
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(iOS);
    // Add viewport meta tag for iOS devices if it doesn't exist
    if (iOS) {
      let viewportMeta = document.querySelector('meta[name="viewport"]');
      if (!viewportMeta) {
        viewportMeta = document.createElement('meta');
        viewportMeta.name = 'viewport';
        document.head.appendChild(viewportMeta);
      }
      viewportMeta.content = 'width=device-width, initial-scale=1, viewport-fit=cover';
    }
  }, []);

  const isActive = (path) => {
    return location.pathname === path;
  };

  // Do not display the navigation bar on the home and login pages
  if (location.pathname === '/' || location.pathname === '/login') {
    return null;
  }

  return (
    <>
      <nav className="bottom-navbar">
        <div className="nav-container">
          <NavLink
            to="/RewardsHub"
            className={`nav-item ${isActive('/RewardsHub') ? 'active' : ''}`}
          >
            <FaDashcube />
            <span>Dashboard</span>
          </NavLink>
          <NavLink
            to="/social-connect"
            className={`nav-item ${isActive('/social-connect') ? 'active' : ''}`}
          >
            <FaCheckCircle />
            <span>Verify</span>
          </NavLink>
          <NavLink
            to="/search-app"
            className={`nav-item ${isActive('/search-app') ? 'active' : ''}`}
          >
            <FaSearch />
            <span>Friends</span>
          </NavLink>
          {/* <NavLink
           to="/profile"
           className={`nav-item ${isActive('/profile') ? 'active' : ''}`}
           >
           <FaUser />
           <span>Profile</span>
           </NavLink> */}
        </div>
        <style jsx>{`
          .bottom-navbar {
            position: fixed;
            bottom: 0;
            left: 0;
            width: 100%;
            height: ${isIOS ? 'calc(60px + 10px)' : '60px'}; /* Hauteur réduite pour iOS */
            display: flex;
            background-color: #f4e9b7;
            border-top: 1px solid rgba(241, 100, 3, 0.1);
            z-index: 999;
            padding-bottom: 0;
          }
          .nav-container {
            width: 100%;
            height: 60px;
            display: flex;
          }
          .nav-item {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: rgba(48, 52, 33, 0.7);
            text-decoration: none;
            font-size: 1.2rem;
            transition: all 0.2s ease;
            position: relative;
          }
          .nav-item span {
            font-size: 0.7rem;
            margin-top: 4px;
            font-weight: 500;
          }
          .nav-item.active {
            color: #f16403;
          }
          /* Dark Mode */
          @media (prefers-color-scheme: dark) {
            .bottom-navbar {
              background-color: #303421;
              border-top: 1px solid rgba(241, 100, 3, 0.2);
            }
            .nav-item {
              color: rgba(244, 233, 183, 0.7);
            }
            .nav-item.active {
              color: #f28011;
            }
          }
        `}</style>
      </nav>
      {/* Spacer pour éviter que le contenu ne soit caché sous la navbar */}
      <div style={{
        height: isIOS ? '65px' : '60px',
        width: '100%'
      }} />
    </>
  );
};

export default BottomNavbar;