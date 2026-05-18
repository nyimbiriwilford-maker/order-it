/**
 * server/scripts/backfillPayoutRecipientModel.js
 *
 * Run ONCE to fix existing Payout documents that are missing recipientModel.
 * Safe to re-run — skips docs that already have recipientModel set.
 *
 * Usage:
 *   cd server
 *   node scripts/backfillPayoutRecipientModel.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const Payout = require('../models/Payout');

  // Only touch docs missing recipientModel
  const docs = await Payout.find({ recipientModel: { $exists: false } }).lean();
  console.log(`Found ${docs.length} payouts missing recipientModel`);

  if (docs.length === 0) {
    console.log('Nothing to backfill. Exiting.');
    process.exit(0);
  }

  let fixed = 0;
  for (const doc of docs) {
    const model = doc.recipientType === 'wholesaler' ? 'User' : 'LogisticsCompany';
    await Payout.updateOne(
      { _id: doc._id },
      { $set: { recipientModel: model } }
    );
    fixed++;
    if (fixed % 50 === 0) console.log(`  ${fixed}/${docs.length} updated…`);
  }

  console.log(`Done — ${fixed} payout(s) backfilled.`);
  process.exit(0);
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
