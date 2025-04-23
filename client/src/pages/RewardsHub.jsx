import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Award, Info, Gift, Shield, User, Check, RefreshCw, Copy } from "lucide-react";
import axios from "axios";
import { ethers } from 'ethers';
import { FaTwitter, FaTelegramPlane, FaDiscord } from 'react-icons/fa';

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

// Token contract details (copied from ConnectAccounts)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://uman.onrender.com/api';
const TOKEN_CONTRACT_ADDRESS = import.meta.env.VITE_TOKEN_CONTRACT_ADDRESS || '0x41Da2F787e0122E2e6A72fEa5d3a4e84263511a8';
const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)"
];

const RewardsHub = () => {
  // Replace mock states with real data states
  const [umiBalance, setUmiBalance] = useState(null);
  const [currentStreak, setCurrentStreak] = useState(null);
  const [maxStreak, setMaxStreak] = useState(null);
  const [todaysReward, setTodaysReward] = useState(null);
  // Live counter for tokens earned since login
  const [lastLoginTime, setLastLoginTime] = useState(null);
  const [firstLoginOfDay, setFirstLoginOfDay] = useState(null);
  const [liveCounter, setLiveCounter] = useState(0);
  const [showTooltip, setShowTooltip] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'info' });
  const [referralCode, setReferralCode] = useState('');
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [activeTab, setActiveTab] = useState('challenges');
  const [username, setUsername] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [walletAddress, setWalletAddress] = useState('');
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [isHumanVerified, setIsHumanVerified] = useState(false); // New state for human verification badge
  const [justCopied, setJustCopied] = useState(false); // State to track copy success
  const [challenges, setChallenges] = useState([
    {
      id: 1,
      title: "Tweet daily",
      image: "tweet.jpg",
      difficulty: "easy",
      reward: 5,
      progress: 0,
      completed: false
    },
    {
      id: 2,
      title: "Share 3 links",
      image: "share.jpg",
      difficulty: "medium",
      reward: 15,
      progress: 67,
      completed: false
    },
    {
      id: 3,
      title: "Verify your email",
      image: "email.jpg",
      difficulty: "easy",
      reward: 10,
      progress: 100,
      completed: true
    },
    {
      id: 4,
      title: "Connect Discord",
      image: "discord.jpg",
      difficulty: "easy",
      reward: 10,
      progress: 0,
      completed: false
    },
    {
      id: 5,
      title: "Invite 5 friends",
      image: "invite.jpg",
      difficulty: "hard",
      reward: 50,
      progress: 20,
      completed: false
    }
  ]);
  
  const [socialVerifications, setSocialVerifications] = useState({});
  
  const scrollContainerRef = useRef(null);

  // Fonction pour ouvrir le groupe Telegram
  const openTelegramGroup = () => {
    window.open('https://t.me/+W3pxAJb4yNk5MWM0', '_blank');
  };

  useEffect(() => {
    if (firstLoginOfDay && todaysReward !== null) {
      // Calculate how many seconds in a day the reward will be distributed over
      const secondsPerDay = 24 * 3600;
      
      // Calculate tokens earned per second
      const rate = todaysReward / secondsPerDay;
      
      // Calculate initial value based on elapsed time since first login of the day
      const now = new Date();
      const elapsedSec = Math.floor((now - firstLoginOfDay) / 1000);
      
      console.log("[REWARDS HUB] Initialisation du compteur live:", {
        premierLoginDuJour: firstLoginOfDay,
        heureActuelle: now,
        secondesÉcoulées: elapsedSec,
        tauxParSeconde: rate,
        montantInitial: (elapsedSec * rate).toFixed(4)
      });
      
      // Initial amount earned so far
      let initial = elapsedSec * rate;
      
      // Cap at maximum reward
      if (initial > todaysReward) {
        initial = todaysReward;
        // console.log("[REWARDS HUB] Compteur plafonné au montant maximal:", todaysReward);
      }
      
      // Set initial counter value
      setLiveCounter(initial);
      
      // Create interval to update the counter
      const interval = setInterval(() => {
        setLiveCounter(prev => {
          // Recalculate current time and elapsed seconds each tick for accuracy
          const currentTime = new Date();
          const currentElapsedSec = Math.floor((currentTime - firstLoginOfDay) / 1000);
          const earned = currentElapsedSec * rate;
          
          // Cap at maximum reward
          if (earned >= todaysReward) {
            clearInterval(interval);
            return todaysReward;
          }
          
          return earned;
        });
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [firstLoginOfDay, todaysReward]);
  
  
  // Load user data on component mount (similar to ConnectAccounts)
  useEffect(() => {
    // console.log("Loading user data...");
    setIsLoading(true);
    
    // Retrieve JWT token from localStorage
    const storedToken = localStorage.getItem('auth_token'); 
    if (storedToken) {
      setToken(storedToken);
      // console.log("JWT token retrieved from localStorage");
    }
    
    // Retrieve user ID from localStorage
    const storedUserId = localStorage.getItem('userId') || localStorage.getItem('user_id');
    if (storedUserId) {
      setUserId(storedUserId);
      // console.log(`User ID retrieved from localStorage: ${storedUserId}`);
    }
    
    // Retrieve username from localStorage
    const storedUsername = localStorage.getItem('username') || localStorage.getItem('user_username');
    if (storedUsername) {
      setUsername(storedUsername);
      // console.log(`Username retrieved: ${storedUsername}`);
    }
    
    // Retrieve wallet address from localStorage
    const storedWalletAddress = localStorage.getItem('walletAddress');
    if (storedWalletAddress) {
      setWalletAddress(storedWalletAddress);
      // console.log(`Wallet address retrieved: ${storedWalletAddress}`);
    }
    
    // If we have a token, fetch user info from the API
    if (storedToken) {
      // Debug logs for auth/me request
      // console.log("Calling API to retrieve user information via /auth/me");
      // console.log("API_BASE_URL:", API_BASE_URL);
      // console.log("GET URL:", `${API_BASE_URL}/auth/me`);
      // console.log("Request headers:", { Authorization: `Bearer ${storedToken}` });
      
      axios.get(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${storedToken}` }
      })
      .then(response => {
        const data = response.data;
        if (data && data._id) {
          // Store ID and referralCode in state and localStorage if needed
          localStorage.setItem('userId', data._id);
          setUserId(data._id);
          // console.log(`User ID retrieved from API: ${data._id}`);
          
          if (data.name) {
            setUsername(data.name);
          }
          if (data.walletAddress) {
            setWalletAddress(data.walletAddress);
          }
          if (data.referralCode) {
            setReferralCode(data.referralCode);
          }
          
          // Utiliser le tokenBalance de la BDD
          if (data.tokenBalance !== undefined && data.tokenBalance !== null) {
            console.log(`[RewardsHub] Récupération du tokenBalance BDD: ${data.tokenBalance}`);
            setUmiBalance(parseFloat(data.tokenBalance));
          } else {
            console.warn('[RewardsHub] tokenBalance non trouvé dans la réponse /auth/me, initialisation à 0.');
            setUmiBalance(0); // Fallback si non présent
          }
          
          // Set human verification status
          if (data.verified === true) {
            setIsHumanVerified(true);
            // console.log("User is human verified");
          }
          
          // Set social verification state and profile image
          if (data.socialVerifications) {
            setSocialVerifications(data.socialVerifications);
            console.log("Réseaux sociaux vérifiés:", data.socialVerifications);
    // Log plus détaillé pour chaque réseau social
    console.log("Twitter vérifiéyes:", data.socialVerifications.twitter?.verified || false);
    console.log("Telegram vérifié:", data.socialVerifications.telegram?.verified || false);
    console.log("Discord vérifié:", data.socialVerifications.discord?.verified || false);
          }
          if (data.social?.twitter?.profileImageUrl) {
            setProfileImage(data.social.twitter.profileImageUrl);
          } else if (data.social?.telegram?.profileImageUrl) {
            setProfileImage(data.social.telegram.profileImageUrl);
          } else if (data.social?.discord?.profileImageUrl) {
            setProfileImage(data.social.discord.profileImageUrl);
          }
        }
        
        // Fetch daily login streak data
        fetchDailyLoginData(storedToken);
      })
      .catch(err => {
        console.error("Error retrieving user information:", err);
        if (err.response) {
          console.error("Error response data:", err.response.data);
          console.error("Error response status:", err.response.status);
          console.error("Error response headers:", err.response.headers);
        }
        setIsLoading(false);
      });
    } else {
      console.warn("No JWT token found - API authentication won't be possible");
      setIsLoading(false);
    }
  }, []);
  
  // Live counter effect: increment liveCounter each second up to todaysReward
  useEffect(() => {
    if (lastLoginTime && todaysReward != null) {
      const secondsPerDay = 24 * 3600;
      const rate = todaysReward / secondsPerDay;
      // Initialize based on elapsed time
      const now = new Date();
      const elapsedSec = Math.floor((now - lastLoginTime) / 1000);
      let initial = elapsedSec * rate;
      if (initial > todaysReward) initial = todaysReward;
      setLiveCounter(initial);
      const interval = setInterval(() => {
        setLiveCounter(prev => {
          const next = prev + rate;
          if (next >= todaysReward) {
            clearInterval(interval);
            return todaysReward;
          }
          return next;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [lastLoginTime, todaysReward]);
  
  // Function to fetch daily login streak data
  const fetchDailyLoginData = async (authToken) => {
    // console.log("[REWARDS HUB] Début de récupération des données de login quotidien");
    // console.log("[REWARDS HUB] Token d'authentification:", authToken ? `${authToken.substring(0, 5)}...${authToken.substring(authToken.length - 5)}` : "Non défini");
    
    try {
      // console.log(`[REWARDS HUB] Appel API vers: ${API_BASE_URL}/users/daily-login`);
      
      const startTime = performance.now();
      const res = await axios.post(`${API_BASE_URL}/users/daily-login`, {}, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const endTime = performance.now();
      
      // console.log(`[REWARDS HUB] Réponse API reçue en ${(endTime - startTime).toFixed(2)}ms:`, res.data);
      
      // Détails sur le streak
      console.log("[REWARDS HUB] Information de streak:", {
        streakActuel: res.data.currentStreak,
        ancienStreak: currentStreak, // valeur précédente dans l'état React
        streakMaximum: res.data.maxStreak,
        augmentationStreak: res.data.currentStreak > currentStreak
      });
      
      setCurrentStreak(res.data.currentStreak);
      setMaxStreak(res.data.maxStreak);
      
      // Détails sur la récompense
       // on récupère ce que la back renvoie (fractionnaire depuis la dernière session)
        const distributed = res.data.distributedReward;
        // on calcule en plus le montant journalier "statique"
        const staticReward = Math.min(res.data.currentStreak, 5) * 10;
        console.log("[REWARDS HUB] Information de récompense:", {
          distributed,
          staticReward,
          calcul: `${staticReward} tokens (streak ${res.data.currentStreak})`,
          ancienneRécompense: todaysReward
        });
        setTodaysReward(staticReward);
      
      // IMPORTANT: Store both firstLoginOfDay and lastLogin
      if (res.data.firstLoginOfDay) {
        const firstLogin = new Date(res.data.firstLoginOfDay);
        setFirstLoginOfDay(firstLogin);
        
        console.log("[REWARDS HUB] Information de premier login:", {
          premierLoginDuJour: firstLogin,
          heureActuelle: new Date(),
          secondesDepuisPremierLogin: Math.floor((new Date() - firstLogin) / 1000)
        });
      } else {
        console.log("[REWARDS HUB] Aucune information de premier login trouvée");
      }
      
      // We still need lastLoginTime for streak calculations
      if (res.data.lastLogin) {
        const loginTime = new Date(res.data.lastLogin);
        setLastLoginTime(loginTime);
        
        console.log("[REWARDS HUB] Information de dernier login:", {
          dernierLogin: loginTime
        });
      }
      
      // Résumé de la réclamation quotidienne
      const nextRewardTime = res.data.lastLogin ? 
        new Date(new Date(res.data.lastLogin).getTime() + 86400000) : null;
        
      console.log("[REWARDS HUB] Résumé de réclamation quotidienne:", {
        streakActuel: res.data.currentStreak,
        récompenseObtenue: res.data.todaysReward,
        prochaineRéclamationPossible: nextRewardTime,
        récompensePotentielleDemain: Math.min((res.data.currentStreak + 1), 5) * 10
      });
      
    } catch (err) {
      console.error("[REWARDS HUB] Erreur critique lors de la récupération:", err);
      console.log("[REWARDS HUB] Détails de l'erreur:", {
        message: err.message,
        code: err.code,
        réponseServeur: err.response?.data
      });
    } finally {
      console.log("[REWARDS HUB] Fin du processus de récupération, chargement terminé");
      setIsLoading(false);
    }
  };
  
  // Function to refresh token balance manually
  const refreshTokenBalance = async () => {
    setNotification({
      show: true,
      message: "Refreshing balance...",
      type: 'info'
    });
    
    // const balance = await fetchTokenBalance();
    
    // if (balance !== null) {
    //   setNotification({
    //     show: true,
    //     message: `Balance updated: ${balance}`,
    //     type: 'success'
    //   });
    // } else {
    //   setNotification({
    //     show: true,
    //     message: "Failed to refresh balance",
    //     type: 'error'
    //   });
    // }
    
    setTimeout(() => {
      setNotification({ show: false, message: '', type: 'info' });
    }, 3000);
  };
  
  // Function to copy referral code
  const copyReferralCode = () => {
    if (!referralCode) {
      setNotification({
        show: true,
        message: "No referral code available",
        type: 'error'
      });
      
      setTimeout(() => {
        setNotification({ show: false, message: '', type: 'info' });
      }, 3000);
      return;
    }
    
    navigator.clipboard.writeText(referralCode);
    setJustCopied(true);
    
    setNotification({
      show: true,
      message: "Referral code copied!",
      type: 'success'
    });
    
    setTimeout(() => {
      setJustCopied(false);
      setNotification({ show: false, message: '', type: 'info' });
    }, 2000);
  };
  
  // Function to share referral
  const shareReferral = () => {
    if (!referralCode) {
      setNotification({
        show: true,
        message: "No referral code available",
        type: 'error'
      });
      
      setTimeout(() => {
        setNotification({ show: false, message: '', type: 'info' });
      }, 3000);
      return;
    }
    
    if (navigator.share) {
      navigator.share({
        title: 'Join me on this app!',
        text: `Use my invitation code ${referralCode} to get 20 UMI bonus!`,
        url: window.location.origin
      })
      .catch(err => console.error("Error sharing:", err));
    } else {
      copyReferralCode();
    }
  };
  
  const handleBack = () => {
    console.log("Back button clicked");
  };
  
  const toggleInfoModal = () => {
    setShowInfoModal(!showInfoModal);
  };
  
  return (
      <div className="rewards-hub">
      <div className="background"></div>
      <div className="content-container">
        {/* Top Navigation - Now with Balance */}
        <header>
          <div className="top-nav">
            {/* <div className="back-button" onClick={handleBack}>
              <ChevronLeft size={20} />
            </div> */}
            <div className="nav-right">
              {/* Improved balance display */}
              <div className="balance-display">
                <div className="balance-text">
                  <span className="balance-label">Balance:</span>
                  {isLoading ? (
                    <span className="balance-value">Loading...</span>
                  ) : (
                    <span className="balance-value">
                      {umiBalance !== null ? 
                        `${parseFloat(umiBalance).toFixed(2)} UMI` : 
                        'N/A'}
                    </span>
                  )}
                </div>
              </div>
              
              {/* Nouveau: Bouton Telegram */}
              <div className="telegram-link" onClick={openTelegramGroup}>
                <FaTelegramPlane size={18} />
                <span className="telegram-text">Join Us</span>
              </div>
            </div>
          </div>
        </header>
        
        {/* USER PROFILE SECTION */}
        <div className="profile-container">
          <div className="profile-image-container">
            {profileImage ? (
              <img src={profileImage} alt="Profile" className="profile-image" />
            ) : (
              <div className="profile-avatar">
                <User size={40} />
              </div>
            )}
          </div>
          <div className="profile-header">
            <h3 className="profile-username">
              {isLoading ? 'Loading...' : (username || 'User')}
            </h3>
            
            {/* Human verification badge */}
            {isHumanVerified && (
              <div className="human-badge" title="Human verified">
                <Shield size={14} />
                <span>Human</span>
              </div>
            )}
          </div>
          
          {/* Social verification badges */}
          <div className="social-badges">
          {socialVerifications.telegram?.verified && (
              <span className="social-badge" style={{ backgroundColor: 'rgba(0,136,255,0.2)', color: '#0088CC' }}>
                <FaTelegramPlane /> Telegram
              </span>
            )}
            
            {socialVerifications.discord?.verified && (
              <span className="social-badge" style={{ backgroundColor: 'rgba(88,101,242,0.2)', color: '#5865F2' }}>
                <FaDiscord /> Discord
              </span>
            )}
            {socialVerifications.twitter?.verified && (
              <span className="social-badge" style={{ backgroundColor: 'rgba(0,0,0,0.2)', color: 'black' }}>
                <FaX /> 
              </span>
            )}
          </div>
        </div>
        
        {/* MODIFIED: Daily login progress bar with integrated counter and combo */}
        <div className="streak-container">
          <div className="stats-card streak-stats">
            <div className="progress-container">
              <div className="progress-stats">
                <span className="progress-text">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="14" height="14" className="fire-icon">
                    <path d="M12 23c-4.9 0-9-4.1-9-9 0-3.5 1.5-6 4.4-8.6.3-.3.7-.4 1-.2.3.2.5.5.5.9 0 1.2.5 2.3 1.4 3 .2.2.5.2.8.1.2-.1.4-.4.4-.7V4c0-1.1.9-2 2-2h.5c3.9.6 6.9 4 6.9 8 0 1.7-1.3 3-3 3h-1.8c-.8 0-1.6.4-2.2 1s-.7 1.4-.6 2.2c.2 1.5 1.4 2.5 3 2.5.8 0 1.6-.4 2.1-1.1.8-1.2 2.4-1.5 3.5-.6.5.4.8 1 .8 1.6 0 3.3-3.8 6-9.2 6zm2.5-10.5c0 .3-.2.5-.5.5h-4c-.3 0-.5-.2-.5-.5s.2-.5.5-.5h4c.3 0 .5.2.5.5z"/>
                  </svg>
                  Daily Login
                </span>
                <div className="streak-info">
                  {isLoading ? (
                    <span className="progress-reward">Loading...</span>
                  ) : (
                    <>
                      {currentStreak !== null && (
                        <div className="streak-combo" title="Current streak">
                          <span className="combo-multiplier">x{currentStreak}</span>
                        </div>
                      )}
                      <span 
                        className="progress-reward"
                        onMouseEnter={() => setShowTooltip(true)} 
                        onMouseLeave={() => setShowTooltip(false)}
                      >
                        Day {currentStreak || 0}
                        {showTooltip && currentStreak !== null && todaysReward !== null && (
                          <div className="streak-tooltip">
                            Tomorrow Day {currentStreak + 1}! +{Math.min((currentStreak + 1), 5) * 10} UMI
                          </div>
                        )}
                      </span>
                    </>
                  )}
                </div>
              </div>
              
              <div className="progress-bar-container">
                <div className="progress-bar-bg">
                  {isLoading ? (
                    <div className="progress-bar-loading"></div>
                  ) : (
                    <div 
                      className="progress-bar-fill" 
                      style={{ 
                        width: currentStreak !== null ? 
                          `${Math.min(currentStreak, 5) / 5 * 100}%` : 
                          '0%'
                      }}
                    ></div>
                  )}
                </div>
                
                {/* Integrated live counter with earning animation */}
                {firstLoginOfDay && todaysReward != null && (
                  <div className="earnings-display">
                    <div className="earnings-value">
                      <span className="earnings-number">{liveCounter.toFixed(4)}</span>
                      <span className="earnings-currency">UMI</span>
                    </div>
                    <div className="earnings-label">
                      Earning now
                      <div className="pulse-dot"></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* REFERRAL CODE SECTION - REDESIGNED */}
        <div className="referral-section">
          <div className="mini-card">
            <div className="referral-content">
              <div className="referral-text">
                <span className="referral-label">Invite friends & earn 20 UMI</span>
                <div className="code-container" onClick={copyReferralCode}>
                  {isLoading ? (
                    <span className="loading-code">Loading...</span>
                  ) : (
                    <div className="referral-code-wrapper">
                      <span className="code-value">{referralCode || 'Not available'}</span>
                      <span className={`copy-icon ${justCopied ? 'copied' : ''}`}>
                        {justCopied ? <Check size={14} /> : <Copy size={14} />}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* CHALLENGES SECTION WITH TEMPORARY MESSAGE */}
        <div className="tab-section challenges-section w-full overflow-hidden">
          <div className="section-header">
            <h3>Daily Challenges</h3>
          </div>
          
          <div className="coming-soon-container">
            <div className="coming-soon-icon">
              <Award size={32} />
            </div>
            <h3 className="coming-soon-title">Coming Soon!</h3>
            <p className="coming-soon-text">Complete challenges and earn UMI</p>
          </div>
        </div>
      </div>
      
      {/* Notification */}
      {notification.show && (
        <div className={`notification ${notification.type}`}>
          <span>{notification.message}</span>
        </div>
      )}
      
      <style jsx>{`
        /* Reset and base styles */
        *, *:before, *:after {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        
        body, html {
          margin: 0;
          padding: 0;
          width: 100%;
          height: 100%;
          overflow-x: hidden;
          font-size: 16px;
          background-color: #f4e9b7 !important;
        }
        
        /* Base component styles */
        .rewards-hub {
          width: 100%;
          min-height: 100vh;
          background-color: #f4e9b7;
          color: #303421;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          position: relative;
        }
        
        .background {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: #f4e9b7;
          pointer-events: none;
          z-index: -1;
        }
        
        .content-container {
          /* Constrain container width and center */
          width: 100%;
          max-width: 400px;
          margin: 0 auto;
          padding: 1rem 1rem 4rem 1rem;
        }
        
        /* Top Navigation */
        .top-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1.5rem;
        }
        
        .back-button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background-color: rgba(241, 100, 3, 0.1);
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .back-button:hover {
          background-color: rgba(241, 100, 3, 0.2);
        }
        
        .page-title {
          font-size: 1.2rem;
          font-weight: 600;
          color: #303421;
        }
        
        /* New: Right navigation with mini-balance and avatar */
        .nav-right {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        /* Improved balance display */
        .balance-display {
            display: flex;
            align-items: center;
            gap: 4px; /* Réduit de 6px à 4px */
            background-color: rgba(241, 100, 3, 0.08);
            border: 1px solid rgba(241, 100, 3, 0.15);
            border-radius: 6px; /* Réduit de 8px à 6px */
            padding: 0.25rem 0.5rem; /* Réduit de 0.4rem 0.7rem */
            transition: all 0.2s ease;
            }
        
        .balance-display:hover {
          background-color: rgba(241, 100, 3, 0.12);
          transform: translateY(-1px);
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
        }
        
        .balance-icon {
          color: #f28011;
          display: flex;
          align-items: center;
        }
        
        .balance-text {
          display: flex;
          flex-direction: column;
          line-height: 1.1;
        }
        
        .balance-label {
          font-size: 0.65rem;
          color: rgba(48, 52, 33, 0.7);
          font-weight: 500;
        }
        
        .balance-value {
          font-size: 0.85rem;
          font-weight: 600;
          color: #303421;
          display: flex;
          align-items: center;
          gap: 0.3rem;
        }
        
        .refresh-balance-button {
          background: none;
          border: none;
          color: #f28011;
          cursor: pointer;
          padding: 2px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          margin-left: auto;
          opacity: 0.7;
        }
        
        .refresh-balance-button:hover {
          opacity: 1;
          background-color: rgba(241, 100, 3, 0.1);
        }
        
        .user-avatar {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background-color: rgba(241, 100, 3, 0.1);
          color: #f28011;
        }
        
        /* MODIFIED: New progress container styles inspired by SocialConnect */
        .streak-container {
          margin-bottom: 1.5rem;
          width: 100%;
          animation: fadeIn 0.6s ease-out;
        }
        
        .stats-card {
          width: 100%;
          background: rgba(241, 100, 3, 0.03);
          border-radius: 16px;
          padding: 1rem 1.2rem;
          border: 1px solid rgba(241, 100, 3, 0.1);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
          position: relative;
          overflow: hidden;
        }
        
        /* New profile container styles */
        .profile-container {
          margin-bottom: 1.5rem;
          width: 100%;
          animation: fadeIn 0.6s ease-out;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          padding: 1rem 0;
        }
        
        /* Added profile header for username and human badge */
        .profile-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          justify-content: center;
        }
        
        /* Human verification badge */
        .human-badge {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.25rem 0.5rem;
          background-color: rgba(241, 100, 3, 0.1);
          border: 1px solid rgba(241, 100, 3, 0.2);
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          color: #f28011;
          animation: fadeIn 0.6s ease-out;
        }
        
        .human-badge span {
          line-height: 1;
        }
        
        .profile-image-container {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          overflow: hidden;
          border: 2px solid #f28011;
          box-shadow: 0 4px 12px rgba(241, 100, 3, 0.2);
          margin-bottom: 0.5rem;
          position: relative;
        }
        
        .profile-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .profile-avatar {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: rgba(241, 100, 3, 0.1);
          color: #f28011;
        }
        
        .profile-username {
          font-size: 1.2rem;
          font-weight: 600;
          color: #303421;
          margin: 0;
          text-align: center;
        }
        
        /* MODIFIED: Updated progress container with integrated counter */
        .progress-container {
          width: 100%;
          animation: fadeIn 0.6s ease-out;
        }
        
        .progress-stats {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.5rem;
          align-items: center;
        }
        
        .progress-text {
          font-size: 0.85rem;
          font-weight: 500;
          color: #303421;
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }
        
        /* New streak info layout */
        .streak-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .progress-reward {
          font-size: 0.8rem;
          color: #f28011;
          font-weight: 500;
          position: relative;
          cursor: help;
        }
        
        /* New streak combo badge */
        .streak-combo {
          background: rgba(241, 100, 3, 0.6);
          border-radius: 6px;
          padding: 0.15rem 0.4rem;
          display: inline-flex;
          align-items: center;
          box-shadow: 0 2px 5px rgba(241, 100, 3, 0.3);
          position: relative;
          overflow: hidden;
        }
        
        .streak-combo::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.2), rgba(255,255,255,0));
          z-index: 1;
        }
        
        .combo-multiplier {
          color: white;
          font-weight: 600;
          font-size: 0.75rem;
          position: relative;
          z-index: 2;
          text-shadow: 0 1px 1px rgba(0,0,0,0.2);
        }
        
        .progress-bar-container {
          position: relative;
        }
        
        .progress-bar-bg {
          width: 100%;
          height: 8px;
          background-color: rgba(241, 100, 3, 0.1);
          border-radius: 10px;
          overflow: hidden;
          position: relative;
          z-index: 1;
        }
        
        .progress-bar-fill {
          height: 100%;
          background: linear-gradient(to right, #f28011, #f16403);
          border-radius: 10px;
          transition: width 0.4s ease-in-out;
          position: relative;
          z-index: 2;
        }
        
        .progress-bar-fill::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(90deg, 
            rgba(255,255,255,0) 0%, 
            rgba(255,255,255,0.15) 50%, 
            rgba(255,255,255,0) 100%);
          animation: shimmer 1.5s infinite;
          z-index: 3;
        }
        
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        .progress-bar-loading {
          height: 100%;
          width: 30%;
          background-color: #f28011;
          border-radius: 10px;
          position: relative;
          animation: loading 1.5s infinite ease-in-out;
        }
        
        @keyframes loading {
          0% { left: -30%; }
          100% { left: 100%; }
        }
        
        .fire-icon {
          color: #f28011;
        }
        
        .streak-tooltip {
          position: absolute;
          top: -40px;
          right: 0;
          background: #303421;
          padding: 0.5rem 0.75rem;
          border-radius: 8px;
          font-size: 0.8rem;
          white-space: nowrap;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          z-index: 100;
          color: white;
        }
        
        .streak-tooltip:after {
          content: '';
          position: absolute;
          bottom: -6px;
          right: 10px;
          width: 0;
          height: 0;
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-top: 6px solid #303421;
        }
        
        /* NEW: Earnings Display */
        .earnings-display {
          margin-top: 0.75rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(241, 100, 3, 0.06);
          border: 1px solid rgba(241, 100, 3, 0.12);
          border-radius: 10px;
          padding: 0.6rem 0.8rem;
          transition: all 0.3s;
          animation: gentle-highlight 3s infinite alternate;
        }
        
        @keyframes gentle-highlight {
          0% { box-shadow: 0 0 0 rgba(241, 100, 3, 0.1); }
          100% { box-shadow: 0 0 8px rgba(241, 100, 3, 0.3); }
        }
        
        .earnings-value {
          display: flex;
          align-items: baseline;
          gap: 0.2rem;
        }
        
        .earnings-number {
          font-size: 1.3rem;
          font-weight: 700;
          color: #f16403;
          animation: pulse-number 2s infinite;
        }
        
        @keyframes pulse-number {
          0% { opacity: 0.9; }
          50% { opacity: 1; }
          100% { opacity: 0.9; }
        }
        
        .earnings-currency {
          font-size: 0.9rem;
          font-weight: 600;
          color: rgba(241, 100, 3, 0.8);
        }
        
        .earnings-label {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.8rem;
          color: rgba(48, 52, 33, 0.7);
          font-weight: 500;
        }
        
        .pulse-dot {
          width: 7px;
          height: 7px;
          background-color: #f16403;
          border-radius: 50%;
          animation: pulse-dot 1.5s infinite;
        }
        
        @keyframes pulse-dot {
          0% { transform: scale(0.7); opacity: 0.5; }
          50% { transform: scale(1); opacity: 1; }
          100% { transform: scale(0.7); opacity: 0.5; }
        }
        
        /* NEW: Minimalist Referral Section */
        .referral-section {
          margin-bottom: 1.5rem;
          width: 100%;
        }
        
        .mini-card {
          background: rgba(241, 100, 3, 0.03);
          border-radius: 12px;
          padding: 0.75rem 1rem;
          border: 1px solid rgba(241, 100, 3, 0.1);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
        }
        
        .referral-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        
        .referral-text {
          width: 100%;
        }
        
        .referral-label {
          display: block;
          font-size: 0.8rem;
          font-weight: 500;
          color: rgba(48, 52, 33, 0.8);
          margin-bottom: 0.4rem;
        }
        
        .code-container {
          display: flex;
          align-items: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .referral-code-wrapper {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
        }
        
        .code-value {
          font-family: monospace;
          font-size: 0.9rem;
          font-weight: 600;
          color: #f16403;
          letter-spacing: 0.5px;
        }
        
        .copy-icon {
          color: rgba(241, 100, 3, 0.6);
          margin-left: 0.5rem;
          display: flex;
          align-items: center;
          transition: all 0.2s;
        }
        
        .copy-icon.copied {
          color: #2ea043;
          animation: popEffect 0.3s ease;
        }
        
        @keyframes popEffect {
          0% { transform: scale(1); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
        
        .loading-code {
          font-size: 0.8rem;
          color: rgba(48, 52, 33, 0.6);
        }
        
        /* Tab Content */
        .tab-content {
          animation: fadeIn 0.4s ease-out;
          width: 100%;
        }

        /* Common styles for all tab sections to ensure consistent sizing */
        .tab-section {
          width: 100%;
          background: transparent;
          border-radius: 16px;
          border: 1px solid rgba(241, 100, 3, 0.1);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
          margin-bottom: 1.5rem;
        }
        
        /* Section Headers */
        .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1rem;
          padding: 1rem 1rem 0 1rem;
        }
        
        .section-header h3 {
          font-size: 1rem;
          font-weight: 500;
          color: #303421;
        }
        
        /* Challenges Section */
        .challenges-section {
          padding-bottom: 1rem;
        }
        
        /* Coming Soon Section */
        .coming-soon-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem 1rem 3rem 1rem;
          text-align: center;
        }
        
        .coming-soon-icon {
          color: #f28011;
          margin-bottom: 1rem;
          animation: pulse 2s infinite;
        }
        
        .coming-soon-title {
          font-size: 1.2rem;
          font-weight: 600;
          color: #303421;
          margin-bottom: 0.5rem;
        }
        
        .coming-soon-text {
          font-size: 1rem;
          color: rgba(48, 52, 33, 0.7);
        }
        
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
        
        /* Notification */
        .notification {
          position: fixed;
          bottom: 1.5rem;
          left: 50%;
          transform: translateX(-50%);
          padding: 0.9rem 1.25rem;
          border-radius: 12px;
          font-size: 0.9rem;
          z-index: 1000;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          min-width: 200px;
          max-width: 90%;
          text-align: center;
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
        
        /* Animations */
        @keyframes slideUp {
          from { opacity: 0; transform: translate(-50%, 20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        /* Responsive Styles */
        @media (max-width: 380px) {
          .content-container {
            padding: 0.75rem;
          }
          
          .mini-balance {
            font-size: 0.8rem;
            padding: 0.25rem 0.5rem;
          }
          
          .profile-image-container {
            width: 80px;
            height: 80px;
          }
          
          .earnings-number {
            font-size: 1.1rem;
          }
        }
        
        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
          .rewards-hub {
            background-color: #303421;
            color: #f4e9b7;
          }
          
          .background {
            background-color: #303421;
          }
          
          .streak-container,
          .tabs-container,
          .mini-card,
          .tab-section,
          .streak-stats {
            background-color: rgba(255, 255, 255, 0.05);
            border-color: rgba(241, 100, 3, 0.2);
          }
          
          .page-title,
          .streak-title,
          .section-header h3,
          .coming-soon-title,
          .progress-text,
          .profile-username {
            color: #f4e9b7;
          }
          
          .progress-text,
          .referral-label,
          .coming-soon-text {
            color: rgba(244, 233, 183, 0.7);
          }
          
          .code-value {
            color: #f28011;
          }
          
          .human-badge {
            background-color: rgba(241, 100, 3, 0.15);
          }
          
          .earnings-display {
            background: rgba(241, 100, 3, 0.1);
            border-color: rgba(241, 100, 3, 0.2);
          }
          
          .earnings-label {
            color: rgba(244, 233, 183, 0.7);
          }
        }
        
        .social-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }
        
        .social-badge {
          padding: 0.25rem 0.5rem;
          border-radius: 6px;
          font-size: 0.8rem;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 0.3rem;
        }
        
        /* Nouveau style pour le lien Telegram */
        .telegram-link {
          display: flex;
          align-items: center;
          gap: 5px;
          background-color: rgba(0, 136, 204, 0.08);
          border: 1px solid rgba(0, 136, 204, 0.2);
          color: #0088cc;
          border-radius: 6px;
          padding: 0.25rem 0.5rem;
          cursor: pointer;
          transition: all 0.2s;
          font-weight: 500;
        }
        
        .telegram-link:hover {
          background-color: rgba(0, 136, 204, 0.15);
          transform: translateY(-1px);
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
        }
        
        .telegram-text {
          font-size: 0.8rem;
          line-height: 1;
        }
        
        /* Dark mode support pour le bouton Telegram */
        @media (prefers-color-scheme: dark) {
          .telegram-link {
            background-color: rgba(0, 136, 204, 0.15);
            border-color: rgba(0, 136, 204, 0.3);
          }
          
          .telegram-link:hover {
            background-color: rgba(0, 136, 204, 0.25);
          }
        }
        
        /* Support responsive pour le bouton Telegram */
        @media (max-width: 380px) {
          .telegram-text {
            display: none;
          }
          
          .telegram-link {
            padding: 0.25rem;
          }
        }
      `}</style>
    </div>
  );
};

export default RewardsHub;