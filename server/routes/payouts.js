/**
 * server/routes/payouts.js
 * Mount in index.js: app.use('/api/payouts', require('./routes/payouts'));
 */

const router  = require('express').Router();
const Payout  = require('../models/Payout');
const auth    = require('../middleware/auth');

// ── GET /api/payouts/my — wholesaler or logistics sees their own payouts ───────
router.get('/my', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, period } = req.query;

    const filter = { recipient: req.user.id };

    if (req.user.role === 'wholesaler') filter.recipientType = 'wholesaler';
    // logistics companies use their company id — handled below

    if (period) {
      const now = new Date();
      const since = new Date();
      if (period === 'today') { since.setHours(0,0,0,0); }
      else if (period === 'week')  { since.setDate(now.getDate() - 7); }
      else if (period === 'month') { since.setMonth(now.getMonth() - 1); }
      else if (period === 'year')  { since.setFullYear(now.getFullYear() - 1); }
      filter.releasedAt = { $gte: since };
    }

    const total   = await Payout.countDocuments(filter);
    const payouts = await Payout.find(filter)
      .populate('order', 'totalAmount orderStatus createdAt items retailer')
      .sort({ releasedAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    // Summary totals
    const allPayouts = await Payout.find({ recipient: req.user.id });
    const totalNet   = allPayouts.reduce((s, p) => s + p.netAmount,  0);
    const totalGross = allPayouts.reduce((s, p) => s + p.grossAmount, 0);
    const totalVat   = allPayouts.reduce((s, p) => s + p.vatAmount,   0);

    res.json({ payouts, total, page: Number(page), pages: Math.ceil(total / limit), summary: { totalNet, totalGross, totalVat } });
  } catch (err) {
    console.error('Payouts error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ── GET /api/payouts/logistics/:companyId — logistics company earnings ─────────
router.get('/logistics/:companyId', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, period } = req.query;

    const filter = { recipient: req.params.companyId, recipientType: 'logistics' };

    if (period) {
      const now = new Date();
      const since = new Date();
      if (period === 'today') { since.setHours(0,0,0,0); }
      else if (period === 'week')  { since.setDate(now.getDate() - 7); }
      else if (period === 'month') { since.setMonth(now.getMonth() - 1); }
      else if (period === 'year')  { since.setFullYear(now.getFullYear() - 1); }
      filter.releasedAt = { $gte: since };
    }

    const total   = await Payout.countDocuments(filter);
    const payouts = await Payout.find(filter)
      .populate('order', 'totalAmount orderStatus createdAt deliveryFee retailer')
      .sort({ releasedAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const allPayouts = await Payout.find({ recipient: req.params.companyId, recipientType: 'logistics' });
    const totalNet   = allPayouts.reduce((s, p) => s + p.netAmount,   0);
    const totalGross = allPayouts.reduce((s, p) => s + p.grossAmount,  0);

    res.json({ payouts, total, page: Number(page), pages: Math.ceil(total / limit), summary: { totalNet, totalGross, totalVat: 0 } });
  } catch (err) {
    console.error('Logistics payouts error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;