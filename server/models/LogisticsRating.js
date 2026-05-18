const mongoose = require('mongoose');

const logisticsRatingSchema = new mongoose.Schema({
  order:            { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  retailer:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  logisticsCompany: { type: mongoose.Schema.Types.ObjectId, ref: 'LogisticsCompany', required: true },
  rating:           { type: Number, required: true, min: 1, max: 5 },
  comment:          { type: String },
}, { timestamps: true });

module.exports = mongoose.model('LogisticsRating', logisticsRatingSchema);