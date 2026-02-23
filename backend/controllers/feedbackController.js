const Feedback     = require('../models/Feedback');
const Event        = require('../models/Event');
const Registration = require('../models/Registration');

// ─────────────────────────────────────────────────────────────────────────────
// @route  POST /api/feedback/:eventId
// @access Private (Participant) — must have Attended
// ─────────────────────────────────────────────────────────────────────────────
exports.submitFeedback = async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

    // Only attendees can leave feedback
    const reg = await Registration.findOne({
      participant: req.user._id,
      event: event._id,
      status: 'Attended',
    });
    if (!reg) {
      return res.status(403).json({ success: false, message: 'Only attendees can submit feedback' });
    }

    const { rating, comment } = req.body;
    if (!rating || typeof rating !== 'number' || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be an integer between 1 and 5' });
    }

    const feedback = await Feedback.create({
      event: event._id,
      rating: Math.round(rating),
      comment: (comment || '').trim().slice(0, 1000),
    });

    res.status(201).json({ success: true, feedback });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route  GET /api/feedback/:eventId
// @access Private (Organizer/Admin for aggregated, Participant for list)
// ─────────────────────────────────────────────────────────────────────────────
exports.getEventFeedback = async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

    const feedbacks = await Feedback.find({ event: event._id }).sort({ createdAt: -1 });

    // Aggregate stats
    const stats = {
      total: feedbacks.length,
      averageRating: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };
    if (feedbacks.length > 0) {
      let sum = 0;
      for (const f of feedbacks) {
        sum += f.rating;
        stats.distribution[f.rating] = (stats.distribution[f.rating] || 0) + 1;
      }
      stats.averageRating = Math.round((sum / feedbacks.length) * 10) / 10;
    }

    res.json({ success: true, feedbacks, stats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
