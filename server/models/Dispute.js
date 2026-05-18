const mongoose = require('mongoose');

const disputeSchema = new mongoose.Schema({
  order:      { type: mongoose.Schema.Types.ObjectId, ref: 'Order',           required: true },
  raisedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User',            required: true },
  wholesaler: { type: mongoose.Schema.Types.ObjectId, ref: 'User'                            },
  logistics:  { type: mongoose.Schema.Types.ObjectId, ref: 'LogisticsCompany'                },

  reason: {
    type: String,
    enum: ['not_received', 'damaged', 'wrong_items', 'other'],
    required: true,
  },
  description: { type: String, required: true },
  evidence:    [{ type: String }], // image URLs

  status: {
    type: String,
    enum: ['open', 'under_review', 'resolved', 'dismissed', 'escalated'],
    default: 'open',
  },

  // Admin resolution
  resolution: {
    type: String,
    enum: ['favour_retailer', 'favour_wholesaler', 'favour_logistics', 'partial', 'dismissed'],
  },
  resolutionNote: { type: String },
  resolvedBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolvedAt:     { type: Date },

  // Internal admin notes (not visible to users)
  adminNotes: [{
    note:      { type: String },
    addedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    addedAt:   { type: Date, default: Date.now },
  }],

  // Escrow state for this dispute
  escrowFrozen: { type: Boolean, default: false },

}, { timestamps: true });

disputeSchema.index({ order: 1 });
disputeSchema.index({ status: 1, createdAt: -1 });
disputeSchema.index({ raisedBy: 1 });

module.exports = mongoose.model('Dispute', disputeSchema);