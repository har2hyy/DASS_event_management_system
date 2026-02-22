const User         = require('../models/User');
const Event        = require('../models/Event');
const Registration = require('../models/Registration');
const { Parser }   = require('json2csv');

// ─────────────────────────────────────────────────────────────────────────────
// @route  GET /api/organizer/dashboard
// @access Private (Organizer)
// ─────────────────────────────────────────────────────────────────────────────
exports.getDashboard = async (req, res) => {
  try {
    const events = await Event.find({ organizer: req.user._id }).sort({ createdAt: -1 });

    // Analytics for completed events
    const completedIds = events.filter((e) => e.status === 'Completed').map((e) => e._id);
    const analytics = await Registration.aggregate([
      { $match: { event: { $in: completedIds } } },
      {
        $group: {
          _id: '$event',
          totalRegistrations: { $sum: 1 },
          attended:           { $sum: { $cond: ['$attended', 1, 0] } },
        },
      },
    ]);

    const analyticsByEvent = {};
    for (const a of analytics) {
      analyticsByEvent[a._id.toString()] = { totalRegistrations: a.totalRegistrations, attended: a.attended };
    }

    // Revenue per completed event
    for (const ev of events.filter((e) => e.status === 'Completed')) {
      const key = ev._id.toString();
      const registrations = await Registration.find({ event: ev._id, status: { $ne: 'Cancelled' } });
      let revenue = 0;
      for (const r of registrations) {
        revenue += ev.registrationFee * (r.merchandiseDetails?.quantity || 1);
      }
      analyticsByEvent[key] = { ...(analyticsByEvent[key] || {}), revenue };
    }

    res.json({ success: true, events, analytics: analyticsByEvent });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route  GET /api/organizer/events/:id/participants
// @access Private (Organizer)
// ─────────────────────────────────────────────────────────────────────────────
exports.getEventParticipants = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    if (event.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not your event' });
    }

    const { search, status, page = 1, limit = 50 } = req.query;
    const query = { event: event._id };
    if (status) query.status = status;

    let registrations = await Registration.find(query)
      .populate('participant', 'firstName lastName email participantType college contactNumber')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    if (search) {
      const s = search.toLowerCase();
      registrations = registrations.filter((r) => {
        const p = r.participant;
        return (
          p?.firstName?.toLowerCase().includes(s) ||
          p?.lastName?.toLowerCase().includes(s) ||
          p?.email?.toLowerCase().includes(s)
        );
      });
    }

    const total = await Registration.countDocuments({ event: event._id });
    res.json({ success: true, registrations, total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route  GET /api/organizer/events/:id/participants/export
// @access Private (Organizer) — returns CSV
// ─────────────────────────────────────────────────────────────────────────────
exports.exportParticipantsCSV = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    if (event.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not your event' });
    }

    const registrations = await Registration.find({ event: event._id })
      .populate('participant', 'firstName lastName email participantType college contactNumber');

    const rows = registrations.map((r) => ({
      Name:            `${r.participant?.firstName || ''} ${r.participant?.lastName || ''}`.trim(),
      Email:           r.participant?.email || '',
      Type:            r.participant?.participantType || '',
      College:         r.participant?.college || '',
      Contact:         r.participant?.contactNumber || '',
      Status:          r.status,
      TicketID:        r.ticketId,
      RegistrationDate: new Date(r.createdAt).toLocaleString(),
      Attended:        r.attended ? 'Yes' : 'No',
      ...(event.eventType === 'Merchandise' ? {
        Size:     r.merchandiseDetails?.size || '',
        Color:    r.merchandiseDetails?.color || '',
        Variant:  r.merchandiseDetails?.variant || '',
        Quantity: r.merchandiseDetails?.quantity || 1,
      } : {}),
    }));

    const parser = new Parser();
    const csv = parser.parse(rows);

    res.header('Content-Type', 'text/csv');
    res.attachment(`participants_${event.eventName.replace(/\s+/g, '_')}.csv`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route  PUT /api/organizer/events/:eventId/attendance/:regId
// @access Private (Organizer)
// ─────────────────────────────────────────────────────────────────────────────
exports.markAttendance = async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    if (event.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not your event' });
    }

    const reg = await Registration.findByIdAndUpdate(
      req.params.regId,
      { attended: true, attendanceTimestamp: new Date(), status: 'Attended' },
      { new: true }
    );
    if (!reg) return res.status(404).json({ success: false, message: 'Registration not found' });
    res.json({ success: true, registration: reg });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route  GET /api/organizer/profile
// @access Private (Organizer)
// ─────────────────────────────────────────────────────────────────────────────
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route  PUT /api/organizer/profile
// @access Private (Organizer)
// ─────────────────────────────────────────────────────────────────────────────
exports.updateProfile = async (req, res) => {
  try {
    const allowed = ['organizerName', 'category', 'description', 'contactEmail', 'contactNumber', 'discordWebhook'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true }).select('-password');
    res.json({ success: true, user });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};
