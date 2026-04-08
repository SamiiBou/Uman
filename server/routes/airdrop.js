/* routes/airdrop.js */
import { Router } from 'express';
import { ethers } from 'ethers';
import User from '../models/User.js';
import { authenticateToken as auth } from '../middleware/authMiddleware.js';
import { setTimeout as wait } from 'node:timers/promises';
import { Types } from 'mongoose';


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

const CLAIM_TTL_MS = 5 * 60 * 1000; // 5 minutes
const LEGACY_CLAIM_TTL_MS = 3600 * 1000; // 1 hour
const CLAIMS_HISTORY_LIMIT = 200;

function buildVoucher(to, amount, nonce, deadline) {
  return {
    to,
    amount: ethers.parseUnits(amount.toString(), 18).toString(),
    nonce,
    deadline: deadline.toString(),
  };
}

function getClaimDeadlineMs(claimPending) {
  if (!claimPending) return null;

  const storedDeadline = Number(claimPending.deadline);
  if (Number.isFinite(storedDeadline) && storedDeadline > 0) {
    return storedDeadline * 1000;
  }

  const legacyCreatedAt = Number(claimPending.nonce);
  if (Number.isFinite(legacyCreatedAt) && legacyCreatedAt > 0) {
    return legacyCreatedAt + LEGACY_CLAIM_TTL_MS;
  }

  return null;
}

function isClaimExpired(claimPending, now = Date.now()) {
  const deadlineMs = getClaimDeadlineMs(claimPending);
  return deadlineMs !== null && now >= deadlineMs;
}

function getRetryAfterSeconds(claimPending, now = Date.now()) {
  const deadlineMs = getClaimDeadlineMs(claimPending);
  if (deadlineMs === null) return null;
  return Math.max(0, Math.ceil((deadlineMs - now) / 1000));
}

async function clearPendingClaim(userId, claimPending) {
  if (!claimPending?.nonce) return false;

  const amount = Number(claimPending.amount || 0);
  const update = { $unset: { claimPending: '' } };

  if (claimPending.reserved && amount > 0) {
    update.$inc = { tokenBalance: amount };
  }

  const result = await User.updateOne(
    { _id: userId, 'claimPending.nonce': String(claimPending.nonce) },
    update
  );

  return result.modifiedCount > 0;
}

async function finalizePendingClaim(userId, nonce, txHash) {
  const user = await User.findById(userId).select('claimPending tokenBalance');
  if (!user?.claimPending || String(user.claimPending.nonce) !== String(nonce)) {
    return false;
  }

  const amount = user.claimPending.amount;
  const update = {
    $unset: { claimPending: '' },
    $push: {
      claimsHistory: {
        $each: [{ amount, txHash, at: new Date() }],
        $slice: -CLAIMS_HISTORY_LIMIT
      }
    }
  };

  if (!user.claimPending.reserved) {
    update.$inc = { tokenBalance: -amount };
  }

  const result = await User.updateOne(
    { _id: userId, 'claimPending.nonce': String(nonce) },
    update
  );

  return result.modifiedCount > 0;
}

async function fetchWorldcoinTransaction(txId) {
  if (!txId || !process.env.APP_ID) {
    return null;
  }

  const wcUrl =
    `https://developer.worldcoin.org/api/v2/minikit/transaction/${txId}` +
    `?app_id=${process.env.APP_ID}&type=transaction`;

  const headers = { 'Content-Type': 'application/json' };
  if (process.env.API_KEY) {
    headers.Authorization = `Bearer ${process.env.API_KEY}`;
  }

  const wcResp = await fetch(wcUrl, { headers });
  if (!wcResp.ok) {
    const text = await wcResp.text();
    throw new Error(`Worldcoin transaction lookup failed: HTTP ${wcResp.status} – ${text || '[no body]'}`);
  }

  return wcResp.json();
}

async function fetchReceiptSafely(txHash) {
  if (!txHash) {
    return null;
  }

  try {
    return await provider.getTransactionReceipt(txHash);
  } catch (error) {
    console.error(`[AIRDROP] Failed to fetch receipt for txHash=${txHash}:`, error);
    return null;
  }
}

async function reconcilePendingClaim(userId, claimPending) {
  if (!claimPending?.txId) {
    return { status: 'not_applicable' };
  }

  const tx = await fetchWorldcoinTransaction(claimPending.txId);
  const txStatus = tx?.transaction_status || tx?.transactionStatus || null;
  const txHash = tx?.transaction_hash || tx?.transactionHash || null;

  if (txStatus === 'mined') {
    const receipt = await fetchReceiptSafely(txHash);
    if (receipt?.status === 1) {
      const finalized = await finalizePendingClaim(userId, claimPending.nonce, txHash);
      return { status: finalized ? 'confirmed' : 'stale', txHash };
    }

    if (receipt?.status === 0) {
      const cleared = await clearPendingClaim(userId, claimPending);
      return { status: cleared ? 'failed' : 'stale', txHash };
    }

    const finalized = await finalizePendingClaim(
      userId,
      claimPending.nonce,
      txHash || claimPending.txId
    );
    return { status: finalized ? 'confirmed' : 'stale', txHash };
  }

  if (txStatus === 'failed') {
    const cleared = await clearPendingClaim(userId, claimPending);
    return { status: cleared ? 'failed' : 'stale', txHash };
  }

  if (isClaimExpired(claimPending)) {
    const cleared = await clearPendingClaim(userId, claimPending);
    return { status: cleared ? 'expired' : 'stale', txHash };
  }

  return { status: 'pending', txHash };
}

async function monitorTx(userId, txId, nonce) {
  console.log(`[monitorTx] 🔍 Starting monitorTx for user=${userId}, txId=${txId}, nonce=${nonce}`);
  let retryCount = 0;
  const MAX_RETRIES = 12; // on retente 12 fois => ~1 minute (avec 5 s d’attente)

  for (;;) {
    try {
      console.log(`[monitorTx] ⏳ Fetching Worldcoin status for txId=${txId}`);
      const wc = await fetchWorldcoinTransaction(txId);
      const txStatus = wc.transaction_status || wc.transactionStatus;
      console.log(`[monitorTx] 🌐 Worldcoin transaction status=${txStatus}`);

      if (!txStatus) {
        console.error(`[monitorTx] ❌ Missing transaction status for txId=${txId}`);
        retryCount++;
        if (retryCount >= MAX_RETRIES) {
          console.error(`[monitorTx] ⚠️ Trop de tentatives infructueuses, on abandonne le monitorTx pour txId=${txId}`);
          io?.to(userId).emit('claim_error', { message: 'Impossible de vérifier la transaction.' });
          return;
        }
        await wait(5000);
        continue;
      }

      console.log('[monitorTx] Worldcoin payload:', wc);

      // Notez que la propriété dans la réponse est snake_case, pas camelCase
      // Doc : transaction_status (snake_case) :contentReference[oaicite:2]{index=2}
      if (txStatus === 'pending') {
        console.log(`[monitorTx] Transaction ${txId} toujours en pending`);
        await wait(5000);
        continue;
      }

      if (txStatus === 'failed') {
        console.warn(`[monitorTx] Transaction ${txId} a échoué`);
        const failedUser = await User.findById(userId).select('claimPending');
        if (failedUser?.claimPending && String(failedUser.claimPending.nonce) === String(nonce)) {
          await clearPendingClaim(userId, failedUser.claimPending);
        }
        io?.to(userId).emit('claim_failed', { nonce });
        return;
      }

      // Si on arrive ici, txStatus === 'mined' (ou une autre valeur type 'success')
      const txHash = wc.transaction_hash || wc.transactionHash;
      console.log(`[monitorTx] Transaction confirmée, hash=${txHash}`);

      // Récupérer le receipt on-chain
      const receipt = await fetchReceiptSafely(txHash);
      if (receipt?.status === 0) {
        console.log('[monitorTx] Receipt failed, clearing pending claim');
        const failedUser = await User.findById(userId).select('claimPending');
        if (failedUser?.claimPending && String(failedUser.claimPending.nonce) === String(nonce)) {
          await clearPendingClaim(userId, failedUser.claimPending);
        }
        io?.to(userId).emit('claim_failed', { nonce, txHash });
        return;
      }

      // Finaliser en base
      const finalizedUser = await User.findById(userId).select('claimPending');
      if (!finalizedUser?.claimPending) {
        console.warn(`[monitorTx] Aucun claimPending pour user ${userId}, on stoppe.`);
        return;
      }

      const amount = finalizedUser.claimPending.amount;
      await finalizePendingClaim(userId, nonce, txHash || txId);
      io?.to(userId).emit('claim_confirmed', { amount, txHash });
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
    const pendingWithoutTx = await User.find({ 'claimPending.txId': null })
      .select('claimPending _id');

    for (const u of pendingWithoutTx) {
      if (isClaimExpired(u.claimPending)) {
        console.log(`[resumePendingTransactions] Clearing expired pending claim for user=${u._id}`);
        await clearPendingClaim(u._id, u.claimPending);
      }
    }

    const pendings = await User.find({ 'claimPending.txId': { $exists: true, $ne: null } })
      .select('claimPending _id');

    console.log(`[resumePendingTransactions] Found ${pendings.length} pending claims`);
    for (const u of pendings) {
      try {
        const reconciliation = await reconcilePendingClaim(u._id, u.claimPending);
        if (reconciliation.status !== 'pending') {
          console.log(
            `[resumePendingTransactions] Reconciled user=${u._id} status=${reconciliation.status} txHash=${reconciliation.txHash ?? 'n/a'}`
          );
          continue;
        }
      } catch (err) {
        console.error(`[resumePendingTransactions] Reconcile failed for user=${u._id}:`, err);
      }

      console.log(`[resumePendingTransactions] Resuming user=${u._id}, txId=${u.claimPending.txId}`);
      monitorTx(u._id, u.claimPending.txId, u.claimPending.nonce)
        .catch(err => console.error('[resumePendingTransactions] Error:', err));
    }
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
    let user = await User.findById(req.user.id)
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
      if (user.claimPending.txId) {
        try {
          const reconciliation = await reconcilePendingClaim(user._id, user.claimPending);
          if (reconciliation.status !== 'pending') {
            user = await User.findById(req.user.id).select('walletAddress tokenBalance claimPending');
          }
        } catch (err) {
          console.error('[AIRDROP/request] Failed to reconcile pending claim:', err);
        }
      }

      if (!user?.claimPending) {
        // Pending claim was reconciled or cleared, continue with normal claim flow.
      } else {
      const noTxId = !user.claimPending.txId;
      const ttlExceeded = isClaimExpired(user.claimPending);
      
      if (noTxId && !ttlExceeded) {
        const deadlineMs = getClaimDeadlineMs(user.claimPending);
        if (!deadlineMs) {
          return res.status(409).json({
            error: 'Claim pending but deadline metadata is invalid',
          });
        }

        const deadline = Math.floor(deadlineMs / 1000);
        const voucher = buildVoucher(
          user.walletAddress,
          user.claimPending.amount,
          user.claimPending.nonce,
          deadline
        );

        let signature = user.claimPending.signature;
        if (!signature) {
          signature = await signer.signTypedData(DOMAIN, VOUCHER_TYPES, voucher);
          await User.updateOne(
            { _id: user._id, 'claimPending.nonce': user.claimPending.nonce, 'claimPending.txId': user.claimPending.txId ?? null },
            {
              $set: {
                'claimPending.deadline': voucher.deadline,
                'claimPending.signature': signature,
              }
            }
          );
        }

        return res.json({ voucher, signature, claimedAmount: user.claimPending.amount, pending: true });
      }
      if (noTxId && ttlExceeded) {        
        console.log('[AIRDROP/request] Expired pending claim, clearing');
        await clearPendingClaim(user._id, user.claimPending);
        user = await User.findById(req.user.id).select('walletAddress tokenBalance claimPending');
        if (user?.claimPending) {
          return res.status(409).json({
            error: 'Claim state changed while clearing expired voucher, retry the request',
            pending: {
              nonce: user.claimPending.nonce,
              txId: user.claimPending.txId ?? null,
              retryAfterSeconds: getRetryAfterSeconds(user.claimPending),
            },
          });
        }
      } else {
        console.warn('[AIRDROP/request] Claim already pending', user.claimPending);
        return res.status(400).json({
          error: 'Claim already pending – confirm first or wait for expiration',
          pending: {
            nonce: user.claimPending.nonce,
            txId: user.claimPending.txId ?? null,
            retryAfterSeconds: getRetryAfterSeconds(user.claimPending),
          },
        });
      }
      }
    }

    const balance = Number(user.tokenBalance || 0);
    if (balance <= 0) {
      console.warn('[AIRDROP/request] Nothing to claim, balance=0');
      return res.status(400).json({ error: 'Nothing to claim' });
    }

    const nonce    = Date.now().toString();
    const deadline = Math.floor((Date.now() + CLAIM_TTL_MS) / 1000);
    const voucher  = buildVoucher(user.walletAddress, balance, nonce, deadline);
    console.log('[AIRDROP/request] Voucher generated:', voucher);

    const signature = await signer.signTypedData(DOMAIN, VOUCHER_TYPES, voucher);
    console.log('[AIRDROP/request] Signature:', signature);

    const upd = await User.updateOne(
      { _id: user._id, claimPending: null, tokenBalance: { $gte: balance } },
      {
        $inc: { tokenBalance: -balance },
        $set: {
          claimPending: {
            amount: balance,
            nonce,
            deadline: voucher.deadline,
            signature,
            reserved: true,
            txId: null,
          }
        }
      }
    );
    console.log('[AIRDROP/request] DB update claimPending:', upd);

    if (!upd.modifiedCount) {
      const refreshedUser = await User.findById(req.user.id).select('walletAddress tokenBalance claimPending');
      if (refreshedUser?.claimPending) {
        console.warn('[AIRDROP/request] Claim state changed during reservation');
        return res.status(409).json({
          error: 'Claim state changed, retry the request',
          pending: {
            nonce: refreshedUser.claimPending.nonce,
            txId: refreshedUser.claimPending.txId ?? null,
            retryAfterSeconds: getRetryAfterSeconds(refreshedUser.claimPending),
          },
        });
      }

      return res.status(409).json({ error: 'Claim reservation failed, retry the request' });
    }

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

    const _id = new Types.ObjectId(userId);
    const pending = await User.findOne({ _id, 'claimPending.nonce': String(nonce) })
      .select('claimPending');
    console.log('[AIRDROP/confirm] Pending before update:', pending);

    if (!pending?.claimPending) {
      console.warn('[AIRDROP/confirm] No matching pending claim');
      return res.status(404).json({ error: 'No matching pending claim' });
    }

    const existingTxId = pending.claimPending.txId;
    if (existingTxId && existingTxId !== txId) {
      console.warn('[AIRDROP/confirm] Claim already linked to another transaction', {
        existingTxId,
        txId,
      });
      return res.status(409).json({ error: 'Claim already linked to another transaction' });
    }

    if (!existingTxId) {
      const updated = await User.findOneAndUpdate(
        { _id, 'claimPending.nonce': String(nonce), 'claimPending.txId': null },
        { $set: { 'claimPending.txId': txId } },
        { new: true }
      );

      if (!updated) {
        const racedPending = await User.findOne({ _id, 'claimPending.nonce': String(nonce) })
          .select('claimPending');
        if (racedPending?.claimPending?.txId !== txId) {
          console.warn('[AIRDROP/confirm] Pending claim changed during confirmation');
          return res.status(409).json({ error: 'Pending claim changed during confirmation' });
        }
      }
    }

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

    if (user.claimPending.txId) {
      return res.status(409).json({
        error: 'Transaction already submitted and can no longer be cancelled',
      });
    }

    if (!isClaimExpired(user.claimPending)) {
      return res.status(409).json({
        error: 'Voucher remains valid until it expires and cannot be cancelled immediately',
        retryAfterSeconds: getRetryAfterSeconds(user.claimPending),
      });
    }

    const cleared = await clearPendingClaim(user._id, user.claimPending);
    console.log('[AIRDROP/cancel] Pending claim cleared after expiry:', cleared);

    return res.json({ ok: true, expired: true });
  } catch (e) {
    console.error('[AIRDROP/cancel] ERROR:', e);
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
