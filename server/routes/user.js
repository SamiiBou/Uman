import express from 'express';
import { authenticate } from '../controllers/auth.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import {
  getSocialAccounts,
  disconnectSocialAccount,
  getTwitterProfile,
  getUserProfile,
  searchUsers,
  searchAppUsers,
  dailyLogin,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  getConnections,
  getUserConnectionsById,
  getUserProfileById,
  getVerifiedUsers,
  updateNotificationPermission,
  searchTelegramUser,
  searchTwitterUser,
  searchDiscordUser
} from '../controllers/user.js';
import { verifyCloudProof } from "@worldcoin/minikit-js";
import User from '../models/User.js';
import Group from '../models/Group.js';

// import { writeVerificationOnChain } from '../../contracts/contracts/lib/registryClient.js';


// Import correct pour ethers v6
import { JsonRpcProvider, Contract, formatUnits } from 'ethers';

const router = express.Router();

// ERC-20 token contract address and minimal ABI
const TOKEN_CONTRACT_ADDRESS = process.env.TOKEN_CONTRACT_ADDRESS || '0x41Da2F787e0122E2e6A72fEa5d3a4e84263511a8';
const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)"
];

// Public routes (no authentication required)
router.get('/search', searchUsers);
// Search users by in-app username
router.get('/search-app', searchAppUsers);

router.get('/verified', getVerifiedUsers);

router.post("/notifications/permission", updateNotificationPermission);


router.get('/check-telegram/:username', searchTelegramUser);
router.get('/check-twitter/:username', searchTwitterUser);
router.get('/check-discord/:username', searchDiscordUser);

// PRISM Daily Reward - Claim 100 UMI tokens once per day
router.post('/claim-prism-reward', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Calculate today's midnight UTC
    const now = new Date();
    const todayMidnightUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));

    // Check if user already claimed today
    const lastClaim = user.prismReward?.lastClaimDate;
    if (lastClaim && new Date(lastClaim) >= todayMidnightUTC) {
      // Calculate time until next claim
      const nextClaimTime = new Date(todayMidnightUTC);
      nextClaimTime.setUTCDate(nextClaimTime.getUTCDate() + 1);
      const timeUntilNextClaim = nextClaimTime - now;

      const hoursLeft = Math.floor(timeUntilNextClaim / (1000 * 60 * 60));
      const minutesLeft = Math.floor((timeUntilNextClaim % (1000 * 60 * 60)) / (1000 * 60));

      return res.status(400).json({
        success: false,
        message: `Already claimed today. Next claim in ${hoursLeft}h ${minutesLeft}m`,
        alreadyClaimed: true,
        nextClaimTime: nextClaimTime.toISOString(),
        hoursLeft,
        minutesLeft
      });
    }

    // Award 100 UMI tokens
    const PRISM_REWARD_AMOUNT = 100;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $inc: { tokenBalance: PRISM_REWARD_AMOUNT },
        $set: { 'prismReward.lastClaimDate': now }
      },
      { new: true }
    );

    console.log(`[PRISM Reward] User ${userId} claimed ${PRISM_REWARD_AMOUNT} UMI tokens. New balance: ${updatedUser.tokenBalance}`);

    return res.json({
      success: true,
      message: `+${PRISM_REWARD_AMOUNT} UMI tokens claimed!`,
      reward: PRISM_REWARD_AMOUNT,
      newBalance: updatedUser.tokenBalance,
      claimedAt: now.toISOString()
    });

  } catch (error) {
    console.error('[PRISM Reward] Error claiming reward:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error claiming reward',
      error: error.message
    });
  }
});

// ========== PRISM 5-Star Review Challenge ==========
// Global counter stored in a simple document (or we can use a Challenge collection)
// For simplicity, we'll use a dedicated document in a "challenges" collection

// Get PRISM 5-Star Review Challenge status
router.get('/prism-review-challenge-status', async (req, res) => {
  try {
    // Count how many users have participated
    const participantCount = await User.countDocuments({ 'prismReviewChallenge.participated': true });
    const maxParticipants = 600;
    const spotsRemaining = Math.max(0, maxParticipants - participantCount);
    const isChallengeOpen = participantCount < maxParticipants;

    return res.json({
      success: true,
      participantCount,
      maxParticipants,
      spotsRemaining,
      isChallengeOpen,
      reward: '0.2 WLD'
    });
  } catch (error) {
    console.error('[PRISM Review Challenge] Error getting status:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Participate in PRISM 5-Star Review Challenge
router.post('/participate-prism-review', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check if user already participated
    if (user.prismReviewChallenge?.participated) {
      return res.status(400).json({
        success: false,
        message: 'You have already participated in this challenge',
        alreadyParticipated: true
      });
    }

    // Count current participants (atomic check)
    const currentCount = await User.countDocuments({ 'prismReviewChallenge.participated': true });
    const maxParticipants = 600;

    if (currentCount >= maxParticipants) {
      return res.status(400).json({
        success: false,
        message: 'Challenge is closed! Maximum participants reached (100/100)',
        challengeClosed: true
      });
    }

    // Mark user as participated
    await User.findByIdAndUpdate(userId, {
      $set: {
        'prismReviewChallenge.participated': true,
        'prismReviewChallenge.participatedAt': new Date()
      }
    });

    // Get updated count
    const newCount = await User.countDocuments({ 'prismReviewChallenge.participated': true });

    console.log(`[PRISM Review Challenge] User ${userId} participated. Total: ${newCount}/100`);

    return res.json({
      success: true,
      message: 'Successfully registered for the challenge! Rate PRISM 5 stars and send your screenshot to support to receive 0.2 WLD.',
      participantNumber: newCount,
      spotsRemaining: Math.max(0, maxParticipants - newCount)
    });

  } catch (error) {
    console.error('[PRISM Review Challenge] Error participating:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Get PRISM reward status (check if can claim)
router.get('/prism-reward-status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const user = await User.findById(userId).select('prismReward tokenBalance');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const now = new Date();
    const todayMidnightUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));

    const lastClaim = user.prismReward?.lastClaimDate;
    const canClaim = !lastClaim || new Date(lastClaim) < todayMidnightUTC;

    let hoursLeft = 0;
    let minutesLeft = 0;
    let nextClaimTime = null;

    if (!canClaim) {
      nextClaimTime = new Date(todayMidnightUTC);
      nextClaimTime.setUTCDate(nextClaimTime.getUTCDate() + 1);
      const timeUntilNextClaim = nextClaimTime - now;
      hoursLeft = Math.floor(timeUntilNextClaim / (1000 * 60 * 60));
      minutesLeft = Math.floor((timeUntilNextClaim % (1000 * 60 * 60)) / (1000 * 60));
    }

    return res.json({
      success: true,
      canClaim,
      lastClaimDate: lastClaim,
      nextClaimTime: nextClaimTime?.toISOString() || null,
      hoursLeft,
      minutesLeft,
      tokenBalance: user.tokenBalance
    });

  } catch (error) {
    console.error('[PRISM Reward] Error checking status:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});


// Token balance endpoint - peut être utilisé avec ou sans authentification
router.get('/token-balance/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;

    if (!walletAddress) {
      return res.status(400).json({
        status: "error",
        message: "L'adresse du portefeuille est requise"
      });
    }

    console.log(`Récupération du solde de token pour l'adresse: ${walletAddress}`);

    // Utiliser un fournisseur public ou celui configuré dans vos variables d'environnement
    // Correction pour ethers v6
    console.log("🔍 Attempting RPC URL:", process.env.RPC_URL);

    const provider = new JsonRpcProvider(
      process.env.RPC_URL || 'https://worldchain-mainnet.g.alchemy.com/v2/vCq59BHgMYA2JIRKAbRPmIL8OaTeRAgu'
    );

    // Créer le contrat - Correction pour ethers v6
    const tokenContract = new Contract(
      TOKEN_CONTRACT_ADDRESS,
      ERC20_ABI,
      provider
    );

    // Récupérer simultanément le solde et les décimales
    const [rawBalance, decimals] = await Promise.all([
      tokenContract.balanceOf(walletAddress),
      tokenContract.decimals()
    ]);

    // Formater le solde avec le bon nombre de décimales - Correction pour ethers v6
    const formattedBalance = formatUnits(rawBalance, decimals);

    console.log(`Solde récupéré pour ${walletAddress}: ${formattedBalance}`);

    // Retourner les informations
    res.json({
      status: "success",
      balance: formattedBalance,
      walletAddress,
      tokenAddress: TOKEN_CONTRACT_ADDRESS
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du solde de token:', error);
    res.status(500).json({
      status: "error",
      message: "Échec de la récupération du solde de token",
      error: error.message
    });
  }
});

// Daily login streak and token distribution
router.post('/daily-login', authenticateToken, dailyLogin);

// Friend invitation and connections routes
router.post('/:id/invite', authenticateToken, sendFriendRequest);
router.post('/:id/invite/accept', authenticateToken, acceptFriendRequest);
router.post('/:id/invite/reject', authenticateToken, rejectFriendRequest);

// Get another user's friends list for map visualization
router.get('/:id/connections', authenticateToken, getUserConnectionsById);
router.get('/connections', authenticateToken, getConnections);


router.post("/verify-social", async (req, res) => {
  try {
    const { walletAddress, proof, provider, userId, appId } = req.body

    console.log(`World ID verification request for ${provider} login. Wallet:`, walletAddress)
    console.log(`[SOCIAL VERIFY] ===== Starting verification ${provider} =====`)
    console.log(`[SOCIAL VERIFY] Wallet: ${walletAddress}`)
    console.log(`[SOCIAL VERIFY] Provider: ${provider}`)
    console.log(`[SOCIAL VERIFY] AppID: ${process.env.APP_ID}`)
    console.log(`[SOCIAL VERIFY] User ID for linking: ${userId || 'Not provided'}`)

    // Input validation
    if (!walletAddress) {
      return res.status(400).json({ message: "Wallet address is required" })
    }
    if (!provider) {
      return res.status(400).json({ message: "Social provider is required" })
    }
    if (!proof || proof.status !== 'success') {
      console.error("Invalid proof format:", proof)
      return res.status(400).json({ message: "Invalid proof format" })
    }

    // Verify the World ID proof via cloud API
    let verifyRes
    let worldIDDetails = {}

    try {
      console.log("Verifying World ID proof with cloud API for social login...")
      console.log("Complete proof structure:", JSON.stringify(proof, null, 2))

      verifyRes = await verifyCloudProof(
        proof,
        process.env.APP_ID,
        "verifyhuman",
        "" // signal (empty if not used)
      )

      console.log("Complete World ID verification result:", JSON.stringify(verifyRes, null, 2))

      if (!verifyRes.success) {
        console.error(`World ID verification failed for ${provider} login:`, verifyRes.error)
        return res.status(400).json({
          message: "Identity verification failed",
          error: verifyRes.error
        })
      }

      console.log(`World ID verification successful for ${provider} login!`)

      // Extraire les informations importantes de la vérification
      worldIDDetails = {
        verified: true,
        timestamp: new Date(),
        // Ces champs dépendent de la structure exacte de votre réponse - ajustez selon besoin
        proofHash: proof.merkle_root || proof.root || proof.proof?.root || null,
        nullifierHash: proof.nullifier_hash || proof.nullifier || proof.proof?.nullifier_hash || null,
        // Si disponible dans la réponse, stockez le txHash
        txHash: verifyRes.transaction?.hash || verifyRes.txHash || null,
        // Stockez le niveau de vérification
        verificationLevel: proof.verification_level || proof.proof?.verification_level || "orb"
      }

    } catch (err) {
      console.error(`Error during World ID verification for ${provider}:`, err)
      return res.status(500).json({
        message: "Error verifying World ID proof",
        error: err.message
      })
    }

    // Find or create/link user
    let user
    if (userId) {
      console.log(`[SOCIAL VERIFY] Link mode detected for userId: ${userId}`)
      user = await User.findById(userId)
      if (!user) {
        console.error(`[SOCIAL VERIFY] User not found for ID: ${userId}`)
        return res.status(404).json({ message: "User not found for linking", error: "USER_NOT_FOUND" })
      }
      console.log(`[SOCIAL VERIFY] Found user for linking: ${user.name || user.username}`)
      if (user.social && user.social[provider]?.id) {
        return res.status(409).json({ message: `Provider ${provider} already linked` })
      }
      req.session.linkMode = true
      req.session.linkUserId = userId
      await new Promise((resolve, reject) =>
        req.session.save(err => err ? reject(err) : resolve())
      )
    } else {
      user = await User.findOne({ walletAddress })
    }

    if (!user) {
      user = new User({
        name: `User ${walletAddress.substring(0, 8)}`,
        walletAddress,
        verified: false,
        social: {},
        createdAt: new Date()
      })
      await user.save()
      console.log(`[SOCIAL VERIFY] Created new user with ID: ${user._id}`)
    }

    // Defer storing verification until social OAuth callback completes
    // Verification details (worldIDDetails) will be applied after OAuth linking

    // Send response
    return res.json({
      message: `User verified successfully for ${provider} login`,
      verified: true,
      provider,
      linkMode: !!userId,
      userId: userId || user._id.toString()
    })

  } catch (error) {
    console.error(`Error verifying user for ${req.body.provider || 'unknown'} login:`, error)
    return res.status(500).json({
      message: "Server error",
      error: error.message
    })
  }
})

// Add the World ID verification endpoint as a public route
router.post("/verify", async (req, res) => {
  try {
    const { walletAddress, proof } = req.body;
    console.log("Verification request received for wallet:", walletAddress);

    if (!walletAddress) {
      return res.status(400).json({ message: "Wallet address is required" });
    }

    // Vérification de la preuve World ID
    if (!proof || proof.status !== 'success') {
      console.error("Invalid proof format:", proof);
      return res.status(400).json({ message: "Invalid proof format" });
    }

    let worldIDDetails = {};

    try {
      // Log de la structure complète de la preuve pour débogage
      console.log("Complete proof structure:", JSON.stringify(proof, null, 2));

      // Vérifier la preuve auprès des serveurs World ID
      console.log("Verifying World ID proof with cloud API...");
      const verifyRes = await verifyCloudProof(
        proof,
        process.env.APP_ID, // Assurez-vous que cette variable d'environnement est définie
        "signin", // Doit correspondre à l'action dans le frontend
        "" // Signal (vide si vous n'en utilisez pas)
      );

      // Log du résultat complet pour débogage
      console.log("Complete World ID verification result:", JSON.stringify(verifyRes, null, 2));

      // Si la vérification échoue, retourner une erreur
      if (!verifyRes.success) {
        console.error("World ID verification failed:", verifyRes.error);
        return res.status(400).json({
          message: "Identity verification failed",
          error: verifyRes.error
        });
      }

      // Extraire les informations de vérification importantes
      worldIDDetails = {
        verified: true,
        timestamp: new Date(),
        proofHash: proof.merkle_root || proof.root || proof.proof?.root || null,
        nullifierHash: proof.nullifier_hash || proof.nullifier || proof.proof?.nullifier_hash || null,
        txHash: verifyRes.transaction?.hash || verifyRes.txHash || null,
        verificationLevel: proof.verification_level || proof.proof?.verification_level || "orb"
      };

      console.log("World ID verification successful with details:", worldIDDetails);

    } catch (verifyError) {
      console.error("Error during World ID verification:", verifyError);
      return res.status(500).json({
        message: "Error verifying World ID proof",
        error: verifyError.message
      });
    }

    // Rechercher ou créer l'utilisateur
    let user = await User.findOne({ walletAddress });
    if (!user) {
      // Si l'utilisateur n'existe pas, le créer
      user = new User({
        name: `User ${walletAddress.substring(0, 8)}`,
        walletAddress,
        verified: true,
        verificationLevel: "orb",
        createdAt: new Date(),
        // Stocker directement les détails de vérification World ID
        socialVerifications: {
          worldid: worldIDDetails
        }
      });
    } else {
      // Mettre à jour le statut de vérification
      user.verified = true;
      user.verificationLevel = "orb";

      // Stocker les détails de la vérification World ID
      if (!user.socialVerifications) user.socialVerifications = {};
      user.socialVerifications.worldid = worldIDDetails;
    }

    await user.save();
    console.log("User updated - verified:", user.verified);
    console.log("World ID verification details saved:", user.socialVerifications.worldid);

    // Renvoyer la réponse de succès
    res.json({
      message: "User verified successfully",
      verified: true,
      worldIDDetails: worldIDDetails // Optionnel: renvoyer les détails pour informer le client
    });
  } catch (error) {
    console.error("Error verifying user:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/social-accounts', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const socialAccounts = {
      twitter: !!user.social?.twitter?.id,
      google: !!user.social?.google?.id,
      facebook: !!user.social?.facebook?.id,
      instagram: !!user.social?.instagram?.id
    };

    res.json({ socialAccounts });
  } catch (error) {
    console.error('Error fetching social accounts:', error);
    res.status(500).json({ message: 'Error fetching social accounts' });
  }
});

// Disconnect social account
router.delete('/social-accounts/:provider', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { provider } = req.params;

    // Validate provider
    if (!['twitter', 'google', 'facebook', 'instagram'].includes(provider)) {
      return res.status(400).json({ message: 'Invalid social provider' });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if provider is connected
    if (!user.social || !user.social[provider] || !user.social[provider].id) {
      return res.status(400).json({ message: `No ${provider} account connected` });
    }

    // Remove the provider
    user.social[provider] = undefined;
    await user.save();

    res.json({
      message: `${provider} account disconnected successfully`,
      socialAccounts: {
        twitter: !!user.social?.twitter?.id,
        google: !!user.social?.google?.id,
        facebook: !!user.social?.facebook?.id,
        instagram: !!user.social?.instagram?.id
      }
    });
  } catch (error) {
    console.error(`Error disconnecting ${req.params.provider} account:`, error);
    res.status(500).json({ message: `Error disconnecting ${req.params.provider} account` });
  }
});

router.get('/:id/profile', authenticateToken, getUserProfileById);


// Public endpoint to validate a referral code
router.post('/validate-referral', async (req, res) => {
  const { referralCode } = req.body;
  if (!referralCode) {
    return res.status(400).json({ valid: false, message: 'Referral code is required' });
  }
  try {
    // Only codes belonging to verified users are considered valid
    const referrer = await User.findOne({ referralCode });
    if (!referrer) {
      return res.status(404).json({ valid: false, message: 'Invalid referral code' });
    }
    return res.json({ valid: true, message: 'Valid referral code', referrer: { id: referrer._id, username: referrer.username } });
  } catch (err) {
    console.error('Error validating referral code:', err);
    return res.status(500).json({ valid: false, message: 'Server error validating referral code' });
  }
});


router.post('/groups/:chatId/members', async (req, res) => {
  const { chatId } = req.params;
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ message: 'userId required' });

  let group = await Group.findOne({ chatId });
  if (!group) {
    group = new Group({ chatId, members: [] });
  }
  // avoid duplicates
  if (!group.members.includes(userId)) {
    group.members.push(userId);
    await group.save();
  }
  res.sendStatus(200);
});

// 2️⃣ Return total & verified member counts
router.get('/groups/:chatId/stats', async (req, res) => {
  const { chatId } = req.params;
  const group = await Group.findOne({ chatId }).populate('members', 'verified');
  if (!group) {
    return res.status(404).json({ success: false, message: 'Group not found' });
  }
  const total = group.members.length;
  const verified = group.members.filter(u => u.verified).length;
  res.json({ success: true, totalMembers: total, verifiedMembers: verified });
});

router.use(authenticate);

// Get user profile with all social accounts
router.get('/profile', getUserProfile);

// Get social accounts status
router.get('/social-accounts', getSocialAccounts);

// Get Twitter profile details
router.get('/twitter/profile', getTwitterProfile);

// Disconnect social account
router.delete('/social-accounts/:provider', disconnectSocialAccount);

export default router;