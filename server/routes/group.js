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
// routes/group.js
// -----------------------------------------------------------------------------
// GET /groups/:chatId/stats
//   ?users=true   → renvoie aussi un échantillon (max 20) de membres
// -----------------------------------------------------------------------------
router.get("/groups/:chatId/stats", async (req, res) => {
    const { chatId } = req.params;
    const includeUsers = req.query.users === "true";
  
    try {
      /* ----------------------------------------------------------------------
         1️⃣  Pipeline d’agrégation
         -------------------------------------------------------------------- */
      const pipeline = [
        { $match: { chatId } },                  // → group recherché
        { $project: { members: 1 } },            // on ne garde que le tableau
        { $unwind: "$members" },                 // explode 1 doc / membre
        {
          $lookup: {                             // jointure sur la collection users
            from: "users",
            localField: "members",
            foreignField: "_id",
            as: "member",
          },
        },
        { $unwind: "$member" },                  // member devient un objet unique
        {
          $group: {                              // on regroupe pour compter
            _id: null,
            totalMembers:   { $sum: 1 },
            verifiedMembers:{ $sum: { $cond: ["$member.verified", 1, 0] } },
            sample: {
              $push: {
                username:   "$member.social.telegram.username",
                telegramId: "$member.telegramId",
                firstName:  "$member.social.telegram.firstName",
                lastName:   "$member.social.telegram.lastName",
                verified:   "$member.verified",
              },
            },
          },
        },
      ];
  
      /* Limiter l’échantillon à 20 éléments seulement si demandé */
      if (!includeUsers) {
        pipeline.push({ $project: { sample: 0 } });
      } else {
        pipeline.push({ $addFields: { sample: { $slice: ["$sample", 20] } } });
      }
  
      /* ----------------------------------------------------------------------
         2️⃣  Exécution
         -------------------------------------------------------------------- */
      const result = await Group.aggregate(pipeline).exec();
      if (result.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Group not found or empty." });
      }
  
      const { totalMembers, verifiedMembers, sample } = result[0];
  
      /* ----------------------------------------------------------------------
         3️⃣  Payload
         -------------------------------------------------------------------- */
      return res.json({
        success: true,
        chatId,
        totalMembers,
        verifiedMembers,
        members: includeUsers ? sample : undefined,
      });
    } catch (error) {
      console.error(`Error in /groups/${chatId}/stats:`, error);
      return res
        .status(500)
        .json({ success: false, message: "Server error while fetching group stats." });
    }
  });
export default router;