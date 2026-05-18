/**
 * One-time migration: backfill platformFee + amountToWholesaler on existing orders
 *
 * Run from inside server/ folder:
 *   node migrate-platform-fee.js
 *
 * Safe to run multiple times — skips orders that already have a platformFee set.
 */

require('dotenv').config();
const mongoose = require('mongoose');

const FEE_PERCENT = parseFloat(process.env.PLATFORM_FEE_PERCENT) || 2;

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ MongoDB connected');

  const Order = require('./models/Order');

  // Find all non-cancelled orders where platformFee is missing or 0
  const orders = await Order.find({
    orderStatus: { $ne: 'cancelled' },
    $or: [
      { platformFee: { $exists: false } },
      { platformFee: 0 },
      { platformFee: null },
    ],
  }).lean();

  console.log(`Found ${orders.length} orders to backfill`);

  let updated = 0;
  let skipped = 0;

  for (const order of orders) {
    const productTotal = order.productTotal || order.totalAmount || 0;
    const deliveryFee  = order.deliveryFee  || 0;

    if (productTotal === 0) {
      skipped++;
      continue;
    }

    const platformFee        = parseFloat(((productTotal * FEE_PERCENT) / 100).toFixed(2));
    const amountToWholesaler = parseFloat((productTotal - platformFee).toFixed(2));
    const amountToLogistics  = deliveryFee;

    await Order.findByIdAndUpdate(order._id, {
      platformFee,
      amountToWholesaler,
      amountToLogistics,
    });

    updated++;
    console.log(`  #${order._id.toString().slice(-8).toUpperCase()} — productTotal: ${productTotal}, fee: ${platformFee}, toWholesaler: ${amountToWholesaler}`);
  }

  console.log(`\n✅ Done. Updated: ${updated}, Skipped (zero total): ${skipped}`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});