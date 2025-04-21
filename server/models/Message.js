import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  // Whether the receiver has read the message
  read: { type: Boolean, default: false }
});

/**
 * Message model represents a direct message between users.
 */
const Message = mongoose.model('Message', messageSchema);
export default Message;