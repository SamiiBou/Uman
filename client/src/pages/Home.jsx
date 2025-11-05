import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { MiniKit, Permission } from "@worldcoin/minikit-js";
import head from './head.png';
import AskNotifPermission from './AskNotifPermission';
import useDebugNotifications from './useDebugNotifications';
import AdSenseAuto from '../components/AdSenseAuto';
import { BACKEND_URL } from '../config';

const API_TIMEOUT = 15000;

async function requestNotificationPermission() {
  console.log('[notifications] requestNotificationPermission called');
  try {
    const payload = await MiniKit.commandsAsync.requestPermission({
      permission: Permission.Notifications,
    });
    console.log('[notifications] requestPermission payload:', payload);
    if (payload.status === 'success') {
      console.log('[notifications] Permission granted');
      return true;
    }
    console.warn('[notifications] Permission not granted, error code:', payload.error_code);
  } catch (err) {
    console.error('[notifications] Error in requestPermission():', err);
  }
  return false;
}

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



  useEffect(() => {
    const initMiniKitAndPermissions = async () => {
      // Initialisation existante
      await new Promise(resolve => setTimeout(resolve, 5000));
      setMiniKitInitialized(true);

      // Ne demander la permission que si l'utilisateur ne l'a pas déjà accordée
      const stored = localStorage.getItem('notification_permission_granted');
      if (stored !== 'true' && MiniKit.isInstalled()) {
        const granted = await requestNotificationPermission();
        if (granted) {
          localStorage.setItem('notification_permission_granted', 'true');
        } else {
          localStorage.setItem('notification_permission_granted', 'false');
        }
      }
    };

    initMiniKitAndPermissions();

    // Disable scrolling
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, []);

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
      
      // Rediriger immédiatement
      setTimeout(() => {
        navigate("/social-connect");
      }, 500);
      
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

        // Rediriger immédiatement
        setTimeout(() => {
          navigate("/social-connect");
        }, 500);
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

  useDebugNotifications();

  return (
    <div className="app-container">
      <AskNotifPermission />
      <div className="content-container">
        <div className="logo-container">
          <img src={head} alt="Logo" className="logo" />
        </div>
        
        {/* AdSense Banner */}
        <div className="ad-container">
          <AdSenseAuto 
            slot="YOUR_AD_SLOT_ID"
            className="mx-auto my-4"
            style={{ maxWidth: '320px' }}
          />
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
          
          {/* Referral code field (redesigned) */}
          <div className="referral-container">
            <input
              type="text"
              placeholder="Referral Code (optional)"
              value={referralCode}
              onChange={e => {
                setReferralCode(e.target.value);
                setIsReferralValid(false);
                setReferralError('');
              }}
              className="referral-input"
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
              className="validate-button"
            >
              Validate
            </button>
          </div>
          
          {isReferralValid && (
            <div className="referral-success">
              <span className="success-icon">✓</span>
              Code "{confirmedReferralCode}" confirmed
            </div>
          )}
          
          {referralError && (
            <div className="referral-error">
              <span className="error-icon">!</span>
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
        
        .ad-container {
          width: 100%;
          display: flex;
          justify-content: center;
          padding: 10px 0;
          margin: 10px 0;
        }
        
        .connect-container {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding-bottom: 40px;
        }
        
        /* New referral container styles */
        .referral-container {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 15px 0;
          width: 100%;
          max-width: 300px;
          position: relative;
          transition: all 0.3s ease;
          animation: fadeIn 0.6s ease-out;
        }
        
        .referral-input {
          flex: 1;
          padding: 10px 12px;
          border-radius: 10px;
          border: 1px solid rgba(242, 128, 17, 0.3);
          background-color: rgba(255, 255, 255, 0.5);
          font-size: 14px;
          color: #303421;
          transition: all 0.3s ease;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
        }
        
        .referral-input:focus {
          outline: none;
          border-color: #f28011;
          box-shadow: 0 4px 8px rgba(242, 128, 17, 0.2);
          transform: translateY(-1px);
        }
        
        .referral-input::placeholder {
          color: rgba(48, 52, 33, 0.6);
        }
        
        .validate-button {
          padding: 10px 14px;
          border-radius: 10px;
          background-color: transparent;
          color: #f28011;
          font-size: 14px;
          font-weight: 500;
          border: 1px solid #f28011;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
          box-shadow: none;
        }
        
        .validate-button:hover {
          background-color: rgba(242, 128, 17, 0.1);
          transform: translateY(-2px);
        }
        
        .validate-button:active {
          transform: translateY(0);
        }
        
        .referral-success {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #2ea043;
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 12px;
          padding: 8px 12px;
          background-color: rgba(46, 160, 67, 0.1);
          border-radius: 8px;
          border: 1px solid rgba(46, 160, 67, 0.2);
          animation: slideIn 0.3s ease-out;
          max-width: 300px;
        }
        
        .referral-error {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #f85149;
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 12px;
          padding: 8px 12px;
          background-color: rgba(248, 81, 73, 0.1);
          border-radius: 8px;
          border: 1px solid rgba(248, 81, 73, 0.2);
          animation: slideIn 0.3s ease-out;
          max-width: 300px;
        }
        
        .success-icon, .error-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          flex-shrink: 0;
          font-size: 12px;
          font-weight: bold;
        }
        
        .success-icon {
          background-color: rgba(46, 160, 67, 0.2);
          color: #2ea043;
        }
        
        .error-icon {
          background-color: rgba(248, 81, 73, 0.2);
          color: #f85149;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-10px); }
          to { opacity: 1; transform: translateX(0); }
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
        
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        
        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
          .referral-input {
            background-color: rgba(255, 255, 255, 0.1);
            border-color: rgba(242, 128, 17, 0.4);
            color: #ecd9b4;
          }
          
          .referral-input::placeholder {
            color: rgba(236, 217, 180, 0.6);
          }
          
          .validate-button {
            color: #f28011;
            border-color: #f28011;
          }
          
          .validate-button:hover {
            background-color: rgba(242, 128, 17, 0.15);
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