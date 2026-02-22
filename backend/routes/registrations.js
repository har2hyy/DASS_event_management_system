const express = require('express');
const router = express.Router();
const {
  registerForEvent, getMyRegistrations,
  getRegistration, cancelRegistration,
} = require('../controllers/registrationController');
const { protect, authorize } = require('../middleware/auth');

router.get('/my',      protect, authorize('Participant'), getMyRegistrations);
router.get('/:id',     protect, getRegistration);
router.post('/:eventId', protect, authorize('Participant'), registerForEvent);
router.delete('/:id',  protect, authorize('Participant'), cancelRegistration);

module.exports = router;
