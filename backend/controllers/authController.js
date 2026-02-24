const User = require('../models/User');
const jwt = require('jsonwebtoken');

const generateToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });

const userPayload = (user) => ({
  _id: user._id,
  email: user.email,
  role: user.role,
  firstName: user.firstName,
  lastName: user.lastName,
  participantType: user.participantType,
  college: user.college,
  contactNumber: user.contactNumber,
  interests: user.interests,
  followedOrganizers: user.followedOrganizers,
  onboardingDone: user.onboardingDone,
  organizerName: user.organizerName,
  category: user.category,
  description: user.description,
  contactEmail: user.contactEmail,
});

// ─────────────────────────────────────────────────────────────────────────────
// @route  POST /api/auth/register
// @access Public  (Participants only; Admin creates Organizer accounts)
// ─────────────────────────────────────────────────────────────────────────────
exports.register = async (req, res) => {
  try {
    const { email, password, firstName, lastName, participantType, college, contactNumber } = req.body;

    if (!email || !password || !firstName || !lastName || !participantType) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields' });
    }

    if (participantType === 'IIIT' && !/.*@.*iiit\.ac\.in$/.test(email.toLowerCase())) {
      return res.status(400).json({ success: false, message: 'IIIT participants must use an email ending with iiit.ac.in (e.g., @iiit.ac.in, @research.iiit.ac.in, @students.iiit.ac.in)' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const user = await User.create({
      email,
      password,
      role: 'Participant',
      firstName,
      lastName,
      participantType,
      college: college || '',
      contactNumber: contactNumber || '',
    });

    const token = generateToken(user._id);
    res.status(201).json({ success: true, token, user: userPayload(user) });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route  POST /api/auth/login
// @access Public
// ─────────────────────────────────────────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const match = await user.comparePassword(password);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Block archived / disabled accounts
    if (user.isArchived) {
      return res.status(403).json({ success: false, message: 'Your account has been archived by an administrator. Please contact support.' });
    }

    const token = generateToken(user._id);
    res.json({ success: true, token, user: userPayload(user) });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route  GET /api/auth/me
// @access Private
// ─────────────────────────────────────────────────────────────────────────────
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({ success: true, user: userPayload(user) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route  PUT /api/auth/change-password
// @access Private
// ─────────────────────────────────────────────────────────────────────────────
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Please provide current and new passwords' });
    }

    const user = await User.findById(req.user._id).select('+password');
    const match = await user.comparePassword(currentPassword);
    if (!match) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save({ validateModifiedOnly: true });
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};
