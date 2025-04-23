import mongoose from 'mongoose'; 
import User from '../models/User.js'; 
import dotenv from 'dotenv';

// Charger les variables d'environnement (peut rester si d'autres utils les utilisent)
dotenv.config();

console.log('[Token Distributor] Initialized for Database Balance Update.');

/**
 * Ajoute des tokens au solde BDD d'un utilisateur.
 * @param {string} userWalletAddress - Adresse portefeuille de l'utilisateur.
 * @param {number|string} amountTokens - Nombre de tokens à ajouter.
 * @returns {Promise<{success: boolean, message: string, newBalance?: number}>}
 */
export async function distributeTokens(userWalletAddress, amountTokens) {
  console.log(`[Token Distributor DB] distributeTokens called for userWalletAddress=${userWalletAddress}, amountTokens=${amountTokens}`);

  if (!userWalletAddress || amountTokens == null) {
    console.error('[Token Distributor DB] Missing userWalletAddress or amountTokens');
    return { success: false, message: 'Missing userWalletAddress or amountTokens' };
  }

  const amountToAdd = parseFloat(amountTokens.toString());
  if (isNaN(amountToAdd) || amountToAdd <= 0) {
    console.error(`[Token Distributor DB] Invalid amount: ${amountTokens}`);
    return { success: false, message: `Invalid amount: ${amountTokens}` };
  }

  try {
    // Trouver l'utilisateur par son adresse de portefeuille
    const user = await User.findOne({ walletAddress: userWalletAddress });

    if (!user) {
      console.warn(`[Token Distributor DB] User not found for walletAddress: ${userWalletAddress}`);
      // Optionnel : Créer un utilisateur ? Ou juste retourner une erreur ?
      // Pour l'instant, on retourne une erreur.
      return { success: false, message: `User not found for wallet address: ${userWalletAddress}` };
    }

    // Mettre à jour le solde de l'utilisateur
    // Utilisation de $inc pour une mise à jour atomique
    const updatedUser = await User.findOneAndUpdate(
      { _id: user._id },
      { $inc: { tokenBalance: amountToAdd } },
      { new: true } // Retourne le document mis à jour
    );

    if (!updatedUser) {
        // Ce cas est peu probable si l'utilisateur a été trouvé juste avant,
        // mais incluons une gestion d'erreur par sécurité.
        console.error(`[Token Distributor DB] Failed to update balance for user ${user._id}`);
        return { success: false, message: 'Failed to update user balance' };
    }

    console.log(`[Token Distributor DB] Successfully added ${amountToAdd} tokens to ${userWalletAddress}. New balance: ${updatedUser.tokenBalance}`);
    return { success: true, message: 'Tokens added successfully', newBalance: updatedUser.tokenBalance };

  } catch (error) {
    console.error(`[Token Distributor DB] Error updating token balance for ${userWalletAddress}:`, error);
    return { success: false, message: 'Database error during token distribution', error: error.message };
  }
}

/**
 * Tente d'ajouter 10 tokens de bienvenue au solde BDD de l'utilisateur.
 * @param {string} userWalletAddress
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function sendWelcomeTokens(userWalletAddress) {
  console.log(`[Token Distributor DB] Attempting to add 10 welcome tokens for ${userWalletAddress}`);
  const result = await distributeTokens(userWalletAddress, 10.0);
  if (result.success) {
    console.log(`[Token Distributor DB] Welcome tokens added successfully for ${userWalletAddress}.`);
  } else {
    console.error(`[Token Distributor DB] Failed to add welcome tokens for ${userWalletAddress}: ${result.message}`);
  }
  return result; // Retourne l'objet résultat complet
}

/**
 * Tente d'ajouter 100 tokens de vérification au solde BDD de l'utilisateur.
 * @param {string} userWalletAddress
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function sendVerificationTokens(userWalletAddress) {
  console.log(`[Token Distributor DB] Attempting to add 100 verification tokens for ${userWalletAddress}`);
  const result = await distributeTokens(userWalletAddress, 100.0);
   if (result.success) {
    console.log(`[Token Distributor DB] Verification tokens added successfully for ${userWalletAddress}.`);
  } else {
    console.error(`[Token Distributor DB] Failed to add verification tokens for ${userWalletAddress}: ${result.message}`);
  }
  return result; // Retourne l'objet résultat complet
}
