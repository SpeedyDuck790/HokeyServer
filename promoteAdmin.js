// Script to promote a user to admin and site admin
// Usage: node promoteAdmin.js

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hokey';
const username = 'James_Hill';

async function promoteUser() {
  await mongoose.connect(MONGO_URI);
  const user = await User.findOne({ username });
  if (!user) {
    console.error('User not found:', username);
    process.exit(1);
  }
  // Add both 'site-admin' and 'chat-admin' to profile.badges (if not present)
  if (!user.profile) user.profile = {};
  user.profile.badges = Array.from(new Set([...(user.profile.badges || []), 'site-admin', 'chat-admin']));
  // Set role to 'admin'
  user.role = 'admin';
  await user.save();
  console.log(`User ${username} promoted to admin and site-admin.`);
  await mongoose.disconnect();
}

promoteUser().catch(err => {
  console.error(err);
  process.exit(1);
});
