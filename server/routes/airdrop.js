/* routes/airdrop.js */
import { Router } from 'express';
import { ethers } from 'ethers';
import User from '../models/User.js';
import { authenticateToken as auth } from '../middleware/authMiddleware.js';
import { setTimeout as wait } from 'node:timers/promises';
import mongoose, { Types } from 'mongoose';   // 👈  AJOUT


const router = Router();

/* ------------------------------------------------------------------ */
/* ⚙️  CONFIG                                                         */
/* ------------------------------------------------------------------ */
const DISTRIBUTOR = '0x36a4E57057f9EE65d5b26bfF883b62Ad47D4B775';
const signerPk    = process.env.TOKEN_PRIVATE_KEY;
if (!signerPk) throw new Error('TOKEN_PRIVATE_KEY must be set in .env');
const signer = new ethers.Wallet(signerPk);

const DOMAIN = {
  name: 'Distributor',
  version: '1',
  chainId: 480,
  verifyingContract: DISTRIBUTOR,
};

const VOUCHER_TYPES = {
  Voucher: [
    { name: 'to', type: 'address' },
    { name: 'amount', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ],
};

const provider = new ethers.JsonRpcProvider(
  process.env.RPC_URL ?? 'https://worldchain-mainnet.g.alchemy.com/v2/YOUR_KEY'
);

let io;
export const setSocketIO = (socket) => { io = socket; };

const CLAIM_TTL_MS = 3600 * 1000; // 1h = 3600000ms

async function monitorTx(userId, txId, nonce) {
  console.log(`[monitorTx] 🔍 Starting monitorTx for user=${userId}, txId=${txId}, nonce=${nonce}`);
  let retryCount = 0;
  const MAX_RETRIES = 12; // on retente 12 fois => ~1 minute (avec 5 s d’attente)

  for (;;) {
    try {
      const wcUrl = `https://developer.worldcoin.org/api/v2/minikit/transaction/${txId}` +
                    `?app_id=${process.env.APP_ID}&type=transaction`;
      console.log(`[monitorTx] ⏳ Fetching Worldcoin status from ${wcUrl}`);
      const wcResp = await fetch(wcUrl, {
        headers: {
          'Authorization': `Bearer ${process.env.API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      console.log(`[monitorTx] 🌐 Worldcoin response ok=${wcResp.ok} (status=${wcResp.status})`);

      if (!wcResp.ok) {
        const text = await wcResp.text();
        console.error(`[monitorTx] ❌ Failed to fetch Worldcoin status: HTTP ${wcResp.status} – ${text || '[no body]'}`);
        retryCount++;
        if (retryCount >= MAX_RETRIES) {
          console.error(`[monitorTx] ⚠️ Trop de tentatives infructueuses, on abandonne le monitorTx pour txId=${txId}`);
          io?.to(userId).emit('claim_error', { message: 'Impossible de vérifier la transaction.' });
          return;
        }
        await wait(5000);
        continue;
      }

      // → ici, on a wcResp.ok===true
      const wc = await wcResp.json();
      console.log('[monitorTx] Worldcoin payload:', wc);

      // Notez que la propriété dans la réponse est snake_case, pas camelCase
      // Doc : transaction_status (snake_case) :contentReference[oaicite:2]{index=2}
      const txStatus = wc.transaction_status || wc.transactionStatus;
      if (txStatus === 'pending') {
        console.log(`[monitorTx] Transaction ${txId} toujours en pending`);
        await wait(5000);
        continue;
      }

      if (txStatus === 'failed') {
        console.warn(`[monitorTx] Transaction ${txId} a échoué`);
        await User.updateOne({ _id: userId }, { $unset: { claimPending: '' } });
        io?.to(userId).emit('claim_failed', { nonce });
        return;
      }

      // Si on arrive ici, txStatus === 'mined' (ou une autre valeur type 'success')
      const txHash = wc.transaction_hash || wc.transactionHash;
      console.log(`[monitorTx] Transaction confirmée, hash=${txHash}`);

      // Récupérer le receipt on-chain
      const receipt = await provider.getTransactionReceipt(txHash);
      if (!receipt || receipt.status !== 1) {
        console.log('[monitorTx] Receipt pas encore prêt ou failed, on retente…');
        await wait(5000);
        continue;
      }

      // Finaliser en base
      const user = await User.findById(userId).select('claimPending tokenBalance');
      if (!user?.claimPending) {
        console.warn(`[monitorTx] Aucun claimPending pour user ${userId}, on stoppe.`);
        return;
      }

      const amount = user.claimPending.amount;
      await User.updateOne(
        { _id: userId },
        {
          $inc:   { tokenBalance: -amount },
          $unset: { claimPending: '' },
          $push:  { claimsHistory: { amount, txHash, at: new Date() } }
        }
      );
      io?.to(userId).emit('claim_confirmed', { amount });
      console.log(`[monitorTx] 🏁 monitorTx terminé pour txId=${txId}`);
      return;

    } catch (error) {
      console.error(`[monitorTx] Erreur lors du monitoring ${txId}:`, error);
      retryCount++;
      if (retryCount >= MAX_RETRIES) {
        console.error(`[monitorTx] ⚠️ Trop de plantages, on abandonne le monitorTx pour txId=${txId}`);
        io?.to(userId).emit('claim_error', { message: 'Erreur interne lors du suivi de transaction.' });
        return;
      }
      await wait(5000);
    }
  }
}


export const resumePendingTransactions = async () => {
  console.log('[resumePendingTransactions] 🔄 Checking for pending claims on startup');
  try {
    const pendings = await User.find({ 'claimPending.txId': { $exists: true, $ne: null } })
      .select('claimPending _id');

    console.log(`[resumePendingTransactions] Found ${pendings.length} pending claims`);
    pendings.forEach(u => {
      console.log(`[resumePendingTransactions] Resuming user=${u._id}, txId=${u.claimPending.txId}`);
      monitorTx(u._id, u.claimPending.txId, u.claimPending.nonce)
        .catch(err => console.error('[resumePendingTransactions] Error:', err));
    });
    return pendings.length;
  } catch (err) {
    console.error('[resumePendingTransactions] Fatal:', err);
    return 0;
  }
};

/* ------------------------------------------------------------------ */
/* 1️⃣  Request voucher                                               */
/* ------------------------------------------------------------------ */
router.post('/request', auth, async (req, res) => {
  console.log('[AIRDROP/request] ➡️ Entry', { userId: req.user.id });
  try {
    const user = await User.findById(req.user.id)
      .select('walletAddress tokenBalance claimPending');
    console.log('[AIRDROP/request] User DB fetch:', user);

    if (!user) {
      console.warn('[AIRDROP/request] User not found');
      return res.status(404).json({ error: 'User not found' });
    }
    if (!user.walletAddress) {
      console.warn('[AIRDROP/request] Wallet not set');
      return res.status(400).json({ error: 'Wallet not set' });
    }

    // Handle expired pending
    if (user.claimPending) {
      const createdAt = Number(user.claimPending.nonce);
      const noTxId      = !user.claimPending.txId;
      const ttlExceeded = Date.now() - createdAt > 5 * 60_000;   // 5 min
      
      if (noTxId && !ttlExceeded) {
        // ↳ On renvoie simplement un *NOUVEAU* voucher (même nonce)
        const deadline = Math.floor(Date.now() / 1000) + 3600;
        const amount   = ethers.parseUnits(user.claimPending.amount.toString(), 18).toString();

        const voucher = {
          to: user.walletAddress,
          amount,
          nonce: user.claimPending.nonce,
          deadline: deadline.toString(),
        };

        const signature = await signer.signTypedData(DOMAIN, VOUCHER_TYPES, voucher);
        return res.json({ voucher, signature, claimedAmount: user.claimPending.amount, pending: true });
      }
      if (noTxId && ttlExceeded) {        
        console.log('[AIRDROP/request] Expired pending claim, clearing');
        await User.updateOne({ _id: user._id }, { $unset: { claimPending: '' } });
      } else {
        console.warn('[AIRDROP/request] Claim already pending', user.claimPending);
        return res.status(400).json({
          error: 'Claim already pending – confirm or cancel first',
          pending: {
            nonce: user.claimPending.nonce,
            txId: user.claimPending.txId ?? null,
          },
        });
      }
    }

    const balance = Number(user.tokenBalance || 0);
    if (balance <= 0) {
      console.warn('[AIRDROP/request] Nothing to claim, balance=0');
      return res.status(400).json({ error: 'Nothing to claim' });
    }

    const nonce    = Date.now().toString();
    const deadline = Math.floor(Date.now() / 1000) + 3600;
    const voucher  = {
      to:       user.walletAddress,
      amount:   ethers.parseUnits(balance.toString(), 18).toString(),
      nonce,
      deadline: deadline.toString(),
    };
    console.log('[AIRDROP/request] Voucher generated:', voucher);

    const signature = await signer.signTypedData(DOMAIN, VOUCHER_TYPES, voucher);
    console.log('[AIRDROP/request] Signature:', signature);

    const upd = await User.updateOne(
      { _id: user._id },
      { $set: { claimPending: { amount: balance, nonce } } }
    );
    console.log('[AIRDROP/request] DB update claimPending:', upd);

    return res.json({ voucher, signature, claimedAmount: balance });

  } catch (e) {
    console.error('[AIRDROP/request] ERROR:', e);
    return res.status(500).json({ error: 'Server error' });
  }
});

/* ------------------------------------------------------------------ */
/* 2️⃣  Confirm transaction                                           */
/* ------------------------------------------------------------------ */
router.post('/confirm', auth, async (req, res) => {
  console.log('[AIRDROP/confirm] ➡️ Entry', req.body);
  try {
    const { nonce, transaction_id: txId } = req.body;
    const userId = req.user.id;
    if (!nonce || !txId) {
      console.warn('[AIRDROP/confirm] Missing nonce or txId');
      return res.status(400).json({ error: 'Missing txId or nonce' });
    }

    const _id = new Types.ObjectId(userId);                // ← cast sûr
    const match = await User.findOne({ _id, 'claimPending.nonce': String(nonce) })
        .select('claimPending');
    console.log('[AIRDROP/confirm] Pending before update:', match);

    const updated = await User.findOneAndUpdate(
         { _id, 'claimPending.nonce': String(nonce), 'claimPending.txId': { $exists: false } },
         { $set: { 'claimPending.txId': txId } },
         { new: true }
       );                       // renvoie le doc après MAJ (null si rien n'a matché)
      
       if (!updated) {
         console.warn('[AIRDROP/confirm] No matching pending claim');
         return res.status(404).json({ error: 'No matching pending claim' });
       }
      
       // OK ➜ on lance le monitoring
       monitorTx(userId, txId, nonce).catch(e =>
         console.error('[AIRDROP/confirm] monitorTx error:', e)
       );
      
       return res.json({ ok: true });
  } catch (e) {
    console.error('[AIRDROP/confirm] ERROR:', e);
    return res.status(500).json({ error: 'Server error' });
  }
});

/* ------------------------------------------------------------------ */
/* 3️⃣  Cancel claim                                                  */
/* ------------------------------------------------------------------ */
router.post('/cancel', auth, async (req, res) => {
  console.log('[AIRDROP/cancel] ➡️ Entry', req.body);
  try {
    const { nonce } = req.body;
    const user = await User.findById(req.user.id).select('claimPending');
    console.log('[AIRDROP/cancel] User pending:', user.claimPending);

    if (!user?.claimPending || String(user.claimPending.nonce) !== String(nonce)) {
      console.warn('[AIRDROP/cancel] No matching pending claim');
      return res.status(400).json({ error: 'No matching pending claim' });
    }

    const upd = await User.updateOne({ _id: user._id }, { $unset: { claimPending: '' } });
    console.log('[AIRDROP/cancel] DB update result:', upd);

    return res.json({ ok: true });
  } catch (e) {
    console.error('[AIRDROP/cancel] ERROR:', e);
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
