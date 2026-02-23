const User         = require('../models/User');
const Event        = require('../models/Event');
const Registration = require('../models/Registration');

// ─────────────────────────────────────────────────────────────────────────────
// @route  GET /api/participant/dashboard
// @access Private (Participant)
// ─────────────────────────────────────────────────────────────────────────────
exports.getDashboard = async (req, res) => {
  try {
    const now = new Date();
    const allRegs = await Registration.find({ participant: req.user._id })
      .populate({
        path: 'event',
        populate: { path: 'organizer', select: 'organizerName category' },
      })
      .sort({ createdAt: -1 });

    const upcoming = allRegs.filter(
      (r) => r.status === 'Registered' && r.event && new Date(r.event.eventStartDate) > now
    );
    const history = allRegs.filter(
      (r) => !['Registered'].includes(r.status) || (r.event && new Date(r.event.eventStartDate) <= now)
    );

    res.json({ success: true, upcoming, history });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route  PUT /api/participant/profile
// @access Private (Participant)
// ─────────────────────────────────────────────────────────────────────────────
exports.updateProfile = async (req, res) => {
  try {
    const allowed = ['firstName', 'lastName', 'contactNumber', 'college', 'interests', 'followedOrganizers'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
    res.json({ success: true, user });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route  PUT /api/participant/onboarding
// @access Private (Participant)
// ─────────────────────────────────────────────────────────────────────────────
exports.completeOnboarding = async (req, res) => {
  try {
    const { interests, followedOrganizers } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { interests: interests || [], followedOrganizers: followedOrganizers || [], onboardingDone: true },
      { new: true }
    );
    res.json({ success: true, user });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route  GET /api/participant/organizers
// @access Private (Participant)
// ─────────────────────────────────────────────────────────────────────────────
exports.getOrganizers = async (req, res) => {
  try {
    const organizers = await User.find({ role: 'Organizer' }).select(
      'organizerName category description contactEmail'
    );
    const me = await User.findById(req.user._id).select('followedOrganizers');
    const followed = me.followedOrganizers.map((id) => id.toString());
    const result = organizers.map((o) => ({ ...o.toObject(), isFollowed: followed.includes(o._id.toString()) }));
    res.json({ success: true, organizers: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route  POST /api/participant/follow/:organizerId
// @route  DELETE /api/participant/follow/:organizerId
// @access Private (Participant)
// ─────────────────────────────────────────────────────────────────────────────
exports.followOrganizer = async (req, res) => {
  try {
    const me = await User.findById(req.user._id);
    const orgId = req.params.organizerId;

    const idx = me.followedOrganizers.findIndex((id) => id.toString() === orgId);
    if (idx === -1) {
      me.followedOrganizers.push(orgId);
    } else {
      me.followedOrganizers.splice(idx, 1);
    }
    await me.save();
    res.json({ success: true, followedOrganizers: me.followedOrganizers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route  GET /api/participant/organizers/:id
// @access Private
// ─────────────────────────────────────────────────────────────────────────────
exports.getOrganizerDetail = async (req, res) => {
  try {
    const organizer = await User.findById(req.params.id).select(
      'organizerName category description contactEmail role'
    );
    if (!organizer || organizer.role !== 'Organizer') {
      return res.status(404).json({ success: false, message: 'Organizer not found' });
    }

    const now = new Date();
    const upcomingEvents = await Event.find({
      organizer: organizer._id,
      status: { $in: ['Published', 'Ongoing'] },
      eventStartDate: { $gte: now },
    }).sort({ eventStartDate: 1 });
    const pastEvents = await Event.find({
      organizer: organizer._id,
      eventStartDate: { $lt: now },
    }).sort({ eventStartDate: -1 }).limit(20);

    res.json({ success: true, organizer, upcomingEvents, pastEvents });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
