const mongoose        = require('mongoose');
const router           = require('express').Router();
const User             = require('../models/User');
const LogisticsCompany = require('../models/LogisticsCompany');
const Order            = require('../models/Order');
const Dispute          = require('../models/Dispute');
const Payout           = require('../models/Payout');
const AuditLog         = require('../models/AuditLog');
const Config           = require('../models/Config');
const auth             = require('../middleware/auth');
const releaseEscrow    = require('../utils/releaseEscrow');

// ─── Helper: write an audit log entry ────────────────────────────────────────
async function audit(req, action, targetModel, targetId, details = {}) {
  try {
    await AuditLog.create({
      adminId:     req.user.id,
      adminName:   req.user.name || 'Admin',
      action,
      targetModel,
      targetId,
      details,
      ipAddress:   req.ip,
    });
  } catch (e) {
    console.error('Audit log write failed:', e.message);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// DASHBOARD STATS
// ════════════════════════════════════════════════════════════════════════════

router.get('/stats', auth, auth.adminOnly, async (req, res) => {
  try {
    const [
      totalUsers,
      totalOrders,
      pendingOrders,
      pendingLogistics,
      openDisputes,
      activeUsers,
    ] = await Promise.all([
      User.countDocuments(),
      Order.countDocuments(),
      Order.countDocuments({ orderStatus: 'pending' }),
      LogisticsCompany.countDocuments({ status: 'pending' }),
      Dispute.countDocuments({ status: { $in: ['open', 'under_review', 'escalated'] } }),
      User.countDocuments({ isActive: true }),
    ]);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const ordersToday = await Order.countDocuments({ createdAt: { $gte: todayStart } });

    const cutoff48h = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const stuckOrders = await Order.countDocuments({
      orderStatus: { $nin: ['completed', 'cancelled', 'disputed'] },
      updatedAt:   { $lt: cutoff48h },
    });

    const escrowAgg = await Order.aggregate([
      { $match: { orderStatus: { $nin: ['cancelled'] }, paymentStatus: { $nin: ['refunded'] } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);
    const escrowTotal = escrowAgg[0]?.total || 0;

    res.json({
      totalUsers, totalOrders, ordersToday,
      pendingOrders, pendingLogistics,
      openDisputes, activeUsers, stuckOrders, escrowTotal,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// USER MANAGEMENT
// ════════════════════════════════════════════════════════════════════════════

router.get('/users', auth, auth.adminOnly, async (req, res) => {
  try {
    const { role, status, search, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (role)   filter.role = role;
    if (status === 'active')    filter.isActive = true;
    if (status === 'suspended') filter.isActive = false;
    if (search) {
      filter.$or = [
        { name:         { $regex: search, $options: 'i' } },
        { email:        { $regex: search, $options: 'i' } },
        { businessName: { $regex: search, $options: 'i' } },
        { phone:        { $regex: search, $options: 'i' } },
      ];
    }
    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    res.json({ users, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

router.get('/users/:id', auth, auth.adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ msg: 'User not found' });
    let orderCount = 0;
    if (user.role === 'retailer')   orderCount = await Order.countDocuments({ retailer: user._id });
    if (user.role === 'wholesaler') orderCount = await Order.countDocuments({ wholesaler: user._id });
    res.json({ user, orderCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

router.put('/users/:id/suspend', auth, auth.adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });
    if (user.role === 'admin') return res.status(400).json({ msg: 'Cannot suspend an admin account' });
    user.isActive = false;
    await user.save();
    await audit(req, 'SUSPEND_USER', 'User', user._id, {
      reason: req.body.reason || 'No reason given',
      userName: user.name, userEmail: user.email,
    });
    res.json({ msg: 'User suspended', user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

router.put('/users/:id/activate', auth, auth.adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });
    user.isActive = true;
    await user.save();
    await audit(req, 'ACTIVATE_USER', 'User', user._id, { userName: user.name, userEmail: user.email });
    res.json({ msg: 'User activated', user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// LOGISTICS COMPANY MANAGEMENT
// ════════════════════════════════════════════════════════════════════════════

router.get('/logistics', auth, auth.adminOnly, async (req, res) => {
  try {
    const { status, search } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { name:  { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }
    const companies = await LogisticsCompany.find(filter).sort({ createdAt: -1 });
    res.json(companies);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

router.put('/logistics/:id/approve', auth, auth.adminOnly, async (req, res) => {
  try {
    const company = await LogisticsCompany.findByIdAndUpdate(
      req.params.id, { status: 'approved' }, { new: true }
    );
    if (!company) return res.status(404).json({ msg: 'Company not found' });
    await audit(req, 'APPROVE_LOGISTICS', 'LogisticsCompany', company._id, { companyName: company.name });
    res.json(company);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

router.put('/logistics/:id/reject', auth, auth.adminOnly, async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ msg: 'Rejection reason is required' });
    const company = await LogisticsCompany.findByIdAndUpdate(
      req.params.id, { status: 'rejected', rejectionReason: reason }, { new: true }
    );
    if (!company) return res.status(404).json({ msg: 'Company not found' });
    await audit(req, 'REJECT_LOGISTICS', 'LogisticsCompany', company._id, { companyName: company.name, reason });
    res.json(company);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

router.put('/logistics/:id/suspend', auth, auth.adminOnly, async (req, res) => {
  try {
    const company = await LogisticsCompany.findByIdAndUpdate(
      req.params.id, { status: 'suspended' }, { new: true }
    );
    if (!company) return res.status(404).json({ msg: 'Company not found' });
    await audit(req, 'SUSPEND_LOGISTICS', 'LogisticsCompany', company._id, {
      companyName: company.name, reason: req.body.reason || 'No reason given',
    });
    res.json(company);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

router.put('/logistics/:id/reinstate', auth, auth.adminOnly, async (req, res) => {
  try {
    const company = await LogisticsCompany.findByIdAndUpdate(
      req.params.id, { status: 'approved' }, { new: true }
    );
    if (!company) return res.status(404).json({ msg: 'Company not found' });
    await audit(req, 'REINSTATE_LOGISTICS', 'LogisticsCompany', company._id, { companyName: company.name });
    res.json(company);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// ORDER MANAGEMENT
// ════════════════════════════════════════════════════════════════════════════

router.get('/orders', auth, auth.adminOnly, async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (status) filter.orderStatus = status;

    // ── FIX: safe search that won't throw CastError on short IDs ──────────
    if (search) {
      const s = search.trim();
      if (mongoose.Types.ObjectId.isValid(s) && s.length === 24) {
        // Exact full 24-char ObjectId
        filter._id = new mongoose.Types.ObjectId(s);
      } else {
        // Partial / short ID — match against string representation of _id
        filter.$expr = {
          $regexMatch: {
            input:   { $toString: '$_id' },
            regex:   s,
            options: 'i',
          },
        };
      }
    }

    const total  = await Order.countDocuments(filter);
    const orders = await Order.find(filter)
      .populate('retailer',  'name email businessName')
      .populate('wholesaler','name email businessName')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    res.json({ orders, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

router.get('/orders/:id', auth, auth.adminOnly, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('retailer',         'name email businessName phone city')
      .populate('wholesaler',       'name email businessName phone city')
      .populate('logisticsCompany', 'name email phone');
    if (!order) return res.status(404).json({ msg: 'Order not found' });
    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

router.put('/orders/:id/cancel', auth, auth.adminOnly, async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ msg: 'Cancellation reason is required' });
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ msg: 'Order not found' });
    if (['completed', 'cancelled'].includes(order.orderStatus))
      return res.status(400).json({ msg: `Order is already ${order.orderStatus}` });
    const prevStatus  = order.orderStatus;
    order.orderStatus = 'cancelled';
    order.status      = 'cancelled';
    order.adminNote   = reason;
    await order.save();
    await audit(req, 'CANCEL_ORDER', 'Order', order._id, { prevStatus, reason });
    res.json({ msg: 'Order cancelled', order });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

router.put('/orders/:id/flag', auth, auth.adminOnly, async (req, res) => {
  try {
    const { note } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ msg: 'Order not found' });
    order.flagged   = true;
    order.adminNote = note || 'Flagged for investigation';
    await order.save();
    await audit(req, 'FLAG_ORDER', 'Order', order._id, { note });
    res.json({ msg: 'Order flagged', order });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// ORDER STATUS — MANUAL ADVANCE
// ════════════════════════════════════════════════════════════════════════════

const ADMIN_ALLOWED_TRANSITIONS = {
  pending:              ['confirmed', 'ready_for_collection', 'cancelled'],
  confirmed:            ['ready_for_collection', 'cancelled'],
  ready_for_collection: ['collected', 'cancelled'],
  collected:            ['in_transit', 'cancelled'],
  in_transit:           ['delivered', 'cancelled'],
  delivered:            ['completed'],
};

const LEGACY_STATUS_MAP = {
  pending:              'pending',
  confirmed:            'confirmed',
  ready_for_collection: 'shipped',
  collected:            'shipped',
  in_transit:           'shipped',
  delivered:            'delivered',
  completed:            'delivered',
  cancelled:            'cancelled',
  disputed:             'disputed',
};

router.put('/orders/:id/status', auth, auth.adminOnly, async (req, res) => {
  try {
    const { status: newStatus, reason } = req.body;
    if (!newStatus) return res.status(400).json({ msg: 'New status is required' });

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ msg: 'Order not found' });

    const current = order.orderStatus;
    const allowed = ADMIN_ALLOWED_TRANSITIONS[current];

    if (!allowed) {
      return res.status(400).json({
        msg: `Order is in terminal status '${current}' and cannot be advanced`,
      });
    }
    if (!allowed.includes(newStatus)) {
      return res.status(400).json({
        msg: `Cannot transition '${current}' → '${newStatus}'. Allowed: ${allowed.join(', ')}`,
      });
    }

    order.orderStatus = newStatus;
    order.status      = LEGACY_STATUS_MAP[newStatus] || order.status;
    if (reason) order.adminNote = reason;
    await order.save();

    if (newStatus === 'completed' && order.paymentStatus !== 'released') {
      try {
        await releaseEscrow(order._id, 'admin_released');
      } catch (escrowErr) {
        console.error('Escrow auto-release failed on status advance:', escrowErr.message);
      }
    }

    await audit(req, 'ORDER_STATUS_ADVANCED', 'Order', order._id, {
      from:   current,
      to:     newStatus,
      reason: reason || 'Admin manual advance',
    });

    const updated = await Order.findById(order._id)
      .populate('retailer',   'name email businessName')
      .populate('wholesaler', 'name email businessName');

    res.json({ msg: `Order advanced: '${current}' → '${newStatus}'`, order: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// ESCROW CONTROLS
// ════════════════════════════════════════════════════════════════════════════

router.get('/escrow', auth, auth.adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const filter = {
      orderStatus: { $nin: ['cancelled', 'completed'] },
      $or: [
        { paymentStatus: { $exists: false } },
        { paymentStatus: { $nin: ['refunded', 'released'] } },
      ],
    };
    const total  = await Order.countDocuments(filter);
    const orders = await Order.find(filter)
      .populate('retailer',         'name email businessName')
      .populate('wholesaler',       'name email businessName')
      .populate('logisticsCompany', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const agg = await Order.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          total:         { $sum: { $ifNull: ['$totalAmount',        0] } },
          toWholesalers: { $sum: { $ifNull: ['$amountToWholesaler', 0] } },
          toLogistics:   { $sum: { $ifNull: ['$amountToLogistics',  0] } },
        },
      },
    ]);
    const summary = agg[0] || { total: 0, toWholesalers: 0, toLogistics: 0 };

    res.json({ orders, total, page: Number(page), pages: Math.ceil(total / limit), summary });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

router.post('/escrow/:orderId/release', auth, auth.adminOnly, async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ msg: 'Release reason is required' });

    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ msg: 'Order not found' });
    if (order.paymentStatus === 'released')
      return res.status(400).json({ msg: 'Escrow already released' });

    const released = await releaseEscrow(order._id, 'admin_released');

    await audit(req, 'ESCROW_MANUAL_RELEASE', 'Order', order._id, {
      reason,
      amount:             order.totalAmount,
      amountToWholesaler: order.amountToWholesaler,
      amountToLogistics:  order.amountToLogistics,
    });

    res.json({ msg: 'Escrow released', order: released });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

router.post('/escrow/:orderId/partial-release', auth, auth.adminOnly, async (req, res) => {
  try {
    const { party, reason } = req.body;

    if (!party || !['wholesaler', 'logistics'].includes(party)) {
      return res.status(400).json({ msg: "party must be 'wholesaler' or 'logistics'" });
    }
    if (!reason) return res.status(400).json({ msg: 'Release reason is required' });

    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ msg: 'Order not found' });
    if (order.paymentStatus === 'released')
      return res.status(400).json({ msg: 'Full escrow already released' });
    if (order.paymentStatus === 'refunded')
      return res.status(400).json({ msg: 'Order has been refunded — cannot release escrow' });

    const existingPayout = await Payout.findOne({ order: order._id, recipientType: party });
    if (existingPayout) {
      return res.status(400).json({
        msg: `${party} has already been paid for this order (Payout ID: ${existingPayout._id})`,
      });
    }

    let vatPercent = 0;
    try {
      const vatConfig = await Config.findOne({ key: 'vat_percent' }).lean();
      if (vatConfig && vatConfig.value > 0) vatPercent = parseFloat(vatConfig.value);
    } catch (_) {}

    let payoutDoc;

    if (party === 'wholesaler') {
      if (!order.amountToWholesaler || order.amountToWholesaler <= 0)
        return res.status(400).json({ msg: 'No wholesaler amount set on this order' });
      if (!order.wholesaler)
        return res.status(400).json({ msg: 'No wholesaler linked to this order' });

      const gross  = order.amountToWholesaler;
      const vatAmt = parseFloat(((gross * vatPercent) / 100).toFixed(2));
      const net    = parseFloat((gross - vatAmt).toFixed(2));

      payoutDoc = await Payout.create({
        order:          order._id,
        recipient:      order.wholesaler,
        recipientModel: 'User',
        recipientType:  'wholesaler',
        grossAmount:    gross,
        vatPercent,
        vatAmount:      vatAmt,
        netAmount:      net,
        trigger:        'admin_released',
      });
    } else {
      if (!order.amountToLogistics || order.amountToLogistics <= 0)
        return res.status(400).json({ msg: 'No logistics amount set on this order' });
      if (!order.logisticsCompany)
        return res.status(400).json({ msg: 'No logistics company linked to this order' });

      const gross = order.amountToLogistics;
      payoutDoc = await Payout.create({
        order:          order._id,
        recipient:      order.logisticsCompany,
        recipientModel: 'LogisticsCompany',
        recipientType:  'logistics',
        grossAmount:    gross,
        vatPercent:     0,
        vatAmount:      0,
        netAmount:      gross,
        trigger:        'admin_released',
      });
    }

    const [wholesalerPaid, logisticsPaid] = await Promise.all([
      Payout.exists({ order: order._id, recipientType: 'wholesaler' }),
      Payout.exists({ order: order._id, recipientType: 'logistics'  }),
    ]);

    const bothPaid = !!(wholesalerPaid && logisticsPaid);
    if (bothPaid) {
      order.paymentStatus = 'released';
      order.orderStatus   = 'completed';
      order.status        = 'delivered';
      await order.save();
    }

    await audit(req, 'ESCROW_PARTIAL_RELEASE', 'Order', order._id, {
      party, reason, payoutId: payoutDoc._id, netAmount: payoutDoc.netAmount, bothPaid,
    });

    res.json({
      msg:    `${party} payout released`,
      payout: payoutDoc,
      bothPaid,
      order: { _id: order._id, paymentStatus: order.paymentStatus, orderStatus: order.orderStatus },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

router.post('/escrow/:orderId/freeze', auth, auth.adminOnly, async (req, res) => {
  try {
    const { reason } = req.body;
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ msg: 'Order not found' });
    if (order.paymentStatus === 'released')
      return res.status(400).json({ msg: 'Cannot freeze — escrow already released' });
    order.flagged   = true;
    order.adminNote = reason || 'Escrow frozen by admin';
    await order.save();
    await audit(req, 'ESCROW_FREEZE', 'Order', order._id, { reason });
    res.json({ msg: 'Escrow frozen', order });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

router.post('/escrow/:orderId/refund', auth, auth.adminOnly, async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ msg: 'Refund reason is required' });
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ msg: 'Order not found' });
    if (order.paymentStatus === 'released')
      return res.status(400).json({ msg: 'Cannot refund — escrow already released' });
    order.paymentStatus = 'refunded';
    order.orderStatus   = 'cancelled';
    await order.save();
    await audit(req, 'ESCROW_REFUND', 'Order', order._id, { reason, amount: order.totalAmount });
    res.json({ msg: 'Order refunded to retailer', order });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// PAYMENTS LOG
// ════════════════════════════════════════════════════════════════════════════

router.get('/payments/log', auth, auth.adminOnly, async (req, res) => {
  try {
    const { recipientType, trigger, search, page = 1, limit = 30 } = req.query;

    const filter = {};
    if (recipientType) filter.recipientType = recipientType;
    if (trigger)       filter.trigger       = trigger;

    if (search) {
      const s  = search.trim();
      const re = { $regex: s, $options: 'i' };

      const matchingUsers     = await User.find({ $or: [{ name: re }, { email: re }, { businessName: re }] }).select('_id').lean();
      const matchingCompanies = await LogisticsCompany.find({ $or: [{ name: re }, { email: re }] }).select('_id').lean();
      const recipientIds = [
        ...matchingUsers.map(u => u._id),
        ...matchingCompanies.map(c => c._id),
      ];

      filter.$or = [
        { $expr: { $regexMatch: { input: { $toString: '$_id' }, regex: s, options: 'i' } } },
        ...(recipientIds.length ? [{ recipient: { $in: recipientIds } }] : []),
      ];
    }

    const total   = await Payout.countDocuments(filter);
    const payouts = await Payout.find(filter)
      .populate('order',     'totalAmount orderStatus paymentStatus platformFee createdAt')
      .populate('recipient', 'name email businessName')
      .sort({ releasedAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    // Second-pass filter to catch order ID substring matches
    let results = payouts;
    if (search) {
      const s = search.trim().toLowerCase();
      results = payouts.filter(p => {
        const orderId  = p.order?._id ? String(p.order._id).toLowerCase() : '';
        const payoutId = String(p._id).toLowerCase();
        const name     = (p.recipient?.name         || '').toLowerCase();
        const biz      = (p.recipient?.businessName || '').toLowerCase();
        const email    = (p.recipient?.email        || '').toLowerCase();
        return orderId.includes(s) || payoutId.includes(s) || name.includes(s) || biz.includes(s) || email.includes(s);
      });
    }

    // Summary totals across ALL payouts
    const agg = await Payout.aggregate([
      { $group: { _id: null, totalGross: { $sum: '$grossAmount' }, totalVat: { $sum: '$vatAmount' }, totalNet: { $sum: '$netAmount' }, totalPayouts: { $sum: 1 } } },
    ]);
    const summary = agg[0] || { totalGross: 0, totalVat: 0, totalNet: 0, totalPayouts: 0 };

    const feeAgg = await Order.aggregate([
      { $match: { paymentStatus: 'released' } },
      { $group: { _id: null, total: { $sum: { $ifNull: ['$platformFee', 0] } } } },
    ]);
    summary.totalPlatformFee = feeAgg[0]?.total || 0;

    res.json({
      payouts: results,
      summary,
      total:  search ? results.length : total,
      pages:  search ? Math.ceil(results.length / Number(limit)) : Math.ceil(total / Number(limit)),
      page:   Number(page),
    });
  } catch (err) {
    console.error('Payments log error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS — ADMIN ALERT FEED
// ════════════════════════════════════════════════════════════════════════════

router.get('/notifications', auth, auth.adminOnly, async (req, res) => {
  try {
    const notifications = [];
    const cutoff48h = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // 1. Stuck orders
    const stuckOrders = await Order.find({
      orderStatus: { $nin: ['completed', 'cancelled', 'disputed'] },
      updatedAt:   { $lt: cutoff48h },
    })
      .populate('retailer',   'name businessName')
      .populate('wholesaler', 'name businessName')
      .sort({ updatedAt: 1 })
      .limit(20)
      .lean();

    for (const o of stuckOrders) {
      const hoursStuck = Math.floor((Date.now() - new Date(o.updatedAt)) / 3_600_000);
      notifications.push({
        type:      'stuck_order',
        severity:  hoursStuck > 72 ? 'high' : 'medium',
        title:     `Order stuck at '${o.orderStatus}'`,
        subtitle:  `${o.retailer?.businessName || o.retailer?.name || 'Unknown retailer'} — MWK ${(o.totalAmount || 0).toLocaleString()} — stuck ${hoursStuck}h`,
        id:        o._id,
        link:      `/admin/orders/${o._id}`,
        createdAt: o.updatedAt,
      });
    }

    // 2. Pending logistics approvals
    const pendingLogistics = await LogisticsCompany.find({ status: 'pending' })
      .sort({ createdAt: 1 }).limit(20).lean();

    for (const c of pendingLogistics) {
      const hoursWaiting = Math.floor((Date.now() - new Date(c.createdAt)) / 3_600_000);
      notifications.push({
        type:      'pending_logistics',
        severity:  hoursWaiting > 48 ? 'high' : 'medium',
        title:     'Logistics company pending approval',
        subtitle:  `${c.name} — waiting ${hoursWaiting}h`,
        id:        c._id,
        link:      '/admin/logistics',
        createdAt: c.createdAt,
      });
    }

    // 3. Open / escalated disputes
    const openDisputes = await Dispute.find({ status: { $in: ['open', 'under_review', 'escalated'] } })
      .populate('order',    'totalAmount orderStatus')
      .populate('raisedBy', 'name businessName')
      .sort({ createdAt: 1 }).limit(20).lean();

    for (const d of openDisputes) {
      notifications.push({
        type:      'open_dispute',
        severity:  d.status === 'escalated' ? 'high' : 'medium',
        title:     `${d.status === 'escalated' ? 'Escalated' : 'Open'} dispute`,
        subtitle:  `${d.raisedBy?.businessName || d.raisedBy?.name || 'Unknown'} — MWK ${(d.order?.totalAmount || 0).toLocaleString()}`,
        id:        d._id,
        link:      `/admin/disputes?id=${d._id}`,
        createdAt: d.createdAt,
      });
    }

    // 4. Delivered orders with escrow unreleased >24h
    const pendingEscrow = await Order.find({
      orderStatus:   'delivered',
      paymentStatus: { $nin: ['released', 'refunded'] },
      updatedAt:     { $lt: cutoff24h },
    })
      .populate('retailer', 'name businessName')
      .sort({ updatedAt: 1 }).limit(20).lean();

    for (const o of pendingEscrow) {
      const hoursWaiting = Math.floor((Date.now() - new Date(o.updatedAt)) / 3_600_000);
      notifications.push({
        type:      'pending_escrow',
        severity:  'low',
        title:     'Delivered order — escrow not released',
        subtitle:  `${o.retailer?.businessName || o.retailer?.name || 'Unknown'} — MWK ${(o.totalAmount || 0).toLocaleString()} — ${hoursWaiting}h since delivery`,
        id:        o._id,
        link:      `/admin/escrow?orderId=${o._id}`,
        createdAt: o.updatedAt,
      });
    }

    // Sort: high first, then oldest within same severity
    const SEVERITY_RANK = { high: 0, medium: 1, low: 2 };
    notifications.sort((a, b) => {
      const rankDiff = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
      if (rankDiff !== 0) return rankDiff;
      return new Date(a.createdAt) - new Date(b.createdAt);
    });

    res.json({
      notifications,
      total: notifications.length,
      counts: {
        high:   notifications.filter(n => n.severity === 'high').length,
        medium: notifications.filter(n => n.severity === 'medium').length,
        low:    notifications.filter(n => n.severity === 'low').length,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// AUDIT LOG
// ════════════════════════════════════════════════════════════════════════════

router.get('/audit-log', auth, auth.adminOnly, async (req, res) => {
  try {
    const { action, adminId, page = 1, limit = 30 } = req.query;
    const filter = {};
    if (action)  filter.action  = { $regex: action, $options: 'i' };
    if (adminId) filter.adminId = adminId;
    const total   = await AuditLog.countDocuments(filter);
    const entries = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    res.json({ entries, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;