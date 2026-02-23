const mongoose = require('mongoose');

const passwordResetRequestSchema = new mongoose.Schema(
  {
    organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reason:    { type: String, required: true, maxlength: 500 },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending',
    },
    adminComment:  { type: String, default: '' },
    resolvedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolvedAt:    Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model('PasswordResetRequest', passwordResetRequestSchema);
