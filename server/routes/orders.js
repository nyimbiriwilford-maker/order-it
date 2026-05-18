const router           = require('express').Router();
const Order            = require('../models/Order');
const Product          = require('../models/Product');
const Config           = require('../models/Config');
const auth             = require('../middleware/auth');
const sendEmail        = require('../utils/sendEmail');
const checkStockAlerts = require('../utils/checkStockAlerts');
const releaseEscrow    = require('../utils/releaseEscrow');
const {
  orderConfirmationRetailer,
  newOrderNotificationWholesaler,
  newAssignmentNotificationLogistics,
  readyForCollectionNotificationLogistics,
} = require('../utils/emailTemplates');

// Helper — reads platform fee % from Config DB, falls back to .env, then 2%
async function calcFees(productTotal, deliveryFee) {
  let feePercent = parseFloat(process.env.PLATFORM_FEE_PERCENT) || 2;
  try {
    const cfg = await Config.findOne({ key: 'platform_fee_percent' }).lean();
    if (cfg && cfg.value != null && parseFloat(cfg.value) >= 0) {
      feePercent = parseFloat(cfg.value);
    }
  } catch (_) {
    // If DB read fails, fall back to .env value already set above
  }
  const platformFee        = parseFloat(((productTotal * feePercent) / 100).toFixed(2));
  const amountToWholesaler = parseFloat((productTotal - platformFee).toFixed(2));
  const amountToLogistics  = deliveryFee || 0;
  return { platformFee, amountToWholesaler, amountToLogistics, feePercent };
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

    const populated = await Order.findById(order._id)
      .populate('retailer', 'name email')
      .populate('logisticsCompany', 'name email contactEmail');

    const shortId = order._id.toString().slice(-8).toUpperCase();

    await sendEmail({ to: populated.retailer.email, ...orderConfirmationRetailer({ retailerName: populated.retailer.name, orderId: shortId, items: enrichedItems, totalAmount }) });
    await sendEmail({ to: process.env.EMAIL_USER, ...newOrderNotificationWholesaler({ orderId: shortId, retailerName: populated.retailer.name, retailerEmail: populated.retailer.email, items: enrichedItems, totalAmount }) });

    const logisticsEmail = populated.logisticsCompany?.contactEmail || populated.logisticsCompany?.email;
    if (logisticsEmail) {
      await sendEmail({ to: logisticsEmail, ...newAssignmentNotificationLogistics({ logisticsName: populated.logisticsCompany.name, orderId: shortId, retailerName: populated.retailer.name, retailerEmail: populated.retailer.email, deliveryAddress: order.deliveryAddress, items: enrichedItems, totalAmount, deliveryFee: order.deliveryFee }) });
    }

    res.status(201).json(order);
  } catch (err) {
    console.error('❌ Order error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ── Place multiple orders (retailer — one per wholesaler group) ───────────────
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

    for (const order of createdOrders) {
      const populated = await Order.findById(order._id)
        .populate('retailer', 'name email')
        .populate('logisticsCompany', 'name email contactEmail');

      const shortId = order._id.toString().slice(-8).toUpperCase();

      await sendEmail({ to: populated.retailer.email, ...orderConfirmationRetailer({ retailerName: populated.retailer.name, orderId: shortId, items: order.items, totalAmount: order.totalAmount }) });
      await sendEmail({ to: process.env.EMAIL_USER, ...newOrderNotificationWholesaler({ orderId: shortId, retailerName: populated.retailer.name, retailerEmail: populated.retailer.email, items: order.items, totalAmount: order.totalAmount }) });

      const logisticsEmail = populated.logisticsCompany?.contactEmail || populated.logisticsCompany?.email;
      if (logisticsEmail) {
        await sendEmail({ to: logisticsEmail, ...newAssignmentNotificationLogistics({ logisticsName: populated.logisticsCompany.name, orderId: shortId, retailerName: populated.retailer.name, retailerEmail: populated.retailer.email, deliveryAddress: order.deliveryAddress, items: order.items, totalAmount: order.totalAmount, deliveryFee: order.deliveryFee }) });
      }
    }

    res.status(201).json(createdOrders);
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
      .populate('retailer', 'name email')
      .populate('logisticsCompany', 'name email contactEmail')
      .populate('items.product', 'name');

    const shortId = order._id.toString().slice(-8).toUpperCase();
    const labels  = { confirmed: 'confirmed ✅', shipped: 'ready for collection 🏭', cancelled: 'cancelled ❌' };

    if (labels[status] && order.retailer?.email) {
      await sendEmail({
        to:      order.retailer.email,
        subject: `Your order has been ${labels[status]} — #${shortId}`,
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto"><div style="background:linear-gradient(135deg,#1a3a6b,#00c853);padding:24px 32px;border-radius:12px 12px 0 0"><h1 style="color:#fff;margin:0">Order It</h1></div><div style="background:#fff;padding:32px;border:1px solid #f0f0f0;border-radius:0 0 12px 12px"><h2>Order #${shortId} update</h2><p>Hi ${order.retailer.name}, your order status is now: <strong>${labels[status]}</strong></p></div></div>`
      });
    }

    if (status === 'shipped') {
      const logisticsEmail = order.logisticsCompany?.contactEmail || order.logisticsCompany?.email;
      if (logisticsEmail) {
        const User = require('../models/User');
        const wholesaler = await User.findById(req.user.id).select('name phone businessName').lean();
        await sendEmail({
          to: logisticsEmail,
          ...readyForCollectionNotificationLogistics({
            logisticsName:   order.logisticsCompany.name,
            orderId:         shortId,
            retailerName:    order.retailer.name,
            deliveryAddress: order.deliveryAddress,
            items:           order.items.map(i => ({ name: i.name || i.product?.name, quantity: i.quantity })),
            deliveryFee:     order.deliveryFee,
            wholesalerName:  wholesaler?.businessName || wholesaler?.name || 'Order It Wholesaler',
            wholesalerPhone: wholesaler?.phone || '',
          })
        });
      }
    }

    res.json(order);
  } catch (err) {
    console.error('❌ Status error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ── Confirm receipt (retailer) ────────────────────────────────────────────────
router.put('/:id/confirm', auth, auth.retailerOnly, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ msg: 'Order not found' });
    if (order.retailer.toString() !== req.user.id) return res.status(403).json({ msg: 'Not your order' });
    if (order.orderStatus !== 'delivered') return res.status(400).json({ msg: 'Order not delivered yet' });

    order.orderStatus       = 'confirmed';
    order.retailerConfirmed = true;
    order.confirmedAt       = new Date();
    await order.save();

    const released = await releaseEscrow(order._id, 'retailer_confirmed');
    res.json(released);
  } catch (err) {
    console.error('❌ Confirm error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ── Cancel order (retailer) ───────────────────────────────────────────────────
router.put('/:id/cancel', auth, auth.retailerOnly, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
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

module.exports = router;