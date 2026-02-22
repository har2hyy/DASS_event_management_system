const Event = require('../models/Event');
const Registration = require('../models/Registration');

// ─────────────────────────────────────────────────────────────────────────────
// @route  GET /api/events
// @access Public (some details only after login)
// Query params: search, type, eligibility, startDate, endDate, organizer, page, limit, followed
// ─────────────────────────────────────────────────────────────────────────────
exports.getEvents = async (req, res) => {
  try {
    const {
      search, type, eligibility, startDate, endDate,
      organizer, page = 1, limit = 12, followed,
    } = req.query;

    const query = {};

    // Only show published/ongoing events to the public (organizers see their own via /organizer routes)
    query.status = { $in: ['Published', 'Ongoing'] };

    if (type) query.eventType = type;
    if (eligibility) query.eligibility = eligibility;
    if (organizer) query.organizer = organizer;
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

    if (status === 'Draft') {
      // Free edits
      Object.assign(event, updates);
    } else if (status === 'Published') {
      // Description, deadline extension, limit increase, close registrations
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
      // Status change only
      if (Object.keys(updates).filter((k) => k !== 'status').length > 0) {
        return res.status(400).json({ success: false, message: 'Only status can be changed for Ongoing/Completed events' });
      }
      if (updates.status) event.status = updates.status;
    } else {
      return res.status(400).json({ success: false, message: 'Closed events cannot be edited' });
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
    if (event.status !== 'Draft') {
      return res.status(400).json({ success: false, message: 'Only Draft events can be deleted' });
    }
    await event.deleteOne();
    res.json({ success: true, message: 'Event deleted' });
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
