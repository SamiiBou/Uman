import express from 'express';
import mongoose from 'mongoose';
import User from '../models/User.js';

const router = express.Router();

// 1. Total users
router.get('/users/total', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    res.json({ success: true, totalUsers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 2. Verified users
router.get('/users/verified', async (req, res) => {
  try {
    const verifiedUsers = await User.countDocuments({ verified: true });
    res.json({ success: true, verifiedUsers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3. Sign-ups over time (daily/weekly/monthly)
// Usage: GET /api/stats/users/created?period=day&days=30
router.get('/users/created', async (req, res) => {
  try {
    const { period = 'day', days = 30 } = req.query;
    const since = new Date();
    since.setDate(since.getDate() - Number(days));

    const formats = {
      day: '%Y-%m-%d',
      week: '%Y-%U',
      month: '%Y-%m'
    };
    const format = formats[period] || formats.day;

    const data = await User.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format, date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({ success: true, period, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 4. Social links distribution
router.get('/users/social-links-distribution', async (req, res) => {
  try {
    const distribution = await User.aggregate([
      {
        $project: {
          numSocial: {
            $add: [
              { $cond: [{ $ifNull: ['$social.twitter.id', false] }, 1, 0] },
              { $cond: [{ $ifNull: ['$social.google.id', false] }, 1, 0] },
              { $cond: [{ $ifNull: ['$social.facebook.id', false] }, 1, 0] },
              { $cond: [{ $ifNull: ['$social.instagram.id', false] }, 1, 0] },
              { $cond: [{ $ifNull: ['$social.discord.id', false] }, 1, 0] },
              { $cond: [{ $ifNull: ['$social.telegram.id', false] }, 1, 0] },
              { $cond: [{ $ifNull: ['$social.tiktok.id', false] }, 1, 0] }
            ]
          }
        }
      },
      { $group: { _id: '$numSocial', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    res.json({ success: true, distribution });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 5. Verification-levels distribution
router.get('/users/verification-levels-distribution', async (req, res) => {
  try {
    const distribution = await User.aggregate([
      { $group: { _id: '$verificationLevel', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    res.json({ success: true, distribution });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 6. Referral counts (per referrer)
router.get('/users/referrals', async (req, res) => {
  try {
    const referrals = await User.aggregate([
      { $match: { referrer: { $ne: null } } },
      { $group: { _id: '$referrer', count: { $sum: 1 } } },
      { $project: { referrer: '$_id', count: 1, _id: 0 } },
      { $sort: { count: -1 } }
    ]);
    res.json({ success: true, referrals });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 7. Token balance stats (avg, min, max)
router.get('/users/token-balance-stats', async (req, res) => {
  try {
    const [stats] = await User.aggregate([
      {
        $group: {
          _id: null,
          average: { $avg: '$tokenBalance' },
          min: { $min: '$tokenBalance' },
          max: { $max: '$tokenBalance' }
        }
      },
      { $project: { _id: 0 } }
    ]);
    res.json({ success: true, stats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 8. Friend-count distribution
router.get('/users/friend-count-distribution', async (req, res) => {
  try {
    const distribution = await User.aggregate([
      { $project: { friendCount: { $size: '$friends' } } },
      { $group: { _id: '$friendCount', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    res.json({ success: true, distribution });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 9. Notifications opt-in count
router.get('/users/notifications', async (req, res) => {
  try {
    const total = await User.countDocuments();
    const enabled = await User.countDocuments({ 'notifications.enabled': true });
    res.json({ success: true, total, enabled });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
