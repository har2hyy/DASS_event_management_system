const express = require('express');
const router = express.Router();
const {
  getDashboard, getEventParticipants, exportParticipantsCSV,
  markAttendance, getProfile, updateProfile,
} = require('../controllers/organizerController');
const { protect, authorize } = require('../middleware/auth');

const O = [protect, authorize('Organizer')];

router.get('/dashboard',                                         ...O, getDashboard);
router.get('/profile',                                           ...O, getProfile);
router.put('/profile',                                           ...O, updateProfile);
router.get('/events/:id/participants',                           ...O, getEventParticipants);
router.get('/events/:id/participants/export',                    ...O, exportParticipantsCSV);
router.put('/events/:eventId/attendance/:regId',                 ...O, markAttendance);

module.exports = router;
