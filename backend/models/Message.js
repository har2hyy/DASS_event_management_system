const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    event:       { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    author:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    authorRole:  { type: String, enum: ['Participant', 'Organizer', 'Admin'], required: true },
    content:     { type: String, required: true, maxlength: 2000 },
    pinned:      { type: Boolean, default: false },
    parentMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
    reactions: {
      type: Map,
      of: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      default: {},
    },
    deleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

messageSchema.index({ event: 1, createdAt: -1 });
messageSchema.index({ event: 1, pinned: -1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
