const express = require('express');
const router = express.Router();
const {
  getDashboard, createOrganizer, getOrganizers,
  deleteOrganizer, resetOrganizerPassword, getAllUsers, getAllEvents,
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

const A = [protect, authorize('Admin')];

router.get('/dashboard',                          ...A, getDashboard);
router.get('/users',                              ...A, getAllUsers);
router.get('/events',                             ...A, getAllEvents);
router.get('/organizers',                         ...A, getOrganizers);
router.post('/organizers',                        ...A, createOrganizer);
router.delete('/organizers/:id',                  ...A, deleteOrganizer);
router.put('/organizers/:id/reset-password',      ...A, resetOrganizerPassword);

module.exports = router;
