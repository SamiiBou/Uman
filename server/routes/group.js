import express from 'express';
import Group from '../models/Group.js';
import User  from '../models/User.js';
import mongoose from 'mongoose';           


const router = express.Router();

// 1️⃣ Track a speaking user in a group
// routes/group.js (inside POST /groups/:chatId/members)
// routes/group.js
router.post('/groups/:chatId/members', async (req, res) => {
    const { chatId }          = req.params;
    const { userId, username, firstName, lastName, photo } = req.body;
  
    // 1️⃣ Upsert User by telegramId
    const user = await User.findOneAndUpdate(
      { telegramId: userId },
      {
        $set: {
          telegramId: userId,
          username  : username ?? undefined,
          name      : (firstName || lastName) ? `${firstName ?? ''} ${lastName ?? ''}`.trim() : undefined,
          'social.telegram': {
            id             : userId,
            username       : username,
            firstName      : firstName,
            lastName       : lastName,
            profileImageUrl: photo,
            lastUpdated    : new Date()
          }
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  
    // 2️⃣ Associer le membre au groupe
    let group = await Group.findOne({ chatId });
    if (!group) group = new Group({ chatId, members: [] });
  
    if (!group.members.includes(user._id)) {
      group.members.push(user._id);
      await group.save();
    }
  
    res.sendStatus(200);
  });


// 2️⃣ Return total & verified member counts
router.get('/groups/:chatId/stats', async (req, res) => {
  const { chatId } = req.params;
  const group = await Group.findOne({ chatId }).populate('members', 'username name social.telegram.username');
  if (!group) {
    return res.status(404).json({ success: false, message: 'Group not found' });
  }
  const total    = group.members.length;
  const verified = group.members.filter(u => u.verified).length;
  res.json({ success: true, totalMembers: total, verifiedMembers: verified });
});

export default router;
