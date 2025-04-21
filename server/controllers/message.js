import Message from '../models/Message.js';

/**
 * Send a new message from the authenticated user to another user.
 */
export const sendMessage = async (req, res) => {
  try {
    const sender = req.user.id;
    const { receiverId, content } = req.body;
    if (!receiverId || !content) {
      return res.status(400).json({ success: false, message: 'receiverId and content are required' });
    }
    const msg = new Message({ sender, receiver: receiverId, content, read: false });
    await msg.save();
    res.status(201).json({ success: true, message: msg });
  } catch (err) {
    console.error('Error sending message:', err);
    res.status(500).json({ success: false, message: 'Error sending message' });
  }
};

/**
 * Get inbox messages for authenticated user (messages received).
 */
export const getInbox = async (req, res) => {
  try {
    const userId = req.user.id;
    const messages = await Message.find({ receiver: userId })
      .populate('sender', 'username name social.twitter.profileImageUrl')
      .sort('-createdAt');
    res.json({ success: true, messages });
  } catch (err) {
    console.error('Error fetching inbox:', err);
    res.status(500).json({ success: false, message: 'Error fetching inbox' });
  }
};

/**
 * Get sent messages for authenticated user.
 */
export const getSent = async (req, res) => {
  try {
    const userId = req.user.id;
    const messages = await Message.find({ sender: userId })
      .populate('receiver', 'username name social.twitter.profileImageUrl')
      .sort('-createdAt');
    res.json({ success: true, messages });
  } catch (err) {
    console.error('Error fetching sent messages:', err);
    res.status(500).json({ success: false, message: 'Error fetching sent messages' });
  }
};

/**
 * Get full conversation between authenticated user and other user.
 */
export const getConversation = async (req, res) => {
  try {
    const userId = req.user.id;
    const otherId = req.params.userId;
    const messages = await Message.find({
      $or: [
        { sender: userId, receiver: otherId },
        { sender: otherId, receiver: userId }
      ]
    })
      .sort('createdAt')
      .populate('sender', 'username')
      .populate('receiver', 'username');
    res.json({ success: true, messages });
  } catch (err) {
    console.error('Error fetching conversation:', err);
    res.status(500).json({ success: false, message: 'Error fetching conversation' });
  }
};
/**
 * Mark all messages from a given user as read in the conversation.
 */
export const markConversationRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const otherId = req.params.userId;
    await Message.updateMany(
      { sender: otherId, receiver: userId, read: false },
      { $set: { read: true } }
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Error marking conversation read:', err);
    res.status(500).json({ success: false, message: 'Error marking conversation read' });
  }
};