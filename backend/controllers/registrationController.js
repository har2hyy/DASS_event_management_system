const Registration = require('../models/Registration');
const Event        = require('../models/Event');
const QRCode       = require('qrcode');
const { sendTicketEmail } = require('../utils/email');

// ─────────────────────────────────────────────────────────────────────────────
// Helper — generate QR code as base64
// ─────────────────────────────────────────────────────────────────────────────
const generateQR = async (ticketId) => {
  try {
    return await QRCode.toDataURL(ticketId, { errorCorrectionLevel: 'H', margin: 2, width: 256 });
  } catch (_) { return null; }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route  POST /api/registrations/:eventId
// @access Private (Participant)
// ─────────────────────────────────────────────────────────────────────────────
exports.registerForEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

    // ── Blocking checks ──────────────────────────────────────────────────
    if (!['Published', 'Ongoing'].includes(event.status)) {
      return res.status(400).json({ success: false, message: 'Event is not open for registration' });
    }
    const deadlineEnd = new Date(event.registrationDeadline);
    deadlineEnd.setHours(23, 59, 59, 999);
    if (new Date() > deadlineEnd) {
      return res.status(400).json({ success: false, message: 'Registration deadline has passed' });
    }
    if (event.currentRegistrations >= event.registrationLimit) {
      return res.status(400).json({ success: false, message: 'Registration limit reached' });
    }
    if (event.eligibility === 'IIIT Only' && req.user.participantType !== 'IIIT') {
      return res.status(403).json({ success: false, message: 'This event is open to IIIT participants only' });
    }

    // Duplicate check
    const dup = await Registration.findOne({ participant: req.user._id, event: event._id });
    if (dup) return res.status(400).json({ success: false, message: 'Already registered for this event' });

    const regData = {
      participant: req.user._id,
      event: event._id,
    };

    if (event.eventType === 'Normal') {
      regData.formResponses = req.body.formResponses || {};
    } else if (event.eventType === 'Merchandise') {
      const { size, color, variant, quantity = 1 } = req.body;

      // Validate quantity
      if (!Number.isInteger(quantity) || quantity < 1) {
        return res.status(400).json({ success: false, message: 'Quantity must be a positive integer' });
      }

      // Per-participant purchase limit
      if (quantity > (event.itemDetails.purchaseLimit || 1)) {
        return res.status(400).json({
          success: false,
          message: `Cannot purchase more than ${event.itemDetails.purchaseLimit} units`,
        });
      }

      // Atomic stock check & decrement
      const stockResult = await Event.findOneAndUpdate(
        { _id: event._id, 'itemDetails.stock': { $gte: quantity } },
        { $inc: { 'itemDetails.stock': -quantity, currentRegistrations: 1 } },
        { new: true }
      );
      if (!stockResult) {
        return res.status(400).json({ success: false, message: 'Insufficient stock' });
      }

      regData.merchandiseDetails = { size, color, variant, quantity };
      regData.status = 'Pending'; // Pending payment approval for merchandise
    }

    // Save registration (ticketId auto-generated in pre-save)
    const registration = await Registration.create(regData);

    // Atomic increment for Normal events (merchandise already incremented atomically)
    if (event.eventType === 'Normal') {
      const updateOps = { $inc: { currentRegistrations: 1 } };
      if (!event.customForm?.locked) {
        updateOps.$set = { 'customForm.locked': true };
      }
      const incResult = await Event.findOneAndUpdate(
        { _id: event._id, currentRegistrations: { $lt: event.registrationLimit } },
        updateOps,
        { new: true }
      );
      if (!incResult) {
        await Registration.deleteOne({ _id: registration._id });
        return res.status(400).json({ success: false, message: 'Registration limit reached' });
      }
    }

    // Generate QR
    const qrCode = await generateQR(registration.ticketId);
    await Registration.findByIdAndUpdate(registration._id, { qrCode });
    registration.qrCode = qrCode;

    // Send email (non-blocking)
    const fullName = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.email;
    sendTicketEmail({
      to:        req.user.email,
      name:      fullName,
      eventName: event.eventName,
      ticketId:  registration.ticketId,
      qrCode,
      eventDate: event.eventStartDate,
    });

    res.status(201).json({ success: true, registration });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: 'Already registered for this event' });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route  GET /api/registrations/my
// @access Private (Participant)
// ─────────────────────────────────────────────────────────────────────────────
exports.getMyRegistrations = async (req, res) => {
  try {
    const registrations = await Registration.find({ participant: req.user._id })
      .populate({
        path: 'event',
        populate: { path: 'organizer', select: 'organizerName category' },
      })
      .sort({ createdAt: -1 });
    res.json({ success: true, registrations });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route  GET /api/registrations/:id
// @access Private (Participant — own only, or Organizer/Admin)
// ─────────────────────────────────────────────────────────────────────────────
exports.getRegistration = async (req, res) => {
  try {
    const reg = await Registration.findById(req.params.id)
      .populate('participant', 'firstName lastName email participantType college')
      .populate({ path: 'event', populate: { path: 'organizer', select: 'organizerName' } });

    if (!reg) return res.status(404).json({ success: false, message: 'Registration not found' });

    const isOwner = reg.participant._id.toString() === req.user._id.toString();
    const isOrgOrAdmin = ['Organizer', 'Admin'].includes(req.user.role);
    if (!isOwner && !isOrgOrAdmin) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.json({ success: true, registration: reg });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route  DELETE /api/registrations/:id
// @access Private (Participant — own only)
// ─────────────────────────────────────────────────────────────────────────────
exports.cancelRegistration = async (req, res) => {
  try {
    const reg = await Registration.findById(req.params.id);
    if (!reg) return res.status(404).json({ success: false, message: 'Registration not found' });
    if (reg.participant.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    if (reg.status === 'Cancelled') {
      return res.status(400).json({ success: false, message: 'Already cancelled' });
    }
    if (['Attended', 'Rejected'].includes(reg.status)) {
      return res.status(400).json({ success: false, message: `Cannot cancel a registration with status '${reg.status}'` });
    }

    reg.status = 'Cancelled';
    await reg.save();

    // Restore slot / stock atomically
    const incOps = { currentRegistrations: -1 };
    if (reg.merchandiseDetails?.quantity) {
      incOps['itemDetails.stock'] = reg.merchandiseDetails.quantity;
    }
    await Event.findByIdAndUpdate(reg.event, { $inc: incOps });

    res.json({ success: true, message: 'Registration cancelled' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route  PUT /api/registrations/:id/payment-proof
// @access Private (Participant — own only)
// ─────────────────────────────────────────────────────────────────────────────
exports.uploadPaymentProof = async (req, res) => {
  try {
    const reg = await Registration.findById(req.params.id);
    if (!reg) return res.status(404).json({ success: false, message: 'Registration not found' });
    if (reg.participant.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    if (reg.status !== 'Pending') {
      return res.status(400).json({ success: false, message: 'Payment proof can only be uploaded for pending registrations' });
    }

    const { paymentProof } = req.body;
    if (!paymentProof) {
      return res.status(400).json({ success: false, message: 'paymentProof (base64 or URL) is required' });
    }

    reg.paymentProof = paymentProof;
    await reg.save();

    res.json({ success: true, registration: reg });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
