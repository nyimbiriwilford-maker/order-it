const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  adminId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  adminName:   { type: String, required: true },
  action:      { type: String, required: true }, // e.g. 'SUSPEND_USER', 'APPROVE_LOGISTICS'
  targetModel: { type: String },                 // e.g. 'User', 'Order', 'LogisticsCompany'
  targetId:    { type: mongoose.Schema.Types.ObjectId },
  details:     { type: mongoose.Schema.Types.Mixed }, // before/after or extra context
  ipAddress:   { type: String },
}, {
  timestamps: true,   // createdAt is the immutable timestamp
  versionKey: false,
});

// Index for fast admin log queries
auditLogSchema.index({ adminId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ targetModel: 1, targetId: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);