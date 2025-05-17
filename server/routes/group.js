import express from 'express';
import Group from '../models/Group.js';
import User  from '../models/User.js';
// import mongoose from 'mongoose'; // Pas nécessaire ici si User et Group sont déjà importés

const router = express.Router();

// 1️⃣ Track a speaking user in a group AND update their Telegram-specific info
router.post('/groups/:chatId/members', async (req, res) => {
    const { chatId } = req.params;
    // Ces données viennent maintenant du bot Telegram
    const { userId, username, firstName, lastName } = req.body;

    if (!userId) {
        return res.status(400).json({ success: false, message: "Telegram userId is required." });
    }

    try {
        // 1️⃣ Upsert User by telegramId
        // On met à jour les informations de `social.telegram` et potentiellement le `username` et `name` racine
        // si c'est la première fois qu'on voit cet utilisateur ou si on veut les synchroniser.
        const userUpdateData = {
            telegramId: userId,
            // Mettre à jour le username racine seulement s'il n'est pas déjà défini ou si la source est Telegram.
            // Si le username racine peut venir d'ailleurs (ex: l'utilisateur le choisit dans l'app),
            // alors il ne faut pas l'écraser ici systématiquement.
            // Pour l'instant, on suppose que le username Telegram peut initialiser le username racine.
            ...(username && { username: username }), // Mettre à jour le username racine si fourni
            'social.telegram.id': userId,
            'social.telegram.username': username, // Peut être null/undefined
            'social.telegram.firstName': firstName, // Peut être null/undefined
            'social.telegram.lastName': lastName, // Peut être null/undefined
            'social.telegram.lastUpdated': new Date()
        };

        // Construire le nom complet si firstName ou lastName est fourni
        const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
        if (fullName) {
            userUpdateData.name = fullName; // Mettre à jour le nom racine si un nom complet est formé
            userUpdateData['social.telegram.name'] = fullName;
        }

        const user = await User.findOneAndUpdate(
            { telegramId: userId },
            { $set: userUpdateData, $setOnInsert: { createdAt: new Date() } }, // $setOnInsert pour les champs à ne définir qu'à la création
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        // 2️⃣ Associer le membre au groupe
        let group = await Group.findOne({ chatId });
        if (!group) {
            group = new Group({ chatId, members: [], createdAt: new Date(), updatedAt: new Date() });
        }

        if (!group.members.some(memberId => memberId.equals(user._id))) {
            group.members.push(user._id);
            group.updatedAt = new Date(); // Mettre à jour la date de modification du groupe
        }
        
        await group.save();

        res.status(200).json({ success: true, message: "User tracked in group.", userId: user._id, telegramId: user.telegramId });

    } catch (error) {
        console.error(`Error in /groups/${chatId}/members: `, error);
        res.status(500).json({ success: false, message: "Server error while tracking member." });
    }
});


// 2️⃣ Return total & verified member counts, and sample members
router.get("/groups/:chatId/stats", async (req, res) => {
    const { chatId } = req.params;
    const includeUsers = req.query.users === "true";
  
    try {
      // 1️⃣ Find the group (lean() for plain JS object)
      const group = await Group.findOne({ chatId }).lean();
      if (!group) {
        return res
          .status(404)
          .json({ success: false, message: "Group not found or not yet tracked." });
      }
  
      // 2️⃣ Basic counters
      const memberIds = group.members; // array of ObjectIds
      const totalMembersInDB = memberIds.length;
  
      // Count verified humans directly in MongoDB (no populate required)
      const verifiedHumansInDB = await User.countDocuments({
        _id: { $in: memberIds },
        verified: true,
      });
  
      // 3️⃣ Optional member sample for display
      let memberSamples = [];
      if (includeUsers && totalMembersInDB > 0) {
        memberSamples = await User.find({ _id: { $in: memberIds } })
          .select(
            "telegramId username verified social.telegram.username social.telegram.firstName social.telegram.lastName"
          )
          .limit(20)
          .lean()
          .exec();
  
        // Format the sample in the exact shape the bot expects
        memberSamples = memberSamples.map((u) => ({
          username: u.social?.telegram?.username || null,
          telegramId: u.telegramId,
          firstName: u.social?.telegram?.firstName || null,
          lastName: u.social?.telegram?.lastName || null,
          verified: u.verified,
        }));
      }
  
      // 4️⃣ Build and send payload
      const payload = {
        success: true,
        chatId,
        totalMembers: totalMembersInDB,
        verifiedMembers: verifiedHumansInDB,
        members: includeUsers ? memberSamples : undefined,
      };
  
      return res.json(payload);
    } catch (error) {
      console.error(`Error in /groups/${chatId}/stats:`, error);
      return res
        .status(500)
        .json({ success: false, message: "Server error while fetching group stats." });
    }
  });

export default router;