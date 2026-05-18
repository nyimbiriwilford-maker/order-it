const router           = require('express').Router();
const LogisticsCompany = require('../models/LogisticsCompany');
const Route            = require('../models/Route');
const Order            = require('../models/Order');
const LogisticsRating  = require('../models/LogisticsRating');
const auth             = require('../middleware/auth');

// ── Register logistics company ────────────────────────────────────────────────
router.post('/register', auth, async (req, res) => {
  try {
    const { name, email, contactEmail, phone } = req.body;
    if (!name) return res.status(400).json({ msg: 'Company name is required' });

    const existing = await LogisticsCompany.findOne({ user: req.user.id });
    if (existing) return res.status(400).json({ msg: 'You already have a registered company' });

    const company = await LogisticsCompany.create({
      name, email, contactEmail, phone,
      user: req.user.id,
      status: 'pending',
    });
    res.status(201).json(company);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ── Get own company ───────────────────────────────────────────────────────────
router.get('/me', auth, async (req, res) => {
  try {
    const company = await LogisticsCompany.findOne({ user: req.user.id });
    if (!company) return res.status(404).json({ msg: 'No company found' });
    res.json(company);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// ── Add route ─────────────────────────────────────────────────────────────────
router.post('/routes', auth, auth.logisticsOnly, async (req, res) => {
  try {
    const company = await LogisticsCompany.findOne({ user: req.user.id });
    if (!company) return res.status(404).json({ msg: 'Company not found' });
    if (company.status !== 'approved') return res.status(403).json({ msg: 'Company not approved yet' });

    const { originCity, destinationCity, pricePerDelivery, estimatedDays } = req.body;
    if (!originCity || !destinationCity || !pricePerDelivery || !estimatedDays) {
      return res.status(400).json({ msg: 'All route fields are required' });
    }

    const route = await Route.create({
      logisticsCompany: company._id,
      originCity, destinationCity,
      pricePerDelivery, estimatedDays,
      active: true,
    });
    res.status(201).json(route);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// ── Get own routes ────────────────────────────────────────────────────────────
router.get('/routes/mine', auth, auth.logisticsOnly, async (req, res) => {
  try {
    const company = await LogisticsCompany.findOne({ user: req.user.id });
    if (!company) return res.status(404).json({ msg: 'Company not found' });
    const routes = await Route.find({ logisticsCompany: company._id }).sort({ createdAt: -1 });
    res.json(routes);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// ── Get available routes by destination (for checkout) ───────────────────────
router.get('/routes/available', auth, async (req, res) => {
  try {
    const { to } = req.query;
    if (!to) return res.status(400).json({ msg: 'Destination city required' });

    const routes = await Route.find({ active: true })
      .populate({
        path: 'logisticsCompany',
        match: { status: 'approved' },
        select: 'name status averageRating',
      })
      .sort({ pricePerDelivery: 1 });

    const filtered = routes.filter(r =>
      r.logisticsCompany &&
      r.destinationCity.toLowerCase() === to.toLowerCase()
    );

    res.json(filtered);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// ── Get assigned orders (logistics) ──────────────────────────────────────────
router.get('/orders', auth, auth.logisticsOnly, async (req, res) => {
  try {
    const company = await LogisticsCompany.findOne({ user: req.user.id });
    if (!company) return res.status(404).json({ msg: 'Company not found' });

    const orders = await Order.find({ logisticsCompany: company._id })
      .populate('retailer', 'name email phone')
      .populate('items.product', 'name')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// ── Mark collected ────────────────────────────────────────────────────────────
router.put('/orders/:id/collect', auth, auth.logisticsOnly, async (req, res) => {
  try {
    const company = await LogisticsCompany.findOne({ user: req.user.id });
    const order   = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ msg: 'Order not found' });
    if (order.logisticsCompany.toString() !== company._id.toString()) {
      return res.status(403).json({ msg: 'Not your order' });
    }

    order.orderStatus   = 'collected';
    order.deliveryStatus = 'collected';
    await order.save();
    res.json(order);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// ── Mark in transit ───────────────────────────────────────────────────────────
router.put('/orders/:id/dispatch', auth, auth.logisticsOnly, async (req, res) => {
  try {
    const company = await LogisticsCompany.findOne({ user: req.user.id });
    const order   = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ msg: 'Order not found' });
    if (order.logisticsCompany.toString() !== company._id.toString()) {
      return res.status(403).json({ msg: 'Not your order' });
    }

    order.orderStatus = 'in_transit';
    const route = await Route.findById(order.logisticsRoute);
    if (route) {
      const d = new Date();
      d.setDate(d.getDate() + route.estimatedDays);
      order.estimatedDeliveryDate = d;
    }
    await order.save();
    res.json(order);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// ── Mark delivered ────────────────────────────────────────────────────────────
router.put('/orders/:id/deliver', auth, auth.logisticsOnly, async (req, res) => {
  try {
    const company = await LogisticsCompany.findOne({ user: req.user.id });
    const order   = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ msg: 'Order not found' });
    if (order.logisticsCompany.toString() !== company._id.toString()) {
      return res.status(403).json({ msg: 'Not your order' });
    }

    order.orderStatus    = 'delivered';
    order.status         = 'delivered';
    order.deliveryStatus = 'delivered';
    const autoConfirm    = new Date();
    autoConfirm.setDate(autoConfirm.getDate() + (parseInt(process.env.AUTO_CONFIRM_DAYS) || 2));
    order.autoConfirmAt  = autoConfirm;
    await order.save();
    res.json(order);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// ── Submit rating ─────────────────────────────────────────────────────────────
router.post('/ratings', auth, auth.retailerOnly, async (req, res) => {
  try {
    const { orderId, rating, comment } = req.body;
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ msg: 'Order not found' });
    if (order.retailer.toString() !== req.user.id) return res.status(403).json({ msg: 'Not your order' });
    if (order.ratingSubmitted) return res.status(400).json({ msg: 'Already rated' });

    await LogisticsRating.create({
      order: orderId, retailer: req.user.id,
      logisticsCompany: order.logisticsCompany,
      rating, comment,
    });

    // Update average rating on company
    const ratings = await LogisticsRating.find({ logisticsCompany: order.logisticsCompany });
    const avg = ratings.reduce((s, r) => s + r.rating, 0) / ratings.length;
    await LogisticsCompany.findByIdAndUpdate(order.logisticsCompany, {
      averageRating: Math.round(avg * 10) / 10,
      totalRatings:  ratings.length,
    });

    order.ratingSubmitted = true;
    await order.save();

    res.json({ msg: 'Rating submitted' });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;