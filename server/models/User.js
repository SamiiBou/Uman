import mongoose from 'mongoose';
import crypto   from 'crypto';

/* ------------------------------------------------------------------ */
/* 📦  SOUS-SCHÉMAS                                                   */
/* ------------------------------------------------------------------ */
const SocialVerificationSchema = new mongoose.Schema(
  {
    verified  : { type: Boolean, default: false },
    timestamp : { type: Date,    default: Date.now },
    txHash    : { type: String,  default: null },
    proofHash : { type: String,  default: null },
  },
  { _id: false }
);

const ClaimPendingSchema = new mongoose.Schema(
  {
    amount: { type: Number, min: 0, required: true },
    nonce : { type: String, required: true },
  },
  { _id: false }
);

const ClaimHistorySchema = new mongoose.Schema(
  {
    amount : { type: Number, min: 0, required: true },
    txHash : { type: String, required: true },
    at     : { type: Date,   default: Date.now },
  },
  { _id: false }
);

/* ------------------------------------------------------------------ */
/* 🗂️  USER SCHEMA                                                    */
/* ------------------------------------------------------------------ */
const UserSchema = new mongoose.Schema(
  {
    /* ------- Identité & login ------------------------------------ */
    name:  { type: String, required: true },
    email: { type: String, sparse: true, index: true },

    verified     : { type: Boolean, default: false },       // World ID
    walletAddress: { type: String, unique: true, sparse: true },

    username: {
      type   : String,
      default: function () {
        if (this.walletAddress) return `user_${this.walletAddress.slice(2, 8)}`;
        return null;
      },
    },

    /* ------- Vérif sociales on-chain ----------------------------- */
    socialVerifications: {
      type   : Map,
      of     : SocialVerificationSchema,
      default: {},
    },

    authMethod: {
      type   : String,
      enum   : ['email','twitter','google','facebook','instagram','tiktok','discord'],
      default: 'twitter',
    },
    verificationLevel: {
      type   : String,
      enum   : ['orb','device','phone'],
      default: 'device',
    },
    temporary: { type: Boolean, default: false },

    /* ------- Profils sociaux OAuth ------------------------------- */
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
      },
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

    /* ------- Daily login ----------------------------------------- */
    dailyLogin: {
      currentStreak   : { type: Number, default: 0 },
      maxStreak       : { type: Number, default: 0 },
      lastLogin       : { type: Date },
      firstLoginOfDay : { type: Date },
    },

    /* ------- Parrainage & amis ----------------------------------- */
    referralCode: {
      type   : String,
      unique : true,
      index  : true,
      default: () => crypto.randomBytes(6).toString('hex'),
    },
    referrer:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    friendRequestsSent: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    friendRequestsReceived:[{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    friends:            [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    /* ------- Tokens ---------------------------------------------- */
    tokenBalance: { type: Number, default: 0, min: 0 },

    /* ====== 🆕 Airdrop pending & historique ====================== */
    claimPending : { type: ClaimPendingSchema, default: null },
    claimsHistory: { type: [ClaimHistorySchema], default: [] },

    /* ------- Meta ------------------------------------------------ */
    createdAt: { type: Date, default: Date.now },
  },
  { strict: true }          // garde « strict » pour capter les fautes
);

const User = mongoose.model('User', UserSchema);
export default User;