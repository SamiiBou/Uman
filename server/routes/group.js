import express from 'express';
import Group from '../models/Group.js';
import User  from '../models/User.js';
import mongoose from 'mongoose';           


const router = express.Router();

// 1️⃣ Track a speaking user in a group
// routes/group.js (inside POST /groups/:chatId/members)
router.post('/groups/:chatId/members', async (req, res) => {
    const { chatId } = req.params;
    const { userId } = req.body;  // this is a Telegram numeric ID
  
    // 1️⃣ Find or create the User by telegramId
    let user = await User.findOne({ telegramId: userId });
    if (!user) {
      user = new User({ telegramId: userId });
      await user.save();
    }
  
    // 2️⃣ Now we have a valid Mongo ObjectId
    const userObjectId = user._id;
  
    // 3️⃣ Fetch or create the group
    let group = await Group.findOne({ chatId });
    if (!group) group = new Group({ chatId, members: [] });
  
    // 4️⃣ Add member only if not already present
    if (!group.members.includes(userObjectId)) {
      group.members.push(userObjectId);
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
  const total    = group.members.length;
  const verified = group.members.filter(u => u.verified).length;
  res.json({ success: true, totalMembers: total, verifiedMembers: verified });
});

export default router;
