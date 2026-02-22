const express = require('express');
const router = express.Router();
const {
  getDashboard, updateProfile, completeOnboarding,
  getOrganizers, followOrganizer, getOrganizerDetail,
} = require('../controllers/participantController');
const { protect, authorize } = require('../middleware/auth');

const P = [protect, authorize('Participant')];

router.get('/dashboard',              ...P, getDashboard);
router.put('/profile',                ...P, updateProfile);
router.put('/onboarding',             ...P, completeOnboarding);
router.get('/organizers',             protect, getOrganizers);
router.get('/organizers/:id',         protect, getOrganizerDetail);
router.post('/follow/:organizerId',   ...P, followOrganizer);

module.exports = router;
