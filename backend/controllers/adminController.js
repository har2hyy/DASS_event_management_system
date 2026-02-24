const User                 = require('../models/User');
const Event                = require('../models/Event');
const Registration         = require('../models/Registration');
const PasswordResetRequest = require('../models/PasswordResetRequest');

// ─────────────────────────────────────────────────────────────────────────────
// @route  GET /api/admin/dashboard
// @access Private (Admin)
// ─────────────────────────────────────────────────────────────────────────────
exports.getDashboard = async (req, res) => {
  try {
    const [totalParticipants, totalOrganizers, totalEvents, totalRegistrations] = await Promise.all([
      User.countDocuments({ role: 'Participant' }),
      User.countDocuments({ role: 'Organizer' }),
      Event.countDocuments(),
      Registration.countDocuments(),
    ]);
    res.json({ success: true, stats: { totalParticipants, totalOrganizers, totalEvents, totalRegistrations } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route  POST /api/admin/organizers
// @access Private (Admin)
// ─────────────────────────────────────────────────────────────────────────────
exports.createOrganizer = async (req, res) => {
  try {
    const { email, password, organizerName, category, description, contactEmail } = req.body;
    if (!email || !password || !organizerName || !category) {
      return res.status(400).json({ success: false, message: 'email, password, organizerName and category are required' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).json({ success: false, message: 'Email already in use' });

    const organizer = await User.create({
      email,
      password,
      role: 'Organizer',
      organizerName,
      category,
      description: description || '',
      contactEmail: contactEmail || email,
    });

    res.status(201).json({
      success: true,
      organizer: {
        _id: organizer._id,
        email: organizer.email,
        organizerName: organizer.organizerName,
        category: organizer.category,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route  GET /api/admin/organizers
// @access Private (Admin)
// ─────────────────────────────────────────────────────────────────────────────
exports.getOrganizers = async (req, res) => {
  try {
    const organizers = await User.find({ role: 'Organizer' }).select('-password').sort({ createdAt: -1 });
    res.json({ success: true, organizers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route  DELETE /api/admin/organizers/:id
// @access Private (Admin)
// ─────────────────────────────────────────────────────────────────────────────
exports.deleteOrganizer = async (req, res) => {
  try {
    const organizer = await User.findById(req.params.id);
    if (!organizer || organizer.role !== 'Organizer') {
      return res.status(404).json({ success: false, message: 'Organizer not found' });
    }

    // ── Full cascade delete: remove ALL data related to this organizer ──

    // 1. Get all events owned by this organizer
    const events = await Event.find({ organizer: organizer._id });
    const eventIds = events.map((e) => e._id);

    // 2. For each registration under those events, restore event counters / merch stock
    if (eventIds.length > 0) {
      const regs = await Registration.find({ event: { $in: eventIds } });
      for (const reg of regs) {
        const incOps = {};
        if (['Registered', 'Attended'].includes(reg.status)) {
          incOps.currentRegistrations = -1;
        }
        if (reg.merchandiseDetails?.quantity && ['Registered', 'Attended', 'Pending'].includes(reg.status)) {
          incOps['itemDetails.stock'] = reg.merchandiseDetails.quantity;
        }
        // Counter restore only matters for cross-organizer events (edge case), safe to skip
      }

      // 3. Delete ALL registrations for all their events
      await Registration.deleteMany({ event: { $in: eventIds } });

      // 4. Delete messages & feedback for all their events
      try { const Message  = require('../models/Message');  await Message.deleteMany({ event: { $in: eventIds } }); } catch (_) {}
      try { const Feedback = require('../models/Feedback'); await Feedback.deleteMany({ event: { $in: eventIds } }); } catch (_) {}
    }

    // 5. Delete ALL events (all statuses)
    await Event.deleteMany({ organizer: organizer._id });

    // 6. Delete password reset requests for this organizer
    await PasswordResetRequest.deleteMany({ organizer: organizer._id });

    // 7. Remove this organizer from all users' followedOrganizers
    await User.updateMany(
      { followedOrganizers: organizer._id },
      { $pull: { followedOrganizers: organizer._id } }
    );

    // 8. Delete the organizer user document
    await organizer.deleteOne();

    res.json({ success: true, message: 'Organizer and all associated data permanently deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route  PUT /api/admin/organizers/:id/archive
// @access Private (Admin)
// Temporarily disables the organizer account (cannot log in).
// ─────────────────────────────────────────────────────────────────────────────
exports.archiveOrganizer = async (req, res) => {
  try {
    const organizer = await User.findById(req.params.id);
    if (!organizer || organizer.role !== 'Organizer') {
      return res.status(404).json({ success: false, message: 'Organizer not found' });
    }
    if (organizer.isArchived) {
      return res.status(400).json({ success: false, message: 'Organizer is already archived' });
    }
    organizer.isArchived = true;
    await organizer.save({ validateModifiedOnly: true });
    res.json({ success: true, message: 'Organizer archived — they can no longer log in', organizer: { _id: organizer._id, isArchived: true } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route  PUT /api/admin/organizers/:id/unarchive
// @access Private (Admin)
// Re-enables a previously archived organizer account.
// ─────────────────────────────────────────────────────────────────────────────
exports.unarchiveOrganizer = async (req, res) => {
  try {
    const organizer = await User.findById(req.params.id);
    if (!organizer || organizer.role !== 'Organizer') {
      return res.status(404).json({ success: false, message: 'Organizer not found' });
    }
    if (!organizer.isArchived) {
      return res.status(400).json({ success: false, message: 'Organizer is not archived' });
    }
    organizer.isArchived = false;
    await organizer.save({ validateModifiedOnly: true });
    res.json({ success: true, message: 'Organizer unarchived — they can log in again', organizer: { _id: organizer._id, isArchived: false } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route  PUT /api/admin/organizers/:id/reset-password
// @access Private (Admin)
// ─────────────────────────────────────────────────────────────────────────────
exports.resetOrganizerPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword) return res.status(400).json({ success: false, message: 'newPassword is required' });

    const organizer = await User.findById(req.params.id).select('+password');
    if (!organizer || organizer.role !== 'Organizer') {
      return res.status(404).json({ success: false, message: 'Organizer not found' });
    }

    organizer.password = newPassword;
    await organizer.save({ validateModifiedOnly: true });
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route  GET /api/admin/users
// @access Private (Admin)
// ─────────────────────────────────────────────────────────────────────────────
exports.getAllUsers = async (req, res) => {
  try {
    const { role, page = 1, limit = 50 } = req.query;
    const query = role ? { role } : {};
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    const total = await User.countDocuments(query);
    res.json({ success: true, users, total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route  GET /api/admin/events
// @access Private (Admin)
// ─────────────────────────────────────────────────────────────────────────────
exports.getAllEvents = async (req, res) => {
  try {
    const events = await Event.find()
      .populate('organizer', 'organizerName email')
      .sort({ createdAt: -1 });
    res.json({ success: true, events });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route  DELETE /api/admin/events/:id
// @access Private (Admin)
// ─────────────────────────────────────────────────────────────────────────────
exports.deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

    // Cascade-delete all registrations, messages, feedback
    await Registration.deleteMany({ event: event._id });
    try { const Message  = require('../models/Message');  await Message.deleteMany({ event: event._id }); } catch (_) {}
    try { const Feedback = require('../models/Feedback'); await Feedback.deleteMany({ event: event._id }); } catch (_) {}

    await event.deleteOne();
    res.json({ success: true, message: 'Event and all associated data deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route  DELETE /api/admin/users/:id
// @access Private (Admin) — removes a Participant and cascades
// ─────────────────────────────────────────────────────────────────────────────
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (['Admin', 'Organizer'].includes(user.role)) {
      return res.status(400).json({ success: false, message: `Cannot delete ${user.role} accounts from here` });
    }

    // ── 1. Cascade registrations ──────────────────────────────────────────
    const regs = await Registration.find({ participant: user._id });

    for (const reg of regs) {
      const incOps = {};

      // Decrement currentRegistrations for statuses that were counted
      if (['Registered', 'Attended'].includes(reg.status)) {
        incOps.currentRegistrations = -1;
      }

      // Restore merch stock for orders that reserved stock
      if (reg.merchandiseDetails?.quantity && ['Registered', 'Attended', 'Pending'].includes(reg.status)) {
        incOps['itemDetails.stock'] = reg.merchandiseDetails.quantity;
      }

      if (Object.keys(incOps).length > 0) {
        await Event.findByIdAndUpdate(reg.event, { $inc: incOps });
      }
    }

    // Delete all registrations
    await Registration.deleteMany({ participant: user._id });

    // ── 2. Cascade messages ───────────────────────────────────────────────
    try {
      const Message = require('../models/Message');
      await Message.deleteMany({ author: user._id });
    } catch (_) {}

    // ── 3. Remove from other users' followedOrganizers (safety) ───────────
    await User.updateMany(
      { followedOrganizers: user._id },
      { $pull: { followedOrganizers: user._id } }
    );

    // ── 4. Delete the user ────────────────────────────────────────────────
    await user.deleteOne();

    res.json({ success: true, message: 'User and all associated data deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route  GET /api/admin/password-reset-requests
// @access Private (Admin)
// ─────────────────────────────────────────────────────────────────────────────
exports.getPasswordResetRequests = async (req, res) => {
  try {
    const { status } = req.query;
    const query = status ? { status } : {};
    const requests = await PasswordResetRequest.find(query)
      .populate('organizer', 'organizerName email')
      .populate('resolvedBy', 'email')
      .sort({ createdAt: -1 });
    res.json({ success: true, requests });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route  PUT /api/admin/password-reset-requests/:id/approve
// @access Private (Admin)
// ─────────────────────────────────────────────────────────────────────────────
exports.approvePasswordResetRequest = async (req, res) => {
  try {
    const { newPassword, comment } = req.body;
    if (!newPassword) {
      return res.status(400).json({ success: false, message: 'newPassword is required' });
    }

    const request = await PasswordResetRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    if (request.status !== 'Pending') {
      return res.status(400).json({ success: false, message: 'Request already resolved' });
    }

    // Reset organizer password
    const organizer = await User.findById(request.organizer).select('+password');
    if (!organizer) return res.status(404).json({ success: false, message: 'Organizer no longer exists' });

    organizer.password = newPassword;
    await organizer.save({ validateModifiedOnly: true });

    request.status = 'Approved';
    request.adminComment = comment || '';
    request.resolvedBy = req.user._id;
    request.resolvedAt = new Date();
    await request.save();

    // Send email notification to organizer
    const { sendPasswordResetApprovedEmail } = require('../utils/email');
    sendPasswordResetApprovedEmail({
      to: organizer.email,
      organizerName: organizer.organizerName || organizer.email,
      tempPassword: newPassword,
      comment: comment || '',
    });

    res.json({ success: true, message: 'Password reset approved', request });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route  PUT /api/admin/password-reset-requests/:id/reject
// @access Private (Admin)
// ─────────────────────────────────────────────────────────────────────────────
exports.rejectPasswordResetRequest = async (req, res) => {
  try {
    const { comment } = req.body;
    const request = await PasswordResetRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    if (request.status !== 'Pending') {
      return res.status(400).json({ success: false, message: 'Request already resolved' });
    }

    request.status = 'Rejected';
    request.adminComment = comment || '';
    request.resolvedBy = req.user._id;
    request.resolvedAt = new Date();
    await request.save();

    // Send email notification to organizer
    const organizer = await User.findById(request.organizer);
    if (organizer) {
      const { sendPasswordResetRejectedEmail } = require('../utils/email');
      sendPasswordResetRejectedEmail({
        to: organizer.email,
        organizerName: organizer.organizerName || organizer.email,
        comment: comment || '',
      });
    }

    res.json({ success: true, message: 'Password reset rejected', request });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
