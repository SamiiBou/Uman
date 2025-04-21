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
        <BottomNavbar />
      </div>
    </Router>
  )
}

export default App