import cron from 'node-cron';
import User from '../models/User.js';
import mongoose from 'mongoose';

/**
 * Service de distribution automatique de tokens UMI
 * Distribue 0.5 tokens UMI à tous les utilisateurs toutes les 2 heures
 */

const AUTO_REWARD_AMOUNT = 0.5; // 0.5 tokens UMI par distribution
const DISTRIBUTION_INTERVAL = '0 */2 * * *'; // Chaque 2 heures (à 00:00, 02:00, 04:00, etc.)

let isRunning = false;

/**
 * Fonction principale de distribution automatique
 */
async function distributeAutoTokens() {
  if (isRunning) {
    console.log('[AUTO DISTRIBUTOR] Une distribution est déjà en cours, ignorer cette exécution');
    return;
  }

  isRunning = true;
  const startTime = new Date();
  
  try {
    console.log(`[AUTO DISTRIBUTOR] 🚀 Début de la distribution automatique de ${AUTO_REWARD_AMOUNT} tokens UMI à ${startTime.toISOString()}`);
    
    // Récupérer tous les utilisateurs actifs (non temporaires et avec une adresse wallet)
    const users = await User.find({ 
      temporary: { $ne: true }, // Exclure les utilisateurs temporaires
      walletAddress: { $exists: true, $ne: null } // Seulement les utilisateurs avec wallet
    }).select('_id walletAddress username tokenBalance');

    if (users.length === 0) {
      console.log('[AUTO DISTRIBUTOR] ⚠️ Aucun utilisateur éligible trouvé');
      return;
    }

    console.log(`[AUTO DISTRIBUTOR] 📊 ${users.length} utilisateurs éligibles trouvés`);

    // Mise à jour en lot pour optimiser les performances
    const updateResult = await User.updateMany(
      { 
        temporary: { $ne: true },
        walletAddress: { $exists: true, $ne: null }
      },
      { 
        $inc: { tokenBalance: AUTO_REWARD_AMOUNT },
        $push: {
          // Ajouter un historique de distribution automatique (optionnel)
          autoDistributionHistory: {
            amount: AUTO_REWARD_AMOUNT,
            timestamp: startTime,
            type: 'auto_hourly'
          }
        }
      }
    );

    const endTime = new Date();
    const duration = endTime - startTime;

    console.log(`[AUTO DISTRIBUTOR] ✅ Distribution terminée avec succès !`);
    console.log(`[AUTO DISTRIBUTOR] 📈 ${updateResult.modifiedCount} utilisateurs récompensés`);
    console.log(`[AUTO DISTRIBUTOR] 💰 Total distribué: ${(updateResult.modifiedCount * AUTO_REWARD_AMOUNT).toFixed(2)} tokens UMI`);
    console.log(`[AUTO DISTRIBUTOR] ⏱️ Durée: ${duration}ms`);
    
    // Log détaillé en mode développement
    if (process.env.NODE_ENV === 'development') {
      console.log(`[AUTO DISTRIBUTOR] 🔍 Utilisateurs récompensés:`);
      const updatedUsers = await User.find({ 
        temporary: { $ne: true },
        walletAddress: { $exists: true, $ne: null }
      }).select('walletAddress username tokenBalance').limit(10);
      
      updatedUsers.forEach(user => {
        console.log(`  - ${user.username || 'No username'} (${user.walletAddress}): ${user.tokenBalance} tokens`);
      });
      
      if (users.length > 10) {
        console.log(`  ... et ${users.length - 10} autres utilisateurs`);
      }
    }

  } catch (error) {
    console.error('[AUTO DISTRIBUTOR] ❌ Erreur lors de la distribution automatique:', error);
    
    // Log plus détaillé de l'erreur
    console.error('[AUTO DISTRIBUTOR] Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
  } finally {
    isRunning = false;
    console.log('[AUTO DISTRIBUTOR] 🔓 Distribution terminée, verrou relâché');
  }
}

/**
 * Démarre le service de distribution automatique
 */
export function startAutoTokenDistribution() {
  console.log('[AUTO DISTRIBUTOR] 🔧 Initialisation du service de distribution automatique...');
  console.log(`[AUTO DISTRIBUTOR] ⏰ Programmé pour s'exécuter: ${DISTRIBUTION_INTERVAL}`);
  console.log(`[AUTO DISTRIBUTOR] 💰 Montant par distribution: ${AUTO_REWARD_AMOUNT} tokens UMI`);
  
  // Programmer la tâche cron
  const task = cron.schedule(DISTRIBUTION_INTERVAL, distributeAutoTokens, {
    scheduled: false, // Ne pas démarrer automatiquement
    timezone: process.env.TIMEZONE || 'UTC' // Utiliser le fuseau horaire configuré ou UTC par défaut
  });

  // Démarrer la tâche
  task.start();
  
  console.log('[AUTO DISTRIBUTOR] ✅ Service de distribution automatique démarré avec succès !');
  console.log(`[AUTO DISTRIBUTOR] 📅 Prochaine exécution prévue: ${getNextExecutionTime()}`);
  
  // Optionnel: exécuter une première distribution au démarrage (pour test)
  if (process.env.AUTO_DISTRIBUTE_ON_START === 'true') {
    console.log('[AUTO DISTRIBUTOR] 🎯 Exécution immédiate activée (AUTO_DISTRIBUTE_ON_START=true)');
    setTimeout(distributeAutoTokens, 5000); // Attendre 5 secondes après le démarrage
  }

  return task;
}

/**
 * Arrête le service de distribution automatique
 */
export function stopAutoTokenDistribution(task) {
  if (task) {
    task.stop();
    console.log('[AUTO DISTRIBUTOR] 🛑 Service de distribution automatique arrêté');
  }
}

/**
 * Obtient l'heure de la prochaine exécution
 */
function getNextExecutionTime() {
  const now = new Date();
  const nextExecution = new Date(now);
  
  // Calculer la prochaine heure paire (00:00, 02:00, 04:00, etc.)
  const currentHour = now.getHours();
  const nextHour = Math.ceil(currentHour / 2) * 2;
  
  if (nextHour === currentHour && now.getMinutes() === 0 && now.getSeconds() === 0) {
    // Si on est exactement sur une heure de distribution, la prochaine est dans 2h
    nextExecution.setHours(currentHour + 2, 0, 0, 0);
  } else if (nextHour > 23) {
    // Si on dépasse 23h, aller au lendemain à 00:00
    nextExecution.setDate(nextExecution.getDate() + 1);
    nextExecution.setHours(0, 0, 0, 0);
  } else {
    nextExecution.setHours(nextHour, 0, 0, 0);
  }
  
  return nextExecution.toISOString();
}

/**
 * Fonction pour distribution manuelle (utile pour les tests ou administration)
 */
export async function manualDistributeTokens() {
  console.log('[AUTO DISTRIBUTOR] 🔧 Distribution manuelle déclenchée');
  await distributeAutoTokens();
}

/**
 * Obtient les statistiques de distribution
 */
export async function getDistributionStats() {
  try {
    const totalUsers = await User.countDocuments({ 
      temporary: { $ne: true },
      walletAddress: { $exists: true, $ne: null }
    });
    
    const totalTokensInSystem = await User.aggregate([
      { 
        $match: { 
          temporary: { $ne: true },
          walletAddress: { $exists: true, $ne: null }
        }
      },
      { 
        $group: { 
          _id: null, 
          totalTokens: { $sum: '$tokenBalance' } 
        }
      }
    ]);

    return {
      eligibleUsers: totalUsers,
      totalTokensInSystem: totalTokensInSystem[0]?.totalTokens || 0,
      tokensPerDistribution: AUTO_REWARD_AMOUNT,
      distributionAttempts: totalUsers * AUTO_REWARD_AMOUNT,
      nextExecution: getNextExecutionTime(),
      isCurrentlyRunning: isRunning
    };
  } catch (error) {
    console.error('[AUTO DISTRIBUTOR] Erreur lors de la récupération des stats:', error);
    throw error;
  }
} 