const mongoose = require('mongoose');
const ApiKey = require('./models/ApiKey');

/**
 * Seed script to create default API keys if none exist
 * This will create two API keys with different rate limits for testing
 */
async function seedApiKeys() {
  try {
    // Check if any API keys exist
    const count = await ApiKey.countDocuments();
    
    if (count === 0) {
      console.log('No API keys found. Creating seed keys...');
      
      // Create two API keys with different rate limits
      const [key1, key2] = await Promise.all([
        ApiKey.create({
          name: 'Default API Key',
          perMinute: 50,
          perDay: 1000
        }),
        ApiKey.create({
          name: 'Limited API Key',
          perMinute: 5,
          perDay: 100
        })
      ]);
      
      console.log('Created seed API keys:');
      console.log(`1. ${key1.name}: ${key1.key} (${key1.perMinute}/min, ${key1.perDay}/day)`);
      console.log(`2. ${key2.name}: ${key2.key} (${key2.perMinute}/min, ${key2.perDay}/day)`);
    } else {
      console.log(`Found ${count} existing API keys. Skipping seed.`);
    }
  } catch (error) {
    console.error('Error seeding API keys:', error);
  }
}

// Export for use in main application
module.exports = seedApiKeys;

// Allow direct execution of this script
if (require.main === module) {
  // Load environment variables
  require('dotenv').config();
  
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/rate-limiter';
  
  mongoose.connect(MONGO_URI)
    .then(async () => {
      console.log('Connected to MongoDB');
      await seedApiKeys();
      mongoose.disconnect();
      console.log('Database connection closed');
    })
    .catch(err => {
      console.error('MongoDB connection error:', err);
      process.exit(1);
    });
}
