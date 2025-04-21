import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { MiniKit } from "@worldcoin/minikit-js";
import head from './head.png';
import UmiToken from './Umi_Token.png'; // Image du token UMI

const BACKEND_URL = 'https://uman.onrender.com';
const API_TIMEOUT = 15000;

const Home = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [slideUp, setSlideUp] = useState(false);
  const [miniKitInitialized, setMiniKitInitialized] = useState(false);
  const [authError, setAuthError] = useState(null);
  
  // Code entered by the user
  const [referralCode, setReferralCode] = useState('');
  // Validated code ready to be sent
  const [confirmedReferralCode, setConfirmedReferralCode] = useState('');
  // Feedback on code validation
  const [isReferralValid, setIsReferralValid] = useState(false);
  const [referralError, setReferralError] = useState(''); // error message for referral code
  
  // États pour gérer le swipe
  const [swipeProgress, setSwipeProgress] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);

  // Nouveaux états pour la carte de confirmation de tokens
  const [showTokenConfirmation, setShowTokenConfirmation] = useState(false);
  const [tokenAmount, setTokenAmount] = useState(10); // Par défaut 10 tokens de bienvenue

  // Initialize MiniKit when component loads
  useEffect(() => {
    const initMiniKit = async () => {
      // Wait a bit to allow MiniKit to fully initialize
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      if (MiniKit.isInstalled()) {
        console.log("MiniKit is installed, checking status...");
        console.log("Initial MiniKit.walletAddress:", MiniKit.walletAddress);
        
        // Check if MiniKit is ready
        if (!MiniKit.walletAddress) {
          console.log("MiniKit not fully initialized yet, will check during auth flow");
        }
      } else {
        console.log("MiniKit not installed");
      }
      
      setMiniKitInitialized(true);
    };
    
    initMiniKit();

    // Disable scrolling
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    
    // Clean up when component unmounts
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, []);
  
  useEffect(() => {
      const params = new URLSearchParams(location.search);
      const ref = params.get('ref') || params.get('referralCode');
      if (ref) {
        console.log('Referral code detected in URL:', ref);
        setReferralCode(ref);
      }
    }, [location.search]);

  // Function to get wallet address with retries
  const getWalletAddress = async (maxRetries = 5) => {
    let retries = 0;
    
    while (retries < maxRetries) {
      if (MiniKit.walletAddress) {
        console.log("Found wallet address:", MiniKit.walletAddress);
        return MiniKit.walletAddress;
      }
      
      console.log(`Wallet address not found, retry ${retries + 1}/${maxRetries}`);
      // Wait 500ms before retrying
      await new Promise(resolve => setTimeout(resolve, 1500));
      retries++;
    }
    
    console.log("Could not obtain wallet address after retries");
    return null;
  };

  // Wallet authentication function
  const handleWalletAuth = useCallback(async () => {
    console.log("=== Starting handleWalletAuth ===");
    
    // Prevent multiple calls
    if (isLoading) {
      return;
    }
    
    // Clear previous errors
    setAuthError(null);
    
    // Set loading state
    setIsLoading(true);
    
    // Prepare animation for transition
    setTimeout(() => {
      setSlideUp(true);
    }, 300);
    
    // Check if MiniKit is installed
    if (!MiniKit || !MiniKit.isInstalled()) {
      console.log("MiniKit not installed, using development mode");
      
      // Simulate successful connection in development mode
      localStorage.setItem("isAuthenticated", "true");
      localStorage.setItem("walletAddress", "0x" + Math.random().toString(16).substring(2, 42));
      
      // Vérifier si l'utilisateur a déjà vu le message de bienvenue
      const hasSeenWelcome = localStorage.getItem("hasSeenWelcomeTokens");
      if (!hasSeenWelcome) {
        // Afficher la confirmation de tokens en mode développement
        setTokenAmount(isReferralValid ? 30 : 10);
        setShowTokenConfirmation(true);
        // Marquer que l'utilisateur a vu le message de bienvenue
        localStorage.setItem("hasSeenWelcomeTokens", "true");
      }
      
      // Rediriger après un court délai
      setTimeout(() => {
        navigate("/social-connect");
      }, hasSeenWelcome ? 500 : 3000);
      
      return;
    }
    
    try {
      // First call to initialize authentication
      // This will often trigger wallet initialization in MiniKit
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
      
      // Request wallet authentication - this will likely initialize the wallet
      const walletAuthResult = await MiniKit.commandsAsync.walletAuth({
        nonce,
        requestId: "0",
        expirationTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        notBefore: new Date(Date.now() - 24 * 60 * 60 * 1000),
        statement: "Sign in to SocialID - Connect with blockchain.",
      });
      
      const { finalPayload } = walletAuthResult;
      const authPayload = finalPayload;
      
      // Handle errors
      if (authPayload.status === "error") {
        setIsLoading(false);
        setSlideUp(false);
        setAuthError(authPayload.message || "Authentication failed");
        return;
      }
      
      // Wait for wallet address to be available
      console.log("Auth successful, now waiting for MiniKit wallet address to be available");
      const walletAddress = await getWalletAddress(5);
      const testResult = await MiniKit.commandsAsync.walletAuth({
        nonce,
        requestId: "0",
        expirationTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        notBefore: new Date(Date.now() - 24 * 60 * 60 * 1000),
        statement: "Sign in to SocialID - Connect with blockchain.",
      });
      console.log('the test result is',testResult);
      console.log("Wallet address after auth:", walletAddress);
      
      // Now get MiniKit username
      let minikitUsername = null;
      
      if (walletAddress) {
        try {
          console.log("Attempting to fetch MiniKit username using getUserByAddress");
          const minikitUser = await MiniKit.getUserByAddress(walletAddress);
          console.log('The minikit user is', minikitUser);
          
          if (minikitUser && minikitUser.username) {
            minikitUsername = minikitUser.username;
            console.log("Successfully retrieved MiniKit username:", minikitUsername);
            
            // Store this username immediately
            localStorage.setItem('user_username', minikitUsername);
            localStorage.setItem('username', minikitUsername);
          } else {
            console.log("MiniKit returned user data but no username");
            
            // Fallbacks as in original in case of failure
            const storedUsername = localStorage.getItem('username') || localStorage.getItem('user_username');
            if (storedUsername) {
              minikitUsername = storedUsername;
              console.log("Using stored username from localStorage:", minikitUsername);
            } else {
              // Last resort: ask the user
              const promptedUsername = prompt("Please enter your preferred username:");
              if (promptedUsername && promptedUsername.trim()) {
                minikitUsername = promptedUsername.trim();
                console.log("User provided username via prompt:", minikitUsername);
              }
            }
          }
        } catch (minikitError) {
          console.error("Error retrieving MiniKit user:", minikitError);
          
          // Same fallbacks as original in case of error
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
      
      // Get wallet address to use (from auth payload or MiniKit)
      const addrToUse = authPayload.address || walletAddress;
      
      console.log("Sending SIWE payload to backend with username:", minikitUsername);
      console.log("Using wallet address:", addrToUse);
      console.log("Referral code sent:", confirmedReferralCode);
        
      const siweResponse = await axios.post(
          `${BACKEND_URL}/api/auth/complete-siwe`,
          { 
            payload: authPayload, 
            nonce, 
            nonceId,
            username: minikitUsername,
            walletAddress: addrToUse,
            referralCode: confirmedReferralCode
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
            localStorage.setItem("auth_token", siweResponse.data.token);
            console.log("JWT token stored successfully");
        } else {
            console.error("No token received from server!");
        }
          
        if (siweResponse.data.userId) {
            localStorage.setItem("userId", siweResponse.data.userId);
            localStorage.setItem("user_id", siweResponse.data.userId);
            console.log("User ID stored:", siweResponse.data.userId);
        } else {
            console.error("No userId received from server!");
        }
          
        // Store authentication details
        localStorage.setItem("isAuthenticated", "true");

        console.log('The username is', verificationResult.username);
        console.log('The wallet is', verificationResult.walletAddress);
        
        if (verificationResult.walletAddress) {
          localStorage.setItem("walletAddress", verificationResult.walletAddress);
        }
        
        if (verificationResult.username) {
          localStorage.setItem("username", verificationResult.username);
          localStorage.setItem("user_username", verificationResult.username);
        }

        console.log('Sending referralCode:', confirmedReferralCode);

        // Vérifier si l'utilisateur a déjà vu le message de bienvenue
        const hasSeenWelcome = localStorage.getItem("hasSeenWelcomeTokens");
        if (!hasSeenWelcome) {
          // Afficher la confirmation des tokens seulement à la première connexion
          setTokenAmount(confirmedReferralCode ? 30 : 10);
          setShowTokenConfirmation(true);
          // Marquer que l'utilisateur a vu le message de bienvenue
          localStorage.setItem("hasSeenWelcomeTokens", "true");
        }
        
        // Rediriger après un délai approprié
        setTimeout(() => {
          navigate("/social-connect");
        }, hasSeenWelcome ? 500 : 3000);
      } else {
        // Authentication failed
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
  }, [navigate, isLoading, confirmedReferralCode, isReferralValid]);

  // Event handlers for swipe
  const handleSwipeStart = () => {
    if (!isLoading) {
      setIsSwiping(true);
    }
  };

  const handleSwipeMove = (e, info) => {
    if (!isLoading) {
      // Calculate progress based on X position
      const distance = 150; // Total required swipe distance (reduced)
      const progress = Math.max(0, Math.min(1, info.point.x / distance));
      setSwipeProgress(progress);
    }
  };

  const handleSwipeEnd = (e, info) => {
    if (!isLoading) {
      // If the user has swiped far enough, trigger authentication
      if (swipeProgress > 0.8) {
        handleWalletAuth();
      } else {
        // Reset progress
        setSwipeProgress(0);
      }
      setIsSwiping(false);
    }
  };

  // Handler for fallback in case of simple click on the area
  const handleAreaClick = () => {
    if (!isLoading && !isSwiping) {
      handleWalletAuth();
    }
  };

  return (
    <div className="app-container">
      <div className="content-container">
        <div className="logo-container">
          <img src={head} alt="Logo" className="logo" />
        </div>
        
        <motion.div
          className="connect-container"
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
          {authError && (
            <div className="error-message">
              {authError}
            </div>
          )}
          
          {/* Referral code field (optional) */}
          <div 
            className="referral-container" 
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              margin: '10px 0',
              width: '100%',
              maxWidth: '300px'
            }}
          >
            <input
              type="text"
              placeholder="Referral Code (optional)"
              value={referralCode}
              onChange={e => {
                setReferralCode(e.target.value);
                setIsReferralValid(false);
                setReferralError('');
              }}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ccc',
                fontSize: '14px'
              }}
            />
            <button
              type="button"
              onClick={async () => {
                const code = referralCode.trim();
                if (!code) {
                  setReferralError('Please enter a referral code or leave blank.');
                  setIsReferralValid(false);
                  setConfirmedReferralCode('');
                  return;
                }
                let resp;
                try {
                  // Always resolve for 2xx–4xx to handle business logic
                  resp = await axios.post(
                    `${BACKEND_URL}/api/users/validate-referral`,
                    { referralCode: code },
                    { timeout: API_TIMEOUT, validateStatus: () => true }
                  );
                  console.log("Referral validation response:", resp.status, resp.data);

                } catch (err) {
                  console.error('Referral validation error:', err);
                  setConfirmedReferralCode('');
                  setIsReferralValid(false);
                  setReferralError('Error validating referral code');
                  return;
                }
                // Handle response
                if (resp.status === 200 && resp.data.valid) {
                  setConfirmedReferralCode(code);
                  setIsReferralValid(true);
                  setReferralError('');
                } else {
                  setConfirmedReferralCode('');
                  setIsReferralValid(false);
                  setReferralError(resp.data.message || 'Invalid referral code');
                }
              }}
              style={{
                padding: '8px 12px',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: '#28a745',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              Validate
            </button>
          </div>
          {isReferralValid && (
            <div style={{ color: '#28a745', marginBottom: '8px' }}>
              Code "{confirmedReferralCode}" confirmed 👍
            </div>
          )}
          {referralError && (
            <div style={{ color: 'red', marginBottom: '8px' }}>
              {referralError}
            </div>
          )}
          
          <div className="connect-area" onClick={handleAreaClick}>
            <div className="swipe-instruction">
              {isLoading ? "Connecting..." : ""}
            </div>
            
            <motion.div 
              className="swipe-track"
              onClick={(e) => e.stopPropagation()}
            >
              <motion.div 
                className="swipe-thumb"
                drag="x"
                dragConstraints={{ left: 0, right: 150 }}
                dragElastic={0}
                dragMomentum={false}
                onDragStart={handleSwipeStart}
                onDrag={handleSwipeMove}
                onDragEnd={handleSwipeEnd}
                animate={{ 
                  x: `${swipeProgress * 150}px`,
                  backgroundColor: swipeProgress > 0.8 ? "#f87a06" : "#e67f00" 
                }}
              >
                {isLoading ? (
                  <div className="spinner"></div>
                ) : (
                  <span className="swipe-arrow">→</span>
                )}
              </motion.div>
              
              <div className="track-fill" style={{ width: `${swipeProgress * 100}%` }}></div>
            </motion.div>
            
            <div className="tap-instruction">
             swipe or tap to connect
            </div>
          </div>
        </motion.div>
      </div>
      
      {/* Confirmation de tokens */}
      {showTokenConfirmation && (
        <div className="token-confirmation-overlay">
          <motion.div 
            className="token-confirmation-card"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="token-content">
              <h2 className="token-title">Tokens Received!</h2>
              <div className="token-icon-container">
                <img src={UmiToken} alt="UMI Token" className="token-icon" />
              </div>
              <p className="token-amount">{tokenAmount} UMI</p>
              <div className="token-description">
                {confirmedReferralCode ? (
                  <p>10 UMI welcome bonus + 20 UMI referral bonus</p>
                ) : (
                  <p>Welcome bonus for joining SocialID</p>
                )}
              </div>
              <div className="redirect-message">
                Redirecting to your dashboard...
              </div>
            </div>
          </motion.div>
        </div>
      )}
      
      <style jsx>{`
        /* Global styles to prevent scrolling */
        html, body {
          margin: 0;
          padding: 0;
          overflow: hidden !important;
          position: fixed;
          width: 100%;
          height: 100%;
        }

        .app-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          height: 100vh;
          width: 100vw;
          padding: 0;
          position: fixed;
          top: 0;
          left: 0;
          overflow: hidden;
          font-family: 'Segoe UI', 'Roboto', 'Helvetica Neue', sans-serif;
          margin: 0;
          box-sizing: border-box;
          background-color: #f4e9b7;
        }
        
        .content-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          height: 100%;
          width: 100%;
          padding: 20px;
        }
        
        .logo-container {
          display: flex;
          align-items: center;
          justify-content: center;
          flex: 1;
        }
        
        .logo {
          width: 300px;
          height: auto;
          object-fit: contain;
          transition: all 0.3s ease;
        }
        
        .connect-container {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding-bottom: 40px;
        }
        
        .connect-area {
          width: 100%;
          max-width: 240px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 12px;
          border-radius: 12px;
          background-color: rgba(255, 255, 255, 0.08);
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        .connect-area:hover {
          background-color: rgba(255, 255, 255, 0.15);
        }
        
        .swipe-instruction {
          font-size: 15px;
          font-weight: 500;
          color: #333;
          margin-bottom: 5px;
        }
        
        .swipe-track {
          position: relative;
          width: 100%;
          height: 40px;
          background-color: rgba(255, 255, 255, 0.2);
          border-radius: 20px;
          overflow: hidden;
        }
        
        .track-fill {
          position: absolute;
          height: 100%;
          background-color: rgba(248, 122, 6, 0.15);
          border-radius: 20px;
          transition: width 0.1s ease;
        }
        
        .swipe-thumb {
          position: absolute;
          width: 32px;
          height: 32px;
          border-radius: 16px;
          background-color: #f87a06;
          top: 4px;
          left: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
          z-index: 2;
          cursor: grab;
          user-select: none;
        }
        
        .swipe-thumb:active {
          cursor: grabbing;
        }
        
        .swipe-arrow {
          font-size: 18px;
        }
        
        .tap-instruction {
          font-size: 12px;
          color: #666;
          text-align: center;
          margin-top: 3px;
        }
        
        .error-message {
          width: 100%;
          max-width: 300px;
          padding: 12px;
          margin-bottom: 20px;
          text-align: center;
          color: #721c24;
          background-color: #f8d7da;
          border: 1px solid #f5c6cb;
          border-radius: 4px;
          font-size: 14px;
        }
        
        .spinner {
          width: 20px;
          height: 20px;
          border: 3px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          border-top-color: white;
          animation: spin 1s linear infinite;
        }
        
        /* Styles pour la confirmation de tokens */
        .token-confirmation-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }
        
        .token-confirmation-card {
          background-color: #f4e9b7;
          border-radius: 16px;
          padding: 20px;
          width: 90%;
          max-width: 320px;
          text-align: center;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
          border: 2px solid rgba(248, 122, 6, 0.3);
        }
        
        .token-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        
        .token-icon-container {
          margin: 10px auto 20px;
          width: 160px;
          height: 160px;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        
        .token-icon {
          width: 160px;
          height: 160px;
          object-fit: contain;
          filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
        }
        
        .token-title {
          margin: 0 0 5px;
          color: #303421;
          font-size: 26px;
          font-weight: bold;
        }
        
        .token-amount {
          margin: 5px 0 10px;
          color: #f87a06;
          font-size: 42px;
          font-weight: bold;
          text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.1);
        }
        
        .token-description {
          color: #303421;
          margin-bottom: 12px;
          font-weight: 500;
        }
        
        .redirect-message {
          color: #666;
          font-size: 14px;
          margin-top: 16px;
          font-style: italic;
        }
        
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        
        @media (max-width: 768px) {
          .logo {
            width: 220px;
          }
          
          .connect-area {
            max-width: 220px;
          }
          
          .swipe-instruction {
            font-size: 14px;
          }
          
          .swipe-track {
            height: 36px;
          }
          
          .swipe-thumb {
            width: 28px;
            height: 28px;
            border-radius: 14px;
          }
          
          .swipe-arrow {
            font-size: 16px;
          }
          
          .tap-instruction {
            font-size: 11px;
          }
          
          .error-message {
            max-width: 220px;
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  );
};

export default Home;