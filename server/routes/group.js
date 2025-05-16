import express from 'express';
import Group from '../models/Group.js';
import User  from '../models/User.js';

const router = express.Router();

// 1️⃣ Track a speaking user in a group
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
  const total    = group.members.length;
  const verified = group.members.filter(u => u.verified).length;
  res.json({ success: true, totalMembers: total, verifiedMembers: verified });
});

export default router;
