const User                 = require('../models/User');
const Event                = require('../models/Event');
const Registration         = require('../models/Registration');
const PasswordResetRequest = require('../models/PasswordResetRequest');
const { Parser }           = require('json2csv');

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

    // When searching, fetch all records then filter (search crosses page boundaries)
    const isSearching = !!search;
    let registrations = await Registration.find(query)
      .populate('participant', 'firstName lastName email participantType college contactNumber')
      .sort({ createdAt: -1 })
      .skip(isSearching ? 0 : (page - 1) * limit)
      .limit(isSearching ? 0 : Number(limit));

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

    const { reason } = req.body || {};
    const reg = await Registration.findOneAndUpdate(
      { _id: req.params.regId, event: event._id, status: { $in: ['Registered'] } },
      {
        attended: true,
        attendanceTimestamp: new Date(),
        status: 'Attended',
        attendanceMethod: 'manual',
        attendanceMarkedBy: req.user._id,
        overrideReason: reason || '',
      },
      { new: true }
    );
    if (!reg) {
      // Check if already attended
      const existing = await Registration.findOne({ _id: req.params.regId, event: event._id });
      if (existing && existing.status === 'Attended') {
        return res.status(400).json({ success: false, message: 'Already marked as attended' });
      }
      return res.status(404).json({ success: false, message: 'Registration not found or not in valid state for attendance' });
    }
    res.json({ success: true, registration: reg });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route  PUT /api/organizer/events/:eventId/attendance-scan
// @access Private (Organizer) — mark attendance by ticketId (QR scan)
// ─────────────────────────────────────────────────────────────────────────────
exports.markAttendanceByScan = async (req, res) => {
  try {
    const { ticketId } = req.body;
    if (!ticketId) return res.status(400).json({ success: false, message: 'ticketId is required' });

    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    if (event.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not your event' });
    }

    const reg = await Registration.findOne({ ticketId, event: event._id })
      .populate('participant', 'firstName lastName email');
    if (!reg) return res.status(404).json({ success: false, message: 'Invalid ticket for this event' });

    if (reg.status === 'Attended') {
      return res.status(400).json({
        success: false,
        message: 'Already checked in',
        registration: reg,
      });
    }
    if (reg.status !== 'Registered') {
      return res.status(400).json({
        success: false,
        message: `Ticket status is '${reg.status}', cannot check in`,
      });
    }

    reg.attended = true;
    reg.attendanceTimestamp = new Date();
    reg.status = 'Attended';
    reg.attendanceMethod = 'scan';
    reg.attendanceMarkedBy = req.user._id;
    await reg.save();

    res.json({ success: true, message: 'Check-in successful', registration: reg });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route  GET /api/organizer/events/:eventId/attendance-stats
// @access Private (Organizer) — live attendance dashboard
// ─────────────────────────────────────────────────────────────────────────────
exports.getAttendanceStats = async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    if (event.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not your event' });
    }

    const [totalRegs, attendedCount, checkedInList, notScannedList, recentCheckins] = await Promise.all([
      Registration.countDocuments({ event: event._id, status: { $in: ['Registered', 'Attended'] } }),
      Registration.countDocuments({ event: event._id, status: 'Attended' }),
      Registration.find({ event: event._id, status: 'Attended' })
        .populate('participant', 'firstName lastName email')
        .sort({ attendanceTimestamp: -1 }),
      Registration.find({ event: event._id, status: 'Registered' })
        .populate('participant', 'firstName lastName email')
        .sort({ createdAt: -1 }),
      Registration.find({ event: event._id, status: 'Attended' })
        .populate('participant', 'firstName lastName email')
        .populate('attendanceMarkedBy', 'email organizerName')
        .sort({ attendanceTimestamp: -1 })
        .limit(20),
    ]);

    res.json({
      success: true,
      stats: {
        totalRegistrations: totalRegs,
        attended: attendedCount,
        attendanceRate: totalRegs > 0 ? Math.round((attendedCount / totalRegs) * 100) : 0,
      },
      checkedIn: checkedInList.map((r) => ({
        _id: r._id,
        ticketId: r.ticketId,
        name: `${r.participant?.firstName || ''} ${r.participant?.lastName || ''}`.trim(),
        email: r.participant?.email,
        checkedInAt: r.attendanceTimestamp,
        method: r.attendanceMethod || 'unknown',
        overrideReason: r.overrideReason || '',
      })),
      notScanned: notScannedList.map((r) => ({
        _id: r._id,
        ticketId: r.ticketId,
        name: `${r.participant?.firstName || ''} ${r.participant?.lastName || ''}`.trim(),
        email: r.participant?.email,
        registeredAt: r.createdAt,
      })),
      recentCheckins: recentCheckins.map((r) => ({
        ticketId: r.ticketId,
        name: `${r.participant?.firstName || ''} ${r.participant?.lastName || ''}`.trim(),
        email: r.participant?.email,
        checkedInAt: r.attendanceTimestamp,
        method: r.attendanceMethod || 'unknown',
        markedBy: r.attendanceMarkedBy?.email || r.attendanceMarkedBy?.organizerName || '',
        overrideReason: r.overrideReason || '',
      })),
    });
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

// ─────────────────────────────────────────────────────────────────────────────
// @route  POST /api/organizer/password-reset-request
// @access Private (Organizer)
// ─────────────────────────────────────────────────────────────────────────────
exports.requestPasswordReset = async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: 'Reason is required' });
    }

    // Prevent duplicate pending requests
    const existing = await PasswordResetRequest.findOne({
      organizer: req.user._id,
      status: 'Pending',
    });
    if (existing) {
      return res.status(400).json({ success: false, message: 'You already have a pending reset request' });
    }

    const request = await PasswordResetRequest.create({
      organizer: req.user._id,
      reason: reason.trim(),
    });

    res.status(201).json({ success: true, request });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route  GET /api/organizer/password-reset-requests
// @access Private (Organizer) — own requests
// ─────────────────────────────────────────────────────────────────────────────
exports.getMyPasswordResetRequests = async (req, res) => {
  try {
    const requests = await PasswordResetRequest.find({ organizer: req.user._id })
      .sort({ createdAt: -1 });
    res.json({ success: true, requests });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route  PUT /api/organizer/events/:eventId/approve-payment/:regId
// @access Private (Organizer)
// ─────────────────────────────────────────────────────────────────────────────
exports.approvePayment = async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    if (event.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not your event' });
    }

    const reg = await Registration.findOne({ _id: req.params.regId, event: event._id });
    if (!reg) return res.status(404).json({ success: false, message: 'Registration not found' });
    if (reg.status !== 'Pending') {
      return res.status(400).json({ success: false, message: `Cannot approve: status is '${reg.status}'` });
    }

    reg.status = 'Registered';
    await reg.save();

    // Generate ticket ID (was skipped during Pending registration)
    if (!reg.ticketId) {
      const crypto = require('node:crypto');
      const ts = Date.now().toString(36).toUpperCase();
      const rand = crypto.randomBytes(4).toString('hex').toUpperCase();
      reg.ticketId = `FEL-${ts}-${rand}`;
      await reg.save();
    }

    // Increment currentRegistrations now that payment is approved
    await Event.findByIdAndUpdate(event._id, { $inc: { currentRegistrations: 1 } });

    // Generate QR code + send ticket email
    const QRCode = require('qrcode');
    const { sendTicketEmail } = require('../utils/email');
    const qrCode = await QRCode.toDataURL(reg.ticketId, { errorCorrectionLevel: 'H', margin: 2, width: 256 }).catch(() => null);
    if (qrCode) {
      reg.qrCode = qrCode;
      await reg.save();
    }
    const participant = await User.findById(reg.participant);
    if (participant) {
      const fullName = `${participant.firstName || ''} ${participant.lastName || ''}`.trim() || participant.email;
      sendTicketEmail({
        to: participant.email,
        name: fullName,
        eventName: event.eventName,
        ticketId: reg.ticketId,
        qrCode,
        eventDate: event.eventStartDate,
      });
    }

    res.json({ success: true, registration: reg });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route  PUT /api/organizer/events/:eventId/reject-payment/:regId
// @access Private (Organizer)
// ─────────────────────────────────────────────────────────────────────────────
exports.rejectPayment = async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    if (event.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not your event' });
    }

    const reg = await Registration.findOne({ _id: req.params.regId, event: event._id });
    if (!reg) return res.status(404).json({ success: false, message: 'Registration not found' });
    if (reg.status !== 'Pending') {
      return res.status(400).json({ success: false, message: `Cannot reject: status is '${reg.status}'` });
    }

    reg.status = 'Rejected';
    await reg.save();

    // Restore stock only (currentRegistrations was never incremented for Pending)
    if (event.eventType === 'Merchandise' && reg.merchandiseDetails?.quantity) {
      await Event.findByIdAndUpdate(event._id, {
        $inc: { 'itemDetails.stock': reg.merchandiseDetails.quantity },
      });
    }

    // Send rejection email
    const participant = await User.findById(reg.participant);
    if (participant) {
      const { sendPaymentRejectedEmail } = require('../utils/email');
      const fullName = `${participant.firstName || ''} ${participant.lastName || ''}`.trim() || participant.email;
      sendPaymentRejectedEmail({
        to: participant.email, name: fullName,
        eventName: event.eventName,
      });
    }

    res.json({ success: true, registration: reg });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
