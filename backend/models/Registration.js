const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema(
  {
    participant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    event:       { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    status: {
      type: String,
      enum: ['Registered', 'Attended', 'Cancelled', 'Rejected', 'Pending'],
      default: 'Registered',
    },

    // Normal event
    formResponses: { type: mongoose.Schema.Types.Mixed, default: {} },

    // Merchandise event
    merchandiseDetails: {
      size:     String,
      color:    String,
      variant:  String,
      quantity: { type: Number, default: 1 },
    },
    paymentProof: String, // URL or base64

    // Ticket
    ticketId: { type: String, unique: true, sparse: true },
    qrCode:   String, // base64 DataURL

    // Attendance
    attended:            { type: Boolean, default: false },
    attendanceTimestamp: Date,

    // Audit trail for attendance
    attendanceMethod: { type: String, enum: ['scan', 'manual'], default: null },
    attendanceMarkedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    overrideReason: { type: String, default: '' },
  },
  { timestamps: true }
);

// Auto-generate ticket ID before first save (skip for Pending — generated on approval)
registrationSchema.pre('save', function () {
  if (!this.ticketId && this.status !== 'Pending') {
    const crypto = require('node:crypto');
    const ts = Date.now().toString(36).toUpperCase();
    const rand = crypto.randomBytes(4).toString('hex').toUpperCase();
    this.ticketId = `FEL-${ts}-${rand}`;
  }
});

// Compound index: one registration per participant per event
registrationSchema.index({ participant: 1, event: 1 }, { unique: true });

module.exports = mongoose.model('Registration', registrationSchema);
