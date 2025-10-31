// Debug script to show how reactions are stored in MongoDB
require('dotenv').config();
const mongoose = require('mongoose');
const Message = require('./src/models/Message');

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('✅ Connected to MongoDB');
    
    // Find messages with reactions
    const messagesWithReactions = await Message.find({ 
      reactions: { $exists: true, $ne: {} } 
    }).limit(5);
    
    console.log(`\n📊 Found ${messagesWithReactions.length} messages with reactions:\n`);
    
    messagesWithReactions.forEach((msg, index) => {
      console.log(`\n--- Message ${index + 1} ---`);
      console.log(`Room: ${msg.room}`);
      console.log(`From: ${msg.username}`);
      console.log(`Message: ${msg.message.substring(0, 50)}...`);
      console.log(`Timestamp: ${msg.timestamp}`);
      console.log(`\nReactions (stored as Map):`);
      console.log(msg.reactions);
      console.log(`\nReactions (as Object):`);
      console.log(Object.fromEntries(msg.reactions));
      console.log(`\nRaw JSON:`);
      console.log(JSON.stringify(msg.toObject(), null, 2));
    });
    
    // Show the most recent message regardless of reactions
    const latestMsg = await Message.findOne({ room: 'global' }).sort({ timestamp: -1 });
    console.log(`\n\n📝 Latest message in global room:`);
    console.log(JSON.stringify(latestMsg, null, 2));
    
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
