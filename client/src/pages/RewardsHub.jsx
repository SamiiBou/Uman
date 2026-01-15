import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Award, Info, Gift, Shield, User, Check, RefreshCw, Copy, Clock, Coins } from "lucide-react";
import axios from "axios";
import { ethers, BrowserProvider, Contract, formatUnits } from 'ethers';
import { FaTwitter, FaTelegramPlane, FaDiscord } from 'react-icons/fa';
import { MiniKit } from "@worldcoin/minikit-js";
import distributorAbi from '../abi/Distributor.json';
import { encodeVoucher } from '../utils/encodeVoucher';

const FaX = () => (
  <svg
    width="1.05em"
    height="1.05em"
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    style={{ marginTop: '0%' }}
  >
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

import { API_BASE_URL, BACKEND_URL } from '../config';

// Token contract details (copied from ConnectAccounts)
const API_TIMEOUT = 15000;
const TOKEN_CONTRACT_ADDRESS = import.meta.env.VITE_TOKEN_CONTRACT_ADDRESS || '0x41Da2F787e0122E2e6A72fEa5d3a4e84263511a8';

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)"
];

const RewardsHub = () => {
  // Replace mock states with real data states
  const [umiBalance, setUmiBalance] = useState(0); // claimable
  const [walletBalance, setWalletBalance] = useState(null); // on-chain
  const [currentStreak, setCurrentStreak] = useState(null); const [maxStreak, setMaxStreak] = useState(null);
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

  // PRISM Daily Reward state
  const [prismRewardStatus, setPrismRewardStatus] = useState({
    canClaim: true,
    hoursLeft: 0,
    minutesLeft: 0,
    loading: false
  });

  // PRISM 5-Star Review Challenge state
  const [reviewChallengeStatus, setReviewChallengeStatus] = useState({
    participantCount: 0,
    maxParticipants: 100,
    spotsRemaining: 100,
    isChallengeOpen: true,
    hasParticipated: false,
    loading: true
  });

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

  /// Fonction pour réclamer des tokens - mise à jour
  const claimTokens = async () => {
    setIsLoading(true);
    setNotification({ show: true, message: "Preparing claim…", type: "info" });

    /* ─────────────────────────────
     * 0. Pré-vérifications
     * ────────────────────────────*/
    const storedWalletAddress = localStorage.getItem("walletAddress");
    if (!storedWalletAddress) {
      setNotification({ show: true, message: "Connect wallet first", type: "error" });
      setIsLoading(false);
      return;
    }
    if (!MiniKit.isInstalled()) {
      setNotification({ show: true, message: "World App / MiniKit not detected", type: "error" });
      setIsLoading(false);
      return;
    }

    /* ─────────────────────────────
     * 1. Récupération du voucher
     * ────────────────────────────*/
    const postVoucher = () =>
      axios.post(
        `${API_BASE_URL}/airdrop/request`,
        {},
        {
          withCredentials: true,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          timeout: API_TIMEOUT,
          validateStatus: () => true, // on gère nous-mêmes les codes ≠200
        }
      );

    let res = await postVoucher();
    let { data } = res;

    // Cas particulier : “claim already pending…”
    if (data.error?.startsWith("Claim already pending")) {
      const pendingNonce = data.pending?.nonce;
      if (!pendingNonce) {
        setNotification({
          show: true,
          message: "Claim pending but backend did not return a nonce",
          type: "error",
        });
        setIsLoading(false);
        return;
      }
      await axios.post(
        `${API_BASE_URL}/airdrop/cancel`,
        { nonce: pendingNonce },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      res = await postVoucher();
      data = res.data;
    }

    /* ─────────────────────────────
     * 2. Validation stricte de la réponse
     * ────────────────────────────*/
    if (res.status !== 200 || !data?.voucher) {
      const msg = data?.error ?? `Unexpected status ${res.status}`;
      setNotification({ show: true, message: msg, type: "error" });
      setIsLoading(false);
      return;
    }

    const { voucher, signature, claimedAmount } = data;

    /* ─────────────────────────────
     * 3. Construction des arguments
     * ────────────────────────────*/
    let voucherArgs;
    try {
      voucherArgs = encodeVoucher(voucher);
    } catch (err) {
      // erreur « voucher manquant » ou structure invalide
      setNotification({ show: true, message: err.message, type: "error" });
      setIsLoading(false);
      return;
    }

    /* ─────────────────────────────
     * 4. Envoi de la transaction
     * ────────────────────────────*/
    try {
      const { finalPayload } = await MiniKit.commandsAsync.sendTransaction({
        transaction: [
          {
            address: "0x36a4E57057f9EE65d5b26bfF883b62Ad47D4B775",
            abi: distributorAbi,
            functionName: "claim",
            args: [voucherArgs, signature],
          },
        ],
      });

      if (finalPayload.status === "error") {
        await axios.post(
          `${API_BASE_URL}/airdrop/cancel`,
          { nonce: voucher.nonce },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        throw new Error(finalPayload.message ?? "User rejected");
      }

      /* ─────────────────────────
       * 5. Confirmation serveur
       * ────────────────────────*/
      const txId = finalPayload.transaction_id;
      let attempts = 0;
      for (; ;) {
        attempts += 1;
        const resp = await axios.post(
          `${API_BASE_URL}/airdrop/confirm`,
          { nonce: voucher.nonce, transaction_id: txId },
          { headers: { Authorization: `Bearer ${token}` }, validateStatus: () => true }
        );

        if (resp.status === 200 && resp.data.ok) break;

        if (resp.status === 202 && resp.data.status === "pending") {
          console.log(`[confirm] pending – retry in 5 s (try #${attempts})`);
          await new Promise((r) => setTimeout(r, 5000));
          continue;
        }
        throw new Error(resp.data.error || `Confirm failed (status ${resp.status})`);
      }

      /* ─────────────────────────
       * 6. Mise à jour UI
       * ────────────────────────*/
      setNotification({
        show: true,
        message: `✅ ${claimedAmount} UMI on the way!`,
        type: "success",
      });
      setUmiBalance(0);
      setTimeout(async () => {
        const onChain = await fetchTokenBalance();
        if (onChain !== null) setWalletBalance(onChain);
      }, 6000);
    } catch (err) {
      setNotification({ show: true, message: err.message ?? "Claim failed", type: "error" });
    } finally {
      setIsLoading(false);
      setTimeout(() => setNotification({ show: false, message: "", type: "info" }), 5000);
    }
  };



  // Fonction pour ouvrir le groupe Telegram
  const openTelegramGroup = () => {
    window.open('https://t.me/+W3pxAJb4yNk5MWM0', '_blank');
  };

  // Fonction pour ouvrir le profil X
  const openXProfile = () => {
    window.open('https://x.com/umantheapp', '_blank');
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
              setUmiBalance(parseFloat(data.tokenBalance));
            } else {
              setUmiBalance(0);          // rien à claim
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
              console.log("Twitter vérifié:", data.socialVerifications.twitter?.verified || false);
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

  // Fetch PRISM reward status when token is available
  useEffect(() => {
    if (token) {
      axios.get(`${API_BASE_URL}/users/prism-reward-status`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(({ data }) => {
          if (data.success) {
            setPrismRewardStatus({
              canClaim: data.canClaim,
              hoursLeft: data.hoursLeft || 0,
              minutesLeft: data.minutesLeft || 0,
              loading: false
            });
          }
        })
        .catch(err => console.error('[PRISM] Error fetching status:', err));
    }
  }, [token]);

  // Fetch PRISM 5-Star Review Challenge status
  useEffect(() => {
    const fetchChallengeStatus = async () => {
      try {
        // Fetch global challenge status (public endpoint)
        const statusRes = await axios.get(`${API_BASE_URL}/users/prism-review-challenge-status`);

        if (statusRes.data.success) {
          setReviewChallengeStatus(prev => ({
            ...prev,
            participantCount: statusRes.data.participantCount,
            maxParticipants: statusRes.data.maxParticipants,
            spotsRemaining: statusRes.data.spotsRemaining,
            isChallengeOpen: statusRes.data.isChallengeOpen,
            loading: false
          }));
        }
      } catch (err) {
        console.error('[PRISM Review Challenge] Error fetching status:', err);
        setReviewChallengeStatus(prev => ({ ...prev, loading: false }));
      }
    };

    fetchChallengeStatus();
  }, []);

  // Check if current user has already participated in review challenge
  useEffect(() => {
    if (token && userId) {
      // We check by trying to call participate - if already participated, we get that info
      // Or we could add a dedicated endpoint. For now, we'll check via auth/me if the field exists
      axios.get(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(({ data }) => {
          if (data.prismReviewChallenge?.participated) {
            setReviewChallengeStatus(prev => ({ ...prev, hasParticipated: true }));
          }
        })
        .catch(err => console.error('[PRISM Review] Error checking participation:', err));
    }
  }, [token, userId]);


  // ➜ charge la balance on-chain au premier rendu ET à chaque changement d’adresse
  useEffect(() => {
    (async () => {
      if (!walletAddress) return;
      const chainBal = await fetchTokenBalance(walletAddress);
      if (chainBal !== null) setWalletBalance(chainBal);
    })();
  }, [walletAddress]);


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

  /**
 * Récupère le solde on-chain du token UMI pour l’adresse passée
 * 1️⃣ on essaye via l’endpoint backend /users/token-balance
 * 2️⃣ si le backend n’est pas dispo, fallback direct on-chain avec ethers + MiniKit/Metamask
 */
  const fetchTokenBalance = async (address = walletAddress) => {
    try {
      if (!address) return null;

      // ---- Méthode 1 : appel API (public, accepte ou non le JWT) ----
      const apiRes = await axios.get(
        `${API_BASE_URL}/users/token-balance/${address}`,
        token ? { headers: { Authorization: `Bearer ${token}` } } : {}
      );

      if (apiRes?.data?.status === 'success') {
        return parseFloat(apiRes.data.balance);
      }

      // ---- Méthode 2 : lecture direct on-chain ----
      // MiniKit injecte un provider EIP-1193 compatible (<window.ethereum> ou <MiniKit.ethereum>)
      const injected = window?.MiniKit?.ethereum || window.ethereum;
      const provider = injected
        ? new BrowserProvider(injected)          // ethers v6
        : ethers.getDefaultProvider();           // public fallback (faible quota)

      const contract = new Contract(TOKEN_CONTRACT_ADDRESS, ERC20_ABI, provider);

      const [rawBalance, decimals] = await Promise.all([
        contract.balanceOf(address),
        contract.decimals()
      ]);

      return parseFloat(formatUnits(rawBalance, decimals));
    } catch (err) {
      console.error('❌ Erreur balance UMI :', err);
      return null;
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

    const bal = await fetchTokenBalance();
    if (bal !== null) {
      setWalletBalance(bal);
      setNotification({ show: true, message: `Balance updated: ${bal.toFixed(2)} UMI`, type: 'success' });
    } else {
      setNotification({ show: true, message: 'Failed to refresh balance', type: 'error' });
    }

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
        {/* Top Navigation - Redesigned */}
        <header>
          <div className="top-nav">
            <div className="balance-display">
              <div className="balance-text">
                <span className="balance-label">Balance:</span>
                <span className="balance-value">
                  {isLoading ? 'Loading…' :
                    walletBalance !== null ? `${walletBalance.toFixed(2)} UMI` : 'N/A'}
                </span>
              </div>
            </div>

            {/* Social Links moved to top right */}
            <div className="social-links">
              {/* Telegram button */}
              <div className="social-btn telegram-btn" onClick={openTelegramGroup}>
                <FaTelegramPlane size={18} />
                <span>Join Us</span>
              </div>

              {/* X button */}
              <div className="social-btn x-btn" onClick={openXProfile}>
                <FaX />
                <span>Join Us</span>
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
              <span className="social-badge telegram-badge">
                <FaTelegramPlane /> Telegram
              </span>
            )}

            {socialVerifications.discord?.verified && (
              <span className="social-badge discord-badge">
                <FaDiscord /> Discord
              </span>
            )}
            {socialVerifications.twitter?.verified && (
              <span className="social-badge twitter-badge">
                <FaX />
              </span>
            )}
          </div>
        </div>

        {/* AUTO DISTRIBUTION INFO - TEXT ONLY */}
        <div className="auto-distribution-text">
          <p className="auto-dist-message">
            <Clock size={14} />
            <span>Limited time: 0.5 UMI auto distributed every 2 hours to all users</span>
          </p>
        </div>

        {/* PRISM Daily Reward Card - More Compact */}
        <div className="prism-reward-card compact">
          <div className="prism-reward-content">
            <div className="prism-reward-icon small">
              <Coins size={20} />
            </div>
            <div className="prism-reward-text">
              <h4>Daily Bonus: +100 UMI</h4>
              <p>Open PRISM app and trade to receive 100 UMI</p>
            </div>
            <button
              className={`prism-claim-btn ${!prismRewardStatus.canClaim ? 'disabled' : ''}`}
              onClick={async () => {
                if (!prismRewardStatus.canClaim || prismRewardStatus.loading) return;
                setPrismRewardStatus(prev => ({ ...prev, loading: true, canClaim: false }));
                window.open('https://world.org/mini-app?app_id=app_df74242b069963d3e417258717ab60e7', '_blank');
                try {
                  const response = await axios.post(
                    `${API_BASE_URL}/users/claim-prism-reward`,
                    {},
                    { headers: token ? { Authorization: `Bearer ${token}` } : {} }
                  );
                  if (response.data.success) {
                    setNotification({ show: true, message: `🎉 ${response.data.message}`, type: 'success' });
                    setPrismRewardStatus({ canClaim: false, hoursLeft: 23, minutesLeft: 59, loading: false });
                  } else {
                    setNotification({ show: true, message: response.data.message || 'Reward claimed!', type: 'info' });
                    setPrismRewardStatus(prev => ({ ...prev, loading: false, canClaim: false }));
                  }
                } catch (err) {
                  const errData = err.response?.data;
                  if (errData?.alreadyClaimed) {
                    setPrismRewardStatus({ canClaim: false, hoursLeft: errData.hoursLeft || 0, minutesLeft: errData.minutesLeft || 0, loading: false });
                    setNotification({ show: true, message: `Already claimed! Next in ${errData.hoursLeft}h ${errData.minutesLeft}m`, type: 'info' });
                  } else {
                    setNotification({ show: true, message: errData?.message || 'Error claiming reward.', type: 'error' });
                    setPrismRewardStatus(prev => ({ ...prev, loading: false, canClaim: true }));
                  }
                }
                setTimeout(() => setNotification({ show: false, message: '', type: 'info' }), 4000);
              }}
              disabled={!prismRewardStatus.canClaim || prismRewardStatus.loading}
            >
              {prismRewardStatus.loading ? 'Claiming...' : prismRewardStatus.canClaim ? 'Open PRISM & Claim' : `${prismRewardStatus.hoursLeft}h ${prismRewardStatus.minutesLeft}m`}
            </button>
          </div>
        </div>

        {/* PRISM 5-Star Review Challenge - Compact Version at Top */}
        <div className="prism-review-challenge-compact">
          <div className="challenge-compact-content">
            <div className="challenge-compact-left">
              <div className="challenge-compact-icon">
                <Award size={18} />
              </div>
              <div className="challenge-compact-text">
                <span className="challenge-compact-title">⭐ Rate PRISM 5 Stars → Get <strong>0.2 WLD</strong></span>
                <div className="challenge-compact-counter">
                  <span>{reviewChallengeStatus.spotsRemaining} spots left</span>
                </div>
              </div>
            </div>
            <button
              className={`challenge-compact-btn ${!reviewChallengeStatus.isChallengeOpen || reviewChallengeStatus.hasParticipated ? 'disabled' : ''}`}
              onClick={async () => {
                if (!reviewChallengeStatus.isChallengeOpen) {
                  setNotification({ show: true, message: 'Challenge closed! Maximum participants reached.', type: 'info' });
                  return;
                }
                if (reviewChallengeStatus.hasParticipated) {
                  window.open('https://world.org/mini-app?app_id=app_df74242b069963d3e417258717ab60e7', '_blank');
                  return;
                }
                try {
                  const response = await axios.post(
                    `${API_BASE_URL}/users/participate-prism-review`,
                    {},
                    { headers: token ? { Authorization: `Bearer ${token}` } : {} }
                  );
                  if (response.data.success) {
                    setNotification({ show: true, message: `🎉 Registered! You are #${response.data.participantNumber}. Rate 5 stars and send screenshot to support!`, type: 'success' });
                    setReviewChallengeStatus(prev => ({ ...prev, participantCount: response.data.participantNumber, spotsRemaining: response.data.spotsRemaining, hasParticipated: true, isChallengeOpen: response.data.spotsRemaining > 0 }));
                  }
                } catch (err) {
                  if (err.response?.data?.alreadyParticipated) {
                    setNotification({ show: true, message: 'You have already participated!', type: 'info' });
                    setReviewChallengeStatus(prev => ({ ...prev, hasParticipated: true }));
                  } else if (err.response?.data?.challengeClosed) {
                    setNotification({ show: true, message: 'Challenge closed! 100 spots filled.', type: 'info' });
                  } else {
                    setNotification({ show: true, message: err.response?.data?.message || 'Error participating', type: 'error' });
                  }
                }
                window.open('https://world.org/mini-app?app_id=app_df74242b069963d3e417258717ab60e7', '_blank');
              }}
              disabled={!reviewChallengeStatus.isChallengeOpen && !reviewChallengeStatus.hasParticipated}
            >
              {!reviewChallengeStatus.isChallengeOpen ? 'Closed' : reviewChallengeStatus.hasParticipated ? 'Open App' : 'Participate'}
            </button>
          </div>
        </div>

        {/* STREAK CONTAINER */}
        <div className="streak-container">
          <div className="streak-card">
            <div className="streak-header">
              <span className="streak-title">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="14" height="14" className="fire-icon">
                  <path d="M12 23c-4.9 0-9-4.1-9-9 0-3.5 1.5-6 4.4-8.6.3-.3.7-.4 1-.2.3.2.5.5.5.9 0 1.2.5 2.3 1.4 3 .2.2.5.2.8.1.2-.1.4-.4.4-.7V4c0-1.1.9-2 2-2h.5c3.9.6 6.9 4 6.9 8 0 1.7-1.3 3-3 3h-1.8c-.8 0-1.6.4-2.2 1s-.7 1.4-.6 2.2c.2 1.5 1.4 2.5 3 2.5.8 0 1.6-.4 2.1-1.1.8-1.2 2.4-1.5 3.5-.6.5.4.8 1 .8 1.6 0 3.3-3.8 6-9.2 6zm2.5-10.5c0 .3-.2.5-.5.5h-4c-.3 0-.5-.2-.5-.5s.2-.5.5-.5h4c.3 0 .5.2.5.5z" />
                </svg>
                Daily Login
              </span>
              <div className="streak-info">
                {isLoading ? (
                  <span className="streak-value">Loading...</span>
                ) : (
                  <>
                    {currentStreak !== null && (
                      <div className="streak-badge" title="Current streak">
                        <span className="streak-multiplier">x{currentStreak}</span>
                      </div>
                    )}
                    <span className="streak-value">
                      Day {currentStreak || 0}
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

              {/* Live token earnings counter */}
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

            {/* Ajout du message d'encouragement pour le streak - version minimaliste */}
            {!isLoading && currentStreak !== null && (
              <div className="streak-message">
                {currentStreak < 5 ? (
                  <span>Come back tomorrow for <span className="highlight">x{currentStreak + 1}</span> more tokens</span>
                ) : (
                  <span>Come back tomorrow to maintain streak</span>
                )}
              </div>
            )}
          </div>
        </div>


        {/* Claim Button - Moved below daily login and redesigned to be more minimalist */}

        {/* Claim Button - More visible while maintaining minimalism */}
        <div className="claim-container">
          <button
            className="claim-button"
            disabled={isLoading || !umiBalance}
            onClick={claimTokens}
          >
            {isLoading ? (
              <span className="claim-text">Loading...</span>
            ) : !umiBalance ? (
              <span className="claim-text">No more UMI to grab</span>
            ) : (
              <div className="claim-content">
                <span className="claim-text">Grab</span>
                <span className="claim-amount">{parseFloat(umiBalance).toFixed(2)} earned UMI</span>
              </div>
            )}
          </button>
        </div>

        {/* REFERRAL CODE SECTION - MINIMALIST */}
        <div className="referral-section">
          <div className="referral-card">
            <div className="referral-content">
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

        {/* CHALLENGES SECTION - PRISM 5-Star Review Challenge */}
        <div className="challenges-section">
          <div className="section-header">
            <h3>Daily Challenges</h3>
          </div>

          <div className="challenge-card prism-review-challenge">
            <div className="challenge-header">
              <div className="challenge-icon">
                <Award size={24} />
              </div>
              <div className="challenge-badge limited">
                <span>Limited to 1100 first users!</span>
              </div>
            </div>

            <div className="challenge-content">
              <h4 className="challenge-title">⭐ Rate PRISM 5 Stars</h4>
              <p className="challenge-description">
                Put a 5-star review on PRISM app and send screenshot to our support team to receive <strong>0.2 WLD</strong>
              </p>

              <div className="challenge-counter">
                <div className="counter-bar">
                  <div
                    className="counter-fill"
                    style={{ width: `${(reviewChallengeStatus.participantCount / 1100) * 100}%` }}
                  ></div>
                </div>
                <span className="counter-text">
                  {reviewChallengeStatus.participantCount}/1100 participants
                </span>
              </div>
            </div>

            <button
              className={`challenge-btn ${!reviewChallengeStatus.isChallengeOpen || reviewChallengeStatus.hasParticipated ? 'disabled' : ''}`}
              onClick={async () => {
                if (!reviewChallengeStatus.isChallengeOpen) {
                  setNotification({ show: true, message: 'Challenge is closed! Maximum participants reached.', type: 'info' });
                  return;
                }

                if (reviewChallengeStatus.hasParticipated) {
                  window.open('https://world.org/mini-app?app_id=app_df74242b069963d3e417258717ab60e7', '_blank');
                  return;
                }

                try {
                  const response = await axios.post(
                    `${API_BASE_URL}/users/participate-prism-review`,
                    {},
                    { headers: token ? { Authorization: `Bearer ${token}` } : {} }
                  );

                  if (response.data.success) {
                    setNotification({
                      show: true,
                      message: `🎉 Registered! You are participant #${response.data.participantNumber}. Rate 5 stars and send screenshot to support!`,
                      type: 'success'
                    });
                    setReviewChallengeStatus(prev => ({
                      ...prev,
                      participantCount: response.data.participantNumber,
                      spotsRemaining: response.data.spotsRemaining,
                      hasParticipated: true,
                      isChallengeOpen: response.data.spotsRemaining > 0
                    }));
                  }
                } catch (err) {
                  if (err.response?.data?.alreadyParticipated) {
                    setNotification({ show: true, message: 'You have already participated!', type: 'info' });
                    setReviewChallengeStatus(prev => ({ ...prev, hasParticipated: true }));
                  } else if (err.response?.data?.challengeClosed) {
                    setNotification({ show: true, message: 'Challenge closed! 100 spots filled.', type: 'info' });
                  } else {
                    setNotification({ show: true, message: err.response?.data?.message || 'Error participating', type: 'error' });
                  }
                }

                window.open('https://world.org/mini-app?app_id=app_df74242b069963d3e417258717ab60e7', '_blank');
              }}
              disabled={!reviewChallengeStatus.isChallengeOpen && !reviewChallengeStatus.hasParticipated}
            >
              {!reviewChallengeStatus.isChallengeOpen ? (
                <span>Challenge Closed</span>
              ) : reviewChallengeStatus.hasParticipated ? (
                <span>Open PRISM App</span>
              ) : (
                <span>Participate & Rate ⭐</span>
              )}
            </button>
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
          width: 100%;
          max-width: 400px;
          margin: 0 auto;
          padding: 1rem 1rem 4rem 1rem;
        }
        
        /* REDESIGNED: Top Navigation with social links in top right */
        .top-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1.5rem;
          height: 48px;
        }
        
        /* Balance display - minimalist */
        .balance-display {
          display: flex;
          align-items: center;
          background-color: rgba(241, 100, 3, 0.08);
          border: 1px solid rgba(241, 100, 3, 0.15);
          border-radius: 6px;
          padding: 0.25rem 0.5rem;
          transition: all 0.2s ease;
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
        }
        
        /* Social links - moved to top right */
        .social-links {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .social-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          border-radius: 6px;
          padding: 0.25rem 0.5rem;
          cursor: pointer;
          transition: all 0.2s;
          font-weight: 500;
        }
        
        .social-btn span {
          font-size: 0.8rem;
          line-height: 1;
        }
        
        .telegram-btn {
          background-color: rgba(0, 136, 204, 0.08);
          border: 1px solid rgba(0, 136, 204, 0.2);
          color: #0088cc;
        }
        
        .telegram-btn:hover {
          background-color: rgba(0, 136, 204, 0.15);
          transform: translateY(-1px);
        }
        
        .x-btn {
          background-color: rgba(0, 0, 0, 0.05);
          border: 1px solid rgba(0, 0, 0, 0.15);
          color: #000000;
        }
        
        .x-btn:hover {
          background-color: rgba(0, 0, 0, 0.1);
          transform: translateY(-1px);
        }
        
        /* Profile container */
        .profile-container {
          margin-bottom: 1.5rem;
          width: 100%;
          animation: fadeIn 0.6s ease-out;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.8rem;
          padding: 0.5rem 0;
        }
        
        .profile-image-container {
          width: 90px;
          height: 90px;
          border-radius: 50%;
          overflow: hidden;
          border: 2px solid #f28011;
          box-shadow: 0 4px 12px rgba(241, 100, 3, 0.2);
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
        
        .profile-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          justify-content: center;
        }
        
        .profile-username {
          font-size: 1.2rem;
          font-weight: 600;
          color: #303421;
          margin: 0;
          text-align: center;
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
        }
        
        .human-badge span {
          line-height: 1;
        }
        
        /* Social verification badges */
        .social-badges {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 0.5rem;
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
        
        .telegram-badge {
          background-color: rgba(0, 136, 255, 0.1);
          color: #0088CC;
          border: 1px solid rgba(0, 136, 255, 0.2);
        }
        
        .discord-badge {
          background-color: rgba(88, 101, 242, 0.1);
          color: #5865F2;
          border: 1px solid rgba(88, 101, 242, 0.2);
        }
        
        .twitter-badge {
          background-color: rgba(0, 0, 0, 0.1);
          color: black;
          border: 1px solid rgba(0, 0, 0, 0.2);
        }
        
        /* NEW MINIMALIST CLAIM BUTTON */
        .minimalist-claim-container {
          display: flex;
          justify-content: center;
          width: 100%;
          margin-bottom: 1.5rem;
          padding: 0;
        }
        
        .minimalist-claim-button {
          background-color: rgba(241, 100, 3, 0.08);
          color: #f16403;
          border: 1px solid rgba(241, 100, 3, 0.2);
          border-radius: 8px;
          padding: 0.6rem 1rem;
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .minimalist-claim-content {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        
        .minimalist-claim-button:hover {
          background-color: rgba(241, 100, 3, 0.12);
        }
        
        .minimalist-claim-button:active {
          background-color: rgba(241, 100, 3, 0.15);
        }
        
        .minimalist-claim-button:disabled {
          background-color: rgba(0, 0, 0, 0.04);
          border-color: rgba(0, 0, 0, 0.08);
          color: rgba(0, 0, 0, 0.3);
          cursor: not-allowed;
        }
        
        .minimalist-claim-icon {
          color: #f16403;
        }
        
        .minimalist-claim-text {
          font-weight: 500;
        }
        
        /* AUTO DISTRIBUTION INFO - TEXT ONLY */
        .auto-distribution-text {
          margin-bottom: 1rem;
          width: 100%;
          text-align: center;
        }
        
        .auto-dist-message {
          font-size: 0.8rem;
          color: #f28011;
          font-weight: 500;
          margin: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          opacity: 0.9;
        }
        
        .auto-dist-message svg {
          color: #f28011;
          opacity: 0.8;
        }

        /* STREAK CONTAINER - MINIMALIST */
        .streak-container {
          margin-bottom: 1rem;
          width: 100%;
        }
        
        .streak-card {
          background: rgba(241, 100, 3, 0.03);
          border-radius: 12px;
          padding: 1rem;
          border: 1px solid rgba(241, 100, 3, 0.1);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
        }
        
        .streak-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.5rem;
          align-items: center;
        }
        
        .streak-title {
          font-size: 0.85rem;
          font-weight: 500;
          color: #303421;
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }
        
        .streak-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .streak-badge {
          background: rgba(241, 100, 3, 0.6);
          border-radius: 6px;
          padding: 0.15rem 0.4rem;
          display: inline-flex;
          align-items: center;
          box-shadow: 0 2px 5px rgba(241, 100, 3, 0.3);
          position: relative;
          overflow: hidden;
        }
        
        .streak-multiplier {
          color: white;
          font-weight: 600;
          font-size: 0.75rem;
          position: relative;
          z-index: 2;
          text-shadow: 0 1px 1px rgba(0,0,0,0.2);
        }
        
        .streak-value {
          font-size: 0.8rem;
          color: #f28011;
          font-weight: 500;
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
        
        /* Earnings display */
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
        }
        
        .earnings-value {
          display: flex;
          align-items: baseline;
          gap: 0.2rem;
        }
        
        .earnings-number {
          font-size: 1.2rem;
          font-weight: 700;
          color: #f16403;
        }
        
        .earnings-currency {
          font-size: 0.85rem;
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
          width: 6px;
          height: 6px;
          background-color: #f16403;
          border-radius: 50%;
          animation: pulse-dot 1.5s infinite;
        }
        
        @keyframes pulse-dot {
          0% { transform: scale(0.7); opacity: 0.5; }
          50% { transform: scale(1); opacity: 1; }
          100% { transform: scale(0.7); opacity: 0.5; }
        }
        
        /* REFERRAL SECTION - MINIMALIST */
        .referral-section {
          margin-bottom: 1.5rem;
          width: 100%;
        }
        
        .referral-card {
          background: rgba(241, 100, 3, 0.03);
          border-radius: 12px;
          padding: 0.75rem 1rem;
          border: 1px solid rgba(241, 100, 3, 0.1);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
        }
        
        .referral-content {
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
        
        /* CHALLENGES SECTION - MINIMALIST */
        .challenges-section {
          width: 100%;
          background: rgba(241, 100, 3, 0.03);
          border-radius: 12px;
          border: 1px solid rgba(241, 100, 3, 0.1);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
          margin-bottom: 1.5rem;
          overflow: hidden;
        }
        
        .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1rem;
          border-bottom: 1px solid rgba(241, 100, 3, 0.1);
        }
        
        .section-header h3 {
          font-size: 0.9rem;
          font-weight: 500;
          color: #303421;
        }
        
        .coming-soon-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem 1rem;
          text-align: center;
        }
        
        .coming-soon-icon {
          color: #f28011;
          margin-bottom: 0.75rem;
          opacity: 0.8;
        }
        
        .coming-soon-title {
          font-size: 1.1rem;
          font-weight: 600;
          color: #303421;
          margin-bottom: 0.3rem;
        }
        
        .coming-soon-text {
          font-size: 0.9rem;
          color: rgba(48, 52, 33, 0.7);
        }

        /* PRISM 5-Star Review Challenge Card */
        .challenge-card {
          padding: 1rem;
          background: linear-gradient(135deg, rgba(255, 215, 0, 0.08) 0%, rgba(241, 100, 3, 0.06) 100%);
        }
        
        .challenge-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.75rem;
        }
        
        .challenge-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: linear-gradient(135deg, #FFD700 0%, #f28011 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }
        
        .challenge-badge.limited {
          background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
          color: white;
          padding: 0.25rem 0.6rem;
          border-radius: 12px;
          font-size: 0.7rem;
          font-weight: 600;
          animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.9; transform: scale(1.02); }
        }
        
        .challenge-content {
          margin-bottom: 1rem;
        }
        
        .challenge-title {
          font-size: 1rem;
          font-weight: 600;
          color: #303421;
          margin-bottom: 0.4rem;
        }
        
        .challenge-description {
          font-size: 0.85rem;
          color: rgba(48, 52, 33, 0.75);
          line-height: 1.4;
          margin-bottom: 0.75rem;
        }
        
        .challenge-description strong {
          color: #f28011;
          font-weight: 600;
        }
        
        .challenge-counter {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }
        
        .counter-bar {
          width: 100%;
          height: 8px;
          background: rgba(48, 52, 33, 0.1);
          border-radius: 4px;
          overflow: hidden;
        }
        
        .counter-fill {
          height: 100%;
          background: linear-gradient(90deg, #f28011 0%, #FFD700 100%);
          border-radius: 4px;
          transition: width 0.5s ease;
        }
        
        .counter-text {
          font-size: 0.75rem;
          color: rgba(48, 52, 33, 0.65);
          font-weight: 500;
        }
        
        .challenge-btn {
          width: 100%;
          padding: 0.75rem 1rem;
          border: none;
          border-radius: 10px;
          background: linear-gradient(135deg, #f28011 0%, #FF8C00 100%);
          color: white;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(242, 128, 17, 0.3);
        }
        
        .challenge-btn:hover:not(.disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(242, 128, 17, 0.4);
        }
        
        .challenge-btn:active:not(.disabled) {
          transform: translateY(0);
        }
        
        .challenge-btn.disabled {
          background: linear-gradient(135deg, #888 0%, #666 100%);
          cursor: not-allowed;
          box-shadow: none;
        }
        
        /* NOTIFICATION */
        .notification {
          position: fixed;
          bottom: 1.5rem;
          left: 50%;
          transform: translateX(-50%);
          padding: 0.75rem 1.25rem;
          border-radius: 10px;
          font-size: 0.9rem;
          z-index: 1000;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          min-width: 200px;
          max-width: 90%;
          text-align: center;
          animation: slideUp 0.3s ease;
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
        
        /* ANIMATIONS */
        @keyframes slideUp {
          from { opacity: 0; transform: translate(-50%, 20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        /* RESPONSIVE STYLES */
        @media (max-width: 380px) {
          .content-container {
            padding: 0.75rem 0.75rem 4rem 0.75rem;
          }
          
          .profile-image-container {
            width: 80px;
            height: 80px;
          }
          
          .minimalist-claim-container {
            padding: 0;
          }
          
          .minimalist-claim-button {
            padding: 0.5rem 0.75rem;
            font-size: 0.85rem;
          }
          
          .social-btn span {
            display: none;
          }
          
          .social-btn {
            padding: 0.25rem;
            border-radius: 4px;
          }
        }
        
        /* DARK MODE SUPPORT */
        @media (prefers-color-scheme: dark) {
          .rewards-hub, .background {
            background-color: #303421;
            color: #f4e9b7;
          }
          
          .streak-card, .referral-card, .challenges-section {
            background-color: rgba(255, 255, 255, 0.05);
            border-color: rgba(241, 100, 3, 0.2);
          }
          
          
          .profile-username, .section-header h3, .coming-soon-title {
            color: #f4e9b7;
          }
          
          .streak-title, .referral-label, .coming-soon-text, .earnings-label {
            color: rgba(244, 233, 183, 0.7);
          }
          
          .x-btn {
            background-color: rgba(255, 255, 255, 0.1);
            border-color: rgba(255, 255, 255, 0.2);
            color: #ffffff;
          }
          
          .minimalist-claim-button {
            background-color: rgba(241, 100, 3, 0.15);
            border-color: rgba(241, 100, 3, 0.3);
          }
          
          .minimalist-claim-button:hover {
            background-color: rgba(241, 100, 3, 0.2);
          }
          
          .minimalist-claim-button:disabled {
            background-color: rgba(255, 255, 255, 0.05);
            border-color: rgba(255, 255, 255, 0.1);
            color: rgba(255, 255, 255, 0.3);
          }
        }
        
            /* PRISM Daily Reward Card - Compact */
            .prism-reward-card {
              width: 100%;
              background: linear-gradient(135deg, rgba(242, 128, 17, 0.15) 0%, rgba(242, 128, 17, 0.05) 100%);
              border: 1px solid rgba(242, 128, 17, 0.3);
              border-radius: 10px;
              padding: 0.75rem;
              margin-bottom: 0.5rem;
            }
            
            .prism-reward-card.compact {
              padding: 0.6rem 0.75rem;
            }
            
            .prism-reward-content {
              display: flex;
              align-items: center;
              gap: 0.6rem;
            }
            
            .prism-reward-icon {
              width: 42px;
              height: 42px;
              background: linear-gradient(135deg, #f28011, #f16403);
              border-radius: 10px;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              flex-shrink: 0;
            }
            
            .prism-reward-icon.small {
              width: 36px;
              height: 36px;
              border-radius: 8px;
            }
            
            .prism-reward-text {
              flex: 1;
              min-width: 0;
            }
            
            .prism-reward-text h4 {
              margin: 0;
              font-size: 0.85rem;
              font-weight: 600;
              color: #303421;
            }
            
            .prism-reward-text p {
              margin: 0.15rem 0 0;
              font-size: 0.7rem;
              color: rgba(48, 52, 33, 0.7);
              line-height: 1.2;
            }
            
            .prism-claim-btn {
              padding: 0.4rem 0.8rem;
              background: linear-gradient(135deg, #f28011, #f16403);
              color: white;
              border: none;
              border-radius: 6px;
              font-size: 0.75rem;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.2s;
              white-space: nowrap;
              flex-shrink: 0;
            }
            
            .prism-claim-btn:hover:not(.disabled) {
              transform: translateY(-1px);
              box-shadow: 0 4px 12px rgba(242, 128, 17, 0.3);
            }
            
            .prism-claim-btn.disabled {
              background: rgba(48, 52, 33, 0.2);
              color: rgba(48, 52, 33, 0.6);
              cursor: not-allowed;
            }

            /* PRISM 5-Star Review Challenge - Compact */
            .prism-review-challenge-compact {
              width: 100%;
              background: linear-gradient(135deg, rgba(255, 215, 0, 0.12) 0%, rgba(241, 100, 3, 0.08) 100%);
              border: 1px solid rgba(255, 215, 0, 0.35);
              border-radius: 10px;
              padding: 0.6rem 0.75rem;
              margin-bottom: 1rem;
            }
            
            .challenge-compact-content {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 0.5rem;
            }
            
            .challenge-compact-left {
              display: flex;
              align-items: center;
              gap: 0.5rem;
              flex: 1;
              min-width: 0;
            }
            
            .challenge-compact-icon {
              width: 32px;
              height: 32px;
              border-radius: 8px;
              background: linear-gradient(135deg, #FFD700 0%, #f28011 100%);
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              flex-shrink: 0;
            }
            
            .challenge-compact-text {
              flex: 1;
              min-width: 0;
            }
            
            .challenge-compact-title {
              font-size: 0.75rem;
              font-weight: 500;
              color: #303421;
              display: block;
              line-height: 1.3;
            }
            
            .challenge-compact-title strong {
              color: #f28011;
            }
            
            .challenge-compact-counter {
              font-size: 0.65rem;
              color: rgba(48, 52, 33, 0.6);
              margin-top: 0.1rem;
            }
            
            .challenge-compact-btn {
              padding: 0.35rem 0.7rem;
              background: linear-gradient(135deg, #FFD700 0%, #f28011 100%);
              color: white;
              border: none;
              border-radius: 6px;
              font-size: 0.7rem;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.2s;
              white-space: nowrap;
              flex-shrink: 0;
            }
            
            .challenge-compact-btn:hover:not(.disabled) {
              transform: translateY(-1px);
              box-shadow: 0 4px 10px rgba(255, 215, 0, 0.3);
            }
            
            .challenge-compact-btn.disabled {
              background: rgba(48, 52, 33, 0.2);
              color: rgba(48, 52, 33, 0.5);
              cursor: not-allowed;
            }
            
            .claim-container {
    display: flex;
    justify-content: center;
    width: 100%;
    margin: 0.75rem 0 1.75rem 0;
  }
  
  .claim-button {
    background-color: #f28011;
    color: white;
    border: none;
    border-radius: 8px;
    padding: 0.7rem 1rem;
    font-size: 0.95rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 4px rgba(241, 100, 3, 0.2);
  }
  
  .claim-button:hover {
    background-color: #e07410;
    box-shadow: 0 3px 5px rgba(241, 100, 3, 0.25);
  }
  
  .claim-button:active {
    background-color: #d56b0f;
    box-shadow: 0 1px 3px rgba(241, 100, 3, 0.15);
    transform: translateY(1px);
  }
  
  .claim-button:disabled {
    background-color: rgba(0, 0, 0, 0.1);
    color: rgba(0, 0, 0, 0.35);
    cursor: not-allowed;
    box-shadow: none;
  }
  
  .claim-content {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }
  
  .claim-text {
    font-weight: 500;
  }
  
  .claim-amount {
    font-weight: 600;
  }
  
  /* Dark mode support */
  @media (prefers-color-scheme: dark) {
    .claim-button:disabled {
      background-color: rgba(255, 255, 255, 0.1);
      color: rgba(255, 255, 255, 0.3);
    }
  }
     .streak-message {
    margin-top: 0.5rem;
    font-size: 0.75rem;
    color: rgba(48, 52, 33, 0.6);
    text-align: center;
    padding: 0.3rem 0;
    transition: all 0.2s;
  }
  
  .streak-message .highlight {
    color: #f16403;
    font-weight: 600;
  }
  
  /* For dark mode */
  @media (prefers-color-scheme: dark) {
    .streak-message {
      color: rgba(244, 233, 183, 0.6);
    }
  }

      `}</style>
    </div>
  );
};

export default RewardsHub;