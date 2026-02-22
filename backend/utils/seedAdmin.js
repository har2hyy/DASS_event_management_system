const User = require('../models/User');

/**
 * Seeds the Admin account if it does not yet exist.
 * Called once after MongoDB connects.
 */
const seedAdmin = async () => {
  try {
    const existing = await User.findOne({ role: 'Admin' });
    if (existing) return;

    await User.create({
      email: process.env.ADMIN_EMAIL || 'admin@felicity.com',
      password: process.env.ADMIN_PASSWORD || 'Admin@123456',
      role: 'Admin',
    });
    console.log('✅ Admin account seeded');
  } catch (err) {
    console.error('❌ Admin seed error:', err.message);
  }
};

module.exports = seedAdmin;
