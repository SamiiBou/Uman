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
        let groupQuery = Group.findOne({ chatId });

        if (includeUsers) {
            // On populate les champs nécessaires pour l'affichage dans le bot
            groupQuery = groupQuery.populate({
                path: "members",
                select: "telegramId username verified social.telegram.username social.telegram.firstName social.telegram.lastName" // Ajoutez les champs dont vous avez besoin
            });
        }

        const group = await groupQuery.exec();

        if (!group) {
            return res.status(404).json({ success: false, message: "Group not found or not yet tracked." });
        }

        const totalMembersInDB = group.members.length;
        let verifiedHumansInDB = 0;
        let memberSamples = [];

        if (totalMembersInDB > 0 && Array.isArray(group.members) && group.members[0]._id) { // Vérifier si members est bien populé
            verifiedHumansInDB = group.members.filter(member => member.verified === true).length;

            if (includeUsers) {
                memberSamples = group.members.map(u => ({
                    // `u.username` est le username UmanApp global
                    // `u.social.telegram.username` est le username Telegram spécifique
                    // Pour le bot, on veut afficher le username Telegram
                    username: u.social?.telegram?.username, // Priorité au username Telegram
                    telegramId: u.telegramId,
                    firstName: u.social?.telegram?.firstName,
                    lastName: u.social?.telegram?.lastName,
                    verified: u.verified, // Statut de vérification WorldID global de l'utilisateur
                    // umanUsername: u.username // Si vous voulez aussi le username UmanApp
                })).slice(0, 20); // Limiter le nombre d'échantillons
            }
        } else if (totalMembersInDB > 0) {
             // Les membres ne sont pas populés, on ne peut pas compter les vérifiés ni donner d'échantillons
             // Cela ne devrait pas arriver si includeUsers=true et qu'il y a des membres.
             console.warn(`Group ${chatId} has ${totalMembersInDB} members, but they were not populated for stats.`);
        }


        const payload = {
            success: true,
            chatId: chatId,
            totalMembers: totalMembersInDB,       // Nombre de membres que le bot a vu et stocké
            verifiedMembers: verifiedHumansInDB,  // Parmi ceux stockés, combien ont User.verified = true
            members: includeUsers ? memberSamples : undefined
        };

        res.json(payload);

    } catch (error) {
        console.error(`Error in /groups/${chatId}/stats: `, error);
        res.status(500).json({ success: false, message: "Server error while fetching group stats." });
    }
});

export default router;