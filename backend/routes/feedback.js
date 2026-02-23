const express = require('express');
const router = express.Router();
const { submitFeedback, getEventFeedback } = require('../controllers/feedbackController');
const { protect, authorize } = require('../middleware/auth');

router.post('/:eventId', protect, authorize('Participant'), submitFeedback);
router.get('/:eventId',  protect, getEventFeedback);

module.exports = router;
