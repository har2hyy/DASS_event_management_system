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
    // Cancel all their events and registrations
    const events = await Event.find({ organizer: organizer._id });
    const eventIds = events.map((e) => e._id);
    await Registration.updateMany(
      { event: { $in: eventIds }, status: { $in: ['Registered', 'Pending'] } },
      { status: 'Cancelled' }
    );
    await Event.updateMany(
      { organizer: organizer._id, status: { $in: ['Published', 'Ongoing'] } },
      { status: 'Cancelled' }
    );
    await Event.deleteMany({ organizer: organizer._id, status: 'Draft' });
    await organizer.deleteOne();
    res.json({ success: true, message: 'Organizer deleted' });
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
    await organizer.save();
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
    await organizer.save();

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
