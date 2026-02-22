const mongoose = require('mongoose');

// ── Custom-form field schema ──────────────────────────────────────────────────
const formFieldSchema = new mongoose.Schema(
  {
    label:    { type: String, required: true },
    type:     { type: String, enum: ['text', 'number', 'email', 'dropdown', 'checkbox', 'file', 'textarea'], required: true },
    options:  [String],       // for dropdown / checkbox
    required: { type: Boolean, default: false },
    order:    { type: Number, default: 0 },
  },
  { _id: true }
);

const eventSchema = new mongoose.Schema(
  {
    eventName:            { type: String, required: true, trim: true },
    eventDescription:     { type: String, required: true },
    eventType:            { type: String, enum: ['Normal', 'Merchandise'], required: true },
    eligibility:          { type: String, enum: ['IIIT Only', 'All'], required: true },
    registrationDeadline: { type: Date, required: true },
    eventStartDate:       { type: Date, required: true },
    eventEndDate:         { type: Date, required: true },
    registrationLimit:    { type: Number, required: true },
    currentRegistrations: { type: Number, default: 0 },
    registrationFee:      { type: Number, default: 0 },
    organizer:            { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    eventTags:            [{ type: String, trim: true }],
    status: {
      type: String,
      enum: ['Draft', 'Published', 'Ongoing', 'Completed', 'Closed'],
      default: 'Draft',
    },

    // ── Normal event ─────────────────────────────────────────────────────
    customForm: {
      fields: [formFieldSchema],
      locked: { type: Boolean, default: false }, // locked after first registration
    },

    // ── Merchandise event ─────────────────────────────────────────────────
    itemDetails: {
      sizes:         [String],
      colors:        [String],
      variants:      [String],
      stock:         { type: Number, default: 0 },
      purchaseLimit: { type: Number, default: 1 }, // max per participant
    },
  },
  { timestamps: true }
);

// Full-text search index
eventSchema.index({ eventName: 'text', eventDescription: 'text', eventTags: 'text' });
// For trending query
eventSchema.index({ currentRegistrations: -1, createdAt: -1 });

module.exports = mongoose.model('Event', eventSchema);
