const router           = require('express').Router();
const LogisticsCompany = require('../models/LogisticsCompany');
const Route            = require('../models/Route');
const Order            = require('../models/Order');
const LogisticsRating  = require('../models/LogisticsRating');
const auth             = require('../middleware/auth');
const sendEmail        = require('../utils/sendEmail');
const { orderStatusUpdateRetailer } = require('../utils/emailTemplates');

// Fire-and-forget helper
function fireEmail(params) {
  if (!params.to) return;
  sendEmail(params).catch(err => console.error('❌ Background email error:', err.message));
}

// Simple branded email builder
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
    const order   = await Order.findById(req.params.id)
      .populate('retailer',   'name email')
      .populate('wholesaler', 'name email businessName');

    if (!order) return res.status(404).json({ msg: 'Order not found' });
    if (order.logisticsCompany.toString() !== company._id.toString()) {
      return res.status(403).json({ msg: 'Not your order' });
    }

    order.orderStatus    = 'collected';
    order.deliveryStatus = 'collected';
    await order.save();
    res.json(order);

    const shortId = order._id.toString().slice(-8).toUpperCase();

    // → Retailer: goods collected
    fireEmail({ to: order.retailer?.email,
      ...orderStatusUpdateRetailer({ retailerName: order.retailer.name, orderId: shortId, status: 'collected', message: `${company.name} has collected your goods from the wholesaler and will be in touch shortly.` }) });

    // → Wholesaler: goods collected confirmation
    const wholesalerEmail = order.wholesaler?.email;
    if (wholesalerEmail) {
      fireEmail({
        to:      wholesalerEmail,
        subject: `📦 Order #${shortId} collected by logistics`,
        html:    buildSimpleEmail('Goods Collected 📦', `<strong>${company.name}</strong> has collected the goods for order <strong>#${shortId}</strong>. The order is now on its way to the retailer.`),
      });
    }

  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// ── Mark in transit ───────────────────────────────────────────────────────────
router.put('/orders/:id/dispatch', auth, auth.logisticsOnly, async (req, res) => {
  try {
    const company = await LogisticsCompany.findOne({ user: req.user.id });
    const order   = await Order.findById(req.params.id)
      .populate('retailer', 'name email');

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

    const shortId = order._id.toString().slice(-8).toUpperCase();
    const eta     = order.estimatedDeliveryDate
      ? `Estimated delivery: <strong>${order.estimatedDeliveryDate.toDateString()}</strong>.`
      : '';

    // → Retailer: out for delivery
    fireEmail({ to: order.retailer?.email,
      ...orderStatusUpdateRetailer({ retailerName: order.retailer.name, orderId: shortId, status: 'in_transit', message: `Your order is now out for delivery with ${company.name}. ${eta}` }) });

  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// ── Mark delivered ────────────────────────────────────────────────────────────
router.put('/orders/:id/deliver', auth, auth.logisticsOnly, async (req, res) => {
  try {
    const company = await LogisticsCompany.findOne({ user: req.user.id });
    const order   = await Order.findById(req.params.id)
      .populate('retailer',   'name email')
      .populate('wholesaler', 'name email businessName');

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

    const shortId = order._id.toString().slice(-8).toUpperCase();

    // → Retailer: delivered — prompt to confirm
    fireEmail({ to: order.retailer?.email,
      ...orderStatusUpdateRetailer({ retailerName: order.retailer.name, orderId: shortId, status: 'delivered', message: 'Your order has been delivered! Please log in and confirm receipt to release payment to the wholesaler and logistics company. If you do not confirm within 2 days, it will be confirmed automatically.' }) });

    // → Wholesaler: delivered notification
    const wholesalerEmail = order.wholesaler?.email;
    if (wholesalerEmail) {
      fireEmail({
        to:      wholesalerEmail,
        subject: `🏠 Order #${shortId} delivered to retailer`,
        html:    buildSimpleEmail('Order Delivered 🏠', `Order <strong>#${shortId}</strong> has been successfully delivered to the retailer by <strong>${company.name}</strong>. Payment will be released once the retailer confirms receipt (or automatically within 2 days).`),
      });
    }

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