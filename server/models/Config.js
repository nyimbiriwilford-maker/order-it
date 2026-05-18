// server/models/Config.js
// Replace your existing file entirely.
// Added: changeHistory array, updatedBy ref

const mongoose = require('mongoose');

const changeEntrySchema = new mongoose.Schema({
  changedAt:  { type: Date,                                    default: Date.now },
  changedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  oldValue:   { type: mongoose.Schema.Types.Mixed },
  newValue:   { type: mongoose.Schema.Types.Mixed },
}, { _id: false });

const configSchema = new mongoose.Schema({
  key:         { type: String, required: true, unique: true },
  value:       { type: mongoose.Schema.Types.Mixed, required: true },
  label:       { type: String },
  description: { type: String },
  updatedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // Rolling last-20 change log — written by the PUT route
  changeHistory: { type: [changeEntrySchema], default: [] },
}, { timestamps: true });

module.exports = mongoose.model('Config', configSchema);