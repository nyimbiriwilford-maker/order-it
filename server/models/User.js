const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name:         { type: String, required: true },
  email:        { type: String, required: true, unique: true },
  password:     { type: String }, // optional — null for Google-only accounts
  googleId:     { type: String, sparse: true }, // Google OAuth sub ID
  avatar:       { type: String }, // profile picture from Google
  role:         { type: String, enum: ['retailer', 'wholesaler', 'logistics', 'admin'], required: true },
  businessName: { type: String },
  phone:        { type: String },
  address:      { type: String },
  city:         { type: String },
  isActive:     { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);