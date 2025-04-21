// models/LinkRequest.js
import mongoose from 'mongoose';

const LinkRequestSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  provider: { 
    type: String, 
    required: true 
  },
  state: { 
    type: String, 
    required: true,
    unique: true,  // Index unique existant
    index: true 
  },
  walletAddress: { 
    type: String 
  },
  created: { 
    type: Date, 
    default: Date.now, 
    expires: 3600 // Expire après 1 heure
  }
});

const LinkRequest = mongoose.model('LinkRequest', LinkRequestSchema);

export default LinkRequest;