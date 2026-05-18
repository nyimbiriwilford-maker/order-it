const router  = require('express').Router();
const Dispute = require('../models/Dispute');
const Order   = require('../models/Order');
const auth    = require('../middleware/auth');

// ─────────────────────────────────────────────────────────────────────────────
// RETAILER — raise a dispute
// POST /api/disputes
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', auth, auth.retailerOnly, async (req, res) => {
  try {
    const { orderId, reason, description } = req.body;
    if (!orderId || !reason || !description)
      return res.status(400).json({ msg: 'orderId, reason, and description are required' });

    const order = await Order.findById(orderId);
    if (!order)
      return res.status(404).json({ msg: 'Order not found' });
    if (String(order.retailer) !== String(req.user.id))
      return res.status(403).json({ msg: 'Not your order' });
    if (!['delivered', 'completed'].includes(order.orderStatus))
      return res.status(400).json({ msg: 'Can only dispute delivered or completed orders' });

    // Check no open dispute already exists
    const existing = await Dispute.findOne({ order: orderId, status: { $in: ['open', 'under_review', 'escalated'] } });
    if (existing)
      return res.status(400).json({ msg: 'An active dispute already exists for this order' });

    const dispute = await Dispute.create({
      order:      orderId,
      raisedBy:   req.user.id,
      wholesaler: order.wholesaler,
      logistics:  order.logisticsCompany,
      reason,
      description,
    });

    // Mark order as disputed
    await Order.findByIdAndUpdate(orderId, { orderStatus: 'disputed' });

    res.status(201).json(dispute);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// RETAILER — get my disputes
// GET /api/disputes/mine
// ─────────────────────────────────────────────────────────────────────────────
router.get('/mine', auth, auth.retailerOnly, async (req, res) => {
  try {
    const disputes = await Dispute.find({ raisedBy: req.user.id })
      .populate('order', 'totalAmount orderStatus createdAt')
      .sort({ createdAt: -1 });
    res.json(disputes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN — get all disputes
// GET /api/disputes?status=&page=&limit=
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', auth, auth.adminOnly, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const total    = await Dispute.countDocuments(filter);
    const disputes = await Dispute.find(filter)
      .populate('raisedBy',  'name email businessName')
      .populate('order',     'totalAmount orderStatus amountToWholesaler amountToLogistics createdAt')
      .populate('wholesaler','name email businessName')
      .populate('logistics', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ disputes, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN — get single dispute
// GET /api/disputes/:id
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id', auth, auth.adminOnly, async (req, res) => {
  try {
    const dispute = await Dispute.findById(req.params.id)
      .populate('raisedBy',  'name email businessName phone')
      .populate('wholesaler','name email businessName phone')
      .populate('logistics', 'name email phone')
      .populate('order')
      .populate('resolvedBy', 'name');
    if (!dispute) return res.status(404).json({ msg: 'Dispute not found' });
    res.json(dispute);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN — resolve dispute
// PUT /api/disputes/:id/resolve
// body: { resolution, resolutionNote }
// ─────────────────────────────────────────────────────────────────────────────
router.put('/:id/resolve', auth, auth.adminOnly, async (req, res) => {
  try {
    const { resolution, resolutionNote } = req.body;
    const validResolutions = ['favour_retailer', 'favour_wholesaler', 'favour_logistics', 'partial', 'dismissed'];
    if (!resolution || !validResolutions.includes(resolution))
      return res.status(400).json({ msg: 'Valid resolution required: ' + validResolutions.join(', ') });

    const dispute = await Dispute.findById(req.params.id)
      .populate('order')
      .populate('raisedBy',   'name email')
      .populate('wholesaler', 'name email businessName')
      .populate('logistics',  'name email contactEmail');

    if (!dispute) return res.status(404).json({ msg: 'Dispute not found' });
    if (dispute.status === 'resolved') return res.status(400).json({ msg: 'Dispute already resolved' });

    dispute.resolution     = resolution;
    dispute.resolutionNote = resolutionNote || '';
    dispute.resolvedBy     = req.user.id;
    dispute.resolvedAt     = new Date();
    dispute.status         = 'resolved';
    dispute.escrowFrozen   = false;
    await dispute.save();

    const order   = dispute.order;
    const shortId = String(order._id).slice(-8).toUpperCase();
    const amount  = Number(order.totalAmount).toLocaleString();
    const note    = resolutionNote ? `<p><strong>Admin note:</strong> ${resolutionNote}</p>` : '';

    // ── Update order status based on ruling ───────────────────────────────────
    if (resolution === 'favour_retailer') {
      await Order.findByIdAndUpdate(order._id, {
        orderStatus:   'cancelled',
        paymentStatus: 'refunded',
      });
    } else {
      await Order.findByIdAndUpdate(order._id, {
        orderStatus:   'completed',
        paymentStatus: 'released',
      });
    }

    // ── Email helpers ─────────────────────────────────────────────────────────
    const sendEmail = require('../utils/sendEmail');

    function emailWrap(body) {
      return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:linear-gradient(135deg,#1a3a6b,#00c853);padding:24px 32px;border-radius:12px 12px 0 0">
          <h1 style="color:#fff;margin:0;font-size:20px">Order It</h1>
        </div>
        <div style="background:#fff;padding:32px;border:1px solid #f0f0f0;border-radius:0 0 12px 12px">
          ${body}
          <hr style="border:none;border-top:1px solid #f0f0f0;margin:24px 0"/>
          <p style="font-size:12px;color:#999;margin:0">Order It · Dispute #${String(dispute._id).slice(-8).toUpperCase()} · Order #${shortId}</p>
        </div>
      </div>`;
    }

    // ── Notify retailer ───────────────────────────────────────────────────────
    const retailer = dispute.raisedBy;
    if (retailer?.email) {
      let retailerBody;

      if (resolution === 'favour_retailer') {
        retailerBody = `
          <h2 style="color:#1a3a6b">Your dispute has been resolved ✅</h2>
          <p>Hi ${retailer.name},</p>
          <p>We have reviewed your dispute for order <strong>#${shortId}</strong> and ruled <strong>in your favour</strong>.</p>
          <p>A refund of <strong>MWK ${amount}</strong> will be returned to you. Our team will contact you within 2–3 business days to arrange the refund.</p>
          ${note}
          <p>Thank you for your patience.</p>`;
      } else if (resolution === 'dismissed') {
        retailerBody = `
          <h2 style="color:#1a3a6b">Dispute update — Order #${shortId}</h2>
          <p>Hi ${retailer.name},</p>
          <p>After reviewing your dispute, our team has <strong>dismissed</strong> it. The order will be marked as completed and payment released to the relevant parties.</p>
          ${note}
          <p>If you believe this is an error, please contact our support team.</p>`;
      } else {
        const rulingLabel = {
          favour_wholesaler: 'in favour of the wholesaler',
          favour_logistics:  'in favour of the logistics provider',
          partial:           'as a partial resolution',
        }[resolution] || resolution;

        retailerBody = `
          <h2 style="color:#1a3a6b">Dispute update — Order #${shortId}</h2>
          <p>Hi ${retailer.name},</p>
          <p>After reviewing your dispute, our team has ruled <strong>${rulingLabel}</strong>. The order has been marked as completed.</p>
          ${note}
          <p>If you have further questions, please contact our support team.</p>`;
      }

      await sendEmail({
        to:      retailer.email,
        subject: `Dispute resolved — Order #${shortId}`,
        html:    emailWrap(retailerBody),
      });
    }

    // ── Notify wholesaler if ruling goes against them ─────────────────────────
    const wholesaler = dispute.wholesaler;
    if (wholesaler?.email && resolution === 'favour_retailer') {
      const wholesalerBody = `
        <h2 style="color:#1a3a6b">Dispute outcome — Order #${shortId}</h2>
        <p>Hi ${wholesaler.businessName || wholesaler.name},</p>
        <p>A dispute raised by the retailer for order <strong>#${shortId}</strong> has been resolved <strong>in favour of the retailer</strong>. The order has been cancelled and a refund of MWK ${amount} will be issued to the retailer.</p>
        ${note}
        <p>If you have questions about this decision, please contact our admin team.</p>`;

      await sendEmail({
        to:      wholesaler.email,
        subject: `Dispute outcome — Order #${shortId}`,
        html:    emailWrap(wholesalerBody),
      });
    }

    // ── Notify logistics if ruling goes against them ──────────────────────────
    const logistics = dispute.logistics;
    const logisticsEmail = logistics?.contactEmail || logistics?.email;
    if (logisticsEmail && resolution === 'favour_retailer') {
      const logisticsBody = `
        <h2 style="color:#1a3a6b">Dispute outcome — Order #${shortId}</h2>
        <p>Hi ${logistics.name},</p>
        <p>A dispute for order <strong>#${shortId}</strong> has been resolved <strong>in favour of the retailer</strong>. Please be aware that the delivery fee for this order may be affected.</p>
        ${note}
        <p>Our admin team will follow up if any action is required from you.</p>`;

      await sendEmail({
        to:      logisticsEmail,
        subject: `Dispute outcome — Order #${shortId}`,
        html:    emailWrap(logisticsBody),
      });
    }

    // ── Audit log ─────────────────────────────────────────────────────────────
    try {
      const AuditLog = require('../models/AuditLog');
      await AuditLog.create({
        adminId:     req.user.id,
        adminName:   req.user.name || 'Admin',
        action:      'RESOLVE_DISPUTE',
        targetModel: 'Dispute',
        targetId:    dispute._id,
        details:     { resolution, resolutionNote, orderId: order._id },
        ipAddress:   req.ip,
      });
    } catch (e) { console.error('Audit log failed:', e.message); }

    res.json({ msg: 'Dispute resolved', dispute });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN — escalate dispute (freeze escrow indefinitely)
// PUT /api/disputes/:id/escalate
// ─────────────────────────────────────────────────────────────────────────────
router.put('/:id/escalate', auth, auth.adminOnly, async (req, res) => {
  try {
    const dispute = await Dispute.findByIdAndUpdate(
      req.params.id,
      { status: 'escalated', escrowFrozen: true },
      { new: true }
    );
    if (!dispute) return res.status(404).json({ msg: 'Dispute not found' });

    // Freeze escrow on the order
    await Order.findByIdAndUpdate(dispute.order, { paymentStatus: 'unpaid' });

    res.json({ msg: 'Dispute escalated and escrow frozen', dispute });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN — add internal note
// POST /api/disputes/:id/notes
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:id/notes', auth, auth.adminOnly, async (req, res) => {
  try {
    const { note } = req.body;
    if (!note) return res.status(400).json({ msg: 'Note is required' });

    const dispute = await Dispute.findByIdAndUpdate(
      req.params.id,
      { $push: { adminNotes: { note, addedBy: req.user.id, addedAt: new Date() } } },
      { new: true }
    );
    if (!dispute) return res.status(404).json({ msg: 'Dispute not found' });
    res.json(dispute);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;