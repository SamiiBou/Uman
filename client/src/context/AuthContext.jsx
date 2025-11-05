import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';

// Configuration Axios de base
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

// Intercepteur pour ajouter le token JWT aux requêtes sortantes
apiClient.interceptors.request.use((config) => {
  // Utiliser 'auth_token' au lieu de 'auth_token'
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});



const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('auth_token') || null);
  const [loading, setLoading] = useState(true);

  // Fonction pour stocker le token et le définir dans l'état
  const storeToken = useCallback((newToken) => {
    if (newToken) {
      localStorage.setItem('auth_token', newToken);
      setToken(newToken);
    } else {
      localStorage.removeItem('auth_token');
      setToken(null);
    }
  }, []);

  // Fonction pour récupérer les informations utilisateur avec le token actuel
  const fetchUser = useCallback(async () => {
    if (!token) {
        setLoading(false);
        setUser(null); // Assurer que l'utilisateur est null s'il n'y a pas de token
        return;
    }
    setLoading(true);
    try {
      // Utilise l'instance Axios configurée avec l'intercepteur
      const response = await apiClient.get('/auth/me'); 
      setUser(response.data);
    } catch (error) {
      console.error('[AuthContext] Failed to fetch user:', error.response?.data?.message || error.message);
      // Token invalide ou expiré ? -> Déconnexion
      storeToken(null); // Supprimer le token invalide
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [token, storeToken]);

  // Effet pour charger l'utilisateur au montage initial si un token existe
  useEffect(() => {
    fetchUser(); 
  }, [token, fetchUser]); // Dépend de fetchUser qui dépend de token et storeToken


  // Fonction de connexion (appelée par AuthCallback)
  const login = useCallback((newToken) => {
    storeToken(newToken);
    // fetchUser sera appelé automatiquement par l'useEffect dépendant de `token`
  }, [storeToken]);

  // Fonction de déconnexion
  const logout = useCallback(async () => {
    setUser(null);
    storeToken(null); // Supprime le token du localStorage et de l'état
    // Optionnel : Appeler une route backend pour invalider le token si nécessaire
    try {
      await apiClient.post('/auth/logout'); // Utilise l'instance Axios
      console.log('[AuthContext] Server logout endpoint notified.');
    } catch (error) {
      console.error('[AuthContext] Error calling server logout endpoint:', error);
    }
  }, [storeToken]);

  const value = {
    user,
    token,
    isAuthenticated: !!user, // Basé sur la présence de l'objet user après fetch réussi
    isLoading: loading,
    login,
    logout,
    fetchUser // Exposer fetchUser si nécessaire pour rafraîchir manuellement
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook personnalisé pour utiliser le contexte d'authentification
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
