const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema(
  {
    event:   { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    rating:  { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: '', maxlength: 1000 },
    // No user reference — anonymous
  },
  { timestamps: true }
);

// Index for efficient aggregation per event
feedbackSchema.index({ event: 1, createdAt: -1 });

module.exports = mongoose.model('Feedback', feedbackSchema);
