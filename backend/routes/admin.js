const express = require('express');
const router = express.Router();
const {
  getDashboard, createOrganizer, getOrganizers,
  deleteOrganizer, archiveOrganizer, unarchiveOrganizer,
  resetOrganizerPassword, getAllUsers, getAllEvents,
  deleteEvent, deleteUser,
  getPasswordResetRequests, approvePasswordResetRequest, rejectPasswordResetRequest,
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

const A = [protect, authorize('Admin')];

router.get('/dashboard',                          ...A, getDashboard);
router.get('/users',                              ...A, getAllUsers);
router.delete('/users/:id',                        ...A, deleteUser);
router.get('/events',                             ...A, getAllEvents);
router.delete('/events/:id',                       ...A, deleteEvent);
router.get('/organizers',                         ...A, getOrganizers);
router.post('/organizers',                        ...A, createOrganizer);
router.delete('/organizers/:id',                  ...A, deleteOrganizer);
router.put('/organizers/:id/archive',             ...A, archiveOrganizer);
router.put('/organizers/:id/unarchive',           ...A, unarchiveOrganizer);
router.put('/organizers/:id/reset-password',      ...A, resetOrganizerPassword);

// Password reset requests
router.get('/password-reset-requests',                         ...A, getPasswordResetRequests);
router.put('/password-reset-requests/:id/approve',             ...A, approvePasswordResetRequest);
router.put('/password-reset-requests/:id/reject',              ...A, rejectPasswordResetRequest);

module.exports = router;
