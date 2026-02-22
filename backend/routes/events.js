const express = require('express');
const router = express.Router();
const {
  getEvents, getTrendingEvents, getEventById,
  createEvent, updateEvent, publishEvent,
  deleteEvent, updateCustomForm,
} = require('../controllers/eventController');
const { protect, authorize } = require('../middleware/auth');

// Public
router.get('/',          getEvents);
router.get('/trending',  getTrendingEvents);
router.get('/:id',       getEventById);

// Organizer only
router.post('/',                   protect, authorize('Organizer'), createEvent);
router.put('/:id',                 protect, authorize('Organizer'), updateEvent);
router.put('/:id/publish',         protect, authorize('Organizer'), publishEvent);
router.delete('/:id',              protect, authorize('Organizer'), deleteEvent);
router.put('/:id/custom-form',     protect, authorize('Organizer'), updateCustomForm);

module.exports = router;
