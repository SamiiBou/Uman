import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { getDistributionStats, manualDistributeTokens } from '../services/autoTokenDistributor.js';
import User from '../models/User.js';

const router = express.Router();

// Middleware pour vérifier les droits d'administration (vous pouvez l'ajuster selon vos besoins)
const requireAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    
    // Vous pouvez définir vos propres critères d'admin ici
    // Par exemple: vérifier un champ isAdmin, ou une liste d'adresses spécifiques
    const adminWallets = process.env.ADMIN_WALLETS?.split(',') || [];
    
    if (!user || !adminWallets.includes(user.walletAddress)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Accès refusé - Droits administrateur requis' 
      });
    }
    
    next();
  } catch (error) {
    console.error('[ADMIN MIDDLEWARE] Erreur:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la vérification des droits' 
    });
  }
};

/**
 * GET /api/admin/distribution/stats
 * Obtenir les statistiques de distribution automatique
 */
router.get('/distribution/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const stats = await getDistributionStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('[ADMIN] Erreur lors de la récupération des stats:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques',
      error: error.message
    });
  }
});

/**
 * POST /api/admin/distribution/manual
 * Déclencher une distribution manuelle
 */
router.post('/distribution/manual', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log(`[ADMIN] Distribution manuelle déclenchée par l'utilisateur ${req.user.id}`);
    
    // Exécuter la distribution manuelle
    await manualDistributeTokens();
    
    res.json({
      success: true,
      message: 'Distribution manuelle exécutée avec succès',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[ADMIN] Erreur lors de la distribution manuelle:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la distribution manuelle',
      error: error.message
    });
  }
});

/**
 * GET /api/admin/users/token-summary
 * Obtenir un résumé des tokens par utilisateur
 */
router.get('/users/token-summary', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, sortBy = 'tokenBalance', order = 'desc' } = req.query;
    
    const sortOrder = order === 'asc' ? 1 : -1;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const users = await User.find({
      temporary: { $ne: true },
      walletAddress: { $exists: true, $ne: null }
    })
    .select('walletAddress username tokenBalance autoDistributionHistory createdAt')
    .sort({ [sortBy]: sortOrder })
    .skip(skip)
    .limit(parseInt(limit));
    
    const totalUsers = await User.countDocuments({
      temporary: { $ne: true },
      walletAddress: { $exists: true, $ne: null }
    });
    
    res.json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalUsers / parseInt(limit)),
          totalUsers,
          hasNextPage: skip + users.length < totalUsers,
          hasPrevPage: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('[ADMIN] Erreur lors de la récupération du résumé des tokens:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du résumé',
      error: error.message
    });
  }
});

/**
 * GET /api/admin/distribution/history
 * Obtenir l'historique des distributions automatiques
 */
router.get('/distribution/history', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 100 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Agréger l'historique de toutes les distributions automatiques
    const history = await User.aggregate([
      { $match: { 'autoDistributionHistory.0': { $exists: true } } },
      { $unwind: '$autoDistributionHistory' },
      { 
        $project: {
          walletAddress: 1,
          username: 1,
          'autoDistributionHistory.amount': 1,
          'autoDistributionHistory.timestamp': 1,
          'autoDistributionHistory.type': 1
        }
      },
      { $sort: { 'autoDistributionHistory.timestamp': -1 } },
      { $skip: skip },
      { $limit: parseInt(limit) }
    ]);
    
    const totalDistributions = await User.aggregate([
      { $match: { 'autoDistributionHistory.0': { $exists: true } } },
      { $unwind: '$autoDistributionHistory' },
      { $count: 'total' }
    ]);
    
    const total = totalDistributions[0]?.total || 0;
    
    res.json({
      success: true,
      data: {
        history,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalDistributions: total,
          hasNextPage: skip + history.length < total,
          hasPrevPage: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('[ADMIN] Erreur lors de la récupération de l\'historique:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\'historique',
      error: error.message
    });
  }
});

export default router; 