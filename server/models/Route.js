const mongoose = require('mongoose');

const routeSchema = new mongoose.Schema({
  logisticsCompany: { type: mongoose.Schema.Types.ObjectId, ref: 'LogisticsCompany', required: true },
  originCity:       { type: String, required: true },
  destinationCity:  { type: String, required: true },
  pricePerDelivery: { type: Number, required: true },
  estimatedDays:    { type: Number, required: true },
  active:           { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Route', routeSchema);