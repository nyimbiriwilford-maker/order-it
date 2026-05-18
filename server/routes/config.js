// server/routes/config.js
// Replace your existing file entirely.
//
// Key fixes vs previous version:
//   1. /revenue/summary registered BEFORE /:key so Express can match it
//   2. vat_percent fully validated (was missing validation)
//   3. Every PUT writes a change log entry to Config.changeHistory
//   4. Returns changeHistory array so the frontend can show an audit trail

const router = require('express').Router();
const Config = require('../models/Config');
const Order  = require('../models/Order');
const auth   = require('../middleware/auth');

// ── Default config values ─────────────────────────────────────────────────────
const DEFAULTS = [
  {
    key:         'platform_fee_percent',
    value:       2,
    label:       'Platform Fee (%)',
    description: 'Percentage deducted from each order\'s product total as platform revenue. Applied at order placement.',
  },
  {
    key:         'vat_percent',
    value:       16.5,
    label:       'VAT (%)',
    description: 'Value Added Tax deducted from the wholesaler payout when escrow is released. Does not affect logistics payouts.',
  },
  {
    key:         'auto_confirm_hours',
    value:       48,
    label:       'Auto-Confirm Window (hours)',
    description: 'Hours after delivery before an order is automatically confirmed and escrow released if the retailer takes no action.',
  },
  {
    key:         'min_order_amount',
    value:       0,
    label:       'Minimum Order Amount (MWK)',
    description: 'Minimum product total required to place an order. Set to 0 to disable.',
  },
  {
    key:         'stock_alert_threshold',
    value:       10,
    label:       'Stock Alert Threshold (units)',
    description: 'Wholesalers receive a low-stock alert when any product\'s quantity drops to or below this number.',
  },
  {
    key:         'max_items_per_order',
    value:       50,
    label:       'Max Items Per Order',
    description: 'Maximum number of distinct product lines allowed in a single order.',
  },
];

// Per-key validation rules
const VALIDATORS = {
  platform_fee_percent: { min: 0,  max: 50, type: 'float', label: 'Fee percent' },
  vat_percent:          { min: 0,  max: 50, type: 'float', label: 'VAT percent' },
  auto_confirm_hours:   { min: 1,  max: 720, type: 'int',  label: 'Auto-confirm hours' },
  min_order_amount:     { min: 0,  max: 10_000_000, type: 'float', label: 'Min order amount' },
  stock_alert_threshold:{ min: 0,  max: 10_000,     type: 'int',   label: 'Stock threshold' },
  max_items_per_order:  { min: 1,  max: 500,        type: 'int',   label: 'Max items' },
};

function validate(key, raw) {
  const rule = VALIDATORS[key];
  if (!rule) return { ok: true, value: raw }; // unknown key — pass through

  const num = rule.type === 'int' ? parseInt(raw) : parseFloat(raw);
  if (isNaN(num)) return { ok: false, msg: `${rule.label} must be a number` };
  if (num < rule.min || num > rule.max) {
    return { ok: false, msg: `${rule.label} must be between ${rule.min} and ${rule.max}` };
  }
  return { ok: true, value: num };
}

async function seedDefaults() {
  for (const d of DEFAULTS) {
    await Config.findOneAndUpdate(
      { key: d.key },
      { $setOnInsert: d },
      { upsert: true, new: false }
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// IMPORTANT: /revenue/summary MUST be registered before /:key
// Express matches routes in order — if /:key comes first, 'revenue' is
// treated as a key and this handler is never reached.
// ─────────────────────────────────────────────────────────────────────────────

// ── GET /api/config/revenue/summary ──────────────────────────────────────────
router.get('/revenue/summary', auth, auth.adminOnly, async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    const now   = new Date();
    let   since = null;

    if      (period === 'today')   { since = new Date(now); since.setHours(0, 0, 0, 0); }
    else if (period === 'week')    { since = new Date(now); since.setDate(now.getDate() - 7); }
    else if (period === 'month')   { since = new Date(now); since.setMonth(now.getMonth() - 1); }
    else if (period === 'year')    { since = new Date(now); since.setFullYear(now.getFullYear() - 1); }
    // period === 'all' → since stays null → no date filter

    const dateFilter = since ? { createdAt: { $gte: since } } : {};

    const [periodAgg, allTimeAgg, monthlyAgg] = await Promise.all([
      Order.aggregate([
        { $match: { ...dateFilter, orderStatus: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$platformFee' }, count: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: { orderStatus: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$platformFee' } } },
      ]),
      // Last 6 months bar chart data
      Order.aggregate([
        {
          $match: {
            orderStatus: { $ne: 'cancelled' },
            createdAt:   { $gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) },
          },
        },
        {
          $group: {
            _id:    { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
            fees:   { $sum: '$platformFee' },
            orders: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
    ]);

    res.json({
      periodFees:   periodAgg[0]?.total  || 0,
      periodOrders: periodAgg[0]?.count  || 0,
      allTimeFees:  allTimeAgg[0]?.total || 0,
      monthly: monthlyAgg.map(m => ({
        label:  new Date(m._id.year, m._id.month - 1, 1)
                  .toLocaleString('default', { month: 'short', year: '2-digit' }),
        fees:   m.fees,
        orders: m.orders,
      })),
    });
  } catch (err) {
    console.error('Revenue summary error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ── GET /api/config — all settings (admin only) ───────────────────────────────
router.get('/', auth, auth.adminOnly, async (req, res) => {
  try {
    await seedDefaults();
    const configs = await Config.find().sort({ key: 1 }).lean();
    res.json(configs);
  } catch (err) {
    console.error('Config GET error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ── GET /api/config/:key — single value (public — used by order/autoConfirm logic)
router.get('/:key', async (req, res) => {
  try {
    await seedDefaults();
    const config = await Config.findOne({ key: req.params.key }).lean();
    if (!config) return res.status(404).json({ msg: 'Config key not found' });
    res.json(config);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// ── PUT /api/config/:key — update a setting (admin only) ──────────────────────
router.put('/:key', auth, auth.adminOnly, async (req, res) => {
  try {
    const { value } = req.body;
    if (value === undefined || value === null) {
      return res.status(400).json({ msg: 'Value is required' });
    }

    // Validate
    const result = validate(req.params.key, value);
    if (!result.ok) return res.status(400).json({ msg: result.msg });

    // Fetch old value first so we can write a history entry
    const existing = await Config.findOne({ key: req.params.key });
    if (!existing) return res.status(404).json({ msg: 'Config key not found' });

    const oldValue = existing.value;

    // Build history entry
    const historyEntry = {
      changedAt:  new Date(),
      changedBy:  req.user.id,
      oldValue,
      newValue:   result.value,
    };

    // Update value + append history
    const config = await Config.findOneAndUpdate(
      { key: req.params.key },
      {
        value:     result.value,
        updatedBy: req.user.id,
        $push:     { changeHistory: { $each: [historyEntry], $slice: -20 } }, // keep last 20
      },
      { new: true }
    );

    // Sync process.env so the running server picks up changes immediately
    // (autoConfirm job reads these on each tick)
    if (req.params.key === 'platform_fee_percent') {
      process.env.PLATFORM_FEE_PERCENT = String(result.value);
    }
    if (req.params.key === 'auto_confirm_hours') {
      process.env.AUTO_CONFIRM_HOURS = String(result.value);
    }
    if (req.params.key === 'vat_percent') {
      process.env.VAT_PERCENT = String(result.value);
    }

    res.json(config);
  } catch (err) {
    console.error('Config PUT error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;