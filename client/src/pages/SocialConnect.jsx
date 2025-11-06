import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaTelegramPlane, FaDiscord, FaArrowLeft, FaCheckCircle, FaLock } from 'react-icons/fa';
import { MiniKit, VerificationLevel } from "@worldcoin/minikit-js";
import { AlertCircle, ChevronLeft, Info, Gift, Shield, Coins, CheckCircle, Award, Ticket } from "lucide-react";
import head from './head.png';
import card from './idCard.png';
import { ethers, solidityPackedKeccak256 } from "ethers";
import AdSenseAuto from '../components/AdSenseAuto';
import { API_BASE_URL } from '../config';

// Custom X logo component
const FaX = () => (
  <svg 
    width="1em" 
    height="1em" 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    xmlns="http://www.w3.org/2000/svg"
    style={{ marginTop: '14%' }}
  >
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const SocialConnect = () => {
  const navigate = useNavigate();
  const [notification, setNotification] = useState({ show: false, message: '', type: 'info' });
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState(null);
  const [pendingSocialLogin, setPendingSocialLogin] = useState(null);
  const [walletAddress, setWalletAddress] = useState("");
  const [userId, setUserId] = useState(null);
  const [token, setToken] = useState(null);
  const [username, setUsername] = useState('');
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showCardTooltip, setShowCardTooltip] = useState(false);
  const [connectedAccounts, setConnectedAccounts] = useState({
    x: false,
    telegram: false,
    discord: false
  });
  const [showIdCard, setShowIdCard] = useState(false);
  const [idCardVisible, setIdCardVisible] = useState(false); // Modified: Default to false to hide card initially
  const [socialHandles, setSocialHandles] = useState({
    x: '',
    telegram: '',
    discord: ''
  });
  
  // MODIFICATION 1: Initialize state from localStorage
  const [idCardImageUrl, setIdCardImageUrl] = useState(() => {
    // if already uploaded, display the S3 URL, otherwise keep empty while waiting for canvas
    return localStorage.getItem('s3CardUrl') || '';
  });
  const canvasRef = useRef(null);
  const [onChainProofs, setOnChainProofs] = useState({});
  const [pendingTransactions, setPendingTransactions] = useState({});

  const [isUploadingCard, setIsUploadingCard] = useState(false);
  const [s3CardUrl, setS3CardUrl] = useState(() => localStorage.getItem('s3CardUrl') || '');
  const [idCardS3Key, setIdCardS3Key] = useState(() => localStorage.getItem('idCardS3Key'));
  
  // New states for lottery animation
  // const [showLotteryAnimation, setShowLotteryAnimation] = useState(false);

  // Désactivé : la carte ID ne s'affiche plus
  // useEffect(() => {
  //   if (idCardS3Key && token) {
  //     setShowIdCard(true);
  //     setIdCardVisible(false);
  //     axios.get(`${API_BASE_URL}/s3/image/${encodeURIComponent(idCardS3Key)}`, {
  //       headers: { Authorization: `Bearer ${token}` }
  //     })
  //     .then(({ data }) => {
  //       setIdCardImageUrl(data.url);
  //     })
  //     .catch(err => {
  //       console.error("Erreur récupération presigned URL :", err);
  //     });
  //   }
  // }, [idCardS3Key, token]);
  

  // Périodiquement on check les tx en attente
  useEffect(() => {
    const checkInterval = setInterval(() => {
      Object.entries(pendingTransactions).forEach(([provider, txId]) => {
        checkTransactionStatus(txId, provider).then(result => {
          if (result.confirmed) {
            setPendingTransactions(prev => {
              const next = { ...prev };
              delete next[provider];
              return next;
            });
          }
        });
      });
    }, 15000);
    return () => clearInterval(checkInterval);
  }, [pendingTransactions]);

  // Récupération token / userId / walletAddress
  useEffect(() => {
    const storedToken = localStorage.getItem('auth_token') || localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
    }
    const storedUserId = localStorage.getItem('userId') || localStorage.getItem('user_id');
    if (storedUserId) {
      setUserId(storedUserId);
    }
    const storedUsername = localStorage.getItem('username') || localStorage.getItem('user_username');
    if (storedUsername) {
      setUsername(storedUsername);
    }
    const storedWalletAddress = localStorage.getItem('walletAddress');
    if (storedWalletAddress) {
      setWalletAddress(storedWalletAddress);
    }

    if (storedToken) {
      axios.get(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${storedToken}` }
      })
      .then(({ data }) => {
        if (data._id) {
          localStorage.setItem('userId', data._id);
          setUserId(data._id);
          if (data.name) setUsername(data.name);
          if (data.walletAddress) setWalletAddress(data.walletAddress);
          if (data.social) {
            const connected = {
              x: !!data.social.twitter, // Mapping twitter field from API to x in front-end
              telegram: !!data.social.telegram,
              discord: !!data.social.discord
            };
            setConnectedAccounts(connected);
            if (data.socialVerifications) {
              setOnChainProofs(data.socialVerifications);
            }
            setSocialHandles({
              x: data.social.twitter ? '@' + data.social.twitter.username : '',
              telegram: data.social.telegram ?   data.social.telegram.username : '',
              discord: data.social.discord && data.social.discord.username
                ?  data.social.discord.username + (data.social.discord.discriminator ? '#' + data.social.discord.discriminator : '')
                : ''
            });
          }
        }
      })
      .catch(err => {
        console.error("Error retrieving user information:", err);
      });
    }
  }, []);

  // Add lottery animation effect
  // useEffect(() => {
  //   const linkedCount = Object.values(connectedAccounts).filter(Boolean).length;
  //   if (linkedCount > 0 && linkedCount < 3) {
  //     setShowLotteryAnimation(true);
  //     const timer = setTimeout(() => {
  //       setShowLotteryAnimation(false);
  //     }, 5000);
  //     return () => clearTimeout(timer);
  //   }
  // }, [connectedAccounts]);

  // Désactivé : la carte ID ne s'affiche plus
  // useEffect(() => {
  //   const linkedCount = Object.values(connectedAccounts).filter(Boolean).length;
  //   if (linkedCount === 3 && !idCardS3Key) {
  //     setShowIdCard(true);
  //     setIdCardVisible(false);
  //     axios.get(`${API_BASE_URL}/auth/me`, {
  //       headers: token ? { Authorization: `Bearer ${token}` } : {}
  //     })
  //     .then(({ data }) => {
  //       const social = data.social || {};
  //       if (social.twitter && social.telegram && social.discord) {
  //         generateIdCardImage();
  //       } else {
  //         console.warn('Not all networks persisted yet, waiting...');
  //       }
  //     })
  //     .catch(err => {
  //       console.error('Error fetching user after linking:', err);
  //     });
  //   } else if (linkedCount === 3 && idCardS3Key) {
  //     setShowIdCard(true);
  //     setIdCardVisible(false);
  //     setIdCardImageUrl(s3CardUrl);
  //   }
  // }, [connectedAccounts, idCardS3Key, s3CardUrl, token]);

  // Désactivé : fonction de toggle de la carte ID
  // const toggleIdCardVisibility = () => {
  //   setIdCardVisible(prev => !prev);
  // };

  // Modification de la fonction testDownloadIdCard pour utiliser la route backend
  const testDownloadIdCard = async () => {
    if (!idCardS3Key) {
      setNotification({ show: true, message: "Aucune clé S3 disponible pour le téléchargement", type: "error" });
      return;
    }
  
    try {
      setNotification({ show: true, message: "Préparation du téléchargement…", type: "info" });
  
      // 1) Récupérer le blob
      const response = await axios.get(
        `${API_BASE_URL}/s3/download/${encodeURIComponent(idCardS3Key)}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          responseType: 'blob'
        }
      );
      const blob = response.data;
  
      // 2) Générer l'URL temporaire
      const blobUrl = window.URL.createObjectURL(blob);
  
      // 3) Déterminer l'extension depuis le MIME
      const mime = blob.type;                     // ex. "image/png"
      const ext  = mime.split('/')[1] || 'png';   // ex. "png"
      const filename = `${username || 'user'}_card.${ext}`;
  
      // 4) Créer l'élément <a> et l'attacher
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      link.style.display = 'none';               // invisible
      document.body.appendChild(link);
  
      // 5) Simuler le clic
      link.click();
  
      // 6) Nettoyer
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
  
      setNotification({ show: true, message: "Téléchargement démarré !", type: "success" });
    } catch (err) {
      console.error("Error testing download:", err);
      setNotification({ show: true, message: `Échec du téléchargement : ${err.message}`, type: "error" });
    }
  };
  
  
// Modification de la fonction uploadIdCardToS3 pour stocker la clé S3
const uploadIdCardToS3 = async (imageBlob) => {
  try {
    setIsUploadingCard(true);
    setNotification({
      show: true,
      message: "Uploading ID card to secure storage...",
      type: 'info'
    });
    
    // Créer un objet FormData pour envoyer l'image
    const formData = new FormData();
    formData.append('image', imageBlob, `${username || 'user'}_id_card.png`);
    
    // Configurer les headers avec le token si disponible
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Envoyer l'image à l'endpoint upload
    const response = await axios.post(
      `${API_BASE_URL}/s3/upload`, 
      formData,
      { 
        headers: headers
      }
    );
    
    // Si l'upload réussit, sauvegarder l'URL S3 et la clé
    if (response.data && response.data.url) {
      // setS3CardUrl(response.data.url);
      setIdCardImageUrl(response.data.url);
      setIdCardS3Key(response.data.key);             
      
      // IMPORTANT: Stocker la clé S3 et l'URL dans localStorage
      localStorage.setItem('idCardS3Key', response.data.key);
      // localStorage.setItem('s3CardUrl', response.data.url);
      // console.log("S3 key saved:", response.data.key);
      
      setNotification({
        show: true,
        message: "ID Card successfully uploaded to secure storage!",
        type: 'success'
      });
      
      setIsUploadingCard(false);
      return response.data;
    }
  } catch (error) {
    console.error("Error uploading ID card to S3:", error);
    setNotification({
      show: true,
      message: "Error saving ID card. Using local version instead.",
      type: 'error'
    });
    setIsUploadingCard(false);
  }
  
  return null;
};

  // ID card rendering (idem que vous aviez)
  const generateIdCardImage = () => {
    const fontPreloader = document.createElement('style');
    fontPreloader.textContent = `
      @font-face {
        font-family: 'Winky Rough';
        src: url('/Winky_Rough/WinkyRough-VariableFont_wght.ttf') format('truetype-variations');
      }
    `;
    document.head.appendChild(fontPreloader);

    const img = new Image();
    img.src = card;
    setTimeout(() => {
      if (img.complete) renderCard(img);
      else img.onload = () => renderCard(img);
    }, 100);
  };

  // MODIFICATION 3: Modified renderCard to prevent re-uploads
  const renderCard = (img) => {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
  
    ctx.fillStyle = "black";
    ctx.font = "bold 96px 'Winky Rough', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(username || 'User', 176, 390);
  
    ctx.fillStyle = "black";
    ctx.font = "48px 'Winky Rough', sans-serif";
    ctx.fillText(socialHandles.telegram || '@user_telegram', 105, 585);
    ctx.fillText(socialHandles.discord || 'user#1234', 107, 690);
    ctx.fillText(socialHandles.x || '@user_x', 105, 795); // Updated from twitter to x
  
    // Afficher localement l'image (comme avant)
    setIdCardImageUrl(canvas.toDataURL('image/png'));
    
    // MODIFICATION: Convertir le canvas en blob et l'envoyer à S3 seulement si pas déjà uploadé
    canvas.toBlob(async (blob) => {
      try {
        // Uniquement si tous les comptes sont connectés ET pas encore de clé S3
        if (Object.values(connectedAccounts).filter(Boolean).length === 3 && !idCardS3Key) {
          const uploadResult = await uploadIdCardToS3(blob);
          if (uploadResult) {
            // console.log('ID Card uploaded to S3:', uploadResult);
            // Stocker l'URL et la clé dans le localStorage
            setS3CardUrl(uploadResult.url);
            setIdCardS3Key(uploadResult.key);
            localStorage.setItem('s3CardUrl', uploadResult.url);
            localStorage.setItem('idCardS3Key', uploadResult.key);
          }
        }
      } catch (error) {
        console.error('Error during ID card upload:', error);
      }
    }, 'image/png', 0.95); // Qualité 95%
  };

  axios.interceptors.request.use(req => {
    console.debug('[AXIOS REQ]', {
      method: req.method,
      url:    req.url,
      headers: req.headers,
      data:   req.data
    });
    return req;
  });
  axios.interceptors.response.use(res => {
    console.debug('[AXIOS RES]', {
      url:      res.config.url,
      status:   res.status,
      data:     res.data
    });
    return res;
  }, err => {
    console.error('[AXIOS ERR]', {
      url:    err.config?.url,
      msg:    err.message,
      status: err.response?.status,
      data:   err.response?.data
    });
    return Promise.reject(err);
  });

  // Envoi de la preuve à World ID puis on‑chain
  const handleWorldIDVerification = async (provider) => {
  
    if (!userId || !walletAddress) {
      setError("User not identified or wallet not connected. Please log in again.");
      return;
    }
    
    if (isVerifying) return;
    
    setPendingSocialLogin(provider);
    setIsVerifying(true);
    setError(null);
    
    try {
      // Vérifier que World ID App est installée
      if (!MiniKit.isInstalled()) {
        setError("World ID app is not installed. Please install it and try again.");
        window.open("https://worldcoin.org/download", "_blank");
        setIsVerifying(false);
        return;
      }
      
      // Lancer la vérification Orb
      const { finalPayload: proofPayload } = await MiniKit.commandsAsync.verify({
        action: "verifyhuman",
        signal: "",
        verification_level: VerificationLevel.Orb,
      });
  
    
      if (proofPayload.status !== "success") {
        console.warn('[DBG] Proof.status ≠ success', proofPayload);
        setError(proofPayload.message || "Identity verification failed");
        setIsVerifying(false);
        return;
      }
      
      // Pour la compatibilité avec le backend, qui attend encore "twitter" comme nom de provider
      const backendProvider = provider === 'x' ? 'twitter' : provider;
      
      // Envoyer la vérification au backend seulement
      await axios.post(
        `${API_BASE_URL}/users/verify-social`,
        {
          walletAddress,
          provider: backendProvider, // Utiliser twitter pour le backend
          userId,
          proof: proofPayload
        },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
  
  
      // Mettre à jour l'état local
      setConnectedAccounts(prev => ({
        ...prev,
        [provider]: true
      }));
      
      // Notification de succès
      setNotification({
        show: true,
        message: `Proceeding to ${provider} for account linking…`,
        type: 'info'
      });
    
      // Redirection vers l'authentification sociale - Utiliser "twitter" dans l'URL pour le backend
      const backendPath = provider === 'x' ? 'twitter' : provider;
      const state = btoa(JSON.stringify({ linkMode: true, userId, timestamp: Date.now() }));
      let redirectUrl = `${API_BASE_URL}/auth/${backendPath.toLowerCase()}?state=${state}`;
      if (token) redirectUrl += `&token=${token}`;
      setTimeout(() => window.location.href = redirectUrl, 1500);
    
    } catch (err) {
      console.error("Unexpected error in handleWorldIDVerification:", err);
      setError(err.message || "An unexpected error occurred");
      setIsVerifying(false);
    }finally {
      setIsVerifying(false);
    }
  };
  
  // Vérification du statut d'une tx par l'API
  const checkTransactionStatus = async (transactionId, provider) => {
    try {
      // Convertir "x" en "twitter" pour l'API
      const apiProvider = provider === 'x' ? 'twitter' : provider;
      
      const response = await axios.get(
        `${API_BASE_URL}/users/check-transaction?transactionId=${transactionId}&provider=${apiProvider}`,
        { headers: token ? { 'Authorization': `Bearer ${token}` } : {} }
      );
      if (response.data.confirmed) {
        setOnChainProofs(prev => ({
          ...prev,
          [provider]: {
            txHash: response.data.txHash,
            proofHash: response.data.proofHash
          }
        }));
        setConnectedAccounts(prev => ({
          ...prev,
          [provider]: true
        }));
      }
      return response.data;
    } catch (err) {
      console.error("Error checking transaction status:", err);
      return { confirmed: false };
    }
  };

  const handleSkip = () => navigate('/search');
  const toggleInfoModal = () => setShowInfoModal(v => !v);
  const toggleCardTooltip = () => setShowCardTooltip(v => !v);
  const generateTestIdCard = () => {
    setSocialHandles(prev => ({
      x: prev.x || '@user_x', // Modifié de twitter à x
      telegram: prev.telegram || '@user_telegram',
      discord: prev.discord   || 'user#1234'
    }));
    generateIdCardImage();
    setShowIdCard(true);
    setIdCardVisible(false); // Modified: Set to false by default so card is hidden until the user clicks "Show ID Card"
    setNotification({ show: true, message: "ID Card successfully generated! Click 'Show ID Card' to view it.", type: 'success' });
    setTimeout(() => setNotification({ show: false, message: '', type: 'info' }), 3000);
  };

  // Icônes + actions
  const socialAccounts = [
    { name: 'X',         icon: <FaX />,             action: () => handleWorldIDVerification('x'),      color: '#f28011', connected: connectedAccounts.x },
    { name: 'Telegram',  icon: <FaTelegramPlane />, action: () => handleWorldIDVerification('telegram'),  color: '#f28011', connected: connectedAccounts.telegram },
    { name: 'Discord',   icon: <FaDiscord />,       action: () => handleWorldIDVerification('discord'),   color: '#f28011', connected: connectedAccounts.discord },
  ];

  const linkedCount     = Object.values(connectedAccounts).filter(Boolean).length;
  const totalUmiEarned  = linkedCount * 100;
  const allLinked       = linkedCount === 3;
  const progressLabel   = `${linkedCount}/3 linked account`;
  const progressPercent = (linkedCount / 3) * 100;
  
  // Calculate lottery tickets based on connected accounts
  // const lotteryTickets = linkedCount;
  
  return (
    <div className="social-connect">
      <div className="background-gradient"></div>
      <div className="content-container">
        <header>
          {/* <div className="top-nav">
            <div className="back-button" onClick={handleSkip}>
              <ChevronLeft size={20} />
            </div>
            <div className="empty-space"></div>
            <div className="empty-space"></div>
          </div> */}
          
          <div className="hero-section">
            <div className="logo-and-card-container">
              <div className="logo-container">
                <div className="logo-glow"></div>
                <img src={head} alt="Logo" className="logo" />
              </div>
              
              <div className="header-text">
                <div className="custom-title">Link & Grow</div>
                
                <p className="subtitle">
                Connect your social accounts, prove you're human, and unlock your <strong>Uman ID Card</strong>. <br></br>Stand out from bots! 
                </p>
                <br></br>
              </div>
              {/* CORRECTION: Force une mise à jour du DOM avec des clés dynamiques pour s'assurer que la barre se recharge */}
              <div className="progress-container" key={`progress-${linkedCount}`}>
                <div className="progress-stats">
                  <span className="progress-text">{progressLabel}</span>
                  <span className="progress-reward">{allLinked ? 'All accounts connected!' : 'Connect all accounts to maximize rewards'}</span>
                </div>
                <div className="progress-bar-bg">
                  <div 
                    className="progress-bar-fill" 
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>
              </div>
              
              {/* Version améliorée et minimaliste de l'annonce de loterie */}
              
              {/* Total UMI earned indicator */}
              {totalUmiEarned > 0 && (
                <div className="umi-earned-badge" key={`earned-${totalUmiEarned}`}>
                  <span>{totalUmiEarned} UMI earned ({linkedCount} × 100 UMI per verification)</span>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="main-content">
          <div className="content-body">
            <div className="accounts-grid">
              {socialAccounts.map((account) => (
                <div 
                  key={`${account.name}-${account.connected ? 'connected' : 'disconnected'}`}
                  className={`account-card ${account.connected ? 'connected' : ''}`}
                  onClick={account.connected ? null : null}
                  style={{ '--accent-color': account.color }}
                >
                  <div className="account-content">
                    <div className="account-icon-wrapper" style={{ backgroundColor: '#303421', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span className="account-icon" style={{ color: '#f28011' }}>{account.icon}</span>
                    </div>
                    <div className="account-text">
                      <span className="account-name">{account.name}</span>
                      {!account.connected ? (
                        <div className="verify-rewards">
                          <span className="verify-text">Prove you're human • +100 UMI</span>
                        </div>
                      ) : (
                        <div className="verify-rewards">
                          <span className="verify-text earned">+100 UMI received</span>
                        </div>
                      )}
                    </div>
                    
                    {/* FIX: Modified this section to always show verified status if connected */}
                    {account.connected ? (
                      <div className="verification-status-container">
                        {onChainProofs[account.name.toLowerCase()] &&
                         onChainProofs[account.name.toLowerCase()].proofHash ? (
                          // If on-chain proof exists, show detailed proof info
                          <div className="onchain-proof">
                            <FaCheckCircle className="text-green-500 mr-1" />
                            On‑chain proof&nbsp;
                            <a
                              href={`https://worldchain.explorer/tx/${onChainProofs[account.name.toLowerCase()].txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline"
                            >
                              #{onChainProofs[account.name.toLowerCase()].proofHash.slice(2, 10)}…
                            </a>
                          </div>
                        ) : (
                          // If connected but no on-chain proof yet, still show verified status
                          <div className="verified-status">
                            <FaCheckCircle className="text-green-500 mr-1" />
                            <span>Verified</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      // Only show verify button if not connected
                      <button
                        className="verify-button"
                        onClick={(e) => { e.stopPropagation(); account.action(); }}
                      >
                        Verify
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {/* "Why connect?" button moved below the account cards */}
            <div className="action-buttons why-connect-only">
              <button className="info-button" onClick={toggleInfoModal}>
                <Info size={16} />
                <span>Why connect?</span>
              </button>
              
              {/* AdSense Banner - directement sous le bouton */}
              <div className="ad-container-social">
                <AdSenseAuto 
                  slot="2494391307"
                  style={{ maxWidth: '320px', width: '100%' }}
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* World ID Verification Status */}
        {isVerifying && (
          <div className="verification-status">
            <div className="spinner"></div>
            <span>World ID verification in progress...</span>
          </div>
        )}
        
        {error && (
          <div className="error-message">
            <AlertCircle className="error-icon" size={20} />
            <span>{error}</span>
          </div>
        )}
        
        {/* Info Modal */}
        {showInfoModal && (
          <div className="modal-overlay" onClick={toggleInfoModal}>
            <div className="info-modal" onClick={e => e.stopPropagation()}>
              <h3>Why Connect Your Accounts?</h3>

              <div className="benefit-item">
                <Award size={20} />
                <div>
                  <h4>Your Uman ID Card</h4>
                  <p>
                  Unlock your exclusive Uman ID Card — undeniable proof that you're a genuine human on social networks (not a bot).
                  </p>
                </div>
              </div>

              <div className="benefit-item">
                <Coins size={20} />
                <div>
                  <h4>Earn UMI Tokens</h4>
                  <p>
                    Collect 100 UMI each time you link an account and watch your token balance grow.
                  </p>
                </div>
              </div>

              <div className="benefit-item">
                <Gift size={20} />
                <div>
                  <h4>Connect with Real Humans</h4>
                  <p>
                    Join a vibrant community of verified people, forge genuine friendships, and expand your network.
                  </p>
                </div>
              </div>

              <div className="benefit-item">
                <Ticket size={20} />
                <div>
                  <h4>Weekly Lottery Rewards</h4>
                  <p>
                    Each verified account gives you one lottery ticket. Every week, 10 verified humans win 5 $WLD each!
                  </p>
                </div>
              </div>

              <button className="close-modal-button" onClick={toggleInfoModal}>
                Got it
              </button>
            </div>
          </div>
        )}
        
        {/* Canvas élément caché pour générer l'image (pas visible à l'utilisateur) */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>
      
      {/* Badge flottant simplifié */}
      
      {/* Animation marketing pour la loterie - style réduit et plus minimaliste */}
      
      
      {notification.show && (
        <div className={`notification ${notification.type}`}>
          <span>{notification.message}</span>
        </div>
      )}

      <style>{`
        /* Reset CSS to eliminate default margins */
        *, *::before, *::after {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        html, body {
          margin: 0;
          padding: 0;
          width: 100%;
          height: 100%;
          overflow-x: hidden;
        }
        
        /* Base styles */
        .social-connect {
          width: 100vw;
          height: 100vh;
          margin: 0;
          padding: 0;
          background-color: #f4e9b7 !important;
          color: #303421;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          overflow-y: auto;
        }
        
        /* Background */
        .background-gradient {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: #f4e9b7;
          pointer-events: none;
          z-index: -1;
        }
        
        .content-container {
          width: 100%;
          height: 100%;
          margin: 0;
          padding: 0.4rem; /* Réduit le padding global de 0.5rem à 0.4rem */
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          padding-bottom: 80px; /* Réduit le padding bottom de 100px à 80px */
        }
        
        /* Top navigation */
        .top-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.4rem; /* Réduit de 0.5rem à 0.4rem */
          height: 36px; /* Réduit de 40px à 36px */
        }
        
        .back-button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px; /* Réduit de 36px à 32px */
          height: 32px; /* Réduit de 36px à 32px */
          border-radius: 50%;
          background-color: rgba(255, 255, 255, 0.6);
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          transition: all 0.2s;
        }
        
        .back-button:hover {
          background-color: rgba(255, 255, 255, 0.8);
          transform: translateY(-2px);
        }
        
        .empty-space {
          width: 32px; /* Réduit de 36px à 32px */
        }
        
        /* Hero section */
        .hero-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 0.8rem; /* Réduit de 1rem à 0.8rem */
          animation: fadeIn 0.6s ease-out;
        }
        
        /* Logo and card container for side by side layout */
        .logo-and-card-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
          margin-top:3%;
          max-width: 460px; /* Réduit de 480px à 460px */
        }
        
        @media (min-width: 768px) {
          .logo-and-card-container {
            flex-direction: row;
            flex-wrap: wrap;
            justify-content: center;
            gap: 0.8rem; /* Réduit de 1rem à 0.8rem */
          }
          
          .logo-container {
            flex: 0 0 120px; /* Réduit de 130px à 120px */
          }
          
          .header-text {
            flex: 1;
            min-width: 190px; /* Réduit de 200px à 190px */
            max-width: 290px; /* Réduit de 300px à 290px */
            padding-top: 0;
            text-align: left;
          }
          
          .custom-title {
            text-align: left !important;
          }
          
          .subtitle {
            text-align: left !important;
          }
          
          .progress-container, .human-id-card, .umi-earned-badge-minimal, .lottery-pill {
            width: 100%;
          }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); } /* Réduit de 10px à 8px */
          to { opacity: 1; transform: translateY(0); }
        }
        
        .logo-container {
          position: relative;
          margin-bottom: 0.4rem; /* Réduit de 0.5rem à 0.4rem */
        }
        
        .logo {
          width: 120px !important; /* Réduit de 130px à 120px */
          height: 120px !important; /* Réduit de 130px à 120px */
          border-radius: 50%;
          object-fit: contain;
          position: relative;
          z-index: 2;
          animation: pulseIn 0.8s ease-out;
        }
        
        @keyframes pulseIn {
          0% { transform: scale(0.95); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        
        .logo-glow {
          position: absolute;
          top: -12px; /* Réduit de -15px à -12px */
          left: -12px; /* Réduit de -15px à -12px */
          right: -12px; /* Réduit de -15px à -12px */
          bottom: -12px; /* Réduit de -15px à -12px */
          background: radial-gradient(circle, rgba(241, 100, 3, 0.4) 0%, rgba(255, 181, 61, 0.2) 50%, rgba(255, 181, 61, 0) 70%);
          border-radius: 50%;
          z-index: 1;
          animation: glow 3s infinite alternate;
        }
        
        @keyframes glow {
          from { opacity: 0.6; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1.04); }
        }
        
        /* Header text container */
        .header-text {
          padding-top: 0.4rem; /* Réduit de 0.5rem à 0.4rem */
          width: 100%;
          max-width: 290px; /* Réduit de 300px à 290px */
        }
        
        .custom-title {
          font-size: 1.4rem; /* Réduit de 1.5rem à 1.4rem */
          font-weight: 600;
          margin: 0;
          color: #303421;
          text-align: center;
        }
        
        .subtitle {
          font-size: 0.95rem; /* Réduit de 1rem à 0.95rem */
          margin: 0.4rem 0 0.6rem 0; /* Réduit de 0.5rem 0 0.7rem 0 à 0.4rem 0 0.6rem 0 */
          color: #303421;
          text-align: center;
          line-height: 1.25; /* Réduit de 1.3 à 1.25 */
        }
        
        /* Progress bar styles */
        .progress-container {
          width: 100%;
          max-width: 290px; /* Réduit de 300px à 290px */
          margin-top: 0.4rem; /* Réduit de 0.5rem à 0.4rem */
          margin-bottom: 0.6rem; /* Réduit */
          animation: fadeIn 0.6s ease-out 0.4s both;
        }
        
        .progress-stats {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.25rem; /* Réduit de 0.3rem à 0.25rem */
        }
        
        .progress-text {
          font-size: 0.75rem; /* Réduit de 0.8rem à 0.75rem */
          font-weight: 500;
          color: #303421;
        }
        
        .progress-reward {
          font-size: 0.75rem; /* Réduit de 0.8rem à 0.75rem */
          color: #f28011;
          font-weight: 500;
        }
        
        .progress-bar-bg {
          width: 100%;
          height: 5px; /* Réduit de 6px à 5px */
          background-color: rgba(241, 100, 3, 0.1);
          border-radius: 8px; /* Réduit de 10px à 8px */
          overflow: hidden;
        }
        
        .progress-bar-fill {
          height: 100%;
          background-color: #f28011;
          border-radius: 8px; /* Réduit de 10px à 8px */
          transition: width 0.4s ease-in-out;
        }
        
        /* Nouvelle version minimaliste de l'annonce de loterie sous forme de pill */
        .lottery-pill {
          display: inline-flex;
          max-width: 290px;
          margin: 0.5rem auto 0.7rem;
          animation: fadeIn 0.6s ease-out 0.5s both;
        }

        .lottery-pill-content {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          background-color: rgba(242, 128, 17, 0.08);
          border: 1px solid rgba(242, 128, 17, 0.25);
          border-radius: 10px;
          padding: 0.7rem;
        }

        .lottery-icon {
          color: #f28011;
          flex-shrink: 0;
          margin-top: 0.2rem;
        }

        .lottery-text-container {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }

        .lottery-text-highlight {
          color: #f28011;
          font-size: 0.9rem;
          font-weight: 600;
        }

        .lottery-text-info {
          color: #303421;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .lottery-text-tip {
          color: rgba(48, 52, 33, 0.8);
          font-size: 0.7rem;
          font-style: italic;
        }

        /* Badge flottant simplifié */
        .lottery-ticket-badge-refined {
          position: fixed;
          bottom: 15px;
          right: 15px;
          background-color: #f4e9b7;
          border: 1px solid rgba(242, 128, 17, 0.4);
          color: #303421;
          border-radius: 40px;
          padding: 0.35rem 0.7rem;
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.75rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          z-index: 100;
        }

        .lottery-ticket-badge-refined svg {
          color: #f28011;
        }

        /* Animation popup marketing améliorée */
        .lottery-animation-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(48, 52, 33, 0.85);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.3s ease-out;
          backdrop-filter: blur(3px);
        }

        .lottery-animation-container {
          background-color: #f4e9b7;
          border: 1px solid rgba(242, 128, 17, 0.4);
          border-radius: 12px;
          padding: 1.8rem;
          width: 90%;
          max-width: 280px;
          text-align: center;
          position: relative;
          overflow: hidden;
          box-shadow: 0 10px 25px rgba(48, 52, 33, 0.3);
          animation: scaleIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .lottery-glow {
          position: absolute;
          top: -50%;
          left: -50%;
          right: -50%;
          bottom: -50%;
          background: radial-gradient(circle, rgba(242, 128, 17, 0.2) 0%, rgba(242, 128, 17, 0) 70%);
          transform: rotate(0deg);
          animation: rotateGlow 15s linear infinite;
          pointer-events: none;
        }

        .lottery-main-icon {
          color: #f28011;
          background-color: rgba(242, 128, 17, 0.1);
          width: 60px;
          height: 60px;
          border-radius: 50%;
          padding: 15px;
          margin: 0 auto 1rem;
          position: relative;
          z-index: 2;
          box-shadow: 0 5px 15px rgba(242, 128, 17, 0.2);
        }

        .lottery-main-message {
          color: #f28011;
          font-size: 1.4rem;
          font-weight: 700;
          margin: 0 0 0.5rem;
          position: relative;
          z-index: 2;
        }
        
        .lottery-winners-message {
          color: #303421;
          font-size: 1rem;
          font-weight: 600;
          margin: 0 0 1rem;
          position: relative;
          z-index: 2;
        }

        .lottery-sub-message {
          color: #303421;
          font-size: 0.85rem;
          margin: 0 0 0.5rem;
          position: relative;
          z-index: 2;
          background-color: rgba(242, 128, 17, 0.1);
          display: inline-block;
          padding: 0.4rem 0.8rem;
          border-radius: 20px;
        }
        
        .lottery-boost-message {
          color: rgba(48, 52, 33, 0.8);
          font-size: 0.8rem;
          font-style: italic;
          margin: 0.5rem 0 0;
          position: relative;
          z-index: 2;
        }

        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1); }
        }

        @keyframes rotateGlow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        /* Total UMI earned indicator */
        .umi-earned-badge {
          display: inline-block;
          color: #f16403;
          margin-top: 0.6rem; /* Réduit de 0.7rem à 0.6rem */
          font-weight: 600;
          font-size: 0.85rem; /* Réduit de 0.9rem à 0.85rem */
          animation: fadeIn 0.6s ease-out 0.6s both;
          background-color: rgba(242, 128, 17, 0.1);
          padding: 0.4rem 0.9rem; /* Réduit de 0.5rem 1rem à 0.4rem 0.9rem */
          border-radius: 7px; /* Réduit de 8px à 7px */
        }
        
        /* Main content area */
        .main-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex: 1;
          width: 100%;
          max-width: 480px; /* Réduit de 500px à 480px */
          margin: 0 auto;
        }
        
        .content-body {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 0.9rem; /* Réduit de 1rem à 0.9rem */
          padding-bottom: 70px; /* Réduit de 80px à 70px */
        }
        
        /* Accounts grid */
        .accounts-grid {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 0.65rem; /* Réduit de 0.75rem à 0.65rem */
        }
        
        .account-card {
          position: relative;
          background-color: transparent;
          border-radius: 10px; /* Réduit de 12px à 10px */
          padding: 1rem; /* Réduit de 1.1rem à 1rem */
          cursor: pointer;
          transition: all 0.3s ease;
          border: 1px solid rgba(241, 100, 3, 0.1);
          overflow: hidden;
          margin-bottom: 0.05rem; /* Réduit de 0.1rem à 0.05rem */
        }
        
        .account-card:hover:not(.connected) {
          transform: translateY(-2px);
          border-color: var(--accent-color);
          background-color: rgba(242, 128, 17, 0.05);
        }
        
        .account-card.connected {
          border-color: rgba(46, 160, 67, 0.4);
          cursor: default;
        }
        
        .account-content {
          display: flex;
          align-items: center;
          gap: 0.65rem; /* Réduit de 0.75rem à 0.65rem */
        }
        
        .account-icon-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 34px; /* Réduit de 36px à 34px */
          height: 34px; /* Réduit de 36px à 34px */
          border-radius: 50%;
          flex-shrink: 0;
        }
        
        .account-icon {
          color: white;
          font-size: 1.15rem; /* Réduit de 1.2rem à 1.15rem */
          margin-top: 14% !important;
        }
        
        .account-text {
          display: flex;
          flex-direction: column;
          flex: 1;
        }
        
        .account-name {
          font-size: 1rem; /* Réduit de 1.05rem à 1rem */
          font-weight: 500;
        }
        
        .verify-text {
          font-size: 0.75rem; /* Réduit de 0.8rem à 0.75rem */
          color: rgba(48, 52, 33, 0.7);
          margin-top: 0.15rem; /* Réduit de 0.2rem à 0.15rem */
        }
        
        /* Simplified styles for rewards */
        .verify-rewards {
          display: flex;
          flex-direction: column;
          margin-top: 0.1rem; /* Réduit de 0.125rem à 0.1rem */
        }
        
        .verify-text.earned {
          color: rgba(46, 160, 67, 0.9);
        }
        
        .account-status {
          display: flex;
          align-items: center;
          gap: 0.2rem; /* Réduit de 0.25rem à 0.2rem */
          padding: 0.2rem 0.45rem; /* Réduit de 0.25rem 0.5rem à 0.2rem 0.45rem */
          border-radius: 4px;
          font-size: 0.7rem;
          font-weight: 500;
        }
        
        .account-status.connected {
          background-color: rgba(46, 160, 67, 0.1);
          color: #2ea043;
        }
        
        .account-status.locked {
          background-color: rgba(241, 100, 3, 0.1);
          color: #f16403;
        }
        
        /* Verify button */
        .verify-button {
          padding: 0.35rem 1.1rem; /* Réduit de 0.4rem 1.2rem à 0.35rem 1.1rem */
          border-radius: 5px; /* Réduit de 6px à 5px */
          background-color: transparent;
          color: #f28011;
          font-size: 0.8rem; /* Réduit de 0.85rem à 0.8rem */
          font-weight: 500;
          border: 1px solid #f28011;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
          box-shadow: none;
          min-width: 75px; /* Réduit de 80px à 75px */
          margin-left: 4px;
        }
        
        .verify-button:hover {
          background-color: rgba(242, 128, 17, 0.1);
          transform: none;
          box-shadow: none;
        }

        /* New styles for verification UI */
        .verification-status-container {
          display: flex;
          align-items: center;
        }
        
        .verified-status {
          display: flex;
          align-items: center;
          gap: 0.4rem; /* Réduit de 0.5rem à 0.4rem */
          color: #2ea043;
          font-size: 0.8rem; /* Réduit de 0.85rem à 0.8rem */
          font-weight: 500;
          padding: 0.35rem 1.1rem; /* Réduit de 0.4rem 1.2rem à 0.35rem 1.1rem */
          border-radius: 5px; /* Réduit de 6px à 5px */
          background-color: rgba(46, 160, 67, 0.1);
          border: 1px solid rgba(46, 160, 67, 0.3);
        }
        
        /* Action buttons */
        .action-buttons {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          margin-top: 0.4rem;
          margin-bottom: 45px;
          padding-bottom: 0.9rem;
          gap: 10px;
        }
        
        /* New style for the single "Why connect?" button */
        .action-buttons.why-connect-only {
          margin-top: 1.3rem;
        }
        
        /* AdSense container */
        .ad-container-social {
          width: 100%;
          max-width: 320px;
          display: flex;
          justify-content: center;
          padding: 8px 0 0 0;
          margin: 0;
        }
        
        .info-button {
          padding: 0.6rem; /* Réduit de 0.7rem à 0.6rem */
          border-radius: 9px; /* Réduit de 10px à 9px */
          font-size: 0.85rem; /* Réduit de 0.9rem à 0.85rem */
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
          display: flex;
          margin-top:-7%;
          align-items: center;
          justify-content: center;
          gap: 0.45rem; /* Réduit de 0.5rem à 0.45rem */
          background-color: #f4e9b7;
          color: #303421;
          width: auto;
          min-width: 130px; /* Réduit de 140px à 130px */
        }
        
        .info-button:hover {
          background-color: #f8f8f8;
          transform: translateY(-2px);
        }
        
        /* Generate ID Button */
        .generate-id-button {
          margin-top: 0.9rem; /* Réduit de 1rem à 0.9rem */
          padding: 0.6rem 1.4rem; /* Réduit de 0.7rem 1.5rem à 0.6rem 1.4rem */
          border-radius: 9px; /* Réduit de 10px à 9px */
          background-color: #f28011;
          color: white;
          font-size: 0.85rem; /* Réduit de 0.9rem à 0.85rem */
          font-weight: 500;
          border: none;
          cursor: pointer;
          transition: all 0.3s;
          box-shadow: 0 4px 8px rgba(242, 128, 17, 0.2);
        }
        
        .generate-id-button:hover {
          background-color: #e57200;
          transform: translateY(-2px);
          box-shadow: 0 6px 12px rgba(242, 128, 17, 0.3);
        }
        
        /* ID Card Container */
        .id-card-container {
          width: 100%;
          max-width: 300px; /* Réduit de 320px à 300px */
          margin: 0 auto 1.8rem auto; /* Réduit de 2rem à 1.8rem */
          display: flex;
          flex-direction: column;
          align-items: center;
          animation: fadeIn 0.6s ease-out;
        }
        
        .id-card-image {
          width: 100%;
          border-radius: 10px; /* Réduit de 12px à 10px */
          box-shadow: 0 8px 25px rgba(242, 128, 17, 0.2); /* Réduit shadow */
          border: 1px solid rgba(242, 128, 17, 0.3);
          animation: cardAppear 0.8s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        
        @keyframes cardAppear {
          0% { opacity: 0; transform: scale(0.8) translateY(18px); } /* Réduit de 20px à 18px */
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        
        .id-card-message {
          display: flex;
          align-items: center;
          gap: 0.45rem; /* Réduit de 0.5rem à 0.45rem */
          margin-top: 0.9rem; /* Réduit de 1rem à 0.9rem */
          font-size: 0.85rem; /* Réduit de 0.9rem à 0.85rem */
          color: #303421;
          background-color: rgba(46, 160, 67, 0.1);
          padding: 0.7rem 0.9rem; /* Réduit de 0.75rem 1rem à 0.7rem 0.9rem */
          border-radius: 9px; /* Réduit de 10px à 9px */
          border: 1px solid rgba(46, 160, 67, 0.2);
          animation: fadeIn 0.6s ease-out 0.8s both;
        }
        
        /* NFT Message Enhanced */
        .nft-message-enhanced {
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
          margin-top: 0.8rem;
          font-size: 0.85rem;
          color: #303421;
          background: linear-gradient(135deg, rgba(9, 105, 218, 0.08) 0%, rgba(242, 128, 17, 0.08) 100%);
          padding: 0.8rem;
          border-radius: 12px;
          border: 1px solid rgba(242, 128, 17, 0.3);
          box-shadow: 0 4px 12px rgba(242, 128, 17, 0.1);
          position: relative;
          overflow: hidden;
          animation: fadeIn 0.6s ease-out 1s both, pulseShadow 3s infinite alternate;
        }

        .nft-message-enhanced::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(242, 128, 17, 0.07) 0%, rgba(242, 128, 17, 0) 70%);
          animation: rotate 15s linear infinite;
          z-index: 0;
          pointer-events: none;
        }

        .nft-message-enhanced > * {
          position: relative;
          z-index: 1;
        }

        .nft-badge {
          position: absolute;
          top: 0.4rem;
          right: 0.4rem;
          background: linear-gradient(135deg, #f28011 0%, #feb53d 100%);
          color: white;
          font-weight: 700;
          font-size: 0.7rem;
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
          box-shadow: 0 2px 6px rgba(242, 128, 17, 0.3);
          animation: pulse 2s infinite alternate;
          letter-spacing: 0.05rem;
        }

        .nft-content {
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
        }

        .nft-content h4 {
          margin: 0;
          font-size: 1rem;
          font-weight: 600;
          color: #303421;
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }

        .nft-content p {
          margin: 0;
          line-height: 1.35;
          color: rgba(48, 52, 33, 0.85);
        }

        .nft-features {
          display: flex;
          flex-wrap: wrap;
          gap: 0.8rem;
          margin-top: 0.2rem;
        }

        .nft-feature {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.75rem;
          font-weight: 500;
          color: #f28011;
          background-color: rgba(242, 128, 17, 0.1);
          padding: 0.25rem 0.6rem;
          border-radius: 20px;
        }

        @keyframes pulseShadow {
          from { box-shadow: 0 4px 12px rgba(242, 128, 17, 0.1); }
          to { box-shadow: 0 6px 18px rgba(242, 128, 17, 0.2); }
        }

        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        /* Toggle card buttons */
        .toggle-card-button {
          padding: 0.6rem 1.4rem; /* Réduit de 0.7rem 1.5rem à 0.6rem 1.4rem */
          border-radius: 9px; /* Réduit de 10px à 9px */
          font-size: 0.85rem; /* Réduit de 0.9rem à 0.85rem */
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s;
          margin: 0.9rem auto; /* Réduit de 1rem à 0.9rem */
          display: block;
        }

        .upload-card-button {
          margin-top: 0.6rem;
          padding: 0.6rem 1.4rem;
          border-radius: 9px;
          background-color: #0969da;
          color: white;
          font-size: 0.85rem;
          font-weight: 500;
          border: none;
          cursor: pointer;
          transition: all 0.3s;
          box-shadow: 0 4px 8px rgba(9, 105, 218, 0.2);
        }

        .upload-card-button:hover {
          background-color: #0860c1;
          transform: translateY(-2px);
          box-shadow: 0 6px 12px rgba(9, 105, 218, 0.3);
        }

        .upload-card-button:disabled {
          background-color: #88b7e9;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }
        
        .test-download-button {
          margin-top: 0.6rem;
          padding: 0.6rem 1.4rem;
          border-radius: 9px;
          background-color: #303421;
          color: white;
          font-size: 0.85rem;
          font-weight: 500;
          border: none;
          cursor: pointer;
          transition: all 0.3s;
        }
        
        .test-download-button:hover {
          background-color: #3e4229;
          transform: translateY(-2px);
        }
        
        .test-download-button:disabled {
          background-color: #888;
          cursor: not-allowed;
          transform: none;
        }
        
        .show-card-button {
          background-color: #f28011;
          color: white;
          border: none;
          box-shadow: 0 4px 7px rgba(242, 128, 17, 0.2); /* Légèrement réduit */
        }
        
        .show-card-button:hover {
          background-color: #e57200;
          transform: translateY(-2px);
          box-shadow: 0 6px 10px rgba(242, 128, 17, 0.3); /* Légèrement réduit */
        }
        
        .hide-card-button {
          background-color: transparent;
          color: #f28011;
          border: 1px solid #f28011;
          margin-top: 0.9rem; /* Réduit de 1rem à 0.9rem */
        }
        
        .hide-card-button:hover {
          background-color: rgba(242, 128, 17, 0.1);
        }
        
        /* Verification Status and Error */
        .verification-status {
          display: flex;
          align-items: center;
          gap: 0.65rem; /* Réduit de 0.75rem à 0.65rem */
          margin: 0.9rem auto; /* Réduit de 1rem à 0.9rem */
          background-color: white;
          padding: 0.7rem 0.9rem; /* Réduit de 0.75rem 1rem à 0.7rem 0.9rem */
          border-radius: 9px; /* Réduit de 10px à 9px */
          border: 1px solid rgba(241, 100, 3, 0.2);
          max-width: 90%;
          box-shadow: 4px 4px 9px rgba(0, 0, 0, 0.05); /* Légèrement réduit */
        }
        
        .spinner {
          width: 16px; /* Réduit de 18px à 16px */
          height: 16px; /* Réduit de 18px à 16px */
          border: 2.5px solid rgba(241, 100, 3, 0.1);
          border-radius: 50%;
          border-top-color: #f16403;
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
          gap: 0.65rem; /* Réduit de 0.75rem à 0.65rem */
          margin: 0.9rem auto; /* Réduit de 1rem à 0.9rem */
          background-color: rgba(248, 81, 73, 0.1);
          padding: 0.7rem 0.9rem; /* Réduit de 0.75rem 1rem à 0.7rem 0.9rem */
          border-radius: 9px; /* Réduit de 10px à 9px */
          border: 1px solid rgba(248, 81, 73, 0.3);
          max-width: 90%;
        }
        
        .error-icon {
          color: #f85149;
          flex-shrink: 0;
        }
        
        /* Info Modal */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(48, 52, 33, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 999;
          animation: fadeIn 0.3s ease;
          backdrop-filter: blur(3px);
        }
        
        .info-modal {
          background-color: #f4e9b7;
          border-radius: 14px; /* Réduit de 16px à 14px */
          padding: 1.4rem; /* Réduit de 1.5rem à 1.4rem */
          width: 90%;
          max-width: 380px; /* Réduit de 400px à 380px */
          max-height: 80vh;
          overflow-y: auto;
          box-shadow: 0 9px 22px rgba(0, 0, 0, 0.15); /* Légèrement réduit */
          animation: slideUp 0.4s ease;
          border: 1px solid rgba(242, 128, 17, 0.2);
        }
        
        .info-modal h3 {
          font-size: 1.15rem; /* Réduit de 1.2rem à 1.15rem */
          font-weight: 600;
          margin: 0 0 1.15rem 0; /* Réduit de 1.25rem à 1.15rem */
          color: #303421;
          text-align: center;
        }
        
        .benefit-item {
          display: flex;
          gap: 0.9rem; /* Réduit de 1rem à 0.9rem */
          margin-bottom: 1.15rem; /* Réduit de 1.25rem à 1.15rem */
          align-items: flex-start;
          padding: 0.7rem; /* Réduit de 0.75rem à 0.7rem */
          border-radius: 9px; /* Réduit de 10px à 9px */
          background-color: rgba(242, 128, 17, 0.05);
          border: 1px solid rgba(242, 128, 17, 0.1);
        }
        
        .benefit-item svg {
          color: #f28011;
          margin-top: 0.2rem; /* Réduit de 0.25rem à 0.2rem */
          flex-shrink: 0;
        }
        
        .benefit-item h4 {
          font-size: 0.95rem; /* Réduit de 1rem à 0.95rem */
          font-weight: 600;
          margin: 0 0 0.2rem 0; /* Réduit de 0.25rem à 0.2rem */
          color: #303421;
        }
        
        .benefit-item p {
          font-size: 0.85rem; /* Réduit de 0.9rem à 0.85rem */
          margin: 0;
          color: rgba(48, 52, 33, 0.75);
          line-height: 1.35; /* Réduit de 1.4 à 1.35 */
        }
        
        .close-modal-button {
          width: 100%;
          padding: 0.7rem; /* Réduit de 0.8rem à 0.7rem */
          border-radius: 9px; /* Réduit de 10px à 9px */
          background-color: transparent;
          color: #f28011;
          font-size: 0.9rem; /* Réduit de 0.95rem à 0.9rem */
          font-weight: 500;
          border: 1px solid #f28011;
          cursor: pointer;
          margin-top: 0.45rem; /* Réduit de 0.5rem à 0.45rem */
          transition: all 0.2s;
        }
        
        .close-modal-button:hover {
          background-color: rgba(242, 128, 17, 0.1);
        }
        
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(18px); } /* Réduit de 20px à 18px */
          to { opacity: 1; transform: translateY(0); }
        }
        
        /* Notification */
        .notification {
          position: fixed;
          bottom: 1.4rem; /* Réduit de 1.5rem à 1.4rem */
          left: 50%;
          transform: translateX(-50%);
          padding: 0.7rem 1.1rem; /* Réduit de 0.8rem 1.2rem à 0.7rem 1.1rem */
          border-radius: 10px; /* Réduit de 12px à 10px */
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.85rem; /* Réduit de 0.9rem à 0.85rem */
          z-index: 1000;
          box-shadow: 0 4px 18px rgba(0, 0, 0, 0.15); /* Légèrement réduit */
          min-width: 280px; /* Réduit de 300px à 280px */
          max-width: 90%;
          animation: slideUp 0.4s ease;
        }
        
        .notification.success {
          background-color: #2ea043;
          color: white;
        }
        
        .notification.info {
          background-color: #0969da;
          color: white;
        }
        
        .notification.error {
          background-color: #f85149;
          color: white;
        }
        
        /* Responsive Styles */
        @media (max-width: 480px) {
          .content-container {
            padding: 0.4rem; /* Réduit de 0.5rem à 0.4rem */
            padding-bottom: 90px; /* Réduit de 100px à 90px */
          }
          
          .notification {
            min-width: 85%;
          }
          
          /* Adjust action buttons on mobile to ensure they're visible */
          .action-buttons {
            margin-bottom: 70px; /* Réduit de 80px à 70px */
          }
          
          /* Adaptation pour mobile */
          .lottery-pill {
            max-width: 100%;
          }
          
          .lottery-animation-container {
            width: 85%;
            padding: 1.5rem;
          }
        }
        
        @media (min-width: 768px) {
          .content-container {
            padding: 0.9rem; /* Réduit de 1rem à 0.9rem */
            padding-bottom: 90px; /* Réduit de 100px à 90px */
          }
        }
        
        /* Dark Mode Support */
        @media (prefers-color-scheme: dark) {
          .social-connect {
            background-color: #303421;
            color: #ecd9b4;
          }
          
          .background-gradient {
            background: linear-gradient(135deg, #303421 0%, #1e2116 100%);
          }
          
          .back-button {
            background-color: rgba(255, 255, 255, 0.1);
            color: #ecd9b4;
          }
          
          .back-button:hover {
            background-color: rgba(255, 255, 255, 0.15);
          }
          
          .account-card {
            background-color: transparent;
            border-color: rgba(241, 100, 3, 0.2);
          }
          
          .account-name {
            color: #ecd9b4;
          }
          
          .account-card:hover:not(.connected) {
            border-color: var(--accent-color);
          }
          
          .verify-text {
            color: rgba(236, 217, 180, 0.7);
          }
          
          .info-button {
            background-color: rgba(255, 255, 255, 0.1);
            color: #ecd9b4;
            box-shadow: 4px 4px 9px rgba(0, 0, 0, 0.2), -4px -4px 9px rgba(255, 255, 255, 0.02); /* Légèrement réduit */
          }
          
          .info-button:hover {
            background-color: rgba(255, 255, 255, 0.15);
          }
          
          .verification-status {
            background-color: rgba(255, 255, 255, 0.05);
            color: #ecd9b4;
            border-color: rgba(241, 100, 3, 0.3);
          }
          
          /* Modifications for modal in dark mode */
          .info-modal {
            background-color: #303421;
            border-color: rgba(242, 128, 17, 0.3);
          }
          
          .info-modal h3 {
            color: #f4e9b7;
          }
          
          .benefit-item {
            background-color: rgba(242, 128, 17, 0.1);
            border-color: rgba(242, 128, 17, 0.2);
          }
          
          .benefit-item h4 {
            color: #f4e9b7;
          }
          
          .benefit-item p {
            color: rgba(244, 233, 183, 0.75);
          }
          
          .progress-text, .card-title, .card-username, .card-status, .card-footer, .custom-title, .subtitle {
            color: #ecd9b4;
          }
          
          .human-id-card.inactive {
            background-color: #3e3f2f;
          }
          
          .human-id-card.active {
            background: linear-gradient(135deg, #f28011 0%, #feb53d 100%);
          }
          
          .card-avatar {
            background-color: rgba(255, 255, 255, 0.2);
            color: #ecd9b4;
          }
          
          .id-card-message, .nft-message {
            background-color: rgba(46, 160, 67, 0.15);
            color: #ecd9b4;
            border-color: rgba(46, 160, 67, 0.3);
          }
          
          /* Dark mode support for NFT message enhanced */
          .nft-message-enhanced {
            background: linear-gradient(135deg, rgba(9, 105, 218, 0.15) 0%, rgba(242, 128, 17, 0.15) 100%);
            border-color: rgba(242, 128, 17, 0.4);
          }

          .nft-content h4 {
            color: #f4e9b7;
          }

          .nft-content p {
            color: rgba(244, 233, 183, 0.85);
          }
          
          /* Dark mode styles for toggle buttons */
          .show-card-button {
            background-color: #f28011;
            color: white;
          }
          
          .hide-card-button {
            background-color: transparent;
            color: #f28011;
            border-color: #f28011;
          }
          
          .hide-card-button:hover {
            background-color: rgba(242, 128, 17, 0.15);
          }
          
          /* Dark mode styles for new verification components */
          .verified-status {
            background-color: rgba(46, 160, 67, 0.15);
            border-color: rgba(46, 160, 67, 0.3);
          }
          
          /* Adaptation pour mode sombre - Nouvelle version minimaliste */
          .lottery-pill-content {
            background-color: rgba(242, 128, 17, 0.15);
            border-color: rgba(242, 128, 17, 0.35);
          }
          
          .lottery-text-highlight {
            color: #f28011;
          }
          
          .lottery-text-info {
            color: #f4e9b7;
          }
          
          .lottery-text-tip {
            color: rgba(244, 233, 183, 0.8);
          }
          
          .lottery-animation-container {
            background-color: #303421;
            border-color: rgba(242, 128, 17, 0.5);
          }
          
          .lottery-winners-message,
          .lottery-sub-message {
            color: #f4e9b7;
          }
          
          .lottery-sub-message {
            background-color: rgba(242, 128, 17, 0.2);
          }
          
          .lottery-boost-message {
            color: rgba(244, 233, 183, 0.7);
          }
          
          .lottery-ticket-badge-refined {
            background-color: #303421;
            border-color: rgba(242, 128, 17, 0.5);
            color: #f4e9b7;
          }
        }
      `}</style>
    </div>
  );
};

export default SocialConnect;