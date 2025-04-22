import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
// Restore navigation routes and navbar
import { useAuth } from './context/AuthContext'
import Home from './pages/Home'
import Login from './pages/Login'
import AuthCallback from './pages/AuthCallback'
import SearchUsers from './pages/SearchUsers'
import SearchAppUsers from './pages/SearchAppUsers'
import ConnectAccounts from './pages/ConnectAccounts'
import SocialConnect from './pages/SocialConnect'
import Connections from './pages/Connections'
import FriendMap from './pages/FriendMap'
import BottomNavbar from './components/BottomNavbar'
import RewardsHub from './pages/RewardsHub'
import TelegramButton from './TelegramButton'

// Modifié pour toujours laisser passer l'utilisateur
function ProtectedRoute({ children }) {
  // Pas de vérification d'authentification, l'accès est autorisé directement
  return children;
}

function App() {
  return (
    <Router>
      <div className="app flex flex-col min-h-screen"> {/* Ensure full height and flex column */}
        <div className="container w-full flex-grow px-4"> {/* Add horizontal padding */}
          <Routes>
            <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
            <Route path="/search" element={<ProtectedRoute><SearchUsers /></ProtectedRoute>} />
            <Route path="/search-app" element={<ProtectedRoute><SearchAppUsers /></ProtectedRoute>} />
            <Route path="/connect-accounts" element={<ProtectedRoute><ConnectAccounts /></ProtectedRoute>} />
            <Route path="/social-connect" element={<ProtectedRoute><SocialConnect /></ProtectedRoute>} />
            <Route path="/connections" element={<ProtectedRoute><Connections /></ProtectedRoute>} />
            <Route path="/friend-map" element={<ProtectedRoute><FriendMap /></ProtectedRoute>} />
            <Route path="/RewardsHub" element={<ProtectedRoute><RewardsHub /></ProtectedRoute>} />
            <Route path="/login" element={<Login />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
        <TelegramButton />
        <BottomNavbar />
      </div>

      {/* Global styles for the TelegramButton */}
      <style jsx global>{`
        .telegram-float-btn {
          position: fixed;
          bottom: 80px; /* Position above the bottom navbar */
          right: 20px;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background-color: #0088cc;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          z-index: 100;
          transition: all 0.3s;
          text-decoration: none;
        }
        
        .telegram-float-btn:hover {
          transform: translateY(-3px);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
        }
        
        @media (prefers-color-scheme: dark) {
          .telegram-float-btn {
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          }
        }
      `}</style>
    </Router>
  )
}

export default App