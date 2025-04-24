// routes/airdrop.js
import { Router } from 'express';
import { ethers } from 'ethers';
import User from '../models/User.js';          // ← assure-toi que le path est correct
import { authenticateToken as authMiddleware } from '../middleware/authMiddleware.js';

const router      = Router();
const distributor = '0x36a4E57057f9EE65d5b26bfF883b62Ad47D4B775';

const signerPk = process.env.TOKEN_PRIVATE_KEY;
if (!signerPk) throw new Error('TOKEN_PRIVATE_KEY non défini');

const signer = new ethers.Wallet(signerPk);

const DOMAIN = {
  name             : 'Distributor',
  version          : '1',
  chainId          : 480,               // ⚠️ adapte si tu changes de réseau
  verifyingContract: distributor,
};

const VOUCHER_TYPES = {
  Voucher: [
    { name: 'to',       type: 'address' },
    { name: 'amount',   type: 'uint256' },
    { name: 'nonce',    type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ],
};

/**
 * POST /api/airdrop/request
 * Body : {}
 * Headers : Authorization: Bearer <token>   (ou session cookie)
 */
router.post('/request', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;                       // injecté par le middleware
    const user   = await User.findById(userId).select('walletAddress tokenBalance');
    if (!user)            return res.status(404).json({ error: 'User not found' });
    if (!user.walletAddress)
      return res.status(400).json({ error: 'Wallet address missing in profile' });

    // 1) Montant disponible hors-chaîne
    const balance = Number(user.tokenBalance || 0);
    if (balance <= 0)
      return res.status(400).json({ error: 'Nothing to claim – balance is already 0' });

    // 2) Préparation du voucher dynamiquement
    const amount   = ethers.parseUnits(balance.toString(), 18);
    const nonce    = Date.now();
    const deadline = Math.floor(Date.now() / 1000) + 3600;   // +1 h

    const voucher = {
      to      : user.walletAddress,
      amount  : amount.toString(),
      nonce   : nonce.toString(),
      deadline: deadline.toString(),
    };

    // 3) Signature EIP-712
    const signature = await signer.signTypedData(DOMAIN, VOUCHER_TYPES, voucher);

    // 4) Mise à zéro atomique de la balance
    await User.updateOne({ _id: userId }, { $set: { tokenBalance: 0 } });

    // 5) Réponse
    return res.json({
      voucher,
      signature,
      claimedAmount: balance              
    });
  } catch (err) {
    console.error('[AIRDROP] Error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
