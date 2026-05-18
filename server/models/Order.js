const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  retailer:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  groupOrderId:     { type: String },
  wholesaler:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  items: [{
    product:    { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name:       { type: String },
    quantity:   { type: Number, required: true },
    price:      { type: Number, required: true },
    wholesaler: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  }],
  totalAmount:      { type: Number, required: true },
  productTotal:     { type: Number },
  deliveryFee:      { type: Number, default: 0 },
  deliveryAddress: {
    street:  { type: String },
    city:    { type: String },
    state:   { type: String },
    country: { type: String },
  },
  logisticsCompany: { type: mongoose.Schema.Types.ObjectId, ref: 'LogisticsCompany' },
  logisticsRoute:   { type: mongoose.Schema.Types.ObjectId, ref: 'Route' },

  // Authoritative status
  orderStatus: {
    type: String,
    enum: ['pending', 'ready_for_collection', 'collected', 'in_transit', 'delivered', 'confirmed', 'completed', 'cancelled'],
    default: 'pending',
  },
  // Legacy status — kept for compatibility
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
    default: 'pending',
  },

  deliveryStatus:   { type: String, enum: ['unassigned', 'assigned', 'collected', 'delivered'], default: 'unassigned' },
  paymentStatus:    { type: String, enum: ['unpaid', 'paid', 'released', 'refunded'], default: 'unpaid' },

  trackingNumber:        { type: String },
  estimatedDeliveryDate: { type: Date },
  confirmedAt:           { type: Date },
  autoConfirmAt:         { type: Date },
  retailerConfirmed:     { type: Boolean, default: false },
  ratingSubmitted:       { type: Boolean, default: false },

  // Escrow fields
  platformFee:          { type: Number, default: 0 },   // platform's cut
  amountToWholesaler:   { type: Number, default: 0 },
  amountToLogistics:    { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);