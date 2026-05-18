// server/routes/adminFinancials.js
//
// ADD ONE LINE to server/index.js after the adminAnalytics line:
//   app.use('/api/admin/financials', require('./routes/adminFinancials'));
//
// Auth pattern matches your auth.js:
//   auth (verify JWT)  →  auth.adminOnly (role === 'admin')

const router = require('express').Router();
const auth   = require('../middleware/auth');
const Order  = require('../models/Order');
const Payout = require('../models/Payout');
const Config = require('../models/Config');

// Every route in this file requires a valid admin JWT
router.use(auth, auth.adminOnly);

// ─── helper: parse ?from= ?to= into Date objects ────────────────────────────
// Defaults: from = start of month 12 months ago, to = end of today
function getRange(query) {
  const to = query.to ? new Date(query.to) : new Date();
  to.setHours(23, 59, 59, 999);

  let from;
  if (query.from) {
    from = new Date(query.from);
  } else {
    from = new Date(to);
    from.setMonth(from.getMonth() - 11);
    from.setDate(1);
    from.setHours(0, 0, 0, 0);
  }
  return { from, to };
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/financials/summary
//
// Headline numbers for the Revenue page top cards:
//   • Commission earned (platformFee on completed orders) — lifetime & period
//   • GMV (completed orders) — lifetime & period
//   • VAT collected from wholesaler payouts — lifetime & period
//   • Escrow currently held
//   • MoM change (this calendar month vs last)
//   • Current config rates
// ─────────────────────────────────────────────────────────────────────────────
router.get('/summary', async (req, res) => {
  try {
    const { from, to } = getRange(req.query);

    // Pull current config rates to display in the UI
    const [feeCfg, vatCfg] = await Promise.all([
      Config.findOne({ key: 'platform_fee_percent' }),
      Config.findOne({ key: 'vat_percent' }),
    ]);
    const platformFeeRate = feeCfg?.value ?? 2;
    const vatRate         = vatCfg?.value ?? 16.5;

    // ── Lifetime ─────────────────────────────────────────────────────────────
    const [ltComm, ltGMV, ltVAT, ltEscrow, ltRefunds] = await Promise.all([

      // Commission = platformFee on every completed order
      Order.aggregate([
        { $match: { orderStatus: 'completed' } },
        { $group: { _id: null, total: { $sum: '$platformFee' }, count: { $sum: 1 } } },
      ]),

      // GMV = totalAmount on completed orders
      Order.aggregate([
        { $match: { orderStatus: 'completed' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
      ]),

      // VAT collected = vatAmount on wholesaler payouts
      // (platform withholds VAT from wholesaler gross before paying them)
      Payout.aggregate([
        { $match: { recipientType: 'wholesaler' } },
        { $group: { _id: null, total: { $sum: '$vatAmount' } } },
      ]),

      // Escrow held right now
      Order.aggregate([
        {
          $match: {
            orderStatus:   { $nin: ['completed', 'cancelled'] },
            paymentStatus: { $ne: 'refunded' },
          },
        },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),

      // Refunds
      Order.aggregate([
        { $match: { paymentStatus: 'refunded' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
      ]),
    ]);

    // ── Period (from → to) ───────────────────────────────────────────────────
    const [pComm, pGMV, pVAT] = await Promise.all([
      Order.aggregate([
        { $match: { orderStatus: 'completed', updatedAt: { $gte: from, $lte: to } } },
        { $group: { _id: null, total: { $sum: '$platformFee' }, count: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: { orderStatus: 'completed', updatedAt: { $gte: from, $lte: to } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
      ]),
      Payout.aggregate([
        { $match: { recipientType: 'wholesaler', releasedAt: { $gte: from, $lte: to } } },
        { $group: { _id: null, total: { $sum: '$vatAmount' } } },
      ]),
    ]);

    // ── MoM change — current calendar month vs previous ─────────────────────
    const now            = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const [thisM, lastM] = await Promise.all([
      Order.aggregate([
        { $match: { orderStatus: 'completed', updatedAt: { $gte: thisMonthStart } } },
        { $group: { _id: null, total: { $sum: '$platformFee' } } },
      ]),
      Order.aggregate([
        { $match: { orderStatus: 'completed', updatedAt: { $gte: lastMonthStart, $lte: lastMonthEnd } } },
        { $group: { _id: null, total: { $sum: '$platformFee' } } },
      ]),
    ]);

    const thisMonthComm = thisM[0]?.total ?? 0;
    const lastMonthComm = lastM[0]?.total ?? 0;
    const momChange     = lastMonthComm > 0
      ? ((thisMonthComm - lastMonthComm) / lastMonthComm) * 100
      : null;

    res.json({
      rates: { platformFeeRate, vatRate },

      lifetime: {
        commission:      ltComm[0]?.total  ?? 0,
        completedOrders: ltComm[0]?.count  ?? 0,
        gmv:             ltGMV[0]?.total   ?? 0,
        vatCollected:    ltVAT[0]?.total   ?? 0,
        escrowHeldNow:   ltEscrow[0]?.total ?? 0,
        refunded:        ltRefunds[0]?.total ?? 0,
        refundedCount:   ltRefunds[0]?.count ?? 0,
      },

      period: {
        from:            from.toISOString(),
        to:              to.toISOString(),
        commission:      pComm[0]?.total   ?? 0,
        completedOrders: pComm[0]?.count   ?? 0,
        gmv:             pGMV[0]?.total    ?? 0,
        vatCollected:    pVAT[0]?.total    ?? 0,
      },

      mom: {
        thisMonth:     thisMonthComm,
        lastMonth:     lastMonthComm,
        changePercent: momChange,
      },
    });
  } catch (err) {
    console.error('financials/summary error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/financials/monthly
//
// One row per calendar month with commission, GMV, VAT, payouts, and
// the derived "net platform cash" figure.
// Query: ?months=12 (default) max 24
// ─────────────────────────────────────────────────────────────────────────────
router.get('/monthly', async (req, res) => {
  try {
    const months = Math.min(parseInt(req.query.months) || 12, 24);

    // Commission + GMV from completed orders grouped by month
    const orderMonthly = await Order.aggregate([
      { $match: { orderStatus: 'completed' } },
      {
        $group: {
          _id:        { year: { $year: '$updatedAt' }, month: { $month: '$updatedAt' } },
          commission: { $sum: '$platformFee' },
          gmv:        { $sum: '$totalAmount' },
          orders:     { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    // Payout totals per month split by recipientType
    const payoutMonthly = await Payout.aggregate([
      {
        $group: {
          _id: {
            year:  { $year:  '$releasedAt' },
            month: { $month: '$releasedAt' },
            type:  '$recipientType',
          },
          netAmount:  { $sum: '$netAmount' },
          vatAmount:  { $sum: '$vatAmount' },
          grossAmount:{ $sum: '$grossAmount' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    // Merge into a single map keyed "YYYY-MM"
    const map = {};
    const mk  = (y, m) => `${y}-${String(m).padStart(2, '0')}`;

    orderMonthly.forEach(r => {
      const k = mk(r._id.year, r._id.month);
      map[k]  = { key: k, year: r._id.year, month: r._id.month,
                  commission: r.commission, gmv: r.gmv, orders: r.orders };
    });

    payoutMonthly.forEach(r => {
      const k = mk(r._id.year, r._id.month);
      if (!map[k]) map[k] = { key: k, year: r._id.year, month: r._id.month };
      if (r._id.type === 'wholesaler') {
        map[k].wholesalerPayout = r.netAmount;
        map[k].vatCollected     = r.vatAmount;
      } else {
        map[k].logisticsPayout = r.netAmount;
      }
    });

    const rows = Object.values(map)
      .sort((a, b) => (a.key > b.key ? 1 : -1))
      .slice(-months)
      .map(r => ({
        key:              r.key,
        year:             r.year,
        month:            r.month,
        commission:       r.commission       ?? 0,
        gmv:              r.gmv              ?? 0,
        orders:           r.orders           ?? 0,
        wholesalerPayout: r.wholesalerPayout ?? 0,
        logisticsPayout:  r.logisticsPayout  ?? 0,
        vatCollected:     r.vatCollected      ?? 0,
        // Platform net cash = fee earned + VAT withheld from wholesalers
        netPlatformCash:  (r.commission ?? 0) + (r.vatCollected ?? 0),
      }));

    res.json({ rows });
  } catch (err) {
    console.error('financials/monthly error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/financials/commission-by-wholesaler
//
// Ranks wholesalers by commission they generated for the platform.
// This is the platform's cut per wholesaler — NOT the wholesaler's own earnings.
// Query: ?from=&to=&limit=20
// ─────────────────────────────────────────────────────────────────────────────
router.get('/commission-by-wholesaler', async (req, res) => {
  try {
    const { from, to } = getRange(req.query);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);

    const rows = await Order.aggregate([
      {
        $match: {
          orderStatus: 'completed',
          updatedAt:   { $gte: from, $lte: to },
        },
      },
      {
        $group: {
          _id:        '$wholesaler',
          commission: { $sum: '$platformFee' },
          gmv:        { $sum: '$totalAmount' },
          orders:     { $sum: 1 },
          avgOrder:   { $avg: '$totalAmount' },
        },
      },
      { $sort: { commission: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from:         'users',
          localField:   '_id',
          foreignField: '_id',
          as:           'user',
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          commission:   1,
          gmv:          1,
          orders:       1,
          avgOrder:     1,
          name:         '$user.name',
          businessName: '$user.businessName',
          email:        '$user.email',
          // Effective rate = commission / GMV (should equal platformFeeRate for all,
          // useful for spotting any data anomalies)
          effectiveRate: {
            $cond: [
              { $gt: ['$gmv', 0] },
              { $multiply: [{ $divide: ['$commission', '$gmv'] }, 100] },
              0,
            ],
          },
        },
      },
    ]);

    res.json({ from: from.toISOString(), to: to.toISOString(), rows });
  } catch (err) {
    console.error('financials/commission-by-wholesaler error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/financials/payouts-log
//
// Every Payout document paginated — shows what actually left the platform.
// Query: ?page=1&limit=25&type=wholesaler|logistics&trigger=admin_released&from=&to=
// ─────────────────────────────────────────────────────────────────────────────
router.get('/payouts-log', async (req, res) => {
  try {
    const page  = Math.max(parseInt(req.query.page)  || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 25, 100);
    const skip  = (page - 1) * limit;

    const match = {};
    if (req.query.type)    match.recipientType = req.query.type;
    if (req.query.trigger) match.trigger        = req.query.trigger;
    if (req.query.from || req.query.to) {
      const { from, to } = getRange(req.query);
      match.releasedAt   = { $gte: from, $lte: to };
    }

    const [payouts, total] = await Promise.all([
      Payout.find(match)
        .sort({ releasedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('recipient', 'name businessName email')
        .populate('order',     'orderStatus totalAmount platformFee'),
      Payout.countDocuments(match),
    ]);

    res.json({
      payouts,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('financials/payouts-log error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/financials/export
//
// Flat JSON → browser converts to CSV using Papa.unparse().
// Query: ?from=&to=
// ─────────────────────────────────────────────────────────────────────────────
router.get('/export', async (req, res) => {
  try {
    const { from, to } = getRange(req.query);

    const payouts = await Payout.find({ releasedAt: { $gte: from, $lte: to } })
      .sort({ releasedAt: -1 })
      .populate('recipient', 'name businessName email')
      .populate('order',     'orderStatus totalAmount platformFee');

    const rows = payouts.map(p => ({
      date:          p.releasedAt?.toISOString().split('T')[0] ?? '',
      orderId:       p.order?._id?.toString()  ?? '',
      orderTotal:    p.order?.totalAmount       ?? 0,
      platformFee:   p.order?.platformFee       ?? 0,
      recipientType: p.recipientType,
      recipientName: p.recipient?.businessName ?? p.recipient?.name ?? '',
      email:         p.recipient?.email         ?? '',
      trigger:       p.trigger,
      grossAmount:   p.grossAmount,
      vatPercent:    p.vatPercent,
      vatAmount:     p.vatAmount,
      netAmount:     p.netAmount,
    }));

    res.json({ from: from.toISOString(), to: to.toISOString(), rows });
  } catch (err) {
    console.error('financials/export error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;