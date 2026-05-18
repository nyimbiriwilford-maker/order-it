const mongoose = require('mongoose');

const logisticsCompanySchema = new mongoose.Schema({
  name:         { type: String, required: true },
  email:        { type: String },
  contactEmail: { type: String },
  phone:        { type: String },
  logo:         { type: String },
  user:         { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status:       { type: String, enum: ['pending', 'approved', 'suspended'], default: 'pending' },
  averageRating:{ type: Number, default: 0 },
  totalRatings: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('LogisticsCompany', logisticsCompanySchema);