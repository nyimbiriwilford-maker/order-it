/**
 * autoConfirm.js — runs every hour
 *
 * Finds orders that have been 'delivered' or 'confirmed' (retailer tapped confirm
 * but escrow not yet released) for longer than auto_confirm_days without the
 * retailer confirming, then releases escrow automatically.
 *
 * Mount in server/index.js:
 *   require('./jobs/autoConfirm');
 */

const releaseEscrow = require('../utils/releaseEscrow');
const Order         = require('../models/Order');
const Config        = require('../models/Config');

async function runAutoConfirm() {
  try {
    // Read configured days (default 2)
    let days = 2;
    const cfg = await Config.findOne({ key: 'auto_confirm_days' }).lean();
    if (cfg && cfg.value > 0) days = parseInt(cfg.value);

    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Orders delivered/confirmed but escrow not yet released, older than cutoff
    const orders = await Order.find({
      orderStatus:   { $in: ['delivered', 'confirmed'] },
      paymentStatus: { $nin: ['released', 'refunded'] },
      updatedAt:     { $lt: cutoff },
    });

    if (orders.length === 0) return;

    console.log(`[AutoConfirm] Processing ${orders.length} order(s)`);

    for (const order of orders) {
      try {
        await releaseEscrow(order._id, 'auto_confirmed');
        console.log(`[AutoConfirm] Released escrow for order ${order._id}`);
      } catch (err) {
        console.error(`[AutoConfirm] Failed for order ${order._id}:`, err.message);
      }
    }
  } catch (err) {
    console.error('[AutoConfirm] Job error:', err.message);
  }
}

// Run once immediately on startup, then every hour
runAutoConfirm();
setInterval(runAutoConfirm, 60 * 60 * 1000);

module.exports = runAutoConfirm;