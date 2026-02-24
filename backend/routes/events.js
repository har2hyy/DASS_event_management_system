const express = require('express');
const router = express.Router();
const {
  getEvents, getTrendingEvents, getEventById, getAllowedTags,
  createEvent, updateEvent, publishEvent,
  deleteEvent, updateCustomForm,
} = require('../controllers/eventController');
const { protect, authorize, optionalAuth } = require('../middleware/auth');

// Public (optionalAuth attaches req.user when logged in, for followed-clubs filter)
router.get('/',          optionalAuth, getEvents);
router.get('/tags',      getAllowedTags);
router.get('/trending',  getTrendingEvents);
router.get('/:id',       getEventById);

// Organizer only
router.post('/',                   protect, authorize('Organizer'), createEvent);
router.put('/:id',                 protect, authorize('Organizer'), updateEvent);
router.put('/:id/publish',         protect, authorize('Organizer'), publishEvent);
router.delete('/:id',              protect, authorize('Organizer'), deleteEvent);
router.put('/:id/custom-form',     protect, authorize('Organizer'), updateCustomForm);

module.exports = router;
