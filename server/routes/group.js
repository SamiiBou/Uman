import express from 'express';
import Group from '../models/Group.js';
import User  from '../models/User.js';

const router = express.Router();

// 1️⃣ Track a speaking user in a group
router.post('/groups/:chatId/members', async (req, res) => {
    const { chatId } = req.params;
    const { userId } = req.body;
  
    // 1️⃣ Validate input
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid Mongo ObjectId' });
    }
  
    const userObjectId = new mongoose.Types.ObjectId(userId);
  
    // 2️⃣ Fetch or create the group
    let group = await Group.findOne({ chatId });
    if (!group) group = new Group({ chatId, members: [] });
  
    // 3️⃣ Add member only if not already present
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
