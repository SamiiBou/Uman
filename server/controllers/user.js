import User from '../models/User.js';
import { distributeTokens } from '../utils/tokenDistributor.js';
import FriendshipReward from '../models/FriendshipReward.js';


// Get the user's connected social accounts
export const getSocialAccounts = (req, res) => {
  const user = req.user
  
  // Create a response object with connected accounts status
  // For now, only Twitter is supported
  const accounts = {
    twitter: !!user.social?.twitter?.id
  }
  
  res.status(200).json({ accounts })
}

// Mettez le code à la fin du fichier, avant les exports déjà présents
export const updateNotificationPermission = async (req, res) => {
  try {
    const { granted } = req.body;              // booléen envoyé par le client
    if (typeof granted !== "boolean") {
      return res.status(400).json({ message: "Paramètre 'granted' manquant ou invalide" });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      granted
        ? { $set: { "notifications.enabled": true, "notifications.grantedAt": new Date() } }
        : { $set: { "notifications.enabled": false }, $unset: { "notifications.grantedAt": "" } },
      { new: true }
    ).select("notifications");

    return res.json({ status: "success", notifications: user.notifications });
  } catch (err) {
    console.error("[NOTIF] Erreur updateNotificationPermission:", err);
    return res.status(500).json({ status: "error", message: err.message });
  }
};


// Get the user's Twitter profile details
export const getTwitterProfile = (req, res) => {
  const user = req.user
  
  if (!user.social?.twitter?.id) {
    return res.status(404).json({
      success: false,
      message: 'Compte Twitter non connecté'
    })
  }
  
  // Format the Twitter profile data
  const twitterProfile = {
    username: user.social.twitter.username,
    name: user.social.twitter.name,
    profileImageUrl: user.social.twitter.profileImageUrl,
    description: user.social.twitter.description,
    followersCount: user.social.twitter.followersCount,
    followingCount: user.social.twitter.followingCount,
    verified: user.social.twitter.verified,
    createdAt: user.social.twitter.createdAt,
    lastUpdated: user.social.twitter.lastUpdated
  }
  
  res.status(200).json({
    success: true,
    profile: twitterProfile
  })
}

// Get complete user profile including all social accounts
export const getUserProfile = (req, res) => {
  const user = req.user
  
  // Create a response with user info and social accounts
  const userProfile = {
    id: user._id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    notificationsEnabled: user.notifications?.enabled || false,
    // Code de parrainage de l'utilisateur
    referralCode: user.referralCode,
    socialAccounts: {
      twitter: user.social?.twitter ? {
        connected: true,
        username: user.social.twitter.username,
        name: user.social.twitter.name,
        profileImageUrl: user.social.twitter.profileImageUrl,
        description: user.social.twitter.description,
        followersCount: user.social.twitter.followersCount,
        followingCount: user.social.twitter.followingCount,
        verified: user.social.twitter.verified,
        createdAt: user.social.twitter.createdAt
      } : { connected: false }
    }
  }
  
  res.status(200).json({
    success: true,
    profile: userProfile
  })
}

// Disconnect a social account
export const disconnectSocialAccount = async (req, res) => {
  const provider = req.params.provider
  const user = req.user
  
  try {
    // Validate provider
    if (provider !== 'twitter') {
      return res.status(400).json({
        success: false,
        message: 'Provider invalide. Actuellement seul Twitter est supporté.'
      })
    }
    
    // Remove the social provider credentials
    if (user.social && user.social[provider]) {
      user.social[provider] = undefined
      await user.save()
    }
    
    res.status(200).json({
      success: true,
      message: `Compte ${provider} déconnecté`
    })
  } catch (error) {
    console.error(`Erreur lors de la déconnexion du compte ${provider}:`, error)
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la déconnexion du compte'
    })
  }
}

// Search for users based on name or connected social networks
export const searchUsers = async (req, res) => {
  try {
    const User = req.app.get('models').User
    const { query = '', network = 'all' } = req.query
    
    // Base query to search by name (case insensitive)
    let searchQuery = { 
      name: { $regex: query, $options: 'i' }
    }
    
    // If specific social network is requested, filter by that
    if (network !== 'all') {
      // Construct the field path based on the network
      const socialField = `social.${network}.id`
      
      // Add filter to only include users with that social network connected
      searchQuery[socialField] = { $exists: true }
    }
    
    // Find users matching the criteria
    // Limit to 50 results for performance
    const users = await User.find(searchQuery)
      .select('name email social.twitter.username social.twitter.profileImageUrl social.google.email social.google.profileImageUrl social.facebook.name social.facebook.profileImageUrl social.instagram.username')
      .limit(50)
    
    // Format user data for the response
    const formattedUsers = users.map(user => {
      return {
        id: user._id,
        name: user.name,
        email: user.email,
        social: {
          twitter: !!user.social?.twitter?.id,
          google: !!user.social?.google?.id,
          facebook: !!user.social?.facebook?.id,
          instagram: !!user.social?.instagram?.id
        },
        username: user.social?.twitter?.username || user.email?.split('@')[0] || '',
        avatar: user.social?.google?.profileImageUrl || 
                user.social?.twitter?.profileImageUrl || 
                user.social?.facebook?.profileImageUrl || 
                user.social?.instagram?.profileImageUrl || 
                `https://api.dicebear.com/7.x/identicon/svg?seed=${user._id}`
      }
    })
    
    res.status(200).json({
      success: true,
      users: formattedUsers
    })
  } catch (error) {
    console.error('Error searching users:', error)
    res.status(500).json({
      success: false,
      message: 'An error occurred while searching users'
    });
  }
};

/**
 * Search for users by app username (username field in DB).
 */
export const searchAppUsers = async (req, res) => {
  try {
    // Parse pagination parameters
    const { query = '', page = 1, limit = 10 } = req.query;
    const pageNumber = parseInt(page, 10) || 1;
    const limitNumber = parseInt(limit, 10) || 10;
    const skip = (pageNumber - 1) * limitNumber;

    // Build search query (case insensitive)
    const searchQuery = {
      username: { $regex: query, $options: 'i' }
    };

    // Count total matching documents
    const total = await User.countDocuments(searchQuery);
    const pages = Math.ceil(total / limitNumber);

    // Fetch paginated user list
    const users = await User.find(searchQuery)
      .select(
        'username name social.twitter.profileImageUrl '
        + 'social.google.profileImageUrl social.facebook.profileImageUrl '
        + 'social.instagram.profileImageUrl'
      )
      .skip(skip)
      .limit(limitNumber);

    // Format user data for the response
    const formattedUsers = users.map(user => ({
      id: user._id,
      name: user.name,
      username: user.username,
      avatar:
        user.social?.google?.profileImageUrl ||
        user.social?.twitter?.profileImageUrl ||
        user.social?.facebook?.profileImageUrl ||
        user.social?.instagram?.profileImageUrl ||
        `https://api.dicebear.com/7.x/identicon/svg?seed=${user._id}`
    }));

    return res.status(200).json({
      success: true,
      users: formattedUsers,
      pagination: {
        total,
        page: pageNumber,
        pages
      }
    });
  } catch (error) {
    console.error('Error searching users by username:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while searching users by username'
    });
  }
};




/**
 * dailyLogin : distribution fractionnaire en fonction
 * du temps écoulé entre la première connexion de la veille et minuit.
 */
export const dailyLogin = async (req, res) => {
  try {
    const userId = req.user.id
    console.log(`[DAILY LOGIN] Début pour userId=${userId}`)

    // 1. Chargement de l’utilisateur
    const user = await User.findById(userId)
    if (!user) {
      console.log(`[DAILY LOGIN] User non trouvé: ${userId}`)
      return res.status(404).json({ message: 'User not found' })
    }

    const now        = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const lastLogin  = user.dailyLogin.lastLogin
    const lastDay    = lastLogin
      ? new Date(lastLogin.getFullYear(), lastLogin.getMonth(), lastLogin.getDate())
      : null

    // 2. Détection d'une nouvelle réclamation (première connexion du jour)
    const isNewClaim = !(lastDay && lastDay.getTime() === todayStart.getTime())

    let dynamicReward = 0

    if (isNewClaim) {
      // Si on a un firstLoginOfDay précédent, on calcule le fractionnaire
      if (user.dailyLogin.firstLoginOfDay) {
        const prevFirst    = new Date(user.dailyLogin.firstLoginOfDay)
        const nextMidnight = new Date(
          prevFirst.getFullYear(),
          prevFirst.getMonth(),
          prevFirst.getDate() + 1,
          0, 0, 0
        )

        const secondsActive   = (nextMidnight - prevFirst) / 1000
        const prevStreakFactor = Math.min(user.dailyLogin.currentStreak, 5)
        const ratePerSec       = (prevStreakFactor * 10) / (24 * 3600)
        dynamicReward          = ratePerSec * secondsActive

        console.log('[DAILY LOGIN] Calcul dynamicReward:', {
          prevFirst, nextMidnight, secondsActive,
          prevStreakFactor, ratePerSec, dynamicReward
        })
      } else {
        console.log('[DAILY LOGIN] Premier jour — pas de firstLoginOfDay précédent')
      }

      // 3. Mise à jour atomique de la balance et du streak
      const yesterday = new Date(todayStart)
      yesterday.setDate(yesterday.getDate() - 1)

      const newStreak = lastDay && lastDay.getTime() === yesterday.getTime()
        ? user.dailyLogin.currentStreak + 1
        : 1

      console.log('[DAILY LOGIN] Streak mis à jour:', newStreak)

      // updateOne atomique pour éviter les conflits
      await User.updateOne(
        { _id: userId },
        {
          $inc:  { tokenBalance: dynamicReward },
          $set: {
            'dailyLogin.currentStreak'   : newStreak,
            'dailyLogin.maxStreak'       : Math.max(user.dailyLogin.maxStreak || 0, newStreak),
            'dailyLogin.firstLoginOfDay' : now,
            'dailyLogin.lastLogin'       : now
          }
        }
      )

      console.log(
        `[DAILY LOGIN] +${dynamicReward.toFixed(6)} UMI crédités hors-chaîne et streak enregistré`
      )

    } else {
      // Même jour : on met à jour uniquement lastLogin
      await User.updateOne(
        { _id: userId },
        { $set: { 'dailyLogin.lastLogin': now } }
      )
      console.log('[DAILY LOGIN] Même jour — lastLogin mis à jour')
    }

    // 4. Envoi de la réponse
    // On récupère l'état actuel pour répondre
    const updatedUser = await User.findById(userId).select(
      'dailyLogin.currentStreak dailyLogin.maxStreak dailyLogin.firstLoginOfDay dailyLogin.lastLogin tokenBalance'
    )

    return res.json({
      distributedReward: dynamicReward,
      currentStreak:    updatedUser.dailyLogin.currentStreak,
      maxStreak:        updatedUser.dailyLogin.maxStreak,
      firstLoginOfDay:  updatedUser.dailyLogin.firstLoginOfDay,
      lastLogin:        updatedUser.dailyLogin.lastLogin,
      tokenBalance:     updatedUser.tokenBalance
    })

  } catch (err) {
    console.error('[DAILY LOGIN] Erreur:', err)
    return res.status(500).json({ message: 'Server error', error: err.message })
  }
}


// -----------------------------------------------------------------------------
// Friend system controllers
// -----------------------------------------------------------------------------
/**
 * Send a friend request from current user to another user.
 */
export const sendFriendRequest = async (req, res) => {
  const fromUserId = req.user.id;
  const toUserId = req.params.id;

  console.log(`[sendFriendRequest] Attempting: ${fromUserId} -> ${toUserId}`);

  if (fromUserId === toUserId) {
    console.log(`[sendFriendRequest] Failed: Cannot send request to self.`);
    return res.status(400).json({ message: "Cannot send friend request to yourself" });
  }

  try {
    const fromUser = await User.findById(fromUserId);
    const toUser = await User.findById(toUserId);

    if (!toUser) {
      console.log(`[sendFriendRequest] Failed: Target user ${toUserId} not found.`);
      return res.status(404).json({ message: "Target user not found" });
    }

    // Already friends?
    if (fromUser.friends.includes(toUserId)) {
      console.log(`[sendFriendRequest] Failed: Users ${fromUserId} and ${toUserId} are already friends.`);
      return res.status(400).json({ message: "Users are already friends" });
    }

    // Request already sent?
    if (fromUser.friendRequestsSent.includes(toUserId)) {
      console.log(`[sendFriendRequest] Failed: Request from ${fromUserId} to ${toUserId} already sent.`);
      return res.status(400).json({ message: "Friend request already sent" });
    }

    // Incoming request exists?
    if (fromUser.friendRequestsReceived.includes(toUserId)) {
      console.log(`[sendFriendRequest] Failed: User ${fromUserId} has pending request from ${toUserId}.`);
      return res.status(400).json({ message: "You have a pending request from this user" });
    }

    // Send request
    console.log(`[sendFriendRequest] Proceeding to send request: ${fromUserId} -> ${toUserId}`);
    fromUser.friendRequestsSent.push(toUserId);
    toUser.friendRequestsReceived.push(fromUserId);
    await fromUser.save();
    await toUser.save();

    console.log(`[sendFriendRequest] Success: Request sent from ${fromUserId} to ${toUserId}`);
    return res.json({ message: "Friend request sent" });

  } catch (err) {
    console.error("[sendFriendRequest] Server error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * Accept a friend request sent by another user.
 */

export const acceptFriendRequest = async (req, res) => {
  const toUserId = req.user.id;
  const fromUserId = req.params.id;

  if (toUserId === fromUserId) {
    return res.status(400).json({ message: "Invalid operation" });
  }

  try {
    const toUser = await User.findById(toUserId);
    const fromUser = await User.findById(fromUserId);
    if (!fromUser) {
      return res.status(404).json({ message: "Requesting user not found" });
    }

    // 1. Vérifier qu'il y a bien une demande en attente
    if (!toUser.friendRequestsReceived.includes(fromUserId)) {
      return res.status(400).json({ message: "No pending friend request from this user" });
    }

    // 2. Préparer la paire triée pour le suivi
    const [u1, u2] = [toUserId, fromUserId].sort();
    let record = await FriendshipReward.findOne({ user1: u1, user2: u2 });

    // 3. Si jamais récompensée, distribuer 2 tokens à chacun
    if (!record) {
      // create record to prevent race conditions
      record = new FriendshipReward({ user1: u1, user2: u2 });
    }

    /* Commenté - Distribution de tokens désactivée
    if (!record.rewarded) {
      try {
        // only if both have walletAddress
        if (toUser.walletAddress) {
          await distributeTokens(toUser.walletAddress, 2);
        }
        if (fromUser.walletAddress) {
          await distributeTokens(fromUser.walletAddress, 2);
        }
        record.rewarded = true;
        await record.save();
        console.log(`[REWARD] 2 tokens distributed to ${toUserId} and ${fromUserId}`);
      } catch (err) {
        console.error('[REWARD ERROR] Failed to distribute friend reward:', err);
        // ne pas bloquer l'acceptation d'ami
      }
    }
    */

    // 4. Procéder à l'ajout en amis (existant)
    if (!toUser.friends.includes(fromUserId)) {
      toUser.friends.push(fromUserId);
    }
    if (!fromUser.friends.includes(toUserId)) {
      fromUser.friends.push(toUserId);
    }
    toUser.friendRequestsReceived = toUser.friendRequestsReceived.filter(id => id.toString() !== fromUserId);
    fromUser.friendRequestsSent = fromUser.friendRequestsSent.filter(id => id.toString() !== toUserId);

    await toUser.save();
    await fromUser.save();

    return res.json({ message: "Friend request accepted" });
  } catch (err) {
    console.error("Error accepting friend request:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * Reject a friend request sent by another user.
 */
export const rejectFriendRequest = async (req, res) => {
  const toUserId = req.user.id;
  const fromUserId = req.params.id;
  try {
    const toUser = await User.findById(toUserId);
    const fromUser = await User.findById(fromUserId);
    // Remove pending request
    toUser.friendRequestsReceived = toUser.friendRequestsReceived.filter(id => id.toString() !== fromUserId);
    fromUser.friendRequestsSent = fromUser.friendRequestsSent.filter(id => id.toString() !== toUserId);
    await toUser.save();
    await fromUser.save();
    return res.json({ message: "Friend request rejected" });
  } catch (err) {
    console.error("Error rejecting friend request:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * Get current user's friend connections: sent requests, received requests, and friends list.
 */
export const getConnections = async (req, res) => {
  const userId = req.user.id;
  try {
    const user = await User.findById(userId)
      .populate('friendRequestsSent', 'name')
      .populate('friendRequestsReceived', 'name')
      .populate('friends', 'name social.twitter.id social.telegram.id social.discord.id');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const sent = user.friendRequestsSent.map(u => ({ id: u._id, name: u.name }));
    const received = user.friendRequestsReceived.map(u => ({ id: u._id, name: u.name }));
    const friends = user.friends.map(u => ({
      id: u._id,
      name: u.name,
      socialAccounts: {
        twitter: !!u.social?.twitter?.id,
        telegram: !!u.social?.telegram?.id,
        discord: !!u.social?.discord?.id
      }
    }));
    return res.json({ sent, received, friends });
  } catch (err) {
    console.error('Error fetching connections:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const getUserProfileById = async (req, res) => {
  try {
    const { id } = req.params;

    // Ne renvoie jamais de secrets (mot de passe, tokens OAuth…)
    const user = await User.findById(id)
      .select('-password -social.twitter.token -social.twitter.tokenSecret')
      .lean();

    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.json(user);
  } catch (err) {
    console.error('[USER] getUserProfileById error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};
/**
 * Get another user's friends list (for friend map).
 */
export const getUserConnectionsById = async (req, res) => {
  const userId = req.params.id;
  try {
    const user = await User.findById(userId)
      .populate('friends', 'name');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const friends = user.friends.map(u => ({ id: u._id, name: u.name }));
    return res.json({ friends });
  } catch (err) {
    console.error('Error fetching user connections by id:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get all verified users.
 */
export const getVerifiedUsers = async (req, res) => {
  try {
    // Parse pagination and search parameters
    const { query: searchTerm = '', page = 1, limit = 10 } = req.query;
    const pageNumber = parseInt(page, 10) || 1;
    const limitNumber = parseInt(limit, 10) || 10;
    const skip = (pageNumber - 1) * limitNumber;

    // Build query to get verified users, filtering by username if searchTerm exists
    const query = { verified: true };
    if (searchTerm) {
      query.username = { $regex: searchTerm, $options: 'i' };
    }

    // Count total matching documents
    const total = await User.countDocuments(query);
    const pages = Math.ceil(total / limitNumber);

    // Fetch paginated user list
    const users = await User.find(query)
      .select(
        'username name verified walletAddress social createdAt'
      )
      .skip(skip)
      .limit(limitNumber);

    // Format user data for the response
    const formattedUsers = users.map(user => ({
      id: user._id,
      name: user.name,
      username: user.username,
      verified: user.verified,
      walletAddress: user.walletAddress,
      createdAt: user.createdAt,
      social: user.social,
      avatar:
        user.social?.google?.profileImageUrl ||
        user.social?.twitter?.profileImageUrl ||
        user.social?.facebook?.profileImageUrl ||
        user.social?.instagram?.profileImageUrl ||
        `https://api.dicebear.com/7.x/identicon/svg?seed=${user._id}`
    }));

    return res.status(200).json({
      success: true,
      users: formattedUsers,
      pagination: {
        total,
        page: pageNumber,
        pages
      }
    });
  } catch (error) {
    console.error('Error fetching verified users:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while fetching verified users'
    });
  }
};