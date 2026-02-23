const express = require('express');
const router = express.Router();
const {
  getDashboard, getEventParticipants, exportParticipantsCSV,
  markAttendance, markAttendanceByScan, getAttendanceStats,
  getProfile, updateProfile,
  requestPasswordReset, getMyPasswordResetRequests,
  approvePayment, rejectPayment,
} = require('../controllers/organizerController');
const { protect, authorize } = require('../middleware/auth');

const O = [protect, authorize('Organizer')];

router.get('/dashboard',                                         ...O, getDashboard);
router.get('/profile',                                           ...O, getProfile);
router.put('/profile',                                           ...O, updateProfile);
router.get('/events/:id/participants',                           ...O, getEventParticipants);
router.get('/events/:id/participants/export',                    ...O, exportParticipantsCSV);
router.put('/events/:eventId/attendance/:regId',                 ...O, markAttendance);
router.post('/events/:eventId/attendance-scan',                  ...O, markAttendanceByScan);
router.get('/events/:eventId/attendance-stats',                  ...O, getAttendanceStats);

// Password reset requests
router.post('/password-reset-request',                           ...O, requestPasswordReset);
router.get('/password-reset-requests',                           ...O, getMyPasswordResetRequests);

// Payment approval
router.put('/events/:eventId/approve-payment/:regId',            ...O, approvePayment);
router.put('/events/:eventId/reject-payment/:regId',             ...O, rejectPayment);

module.exports = router;
