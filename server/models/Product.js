const mongoose = require('mongoose');

const bulkTierSchema = new mongoose.Schema({
  minQty:       { type: Number, required: true },
  pricePerUnit: { type: Number, required: true },
}, { _id: false });

const promoSchema = new mongoose.Schema({
  enabled: { type: Boolean, default: false },
  label:   { type: String,  default: '' },
  price:   { type: Number },
  expiry:  { type: Date },
}, { _id: false });

const productSchema = new mongoose.Schema({
  name:              { type: String,  required: true },
  description:       { type: String,  default: '' },
  price:             { type: Number,  required: true },
  stock:             { type: Number,  required: true, default: 0 },
  unit:              { type: String,  default: 'item' },
  image:             { type: String,  default: '' },
  wholesaler:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  wholesalerCity:    { type: String,  default: '' },
  isActive:          { type: Boolean, default: true },

  lowStockThreshold: { type: Number,  default: 10 },
  minOrderQty:       { type: Number,  default: 1, min: 1 },

  category:          { type: String,  default: 'General' },
  tags:              [{ type: String }],

  bulkPricing:       [bulkTierSchema],
  promo:             { type: promoSchema, default: () => ({ enabled: false }) },
}, { timestamps: true });

// Text index — powers search and Gemini visual search fallback
productSchema.index({ name: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('Product', productSchema);