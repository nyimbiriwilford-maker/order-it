const router           = require('express').Router();
const Order            = require('../models/Order');
const Product          = require('../models/Product');
const Config           = require('../models/Config');
const User             = require('../models/User');
const auth             = require('../middleware/auth');
const sendEmail        = require('../utils/sendEmail');
const checkStockAlerts = require('../utils/checkStockAlerts');
const releaseEscrow    = require('../utils/releaseEscrow');
const {
  orderConfirmationRetailer,
  newOrderNotificationWholesaler,
  newAssignmentNotificationLogistics,
  readyForCollectionNotificationLogistics,
  orderStatusUpdateRetailer,
} = require('../utils/emailTemplates');

// Helper — reads platform fee % from Config DB, falls back to .env, then 2%
async function calcFees(productTotal, deliveryFee) {
  let feePercent = parseFloat(process.env.PLATFORM_FEE_PERCENT) || 2;
  try {
    const cfg = await Config.findOne({ key: 'platform_fee_percent' }).lean();
    if (cfg && cfg.value != null && parseFloat(cfg.value) >= 0) {
      feePercent = parseFloat(cfg.value);
    }
  } catch (_) {}
  const platformFee        = parseFloat(((productTotal * feePercent) / 100).toFixed(2));
  const amountToWholesaler = parseFloat((productTotal - platformFee).toFixed(2));
  const amountToLogistics  = deliveryFee || 0;
  return { platformFee, amountToWholesaler, amountToLogistics, feePercent };
}

// Fire-and-forget — never blocks response
function fireEmail(params) {
  if (!params.to) return; // skip if no email address
  sendEmail(params).catch(err => console.error('❌ Background email error:', err.message));
}

// ── Place order (retailer) ────────────────────────────────────────────────────
router.post('/', auth, auth.retailerOnly, async (req, res) => {
  try {
    const { items, totalAmount, productTotal, deliveryFee, deliveryAddress, logisticsRoute, logisticsCompany } = req.body;

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) return res.status(404).json({ msg: `Product not found: ${item.product}` });
      if (product.stock < item.quantity) {
        return res.status(400).json({ msg: `Not enough stock for "${product.name}". Available: ${product.stock}` });
      }
    }

    const enrichedItems = [];
    for (const item of items) {
      const product = await Product.findById(item.product);
      await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.quantity } });
      enrichedItems.push({
        product:    item.product,
        quantity:   item.quantity,
        price:      item.price,
        name:       product.name,
        wholesaler: product.wholesaler,
      });
    }

    const base = productTotal || totalAmount;
    const fee  = deliveryFee || 0;
    const { platformFee, amountToWholesaler, amountToLogistics } = await calcFees(base, fee);

    const order = await Order.create({
      retailer:         req.user.id,
      wholesaler:       enrichedItems[0]?.wholesaler || null,
      items:            enrichedItems,
      totalAmount,
      productTotal:     base,
      deliveryFee:      fee,
      deliveryAddress:  deliveryAddress || {},
      logisticsRoute:   logisticsRoute  || null,
      logisticsCompany: logisticsCompany || null,
      orderStatus:      'pending',
      status:           'pending',
      deliveryStatus:   logisticsCompany ? 'assigned' : 'unassigned',
      platformFee,
      amountToWholesaler,
      amountToLogistics,
    });

    for (const item of enrichedItems) {
      const updated = await Product.findById(item.product).select('stock name');
      if (updated) await checkStockAlerts(updated._id, updated.stock, updated.name);
    }

    res.status(201).json(order);

    // Background emails
    const populated = await Order.findById(order._id)
      .populate('retailer',         'name email')
      .populate('wholesaler',       'name email businessName')
      .populate('logisticsCompany', 'name email contactEmail');

    const shortId = order._id.toString().slice(-8).toUpperCase();

    // → Retailer
    fireEmail({ to: populated.retailer.email,
      ...orderConfirmationRetailer({ retailerName: populated.retailer.name, orderId: shortId, items: enrichedItems, totalAmount }) });

    // → Wholesaler (actual wholesaler email, not hardcoded)
    const wholesalerEmail = populated.wholesaler?.email;
    if (wholesalerEmail) {
      fireEmail({ to: wholesalerEmail,
        ...newOrderNotificationWholesaler({ orderId: shortId, retailerName: populated.retailer.name, retailerEmail: populated.retailer.email, items: enrichedItems, totalAmount }) });
    }

    // → Logistics
    const logisticsEmail = populated.logisticsCompany?.contactEmail || populated.logisticsCompany?.email;
    if (logisticsEmail) {
      fireEmail({ to: logisticsEmail,
        ...newAssignmentNotificationLogistics({ logisticsName: populated.logisticsCompany.name, orderId: shortId, retailerName: populated.retailer.name, retailerEmail: populated.retailer.email, deliveryAddress: order.deliveryAddress, items: enrichedItems, totalAmount, deliveryFee: order.deliveryFee }) });
    }

  } catch (err) {
    console.error('❌ Order error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ── Place multiple orders (one per wholesaler group) ─────────────────────────
router.post('/multi', auth, auth.retailerOnly, async (req, res) => {
  try {
    const { groups, deliveryAddress } = req.body;
    if (!groups || groups.length === 0) {
      return res.status(400).json({ msg: 'No order groups provided' });
    }

    const mongoose      = require('mongoose');
    const groupOrderId  = new mongoose.Types.ObjectId().toString();
    const createdOrders = [];

    for (const group of groups) {
      const { items, logisticsRoute, logisticsCompany, deliveryFee, wholesalerId } = group;

      for (const item of items) {
        const product = await Product.findById(item.product);
        if (!product) return res.status(404).json({ msg: `Product not found: ${item.product}` });
        if (product.stock < item.quantity) {
          return res.status(400).json({ msg: `Not enough stock for "${product.name}". Available: ${product.stock}` });
        }
      }

      const enrichedItems = [];
      for (const item of items) {
        const product = await Product.findById(item.product);
        await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.quantity } });
        enrichedItems.push({ product: item.product, quantity: item.quantity, price: item.price, name: product.name });
      }

      const productTotal = enrichedItems.reduce((s, i) => s + i.price * i.quantity, 0);
      const fee          = deliveryFee || 0;
      const totalAmount  = productTotal + fee;
      const { platformFee, amountToWholesaler, amountToLogistics } = await calcFees(productTotal, fee);

      const order = await Order.create({
        retailer:         req.user.id,
        wholesaler:       wholesalerId || null,
        groupOrderId,
        items:            enrichedItems,
        totalAmount,
        productTotal,
        deliveryFee:      fee,
        deliveryAddress:  deliveryAddress || {},
        logisticsRoute:   logisticsRoute  || null,
        logisticsCompany: logisticsCompany || null,
        orderStatus:      'pending',
        status:           'pending',
        deliveryStatus:   logisticsCompany ? 'assigned' : 'unassigned',
        platformFee,
        amountToWholesaler,
        amountToLogistics,
      });

      for (const item of enrichedItems) {
        const updated = await Product.findById(item.product).select('stock name');
        if (updated) await checkStockAlerts(updated._id, updated.stock, updated.name);
      }

      createdOrders.push(order);
    }

    res.status(201).json(createdOrders);

    // Background emails for each order
    for (const order of createdOrders) {
      const populated = await Order.findById(order._id)
        .populate('retailer',         'name email')
        .populate('wholesaler',       'name email businessName')
        .populate('logisticsCompany', 'name email contactEmail');

      const shortId = order._id.toString().slice(-8).toUpperCase();

      // → Retailer
      fireEmail({ to: populated.retailer.email,
        ...orderConfirmationRetailer({ retailerName: populated.retailer.name, orderId: shortId, items: order.items, totalAmount: order.totalAmount }) });

      // → Wholesaler (actual wholesaler email)
      const wholesalerEmail = populated.wholesaler?.email;
      if (wholesalerEmail) {
        fireEmail({ to: wholesalerEmail,
          ...newOrderNotificationWholesaler({ orderId: shortId, retailerName: populated.retailer.name, retailerEmail: populated.retailer.email, items: order.items, totalAmount: order.totalAmount }) });
      }

      // → Logistics
      const logisticsEmail = populated.logisticsCompany?.contactEmail || populated.logisticsCompany?.email;
      if (logisticsEmail) {
        fireEmail({ to: logisticsEmail,
          ...newAssignmentNotificationLogistics({ logisticsName: populated.logisticsCompany.name, orderId: shortId, retailerName: populated.retailer.name, retailerEmail: populated.retailer.email, deliveryAddress: order.deliveryAddress, items: order.items, totalAmount: order.totalAmount, deliveryFee: order.deliveryFee }) });
      }
    }

  } catch (err) {
    console.error('❌ Multi-order error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ── Get my orders (retailer) ──────────────────────────────────────────────────
router.get('/mine', auth, auth.retailerOnly, async (req, res) => {
  try {
    const orders = await Order.find({ retailer: req.user.id })
      .populate('items.product', 'name price')
      .populate('logisticsCompany', 'name')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// ── Get orders (wholesaler sees own, admin sees all) ──────────────────────────
router.get('/all', auth, (req, res, next) => {
  if (req.user.role === 'wholesaler' || req.user.role === 'admin') return next();
  return res.status(403).json({ msg: 'Access denied' });
}, async (req, res) => {
  try {
    const filter = req.user.role === 'wholesaler' ? { wholesaler: req.user.id } : {};
    const orders = await Order.find(filter)
      .populate('items.product', 'name price')
      .populate('retailer', 'name email businessName phone')
      .populate('logisticsCompany', 'name')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// ── Update status (wholesaler) ────────────────────────────────────────────────
router.put('/:id/status', auth, auth.wholesalerOnly, async (req, res) => {
  try {
    const { status } = req.body;

    const existing = await Order.findById(req.params.id);
    if (!existing) return res.status(404).json({ msg: 'Order not found' });
    if (String(existing.wholesaler) !== String(req.user.id)) {
      return res.status(403).json({ msg: 'Not your order' });
    }

    const statusMap = {
      confirmed: 'pending',
      shipped:   'ready_for_collection',
      cancelled: 'cancelled',
    };

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status, orderStatus: statusMap[status] || status },
      { new: true }
    )
      .populate('retailer',         'name email')
      .populate('wholesaler',       'name email businessName phone')
      .populate('logisticsCompany', 'name email contactEmail')
      .populate('items.product',    'name');

    res.json(order);

    const shortId = order._id.toString().slice(-8).toUpperCase();

    // → Retailer: order confirmed or cancelled
    if ((status === 'confirmed' || status === 'cancelled') && order.retailer?.email) {
      const orderStatus = status === 'confirmed' ? 'confirmed' : 'cancelled';
      const message = status === 'confirmed'
        ? 'Your wholesaler has confirmed your order. Goods are now being prepared.'
        : 'Unfortunately your order has been cancelled by the wholesaler.';
      fireEmail({ to: order.retailer.email,
        ...orderStatusUpdateRetailer({ retailerName: order.retailer.name, orderId: shortId, status: orderStatus, message }) });
    }

    // → Retailer: ready for collection (goods being prepared)
    if (status === 'shipped' && order.retailer?.email) {
      fireEmail({ to: order.retailer.email,
        ...orderStatusUpdateRetailer({ retailerName: order.retailer.name, orderId: shortId, status: 'ready_for_collection', message: 'Your goods are packed and ready. A logistics company will collect and deliver them soon.' }) });
    }

    // → Logistics: ready for collection notification
    if (status === 'shipped') {
      const logisticsEmail = order.logisticsCompany?.contactEmail || order.logisticsCompany?.email;
      if (logisticsEmail) {
        const wholesaler = order.wholesaler;
        fireEmail({ to: logisticsEmail,
          ...readyForCollectionNotificationLogistics({
            logisticsName:   order.logisticsCompany.name,
            orderId:         shortId,
            retailerName:    order.retailer.name,
            deliveryAddress: order.deliveryAddress,
            items:           order.items.map(i => ({ name: i.name || i.product?.name, quantity: i.quantity })),
            deliveryFee:     order.deliveryFee,
            wholesalerName:  wholesaler?.businessName || wholesaler?.name || 'Order It Wholesaler',
            wholesalerPhone: wholesaler?.phone || '',
          }) });
      }
    }

  } catch (err) {
    console.error('❌ Status error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ── Confirm receipt (retailer) ────────────────────────────────────────────────
router.put('/:id/confirm', auth, auth.retailerOnly, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('wholesaler',       'name email businessName')
      .populate('logisticsCompany', 'name email contactEmail');

    if (!order) return res.status(404).json({ msg: 'Order not found' });
    if (order.retailer.toString() !== req.user.id) return res.status(403).json({ msg: 'Not your order' });
    if (order.orderStatus !== 'delivered') return res.status(400).json({ msg: 'Order not delivered yet' });

    order.orderStatus       = 'confirmed';
    order.retailerConfirmed = true;
    order.confirmedAt       = new Date();
    await order.save();

    const released  = await releaseEscrow(order._id, 'retailer_confirmed');
    res.json(released);

    // Background emails
    const shortId = order._id.toString().slice(-8).toUpperCase();
    const retailer = await User.findById(req.user.id).select('name email').lean();

    // → Wholesaler: payment released
    const wholesalerEmail = order.wholesaler?.email;
    if (wholesalerEmail) {
      fireEmail({
        to:      wholesalerEmail,
        subject: `💰 Payment released — Order #${shortId}`,
        html:    buildSimpleEmail('Payment Released 💰', `Hi <strong>${order.wholesaler.businessName || order.wholesaler.name}</strong>, the retailer has confirmed delivery of order <strong>#${shortId}</strong>. Your payment has been released to your account.`),
      });
    }

    // → Logistics: payment released
    const logisticsEmail = order.logisticsCompany?.contactEmail || order.logisticsCompany?.email;
    if (logisticsEmail) {
      fireEmail({
        to:      logisticsEmail,
        subject: `💰 Delivery fee released — Order #${shortId}`,
        html:    buildSimpleEmail('Delivery Fee Released 💰', `Hi <strong>${order.logisticsCompany.name}</strong>, the retailer has confirmed delivery of order <strong>#${shortId}</strong>. Your delivery fee has been released to your account.`),
      });
    }

  } catch (err) {
    console.error('❌ Confirm error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ── Cancel order (retailer) ───────────────────────────────────────────────────
router.put('/:id/cancel', auth, auth.retailerOnly, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('wholesaler', 'name email businessName');

    if (!order) return res.status(404).json({ msg: 'Order not found' });
    if (order.retailer.toString() !== req.user.id) return res.status(403).json({ msg: 'Not your order' });
    if (order.status !== 'pending') return res.status(400).json({ msg: 'Only pending orders can be cancelled' });

    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
    }

    order.status      = 'cancelled';
    order.orderStatus = 'cancelled';
    await order.save();
    res.json(order);

    // → Wholesaler: order cancelled
    const shortId = order._id.toString().slice(-8).toUpperCase();
    const wholesalerEmail = order.wholesaler?.email;
    if (wholesalerEmail) {
      fireEmail({
        to:      wholesalerEmail,
        subject: `❌ Order #${shortId} cancelled by retailer`,
        html:    buildSimpleEmail('Order Cancelled ❌', `Order <strong>#${shortId}</strong> has been cancelled by the retailer before confirmation. No action is required.`),
      });
    }

  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// ── Get single order (retailer — own orders only) ─────────────────────────────
router.get('/:id', auth, auth.retailerOnly, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('items.product', 'name price')
      .populate('logisticsCompany', 'name')
      .populate('wholesaler', 'name businessName');

    if (!order) return res.status(404).json({ msg: 'Order not found' });
    if (order.retailer.toString() !== req.user.id)
      return res.status(403).json({ msg: 'Not your order' });

    res.json(order);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// ── Simple branded email builder (for short transactional messages) ───────────
function buildSimpleEmail(title, bodyHtml) {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f0f0f0;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px">
        <tr><td style="background:linear-gradient(135deg,#1a3a6b,#0d6efd 50%,#00c853);border-radius:16px 16px 0 0;padding:28px 40px">
          <table cellpadding="0" cellspacing="0"><tr>
            <td style="background:#f0f0f0;border-radius:50px;padding:10px 22px">
              <span style="font-size:22px;font-weight:900;color:#1a3a6b;font-family:Arial,sans-serif">order</span><span style="font-size:22px;font-weight:900;color:#00c853;font-family:Arial,sans-serif"> ·it</span>
            </td>
          </tr></table>
        </td></tr>
        <tr><td style="background:#fff;border-left:1px solid #e8e8e8;border-right:1px solid #e8e8e8;padding:40px">
          <h2 style="margin:0 0 16px;color:#1a3a6b;font-size:22px">${title}</h2>
          <p style="margin:0;color:#555;font-size:15px;line-height:1.7">${bodyHtml}</p>
        </td></tr>
        <tr><td style="background:#1a3a6b;border-radius:0 0 16px 16px;padding:20px 40px">
          <p style="margin:0;color:rgba(255,255,255,0.6);font-size:12px">Order It — B2B E-Commerce Platform · Malawi<br/>This is an automated message. Please do not reply.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

module.exports = router;