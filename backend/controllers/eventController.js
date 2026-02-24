const Event = require('../models/Event');
const Registration = require('../models/Registration');

const ALLOWED_TAGS = [
  'gaming', 'music', 'dance', 'sports', 'coding', 'hacking',
  'robotics', 'art', 'photography', 'quizzing', 'film', 'fashion', 'literature',
];

// ─────────────────────────────────────────────────────────────────────────────
// @route  GET /api/events
// @access Public (some details only after login)
// Query params: search, type, eligibility, startDate, endDate, organizer, page, limit, followed
// ─────────────────────────────────────────────────────────────────────────────
exports.getEvents = async (req, res) => {
  try {
    const {
      search, type, eligibility, startDate, endDate,
      organizer, page = 1, limit = 12, followed, tag,
    } = req.query;

    const query = {};

    // Only show published/ongoing events to the public (organizers see their own via /organizer routes)
    query.status = { $in: ['Published', 'Ongoing'] };

    if (type) query.eventType = type;
    if (eligibility) query.eligibility = eligibility;
    if (organizer) query.organizer = organizer;
    if (tag) query.eventTags = tag.toLowerCase();
    if (startDate || endDate) {
      query.eventStartDate = {};
      if (startDate) query.eventStartDate.$gte = new Date(startDate);
      if (endDate) query.eventStartDate.$lte = new Date(endDate);
    }

    // Followed organizers filter (requires login)
    if (followed === 'true' && req.user) {
      const me = await require('../models/User').findById(req.user._id);
      if (me?.followedOrganizers?.length) {
        query.organizer = { $in: me.followedOrganizers };
      }
    }

    let events;
    if (search) {
      events = await Event.find({
        ...query,
        $text: { $search: search },
      })
        .populate('organizer', 'organizerName category')
        .sort({ score: { $meta: 'textScore' }, currentRegistrations: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit));
    } else {
      events = await Event.find(query)
        .populate('organizer', 'organizerName category')
        .sort({ currentRegistrations: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit));
    }

    const total = await Event.countDocuments(query);

    res.json({ success: true, count: events.length, total, events });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route  GET /api/events/tags
// @access Public
// ─────────────────────────────────────────────────────────────────────────────
exports.getAllowedTags = (_req, res) => {
  res.json({ success: true, tags: ALLOWED_TAGS });
};

// ─────────────────────────────────────────────────────────────────────────────
// @route  GET /api/events/trending
// @access Public
// ─────────────────────────────────────────────────────────────────────────────
exports.getTrendingEvents = async (req, res) => {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000); // last 24 h

    // Count registrations per event in the last 24 h
    const trending = await Registration.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: '$event', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    const eventIds = trending.map((t) => t._id);
    const events = await Event.find({
      _id: { $in: eventIds },
      status: { $in: ['Published', 'Ongoing'] },
    }).populate('organizer', 'organizerName category');

    // Preserve trending order
    const ordered = eventIds
      .map((id) => events.find((e) => e._id.toString() === id.toString()))
      .filter(Boolean);

    res.json({ success: true, events: ordered });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route  GET /api/events/:id
// @access Public
// ─────────────────────────────────────────────────────────────────────────────
exports.getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate(
      'organizer',
      'organizerName category description contactEmail'
    );
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    res.json({ success: true, event });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route  POST /api/events
// @access Private (Organizer)
// ─────────────────────────────────────────────────────────────────────────────
exports.createEvent = async (req, res) => {
  try {
    const { eventStartDate, eventEndDate, registrationDeadline, eventTags } = req.body;

    // Date validations
    if (eventEndDate && eventStartDate && new Date(eventEndDate) < new Date(eventStartDate)) {
      return res.status(400).json({ success: false, message: 'End date must be on or after start date' });
    }
    if (registrationDeadline && eventEndDate && new Date(registrationDeadline) > new Date(eventEndDate)) {
      return res.status(400).json({ success: false, message: 'Registration deadline must be on or before end date' });
    }

    // Tag validation
    if (eventTags && eventTags.length > 0) {
      const invalid = eventTags.filter((t) => !ALLOWED_TAGS.includes(t.toLowerCase()));
      if (invalid.length > 0) {
        return res.status(400).json({ success: false, message: `Invalid tags: ${invalid.join(', ')}. Allowed: ${ALLOWED_TAGS.join(', ')}` });
      }
      req.body.eventTags = eventTags.map((t) => t.toLowerCase());
    }

    const eventData = { ...req.body, organizer: req.user._id, status: 'Draft' };
    const event = await Event.create(eventData);
    res.status(201).json({ success: true, event });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route  PUT /api/events/:id
// @access Private (Organizer — owns event)
// Editing rules enforced per status.
// ─────────────────────────────────────────────────────────────────────────────
exports.updateEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    if (event.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not your event' });
    }

    const { status } = event;
    const updates = req.body;

    // Date validations on any update
    const newStart = updates.eventStartDate ? new Date(updates.eventStartDate) : event.eventStartDate;
    const newEnd   = updates.eventEndDate   ? new Date(updates.eventEndDate)   : event.eventEndDate;
    const newDead  = updates.registrationDeadline ? new Date(updates.registrationDeadline) : event.registrationDeadline;
    if (newEnd < newStart) {
      return res.status(400).json({ success: false, message: 'End date must be on or after start date' });
    }
    if (newDead > newEnd) {
      return res.status(400).json({ success: false, message: 'Registration deadline must be on or before end date' });
    }

    // Tag validation on any update
    if (updates.eventTags && updates.eventTags.length > 0) {
      const invalid = updates.eventTags.filter((t) => !ALLOWED_TAGS.includes(t.toLowerCase()));
      if (invalid.length > 0) {
        return res.status(400).json({ success: false, message: `Invalid tags: ${invalid.join(', ')}` });
      }
      updates.eventTags = updates.eventTags.map((t) => t.toLowerCase());
    }

    // Handle cancellation from any active status
    if (updates.status === 'Cancelled') {
      if (!['Published', 'Ongoing'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Only Published or Ongoing events can be cancelled' });
      }
      event.status = 'Cancelled';
      await event.save();
      // Cancel all active registrations
      await Registration.updateMany(
        { event: event._id, status: { $in: ['Registered', 'Pending'] } },
        { status: 'Cancelled' }
      );

      // Notify registered participants via email (fire-and-forget)
      const { sendEventStatusEmail } = require('../utils/email');
      Registration.find({ event: event._id }).populate('participant', 'firstName lastName email').then((regs) => {
        for (const r of regs) {
          if (r.participant?.email) {
            const name = `${r.participant.firstName || ''} ${r.participant.lastName || ''}`.trim() || r.participant.email;
            sendEventStatusEmail({ to: r.participant.email, name, eventName: event.eventName, newStatus: 'Cancelled' });
          }
        }
      }).catch(() => {});

      return res.json({ success: true, event });
    }

    if (status === 'Draft') {
      // Free edits
      Object.assign(event, updates);
    } else if (status === 'Published') {
      const allowed = ['eventDescription', 'registrationDeadline', 'registrationLimit', 'status'];
      for (const key of Object.keys(updates)) {
        if (!allowed.includes(key)) {
          return res.status(400).json({ success: false, message: `Cannot edit '${key}' when Published` });
        }
      }
      if (updates.registrationDeadline && new Date(updates.registrationDeadline) < event.registrationDeadline) {
        return res.status(400).json({ success: false, message: 'Cannot shorten registration deadline' });
      }
      if (updates.registrationLimit && updates.registrationLimit < event.registrationLimit) {
        return res.status(400).json({ success: false, message: 'Cannot decrease registration limit' });
      }
      Object.assign(event, updates);
    } else if (['Ongoing', 'Completed'].includes(status)) {
      if (Object.keys(updates).filter((k) => k !== 'status').length > 0) {
        return res.status(400).json({ success: false, message: 'Only status can be changed for Ongoing/Completed events' });
      }
      if (updates.status) event.status = updates.status;
    } else {
      return res.status(400).json({ success: false, message: 'Cancelled events cannot be edited' });
    }

    await event.save();
    res.json({ success: true, event });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route  PUT /api/events/:id/publish
// @access Private (Organizer)
// ─────────────────────────────────────────────────────────────────────────────
exports.publishEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate('organizer');
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    if (event.organizer._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not your event' });
    }
    if (event.status !== 'Draft') {
      return res.status(400).json({ success: false, message: 'Only Draft events can be published' });
    }

    event.status = 'Published';
    await event.save();

    // Discord webhook
    if (event.organizer.discordWebhook) {
      try {
        const axios = require('axios');
        await axios.post(event.organizer.discordWebhook, {
          content: `🎉 New event published: **${event.eventName}**\nType: ${event.eventType} | Starts: ${event.eventStartDate.toDateString()}`,
        });
      } catch (_) { /* non-fatal */ }
    }

    res.json({ success: true, event });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route  DELETE /api/events/:id
// @access Private (Organizer — Draft only)
// ─────────────────────────────────────────────────────────────────────────────
exports.deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    if (event.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not your event' });
    }

    // Cascade-delete all registrations for this event
    await Registration.deleteMany({ event: event._id });

    // Delete forum messages and feedback if models exist
    try { const Message  = require('../models/Message');  await Message.deleteMany({ event: event._id }); } catch (_) {}
    try { const Feedback = require('../models/Feedback'); await Feedback.deleteMany({ event: event._id }); } catch (_) {}

    await event.deleteOne();
    res.json({ success: true, message: 'Event and all associated data deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route  PUT /api/events/:id/custom-form
// @access Private (Organizer)
// ─────────────────────────────────────────────────────────────────────────────
exports.updateCustomForm = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    if (event.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not your event' });
    }
    if (event.eventType !== 'Normal') {
      return res.status(400).json({ success: false, message: 'Custom forms are for Normal events only' });
    }
    if (event.customForm?.locked) {
      return res.status(400).json({ success: false, message: 'Form is locked after first registration' });
    }

    event.customForm = { fields: req.body.fields || [], locked: false };
    await event.save();
    res.json({ success: true, event });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};
