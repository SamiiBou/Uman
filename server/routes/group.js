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
// routes/group.js
router.get("/groups/:chatId/stats", async (req, res) => {
    const { chatId } = req.params;
    const includeUsers = req.query.users === "true";
  
    // 1. Préparer la requête
    let query = Group.findOne({ chatId });
    if (includeUsers) {
        query = query.populate(
            "members",
            "telegramId social.telegram.username social.telegram.firstName social.telegram.lastName verified"
          );
    }
  
    // 2. Exécuter
    const group = await query.exec();
    if (!group) {
      return res.status(404).json({ success: false, message: "Group not found" });
    }
  
    // 3. Construire la réponse
    const total    = group.members.length;
    const verified = group.members.filter(u => u.verified).length;
  
    const payload = {
      success: true,
      totalMembers:    total,
      verifiedMembers: verified
    };
  
    if (includeUsers) {
      payload.members = group.members.map(u => ({
        telegramId: u.telegramId,
        username:   u.social.telegram.username,   // <–– on prend le nested
        firstName:  u.social.telegram.firstName,
        lastName:   u.social.telegram.lastName,
        verified:   u.verified
      }));
    }
  
    res.json(payload);
  });


export default router;
