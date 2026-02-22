const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: ['Participant', 'Organizer', 'Admin'],
      required: true,
    },

    // ── Participant fields ──────────────────────────────────────────────────
    firstName: {
      type: String,
      required: function () { return this.role === 'Participant'; },
      trim: true,
    },
    lastName: {
      type: String,
      required: function () { return this.role === 'Participant'; },
      trim: true,
    },
    participantType: {
      type: String,
      enum: ['IIIT', 'Non-IIIT'],
      required: function () { return this.role === 'Participant'; },
    },
    college: { type: String, trim: true },
    contactNumber: { type: String, trim: true },
    interests: [{ type: String, trim: true }],
    followedOrganizers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    onboardingDone: { type: Boolean, default: false },

    // ── Organizer fields ───────────────────────────────────────────────────
    organizerName: {
      type: String,
      required: function () { return this.role === 'Organizer'; },
      trim: true,
    },
    category: {
      type: String,
      required: function () { return this.role === 'Organizer'; },
      trim: true,
    },
    description: { type: String, default: '' },
    contactEmail: { type: String, trim: true, lowercase: true },
    discordWebhook: { type: String, default: '' },
  },
  { timestamps: true }
);

// ── Hash password before save ─────────────────────────────────────────────
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', userSchema);
