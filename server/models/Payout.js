const mongoose = require('mongoose');

const payoutSchema = new mongoose.Schema({
  order:          { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },

  recipient:      { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'recipientModel' },
  recipientModel: { type: String, required: true, enum: ['User', 'LogisticsCompany'] },
  // 'User'              → wholesaler (a User document)
  // 'LogisticsCompany'  → logistics  (a LogisticsCompany document)

  recipientType:  { type: String, enum: ['wholesaler', 'logistics'], required: true },

  grossAmount:    { type: Number, required: true },  // amountToWholesaler or amountToLogistics before VAT
  vatPercent:     { type: Number, default: 0 },
  vatAmount:      { type: Number, default: 0 },
  netAmount:      { type: Number, required: true },  // what they actually receive after VAT

  trigger:        { type: String, enum: ['retailer_confirmed', 'auto_confirmed', 'admin_released'], required: true },
  releasedAt:     { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Payout', payoutSchema);