import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { MiniKit } from "@worldcoin/minikit-js";

const BACKEND_URL = 'https://uman.onrender.com';
const API_TIMEOUT = 15000;

export const WalletAuthBlock = () => {
  const [authError, setAuthError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [slideUp, setSlideUp] = useState(false);
  const [miniKitInitialized, setMiniKitInitialized] = useState(false);
  const navigate = useNavigate();

  // Initialiser MiniKit au chargement du composant
  useEffect(() => {
    const initMiniKit = async () => {
      // Attendre un peu pour permettre à MiniKit de s'initialiser complètement
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (MiniKit.isInstalled()) {
        console.log("MiniKit is installed, checking status...");
        console.log("Initial MiniKit.walletAddress:", MiniKit.walletAddress);
        
        // Vérifier si MiniKit est prêt
        if (!MiniKit.walletAddress) {
          console.log("MiniKit not fully initialized yet, will check during auth flow");
        }
      } else {
        console.log("MiniKit not installed");
      }
      
      setMiniKitInitialized(true);
    };
    
    initMiniKit();
  }, []);

  // Fonction pour récupérer le wallet address avec retries
  const getWalletAddress = async (maxRetries = 5) => {
    let retries = 0;
    
    while (retries < maxRetries) {
      if (MiniKit.walletAddress) {
        console.log("Found wallet address:", MiniKit.walletAddress);
        return MiniKit.walletAddress;
      }
      
      console.log(`Wallet address not found, retry ${retries + 1}/${maxRetries}`);
      // Attendre 500ms avant de réessayer
      await new Promise(resolve => setTimeout(resolve, 1500));
      retries++;
    }
    
    console.log("Could not obtain wallet address after retries");
    return null;
  };

  // Fonction d'authentification wallet
  const handleWalletAuth = useCallback(async () => {
    console.log("=== Starting handleWalletAuth ===");
    
    // Empêcher plusieurs appels
    if (isLoading) {
      return;
    }
    
    // Effacer les erreurs précédentes
    setAuthError(null);
    
    // Définir l'état de chargement
    setIsLoading(true);
    
    // Préparer l'animation pour la transition
    setTimeout(() => {
      setSlideUp(true);
    }, 300);
    
    // Vérifier si MiniKit est installé
    if (!MiniKit || !MiniKit.isInstalled()) {
      console.log("MiniKit not installed, using development mode");
      
      // Simuler une connexion réussie en mode développement
      localStorage.setItem("isAuthenticated", "true");
      localStorage.setItem("walletAddress", "0x" + Math.random().toString(16).substring(2, 42));
      await new Promise(resolve => setTimeout(resolve, 1000));
      navigate("/search");
      return;
    }
    
    try {
      // Premier appel pour initialiser l'authentification
      // Cela va souvent déclencher l'initialisation du wallet dans MiniKit
      const nonceResponse = await axios.get(`${BACKEND_URL}/api/auth/nonce`, {
        withCredentials: true,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        timeout: API_TIMEOUT
      }).catch(err => {
        console.error("Error getting nonce:", err);
        return { data: { nonce: `fallback-${Date.now()}`, nonceId: `fallback-${Date.now()}` } };
      });
      
      const { nonce, nonceId } = nonceResponse.data;
      
      // Demander l'authentification wallet - ceci va probablement initialiser le wallet
      const walletAuthResult = await MiniKit.commandsAsync.walletAuth({
        nonce,
        requestId: "0",
        expirationTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        notBefore: new Date(Date.now() - 24 * 60 * 60 * 1000),
        statement: "Sign in to SocialID - Connect with blockchain.",
      });
      
      const { finalPayload } = walletAuthResult;
      const authPayload = finalPayload;
      
      // Gérer les erreurs
      if (authPayload.status === "error") {
        setIsLoading(false);
        setSlideUp(false);
        setAuthError(authPayload.message || "Authentication failed");
        return;
      }
      
      // *** IMPORTANT: Attendre que le wallet address soit disponible
      console.log("Auth successful, now waiting for MiniKit wallet address to be available");
      const walletAdressePayLoad = await MiniKit.commandsAsync.walletAuth({
        nonce,
        requestId: "0",
        expirationTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        notBefore: new Date(Date.now() - 24 * 60 * 60 * 1000),
        statement: "Sign in to SocialID - Connect with blockchain.",
      });

      console.log("Auth successful, now waiting for MiniKit wallet address to be available");
      const walletAddress = walletAdressePayLoad.finalPayload.address;
      console.log("Wallet address after auth:", walletAddress);


      // const testResult = await MiniKit.commandsAsync.walletAuth({
      //   nonce,
      //   requestId: "0",
      //   expirationTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      //   notBefore: new Date(Date.now() - 24 * 60 * 60 * 1000),
      //   statement: "Sign in to SocialID - Connect with blockchain.",
      // });

      // console.log("the test result is", testResult.finalPayload.address);
      
      // Maintenant récupérer le username MiniKit
      let minikitUsername = null;
      
      if (walletAddress) {
        try {
          console.log("Attempting to fetch MiniKit username using getUserByAddress");
          const minikitUser = await MiniKit.getUserByAddress(walletAddress);
          console.log('The minikit user is', minikitUser);
          
          if (minikitUser && minikitUser.username) {
            minikitUsername = minikitUser.username;
            console.log("Successfully retrieved MiniKit username:", minikitUsername);
            
            // Cacher ce username immédiatement
            localStorage.setItem('user_username', minikitUsername);
            localStorage.setItem('username', minikitUsername);
          } else {
            console.log("MiniKit returned user data but no username");
            
            // Fallbacks comme dans l'original en cas d'échec
            const storedUsername = localStorage.getItem('username') || localStorage.getItem('user_username');
            if (storedUsername) {
              minikitUsername = storedUsername;
              console.log("Using stored username from localStorage:", minikitUsername);
            } else {
              // Dernier recours: demander à l'utilisateur
              const promptedUsername = prompt("Please enter your preferred username:");
              if (promptedUsername && promptedUsername.trim()) {
                minikitUsername = promptedUsername.trim();
                console.log("User provided username via prompt:", minikitUsername);
              }
            }
          }
        } catch (minikitError) {
          console.error("Error retrieving MiniKit user:", minikitError);
          
          // Mêmes fallbacks que l'original en cas d'erreur
          const storedUsername = localStorage.getItem('username') || localStorage.getItem('user_username');
          if (storedUsername) {
            minikitUsername = storedUsername;
            console.log("Using stored username from localStorage:", minikitUsername);
          } else {
            const promptedUsername = prompt("Please enter your preferred username:");
            if (promptedUsername && promptedUsername.trim()) {
              minikitUsername = promptedUsername.trim();
              console.log("User provided username via prompt:", minikitUsername);
            }
          }
        }
      }
      
      console.log("Final username to use:", minikitUsername);
      
      // Récupérer l'adresse du wallet à utiliser (de l'auth payload ou de MiniKit)
      const addrToUse = authPayload.address || walletAddress;
      
      // CORRECTION: Envoyer le username comme un champ séparé
      console.log("Sending SIWE payload to backend with username:", minikitUsername);
      console.log("Using wallet address:", addrToUse);
        
      const siweResponse = await axios.post(
          `${BACKEND_URL}/api/auth/complete-siwe`,
          { 
            payload: authPayload, 
            nonce, 
            nonceId,
            username: minikitUsername, // Séparé du payload
            walletAddress: addrToUse // Être explicite sur l'adresse à utiliser
          },
          {
            withCredentials: true,
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            timeout: API_TIMEOUT
          }
        ).catch(err => {
          console.error("SIWE completion error:", err);
          return { data: { status: "error", isValid: false, message: err.message } };
        });
      
      const verificationResult = siweResponse.data;
      
      if (verificationResult.status === "success" && verificationResult.isValid) {

        if (siweResponse.data.token) {
            localStorage.setItem("token", siweResponse.data.token);
            localStorage.setItem("auth_token", siweResponse.data.token); // Stocker dans les deux formats pour compatibilité
            console.log("Token JWT stocké avec succès");
          } else {
            console.error("Aucun token reçu du serveur!");
          }
          
          if (siweResponse.data.userId) {
            localStorage.setItem("userId", siweResponse.data.userId);
            localStorage.setItem("user_id", siweResponse.data.userId); // Stocker dans les deux formats
            console.log("ID utilisateur stocké:", siweResponse.data.userId);
          } else {
            console.error("Aucun userId reçu du serveur!");
          }
          
        // Stocker les détails d'authentification
        localStorage.setItem("isAuthenticated", "true");

        console.log('The username is', verificationResult.username);
        console.log('The wallet is', verificationResult.walletAddress);
        
        if (verificationResult.walletAddress) {
          localStorage.setItem("walletAddress", verificationResult.walletAddress);
        }
        
        if (verificationResult.username) {
          // CORRECTION: Uniformiser le stockage du username
          localStorage.setItem("username", verificationResult.username);
          localStorage.setItem("user_username", verificationResult.username);
        }
        
        // IMPORTANT: Stocker le token JWT reçu du serveur
        if (siweResponse.data.token) {
          localStorage.setItem("token", siweResponse.data.token);
          console.log("Token JWT stocké:", siweResponse.data.token.substring(0, 15) + "...");
        }
        
        // IMPORTANT: Stocker l'ID utilisateur si fourni
        if (siweResponse.data.userId) {
          localStorage.setItem("userId", siweResponse.data.userId);
          console.log("ID utilisateur stocké:", siweResponse.data.userId);
        }
        
        // Rediriger vers la page de recherche
        navigate("/search");
      } else {
        // L'authentification a échoué
        setIsLoading(false);
        setSlideUp(false);
        setAuthError(verificationResult.message || "Authentication verification failed");
      }
    } catch (error) {
      console.error("Error during authentication:", error);
      setIsLoading(false);
      setSlideUp(false);
      setAuthError(error instanceof Error ? error.message : "An unexpected error occurred");
    }
  }, [navigate, isLoading]);

  return (
    <motion.div
      className="flex flex-col items-center justify-center w-full min-h-[300px] p-8 rounded-lg shadow-md bg-white"
      initial={{ opacity: 0 }}
      animate={{
        opacity: 1,
        y: slideUp ? "-100vh" : 0
      }}
      transition={{
        duration: slideUp ? 0.6 : 0.8,
        ease: slideUp ? "easeInOut" : "easeOut"
      }}
    >
      {/* Afficher les erreurs d'authentification s'il y en a */}
      {authError && (
        <div className="w-full p-3 mb-4 text-center text-red-700 bg-red-100 border border-red-300 rounded-md">
          {authError}
        </div>
      )}
      
      <h2 className="mb-6 text-2xl font-bold text-center">Connexion avec Wallet</h2>
      <p className="mb-8 text-sm text-center text-gray-600">
        Connectez-vous en toute sécurité avec votre portefeuille blockchain.
      </p>
      
      {/* Indicateur d'initialisation */}
      {!miniKitInitialized && (
        <div className="mb-4 text-sm text-center text-blue-600">
          Initialisation du wallet en cours...
        </div>
      )}
      
      {/* Bouton de connexion */}
      <button
        className="flex items-center justify-center w-full max-w-xs px-6 py-3 font-medium text-white bg-blue-600 rounded-full hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        onClick={() => !isLoading && handleWalletAuth()}
        disabled={isLoading}
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
            <span>Connexion en cours...</span>
          </div>
        ) : (
          <span>Se connecter avec Wallet</span>
        )}
      </button>
    </motion.div>
  );
};