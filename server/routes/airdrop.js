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
  for (;;) {
    try {
      const wcUrl = `https://developer.worldcoin.org/api/v2/minikit/transaction/${txId}` +
                    `?app_id=${process.env.APP_ID}&type=transaction`;
      console.log(`[monitorTx] ⏳ Fetching Worldcoin status from ${wcUrl}`);
      const wcResp = await fetch(wcUrl);
      console.log(`[monitorTx] 🌐 Worldcoin response ok=${wcResp.ok}`);

      if (!wcResp.ok) {
        console.error('[monitorTx] Failed to fetch Worldcoin status:', await wcResp.text());
        await wait(5000);
        continue;
      }

      const wc = await wcResp.json();
      console.log('[monitorTx] Worldcoin payload:', wc);

      if (wc.transactionStatus === 'pending') {
        console.log(`[monitorTx] Transaction ${txId} still pending`);
        await wait(5000);
        continue;
      }

      if (wc.transactionStatus === 'failed') {
        console.warn(`[monitorTx] Transaction ${txId} failed, rolling back pending claim`);
        await User.updateOne({ _id: userId }, { $unset: { claimPending: '' } });
        console.log('[monitorTx] User claimPending reset');
        io?.to(userId).emit('claim_failed', { nonce });
        return;
      }

      console.log(`[monitorTx] Transaction ${txId} confirmed, hash=${wc.transactionHash}`);
      const receipt = await provider.getTransactionReceipt(wc.transactionHash);
      console.log('[monitorTx] Receipt fetched:', receipt);

      if (!receipt || receipt.status !== 1) {
        console.log('[monitorTx] Receipt not ready or failed, retrying...');
        await wait(5000);
        continue;
      }

      const user = await User.findById(userId).select('claimPending tokenBalance');
      console.log('[monitorTx] User DB state:', user);
      if (!user?.claimPending) {
        console.warn(`[monitorTx] No pending claim for user ${userId}, exiting`);
        return;
      }

      const amount = user.claimPending.amount;
      console.log(`[monitorTx] Finalizing claim, amount=${amount}`);

      const updateRes = await User.updateOne(
        { _id: userId },
        {
          $inc:   { tokenBalance: -amount },
          $unset: { claimPending: '' },
          $push:  { claimsHistory: { amount, txHash: wc.transactionHash, at: new Date() } }
        }
      );
      console.log('[monitorTx] DB update result:', updateRes);

      io?.to(userId).emit('claim_confirmed', { amount });
      console.log(`[monitorTx] 🏁 Monitoring complete for txId=${txId}`);
      return;

    } catch (error) {
      console.error(`[monitorTx] Error monitoring ${txId}:`, error);
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
        return res.status(400).json({ error: 'Claim already pending – confirm or cancel first' });
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
    console.log('[AIRDROP/confirm] DB update result:', update);

    if (!update.matchedCount) {
      console.warn('[AIRDROP/confirm] No matching pending claim');
      return res.status(404).json({ error: 'No matching pending claim' });
    }

    // Quick Worldcoin status check
    const checkUrl = `https://developer.worldcoin.org/api/v2/minikit/transaction/${txId}` +
                     `?app_id=${process.env.APP_ID}&type=transaction`;
    console.log('[AIRDROP/confirm] Checking Worldcoin status at', checkUrl);
    const wcResp = await fetch(checkUrl);
    const wc = await wcResp.json();
    console.log('[AIRDROP/confirm] Worldcoin status:', wc.transactionStatus);

    if (wc.transactionStatus === 'pending') {
      console.log('[AIRDROP/confirm] Status pending, returning 202');
      return res.status(202).json({ status: 'pending' });
    }

    console.log('[AIRDROP/confirm] Launching monitorTx');
    monitorTx(userId, txId, nonce).catch(e => console.error('[AIRDROP/confirm] monitorTx error:', e));

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