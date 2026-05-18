/**
 * releaseEscrow(orderId, trigger)
 *
 * Called from:
 *   - routes/orders.js  PUT /:id/confirm  (trigger = 'retailer_confirmed')
 *   - jobs/autoConfirm.js                 (trigger = 'auto_confirmed')
 *   - routes/admin.js   POST /escrow/:id/release (trigger = 'admin_released')
 *
 * What it does:
 *   1. Reads vat_percent from Config
 *   2. Calculates VAT deduction on wholesaler payout
 *   3. Creates a Payout record for wholesaler
 *   4. Creates a Payout record for logistics (no VAT on logistics)
 *   5. Sets order.paymentStatus = 'released', order.orderStatus = 'completed'
 */

const Order   = require('../models/Order');
const Payout  = require('../models/Payout');
const Config  = require('../models/Config');

async function releaseEscrow(orderId, trigger) {
  const order = await Order.findById(orderId);
  if (!order) throw new Error(`Order ${orderId} not found`);

  // Idempotency — don't double-release
  if (order.paymentStatus === 'released') return order;

  // Read VAT from config (default 0 if not set)
  let vatPercent = 0;
  try {
    const vatConfig = await Config.findOne({ key: 'vat_percent' }).lean();
    if (vatConfig && vatConfig.value > 0) vatPercent = parseFloat(vatConfig.value);
  } catch (_) {}

  const payouts = [];

  // ── Wholesaler payout ────────────────────────────────────────────────────
  if (order.amountToWholesaler > 0 && order.wholesaler) {
    const gross  = order.amountToWholesaler;
    const vatAmt = parseFloat(((gross * vatPercent) / 100).toFixed(2));
    const net    = parseFloat((gross - vatAmt).toFixed(2));

    payouts.push(
      Payout.create({
        order:          order._id,
        recipient:      order.wholesaler,
        recipientModel: 'User',              // ← wholesaler is a User document
        recipientType:  'wholesaler',
        grossAmount:    gross,
        vatPercent,
        vatAmount:      vatAmt,
        netAmount:      net,
        trigger,
      })
    );
  }

  // ── Logistics payout (no VAT — logistics paid as service fee) ────────────
  if (order.amountToLogistics > 0 && order.logisticsCompany) {
    const gross = order.amountToLogistics;

    payouts.push(
      Payout.create({
        order:          order._id,
        recipient:      order.logisticsCompany,
        recipientModel: 'LogisticsCompany',  // ← logistics is a LogisticsCompany document
        recipientType:  'logistics',
        grossAmount:    gross,
        vatPercent:     0,
        vatAmount:      0,
        netAmount:      gross,
        trigger,
      })
    );
  }

  await Promise.all(payouts);

  // ── Mark order settled ───────────────────────────────────────────────────
  order.paymentStatus = 'released';
  order.orderStatus   = 'completed';
  await order.save();

  return order;
}

module.exports = releaseEscrow;