import mongoose from 'mongoose';

const friendshipRewardSchema = new mongoose.Schema({
  user1: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  user2: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rewarded: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Ensure that each unordered pair appears only once
friendshipRewardSchema.index(
  { user1: 1, user2: 1 },
  { unique: true }
);

export default mongoose.model('FriendshipReward', friendshipRewardSchema);