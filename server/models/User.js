import mongoose from 'mongoose'
import crypto from 'crypto'

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    sparse: true, // Allows multiple null values but unique emails otherwise
    index: true // Index for faster queries
  },
  // Ajout pour World ID
  verified: {
    type: Boolean,
    default: false
  },
  // Adresse du portefeuille utilisée pour la vérification World ID
  walletAddress: {
    type: String,
    unique: true, 
    sparse: true // Permet des valeurs null/undefined et des entrées uniques
  },

  username: {
    type: String,
    default: function() {
      if (this.walletAddress) {
        return `user_${this.walletAddress.substring(2, 8)}`;
      }
      return null;
    }
  },
  // On-chain verification proofs per social provider
  socialVerifications: {
    type: Map,
    of: new mongoose.Schema({
      verified:   { type: Boolean, default: false },
      timestamp:  { type: Date,    default: Date.now },
      txHash:     { type: String,  default: null },
      proofHash:  { type: String,  default: null }
    }, { _id: false }),
    default: {}
  },
  authMethod: {
    type: String,
    enum: ['email', 'twitter', 'google', 'facebook', 'instagram', 'tiktok', 'discord'],
    default: 'twitter'
  },
  verificationLevel: {
    type: String,
    enum: ['orb', 'device', 'phone'],
    default: 'device'
  },
  temporary: {
    type: Boolean,
    default: false
  },
  social: {
    twitter: {
      id: String, // Twitter user ID
      token: String, // Access token (OAuth 1.0a)
      refreshToken: String,
      username: String,
      name: String,
      profileImageUrl: String,
      description: String,
      followersCount: Number,
      followingCount: Number,
      verified: Boolean,
      createdAt: Date, // Twitter account creation date
      lastUpdated: Date // Last time we fetched data
    },
    google: {
      id: String, // Google user ID
      token: String, // Access token (OAuth 2.0)
      refreshToken: String, // Refresh token (OAuth 2.0)
      email: String, // User's Google email
      name: String, // User's full name from Google
      profileImageUrl: String, // URL of the profile picture
      lastUpdated: Date // Last time we fetched data
    },
    facebook: {
      id: String,          // Facebook user ID
      token: String,         // Access token (OAuth 2.0)
      email: String,         // User's Facebook email (requires permission)
      name: String,          // User's full name from Facebook
      profileImageUrl: String, // URL of the profile picture
      lastUpdated: Date      // Last time we fetched data
    },
    instagram: {
      id: String, // Instagram user ID
      token: String, // Access token (short-lived or long-lived)
      username: String, // Instagram username
      name: String, // Full name from Instagram (might be less common)
      profileImageUrl: String, // URL of the profile picture
      lastUpdated: Date // Last time we fetched data
    },
    // TikTok social login data
    tiktok: {
      id: String,             // TikTok user open_id
      token: String,          // Access token (OAuth 2.0)
      refreshToken: String,   // Refresh token (OAuth 2.0)
      username: String,       // TikTok unique user identifier (union_id or display_name)
      name: String,           // Display name from TikTok
      profileImageUrl: String,// URL of the profile picture
      description: String,    // User bio/description
      followersCount: Number, // Number of followers
      followingCount: Number, // Number following
      verified: Boolean,      // Whether account is verified
      createdAt: Date,        // Account creation date if available
      lastUpdated: Date       // Last time we fetched data
    }
    , // Telegram login data via Telegram Login Widget
    telegram: {
      id: String,               // Telegram user ID
      username: String,         // Telegram username (optional)
      firstName: String,        // First name
      lastName: String,         // Last name (optional)
      name: String,             // Combined name
      profileImageUrl: String,  // URL of the profile picture
      authDate: Date,           // Authentication date from widget
      lastUpdated: Date         // Last time linked or updated
    },
    // Discord login data via OAuth2
    discord: {
      id: String,             // Discord user ID
      username: String,       // Discord username
      discriminator: String,  // Discord discriminator
      email: String,          // User email from Discord
      avatar: String,         // Avatar hash or URL
      token: String,          // Access token
      refreshToken: String,   // Refresh token
      lastUpdated: Date       // Last time linked or updated
    }
    // Vous pourrez ajouter d'autres réseaux sociaux ici plus tard
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  // Code de parrainage unique généré automatiquement
  referralCode: {
    type: String,
    unique: true,
    index: true,
    default: () => crypto.randomBytes(6).toString('hex')
  },
  // Référence vers l'utilisateur parrain (le cas échéant)
  referrer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  // Daily login streak tracking
  dailyLogin: {
    currentStreak: { type: Number, default: 0 },
    maxStreak: { type: Number, default: 0 },
    lastLogin: { type: Date },
    firstLoginOfDay: { type: Date } // New field to track first login of each day
  },
  
  // Friend system: sent and received friend requests, and friends list
  friendRequestsSent: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  friendRequestsReceived: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  friends: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
})

const User = mongoose.model('User', UserSchema)

export default User