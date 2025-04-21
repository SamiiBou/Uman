import React, { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
// Only enable Twitter, Telegram, Discord connections for now
import { FaTwitter, FaTelegramPlane, FaDiscord, FaCheck, FaUserCircle, FaShieldAlt, FaUserPlus, FaUserTimes, FaWallet, FaCoins } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { MiniKit, VerificationLevel } from "@worldcoin/minikit-js";
import { AlertCircle, RefreshCw } from "lucide-react";
import axios from "axios";
import { ethers } from 'ethers';


const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://520ffd996e5c.ngrok.app/api';
// ERC-20 token contract address and minimal ABI
const TOKEN_CONTRACT_ADDRESS = import.meta.env.VITE_TOKEN_CONTRACT_ADDRESS || '0x41Da2F787e0122E2e6A72fEa5d3a4e84263511a8';
const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)"
];

const ConnectAccounts = () => {
  const [notification, setNotification] = useState({ show: false, message: '', type: 'info' });
  const [username, setUsername] = useState('John Doe'); // Default username
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState(null);
  const [pendingSocialLogin, setPendingSocialLogin] = useState(null);
  const [walletAddress, setWalletAddress] = useState("");
  const [userId, setUserId] = useState(null);
  const [referralCode, setReferralCode] = useState('');
  // Daily login reward/streak info
  const [currentStreak, setCurrentStreak] = useState(null);
  const [maxStreak, setMaxStreak] = useState(null);
  const [todaysReward, setTodaysReward] = useState(null);
  const [token, setToken] = useState(null);
  const [tokenBalance, setTokenBalance] = useState(null);
  // Friend requests state
  const [connections, setConnections] = useState({ received: [], sent: [], friends: [] });
  const [connLoading, setConnLoading] = useState(true);
  // Get the authenticated user (including referralCode)
  const { user } = useAuth();

  // Récupérer l'adresse de portefeuille, l'ID utilisateur et le token JWT
  useEffect(() => {
    // Récupérer le token JWT - IMPORTANT pour la liaison des comptes
    const storedToken = localStorage.getItem('auth_token'); 
    console.log('the token is',storedToken);
      if (storedToken) {
      setToken(storedToken);
      console.log("Token JWT récupéré du localStorage");
    }
    
    // Récupérer l'ID utilisateur
    const storedUserId = localStorage.getItem('userId') || localStorage.getItem('user_id');
    if (storedUserId) {
      setUserId(storedUserId);
      console.log(`ID utilisateur récupéré du localStorage: ${storedUserId}`);
    }
    
    // Récupérer le username
    const storedUsername = localStorage.getItem('username') || localStorage.getItem('user_username');
    if (storedUsername) {
      setUsername(storedUsername);
      console.log(`Username récupéré: ${storedUsername}`);
    }
    
    // Récupérer l'adresse du wallet
    const storedWalletAddress = localStorage.getItem('walletAddress');
    if (storedWalletAddress) {
      setWalletAddress(storedWalletAddress);
      console.log(`Adresse wallet récupérée: ${storedWalletAddress}`);
    }
    
    // Si on a un token, récupérer les infos utilisateur depuis l'API
    if (storedToken) {
      // Debug logs for auth/me request
      console.log("Appel API pour récupérer les informations utilisateur via /auth/me");
      console.log("API_BASE_URL:", API_BASE_URL);
      console.log("GET URL:", `${API_BASE_URL}/auth/me`);
      console.log("Request headers:", { Authorization: `Bearer ${storedToken}` });
      axios.get(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${storedToken}` }
      })
      .then(response => {
        const data = response.data;
        if (data && data._id) {
          // Stocker l'ID et referralCode dans le state et localStorage si besoin
          localStorage.setItem('userId', data._id);
          setUserId(data._id);
          console.log(`ID utilisateur récupéré de l'API: ${data._id}`);
          
          if (data.name) {
            setUsername(data.name);
          }
          if (data.walletAddress) {
            setWalletAddress(data.walletAddress);
          }
          if (data.referralCode) {
            setReferralCode(data.referralCode);
          }
        }
      })
      .catch(err => {
        console.error("Erreur lors de la récupération des informations utilisateur:", err);
        if (err.response) {
          console.error("Error response data:", err.response.data);
          console.error("Error response status:", err.response.status);
          console.error("Error response headers:", err.response.headers);
        }
        if (err.config) {
          console.log("Error request config:", err.config);
        }
        if (err.request) {
          console.log("Error request info:", err.request);
        }
      });
    } else {
      console.warn("Aucun token JWT trouvé - l'authentification API ne sera pas possible");
    }
  }, []);

  // Nouvelle fonction pour récupérer la balance du token
  const fetchTokenBalance = async (address = null) => {
    try {
      const targetAddress = address || walletAddress;
      if (!targetAddress || !TOKEN_CONTRACT_ADDRESS) {
        console.log("Adresse wallet ou adresse du contrat manquante pour récupérer la balance");
        return null;
      }

      // Méthode 1: Utiliser l'API si un token est disponible
      if (token) {
        console.log(`Récupération du solde de token via API pour l'adresse: ${targetAddress}`);
        const response = await axios.get(`${API_BASE_URL}/users/token-balance/${targetAddress}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data.status === "success") {
          console.log(`Solde récupéré depuis l'API: ${response.data.balance}`);
          setTokenBalance(response.data.balance);
          return response.data.balance;
        } else {
          throw new Error("Échec de la récupération du solde via API");
        }
      } 
      // Méthode 2: Utiliser ethers.js directement (comme fallback)
      else {
        console.log(`Récupération directe du solde de token avec ethers.js pour: ${targetAddress}`);
        const provider = window.ethereum
          ? new ethers.providers.Web3Provider(window.ethereum)
          : ethers.getDefaultProvider();
          
        const contract = new ethers.Contract(TOKEN_CONTRACT_ADDRESS, ERC20_ABI, provider);
        const [rawBalance, decimals] = await Promise.all([
          contract.balanceOf(targetAddress),
          contract.decimals()
        ]);
        
        const formatted = ethers.utils.formatUnits(rawBalance, decimals);
        console.log(`Solde récupéré directement: ${formatted}`);
        setTokenBalance(formatted);
        return formatted;
      }
    } catch (err) {
      console.error('Erreur lors de la récupération du solde de token:', err);
      return null;
    }
  };

  // Mettre à jour useEffect pour utiliser la nouvelle fonction
  useEffect(() => {
    if (!walletAddress || !TOKEN_CONTRACT_ADDRESS) return;
    fetchTokenBalance();
  }, [walletAddress, token]);

  // Fetch daily login streak and reward
  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await axios.post(`${API_BASE_URL}/users/daily-login`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setCurrentStreak(res.data.currentStreak);
        setMaxStreak(res.data.maxStreak);
        setTodaysReward(res.data.todaysReward);
      } catch (err) {
        console.error("Error fetching daily login reward:", err);
      }
    })();
  }, [token]);

  // Fetch friend connections (requests and friends)
  useEffect(() => {
    if (!token) return;
    const fetchConnections = async () => {
      setConnLoading(true);
      try {
        const res = await axios.get(`${API_BASE_URL}/users/connections`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setConnections({
          sent: res.data.sent || [],
          received: res.data.received || [],
          friends: res.data.friends || []
        });
      } catch (err) {
        console.error('Error fetching connections:', err);
      } finally {
        setConnLoading(false);
      }
    };
    fetchConnections();
  }, [token]);
  // Refs and animations
  const containerRef = useRef(null);

  // Animate buttons on mount
  useEffect(() => {
    if (containerRef.current) {
      const buttons = containerRef.current.querySelectorAll('.account-button');
      gsap.from(buttons, { opacity: 0, y: 20, stagger: 0.1, duration: 0.6, ease: 'power3.out' });
    }
  }, []);

  // Fonction pour actualiser manuellement le solde du token
  const refreshTokenBalance = async () => {
    setNotification({
      show: true,
      message: "Actualisation du solde en cours...",
      type: 'info'
    });
    
    const balance = await fetchTokenBalance();
    
    if (balance !== null) {
      setNotification({
        show: true,
        message: `Solde actualisé: ${balance}`,
        type: 'success'
      });
    } else {
      setNotification({
        show: true,
        message: "Échec de l'actualisation du solde",
        type: 'error'
      });
    }
    
    setTimeout(() => {
      setNotification({ show: false, message: '', type: 'info' });
    }, 3000);
  };

  // Function to connect Ethereum wallet
  const handleConnectWallet = async () => {
    try {
      if (!window.ethereum) {
        setError("MetaMask non détecté. Veuillez l'installer.");
        return;
      }
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = provider.getSigner();
      const address = await signer.getAddress();
      setWalletAddress(address);
      localStorage.setItem("walletAddress", address);
      console.log("Wallet connected:", address);
      
      // Récupérer le solde du token après la connexion du wallet
      fetchTokenBalance(address);
    } catch (err) {
      console.error("Error connecting wallet:", err);
      setError("Échec de la connexion du wallet.");
    }
  };

  // Function to handle World ID verification
  const handleWorldIDVerification = async (provider) => {
    console.log(`Starting World ID verification before ${provider} login`);
    
    // Vérifier qu'on a l'ID utilisateur
    if (!userId) {
      console.error("ID utilisateur manquant. Impossible de lier les comptes.");
      setError("Identification de l'utilisateur impossible. Veuillez vous reconnecter.");
      return;
    }
    
    console.log(`ID utilisateur pour liaison: ${userId}`);
    
    // Éviter les vérifications multiples
    if (isVerifying) {
      console.log("Already verifying, ignoring click");
      return;
    }
    
    // Stocker le fournisseur pour redirection après vérification
    setPendingSocialLogin(provider);
    
    // Mettre à jour l'état de vérification
    setIsVerifying(true);
    setError(null);
    
    try {
      // Vérifier si MiniKit est installé
      if (!MiniKit.isInstalled()) {
        console.error("MiniKit is not installed");
        
        // Afficher un message d'erreur détaillé avec lien d'installation
        setError(
          "L'application World ID n'est pas installée. Pour continuer, veuillez installer l'application World ID depuis votre app store et réessayer."
        );
        
        // Optionnellement, ouvrir le site de World ID pour l'installation
        window.open("https://worldcoin.org/download", "_blank");
        setIsVerifying(false);
        return;
      }
      
      // Créer le payload de vérification
      const verifyPayload = {
        action: "verifyhuman",
        signal: "",
        verification_level: VerificationLevel.Orb,
      };
      
      console.log("Sending verify command with payload:", verifyPayload);
      
      try {
        // Envoyer la commande de vérification à MiniKit
        const miniKitResult = await MiniKit.commandsAsync.verify(verifyPayload);
        console.log("Raw response from MiniKit:", miniKitResult);

        if (miniKitResult.finalPayload.status === "success") {
          console.log("User info:", MiniKit.user);
          // Vérifier si username est disponible
          if (MiniKit.user && MiniKit.user.username) {
            console.log("Username:", MiniKit.user.username);
          }
        }
        
        const { finalPayload } = miniKitResult;
        console.log("Received final payload:", finalPayload);
        
        // Vérifier si la vérification a réussi
        if (!finalPayload || finalPayload.status === "error") {
          console.error("MiniKit verification failed:", finalPayload);
          setError(
            finalPayload && 'message' in finalPayload 
              ? finalPayload.message 
              : "La vérification a échoué"
          );
          setIsVerifying(false);
          return;
        }
        
        if (finalPayload.status === "success") {
          console.log("MiniKit verification successful, sending to backend");
          
          try {
            // Envoyer la preuve au backend pour vérification
            console.log("Sending verification to backend with walletAddress:", walletAddress);
            console.log("User ID for linking:", userId);
            
            const response = await axios.post(`${API_BASE_URL}/users/verify-social`, {
              walletAddress,
              proof: finalPayload,
              appId: "app_a1a7fb139d05d20c50af7ba30b453f91",
              provider: provider,
              userId: userId // ID utilisateur pour la liaison
            }, {
              headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            
            console.log("Backend verification response:", response.data);
            
            // Vérifier si la vérification a réussi sur le serveur
            if (response.data.verified) {
              console.log("Backend confirmed verification success");
              
              // Afficher une notification de succès
              setNotification({
                show: true,
                message: `Identité vérifiée. Redirection vers ${provider}...`,
                type: 'success'
              });
              
              // IMPORTANT: Construire l'état avec les bons paramètres pour la liaison
              const state = btoa(JSON.stringify({
                linkMode: true,
                userId: userId, // Utiliser l'ID récupéré plus tôt
                timestamp: Date.now()
              }));
              
              console.log(`Redirection avec state encodé: ${state}`);
              console.log(`État décodé:`, JSON.parse(atob(state)));
              
              // Construire l'URL avec les paramètres corrects
              let redirectUrl = `${API_BASE_URL}/auth/${provider.toLowerCase()}?state=${state}`;
              
              // IMPORTANT: Ajouter le token JWT dans l'URL pour que le serveur puisse identifier l'utilisateur
              if (token) {
                redirectUrl += `&token=${token}`;
              }
              
              console.log(`URL de redirection finale: ${redirectUrl}`);
              
              // Rediriger vers le fournisseur social après un court délai
              setTimeout(() => {
                window.location.href = redirectUrl;
              }, 1500);
            } else {
              console.error("Backend verification failed:", response.data.message);
              setError(response.data.message || "Impossible de vérifier votre identité sur le serveur");
            }
          } catch (err) {
            console.error("Error during backend verification:", err);
            setError("Impossible de communiquer avec le serveur. Veuillez réessayer plus tard.");
          }
        }
      } catch (miniKitError) {
        console.error("Error from MiniKit:", miniKitError);
        
        if (miniKitError instanceof Error) {
          setError(miniKitError.message || "Le processus de vérification World ID a échoué");
        } else {
          setError("Le processus de vérification World ID a échoué");
        }
      }
    } catch (error) {
      console.error("Unexpected error during verification:", error);
      
      if (error instanceof Error) {
        setError(error.message || "Une erreur s'est produite pendant la vérification");
      } else {
        setError("Une erreur s'est produite pendant la vérification");
      }
    } finally {
      setIsVerifying(false);
    }
  };

  // Handlers for accepting/rejecting friend requests
  const handleAccept = async (id) => {
    try {
      await axios.post(`${API_BASE_URL}/users/${id}/invite/accept`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConnections(prev => ({
        ...prev,
        friends: [...prev.friends, { id, name: prev.received.find(u => u.id === id)?.name }],
        received: prev.received.filter(u => u.id !== id)
      }));

      setNotification({
        show: true,
        message: "Demande d'ami acceptée",
        type: 'success'
      });
      
      setTimeout(() => {
        setNotification({ show: false, message: '', type: 'info' });
      }, 3000);
    } catch (err) {
      console.error('Error accepting friend request:', err);
      setNotification({
        show: true,
        message: "Erreur lors de l'acceptation de la demande",
        type: 'error'
      });
      
      setTimeout(() => {
        setNotification({ show: false, message: '', type: 'info' });
      }, 3000);
    }
  };

  const handleReject = async (id) => {
    try {
      await axios.post(`${API_BASE_URL}/users/${id}/invite/reject`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConnections(prev => ({
        ...prev,
        received: prev.received.filter(u => u.id !== id)
      }));

      setNotification({
        show: true,
        message: "Demande d'ami rejetée",
        type: 'info'
      });
      
      setTimeout(() => {
        setNotification({ show: false, message: '', type: 'info' });
      }, 3000);
    } catch (err) {
      console.error('Error rejecting friend request:', err);
      setNotification({
        show: true,
        message: "Erreur lors du rejet de la demande",
        type: 'error'
      });
      
      setTimeout(() => {
        setNotification({ show: false, message: '', type: 'info' });
      }, 3000);
    }
  };

  // Enabled social providers
  const socialAccounts = [
    // Twitter connection
    {
      name: 'Twitter',
      icon: <FaTwitter />,
      action: () => handleWorldIDVerification('twitter'),
      color: '#1DA1F2'
    },
    // Telegram connection
    {
      name: 'Telegram',
      icon: <FaTelegramPlane />,
      action: () => handleWorldIDVerification('telegram'),
      color: '#0088cc'
    },
    // Discord connection
    {
      name: 'Discord',
      icon: <FaDiscord />,
      action: () => handleWorldIDVerification('discord'),
      color: '#5865F2'
    }
  ];

  return (
    <div className="connect-accounts">
      <div className="background-gradient"></div>
      <div className="content-container">
        <header>
          <div className="profile-card">
            <div className="profile-header">
              <div className="profile-image">
                <FaUserCircle />
              </div>
              <div className="profile-details">
                <h2 className="username">{username}</h2>
                {userId && <p className="user-id">ID: {userId.substring(0, 8)}...</p>}
              </div>
            </div>
            
            <div className="wallet-section">
              {walletAddress ? (
                <div className="wallet-connected">
                  <div className="wallet-info">
                    <FaWallet className="wallet-icon" />
                    <span className="wallet-address">
                      {walletAddress.substring(0, 6)}...{walletAddress.substring(walletAddress.length - 4)}
                    </span>
                  </div>
                  
                  {tokenBalance != null && (
                    <div className="token-balance-container">
                      <FaCoins className="token-icon" />
                      <span className="token-balance">{parseFloat(tokenBalance).toFixed(2)}</span>
                      <button 
                        onClick={refreshTokenBalance} 
                        className="refresh-balance-button"
                        title="Rafraîchir le solde de token"
                      >
                        <RefreshCw size={16} />
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button onClick={handleConnectWallet} className="connect-wallet-button">
                  <FaWallet className="wallet-icon" />
                  <span>Connect Wallet</span>
                </button>
              )}
            </div>
            
            {/* Referral code display */}
            <div className="referral-container">
              <span className="referral-label">Code de parrainage:</span>
              <span className="referral-code">{(user?.referralCode) || referralCode || 'Non défini'}</span>
            </div>
          </div>
          
          {/* Daily login streak indicator */}
          {currentStreak != null && maxStreak != null && todaysReward != null && (
            <div className="streak-container">
              <div className="streak-header">
                <h3>Connexion quotidienne</h3>
              </div>
              <div className="streak-details">
                <div className="streak-item">
                  <span className="streak-value">{currentStreak}</span>
                  <span className="streak-label">Jours consécutifs</span>
                </div>
                <div className="streak-item">
                  <span className="streak-value">{maxStreak}</span>
                  <span className="streak-label">Record</span>
                </div>
                <div className="streak-item">
                  <span className="streak-value">{todaysReward}</span>
                  <span className="streak-label">Récompense du jour</span>
                </div>
              </div>
              <div className="streak-progress">
                <div className="streak-progress-bar" style={{ width: `${Math.min(todaysReward, 5) / 5 * 100}%` }}></div>
              </div>
            </div>
          )}
          
          <div className="page-title">
            <h1>Connectez vos comptes</h1>
            <p className="subtitle">Liez vos réseaux sociaux à votre profil</p>
          </div>
          
          <div className="verification-card">
            <div className="verification-icon">
              <FaShieldAlt />
            </div>
            <div className="verification-content">
              <h3>Vérification humaine requise</h3>
              <p>Vérifiez votre identité avec World ID avant de connecter vos comptes sociaux</p>
            </div>
          </div>
        </header>

        <div className="accounts-grid" ref={containerRef}>
          {socialAccounts.map((account) => (
            <button 
              key={account.name}
              onClick={account.action}
              className="account-button"
              disabled={isVerifying}
              style={{
                '--accent-color': account.color
              }}
            >
              <div className="account-icon-wrapper">
                <span className="account-icon">{account.icon}</span>
              </div>
              <span className="account-name">{account.name}</span>
            </button>
          ))}
        </div>
        
        {/* World ID Verification Status */}
        {isVerifying && (
          <div className="verification-status">
            <div className="spinner"></div>
            <span>Vérification World ID en cours...</span>
          </div>
        )}
        
        {error && (
          <div className="error-message">
            <AlertCircle className="error-icon" />
            <span>{error}</span>
          </div>
        )}

        {/* Friend Requests Section */}
        <section className="friends-section">
          <h2>Demandes d'amis reçues</h2>
          {connLoading ? (
            <div className="loading-container">
              <div className="spinner"></div>
              <span>Chargement des demandes d'amis...</span>
            </div>
          ) : connections.received.length === 0 ? (
            <div className="empty-state">
              <p>Aucune demande d'ami en attente.</p>
            </div>
          ) : (
            <ul className="friend-requests-list">
              {connections.received.map(u => (
                <li key={u.id} className="friend-request-item">
                  <div className="friend-info">
                    <FaUserCircle className="friend-avatar" />
                    <span className="friend-name">{u.name}</span>
                  </div>
                  <div className="friend-actions">
                    <button 
                      onClick={() => handleAccept(u.id)}
                      className="accept-button"
                    >
                      <FaCheck /> Accepter
                    </button>
                    <button 
                      onClick={() => handleReject(u.id)}
                      className="reject-button"
                    >
                      <FaUserTimes /> Refuser
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      
      {notification.show && (
        <div className={`notification ${notification.type}`}>
          {notification.type === 'success' && <FaCheck className="notification-icon" />}
          {notification.type === 'error' && <AlertCircle className="notification-icon" />}
          <span>{notification.message}</span>
        </div>
      )}

      <style>{`   
        /* Base styles */
        .connect-accounts {
          width: 100%;
          min-height: 100vh;
          margin: 0;
          padding: 0;
          background-color: #0d1117;
          color: #ffffff;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          position: relative;
          overflow-x: hidden; /* Prevent horizontal scroll */
        }
        
        /* Clean background by removing complex gradients */
        .background-gradient {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: #0d1117; /* Solid dark background */
          pointer-events: none;
        }
        
        .content-container {
          max-width: 1000px;
          margin: 0 auto;
          padding: 2rem;
          position: relative;
          z-index: 1;
        }
        
        /* Header and Profile */
        header {
          margin-bottom: 3rem;
        }
        
        .profile-card, .streak-container, .verification-card, .friends-section {
          background: #161b22; /* Solid dark background instead of semi-transparent */
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          border: 1px solid #30363d;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        }
        
        .profile-header {
          display: flex;
          align-items: center;
          margin-bottom: 1.25rem;
        }
        
        .profile-image {
          font-size: 3.5rem;
          color: #7ee787;
          margin-right: 1rem;
          flex-shrink: 0;
        }
        
        .profile-details {
          flex-grow: 1;
        }
        
        .username {
          font-size: 1.5rem;
          margin: 0 0 0.25rem 0;
          color: white;
          font-weight: 600;
        }
        
        .user-id {
          font-size: 0.8rem;
          margin: 0;
          color: rgba(255, 255, 255, 0.6);
          font-weight: 400;
        }
        
        .wallet-section {
          margin-bottom: 1rem;
          border-top: 1px solid rgba(48, 54, 61, 0.8);
          padding-top: 1rem;
        }
        
        .wallet-connected {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        
        .wallet-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .wallet-icon {
          color: #7ee787;
          font-size: 1rem;
        }
        
        .wallet-address {
          font-size: 0.9rem;
          color: rgba(255, 255, 255, 0.8);
          font-family: monospace;
          letter-spacing: 0.5px;
        }
        
        .token-balance-container {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(22, 146, 93, 0.15);
          padding: 0.5rem 0.75rem;
          border-radius: 8px;
          margin-top: 0.5rem;
        }
        
        .token-icon {
          color: #d4a017;
          font-size: 1rem;
        }
        
        .token-balance {
          color: #f0f6fc;
          font-weight: 500;
        }
        
        .refresh-balance-button {
          background: none;
          border: none;
          color: #7ee787;
          cursor: pointer;
          padding: 4px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          margin-left: auto;
        }
        
        .refresh-balance-button:hover {
          background-color: rgba(126, 231, 135, 0.2);
        }
        
        .connect-wallet-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background-color: #238636;
          border: none;
          border-radius: 6px;
          padding: 0.6rem 1rem;
          color: white;
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          width: 100%;
          justify-content: center;
        }
        
        .connect-wallet-button:hover {
          background-color: #2ea043;
        }
        
        .referral-container {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-top: 0.5rem;
          padding-top: 0.75rem;
          border-top: 1px solid rgba(48, 54, 61, 0.8);
        }
        
        .referral-label {
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.6);
        }
        
        .referral-code {
          font-size: 0.9rem;
          font-weight: 500;
          padding: 0.2rem 0.5rem;
          background-color: rgba(126, 231, 135, 0.1);
          border-radius: 4px;
          font-family: monospace;
          letter-spacing: 0.5px;
          color: #7ee787;
        }
        
        /* Streak Display */
        .streak-container {
          background: rgba(22, 27, 34, 0.7);
          border-radius: 12px;
          padding: 1.25rem;
          margin-bottom: 2rem;
          border: 1px solid rgba(48, 54, 61, 0.8);
          backdrop-filter: blur(10px);
        }
        
        .streak-header {
          margin-bottom: 1rem;
        }
        
        .streak-header h3 {
          font-size: 1.1rem;
          margin: 0;
          color: #7ee787;
          font-weight: 500;
        }
        
        .streak-details {
          display: flex;
          justify-content: space-between;
          margin-bottom: 1rem;
        }
        
        .streak-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex: 1;
          padding: 0.5rem;
        }
        
        .streak-value {
          font-size: 1.5rem;
          font-weight: 600;
          color: #f0f6fc;
        }
        
        .streak-label {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.6);
          margin-top: 0.25rem;
        }
        
        .streak-progress {
          height: 8px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          overflow: hidden;
        }
        
        .streak-progress-bar {
          height: 100%;
          background: linear-gradient(90deg, #238636, #7ee787);
          border-radius: 4px;
          transition: width 0.5s ease;
        }
        
        /* Page Title */
        .page-title {
          margin-bottom: 1.5rem;
          text-align: center;
        }
        
        .page-title h1 {
          font-size: 2rem;
          font-weight: 600;
          color: #f0f6fc;
          margin: 0 0 0.5rem 0;
        }
        
        .subtitle {
          color: rgba(255, 255, 255, 0.6);
          font-size: 1rem;
          margin: 0;
        }
        
        /* Verification Card */
        .verification-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          background: rgba(26, 97, 159, 0.2);
          border: 1px solid rgba(33, 139, 255, 0.2);
          border-radius: 12px;
          padding: 1.25rem;
          margin-bottom: 2rem;
        }
        
        .verification-icon {
          font-size: 1.75rem;
          color: #58a6ff;
          flex-shrink: 0;
        }
        
        .verification-content h3 {
          font-size: 1.1rem;
          color: #58a6ff;
          margin: 0 0 0.5rem 0;
          font-weight: 500;
        }
        
        .verification-content p {
          font-size: 0.9rem;
          color: rgba(255, 255, 255, 0.8);
          margin: 0;
        }
        
        /* Account Buttons - New solid design with high contrast */
        .accounts-grid {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          margin-bottom: 2.5rem;
          width: 100%;
          max-width: 500px;
          margin-left: auto;
          margin-right: auto;
          position: relative;
          z-index: 10; /* Ensure buttons are above any other elements */
        }
        
        .account-button {
          display: flex;
          align-items: center;
          gap: 1rem;
          background-color: rgba(22, 27, 34, 0.95);
          border: 1px solid rgba(48, 54, 61, 0.8);
          border-radius: 12px;
          padding: 1.25rem;
          color: #ffffff;
          font-size: 1.1rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
          backdrop-filter: blur(10px);
          height: 80px;
        }
        
        /* Removed the ::before pseudo-element since we're using direct styling now */
        
        .account-button:hover:not(:disabled) {
          transform: translateY(-3px);
          box-shadow: 0 7px 14px rgba(0, 0, 0, 0.25);
          border-color: var(--accent-color);
        }
        
        .account-button:hover:not(:disabled)::before {
          width: 100%;
          opacity: 0.1;
        }
        
        .account-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .account-icon-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 50px;
          height: 50px;
          background-color: rgba(255, 255, 255, 0.9);
          border-radius: 50%;
          flex-shrink: 0;
        }
        
        /* Icon wrapper colors for each social network */
        button[style*="--accent-color: #1DA1F2"] .account-icon-wrapper {
          background-color: white;
        }
        
        button[style*="--accent-color: #0088cc"] .account-icon-wrapper {
          background-color: white;
        }
        
        button[style*="--accent-color: #5865F2"] .account-icon-wrapper {
          background-color: white;
        }
        
        .account-icon {
          font-size: 1.5rem;
          color: #000000; /* Black icons by default */
        }
        
        /* Icon colors for each social network */
        button[style*="--accent-color: #1DA1F2"] .account-icon {
          color: #1DA1F2; /* Twitter blue */
        }
        
        button[style*="--accent-color: #0088cc"] .account-icon {
          color: #0088cc; /* Telegram blue */
        }
        
        button[style*="--accent-color: #5865F2"] .account-icon {
          color: #5865F2; /* Discord purple */
        }
        
        .account-button:hover:not(:disabled) .account-icon {
          color: white;
        }
        
        .account-name {
          font-weight: 500;
        }
        
        /* Verification Status and Error */
        .verification-status {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin: 1.5rem 0;
          background-color: rgba(56, 139, 255, 0.15);
          padding: 1rem 1.25rem;
          border-radius: 10px;
          border: 1px solid rgba(56, 139, 255, 0.3);
          max-width: 500px;
          margin-left: auto;
          margin-right: auto;
        }
        
        .spinner {
          width: 20px;
          height: 20px;
          border: 3px solid rgba(56, 139, 255, 0.3);
          border-radius: 50%;
          border-top-color: rgba(56, 139, 255, 0.9);
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        
        .error-message {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin: 1.5rem 0;
          background-color: rgba(248, 81, 73, 0.15);
          padding: 1rem 1.25rem;
          border-radius: 10px;
          border: 1px solid rgba(248, 81, 73, 0.3);
          max-width: 500px;
          margin-left: auto;
          margin-right: auto;
        }
        
        .error-icon {
          color: #f85149;
          flex-shrink: 0;
        }
        
        /* Friends Section */
        .friends-section {
          background: rgba(22, 27, 34, 0.7);
          border-radius: 12px;
          padding: 1.5rem;
          margin-top: 2rem;
          border: 1px solid rgba(48, 54, 61, 0.8);
          backdrop-filter: blur(10px);
        }
        
        .friends-section h2 {
          font-size: 1.25rem;
          font-weight: 500;
          margin: 0 0 1.25rem 0;
          color: #7ee787;
        }
        
        .loading-container {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          padding: 1.5rem;
          color: rgba(255, 255, 255, 0.6);
        }
        
        .empty-state {
          text-align: center;
          padding: 2rem 0;
          color: rgba(255, 255, 255, 0.6);
        }
        
        .friend-requests-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        
        .friend-request-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem;
          border-bottom: 1px solid rgba(48, 54, 61, 0.8);
        }
        
        .friend-request-item:last-child {
          border-bottom: none;
        }
        
        .friend-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        
        .friend-avatar {
          font-size: 1.5rem;
          color: rgba(255, 255, 255, 0.8);
        }
        
        .friend-name {
          font-weight: 500;
        }
        
        .friend-actions {
          display: flex;
          gap: 0.5rem;
        }
        
        .accept-button, .reject-button {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.5rem 0.75rem;
          border-radius: 6px;
          border: none;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .accept-button {
          background-color: #238636;
          color: white;
        }
        
        .accept-button:hover {
          background-color: #2ea043;
        }
        
        .reject-button {
          background-color: transparent;
          color: rgba(255, 255, 255, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .reject-button:hover {
          background-color: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.3);
        }
        
        /* Notification */
        .notification {
          position: fixed;
          bottom: 1.5rem;
          left: 50%;
          transform: translateX(-50%);
          padding: 0.75rem 1.25rem;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.9rem;
          z-index: 1000;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
          min-width: 300px;
          max-width: 90%;
          backdrop-filter: blur(10px);
        }
        
        .notification.success {
          background-color: rgba(46, 160, 67, 0.9);
          border: 1px solid rgba(46, 160, 67, 1);
          color: white;
        }
        
        .notification.info {
          background-color: rgba(56, 139, 255, 0.9);
          border: 1px solid rgba(56, 139, 255, 1);
          color: white;
        }
        
        .notification.error {
          background-color: rgba(248, 81, 73, 0.9);
          border: 1px solid rgba(248, 81, 73, 1);
          color: white;
        }
        
        .notification-icon {
          flex-shrink: 0;
        }
        
        /* Responsive Styles */
        @media (max-width: 768px) {
          .content-container {
            padding: 1.5rem;
          }
          
          .profile-header {
            flex-direction: column;
            text-align: center;
          }
          
          .profile-image {
            margin-right: 0;
            margin-bottom: 0.75rem;
          }
          
          .streak-details {
            flex-direction: column;
            gap: 1rem;
          }
          
          .friend-request-item {
            flex-direction: column;
            gap: 1rem;
            align-items: flex-start;
          }
          
          .friend-actions {
            width: 100%;
          }
          
          .accept-button, .reject-button {
            flex: 1;
            justify-content: center;
          }
        }
        
        @media (max-width: 480px) {
          .accounts-grid {
            grid-template-columns: 1fr;
          }
          
          .notification {
            min-width: 90%;
            max-width: 90%;
          }
        }
      `}</style>
    </div>
  );
};

export default ConnectAccounts;