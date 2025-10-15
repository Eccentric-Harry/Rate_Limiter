const mongoose = require('mongoose');

// Usage Window Schema - Tracks API usage per minute/day
const usageWindowSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: ['minute', 'day'],
    index: true
  },
  windowId: {
    type: String,
    required: true,
    index: true
  },
  count: {
    type: Number,
    default: 0
  },
  expiresAt: {
    type: Date,
    required: true,
    expires: 0 // TTL index - document will be automatically removed after this date
  }
});

// Compound index for efficient lookups
usageWindowSchema.index({ key: 1, type: 1, windowId: 1 }, { unique: true });

// Static method to increment usage count and get current value
usageWindowSchema.statics.incrementAndGet = async function(key, type, windowId, expiry) {
  // This uses MongoDB's atomic findOneAndUpdate with upsert
  // In Redis, this would be replaced with: INCR key and EXPIRE key ttl
  
  const result = await this.findOneAndUpdate(
    { key, type, windowId },
    { 
      $inc: { count: 1 },
      $setOnInsert: { expiresAt: expiry }
    },
    { 
      new: true, // Return the updated document
      upsert: true // Create if it doesn't exist
    }
  );

  return result.count;
};

// Static method to get current usage for a key
usageWindowSchema.statics.getCurrentUsage = async function(key) {
  // Generate current window IDs
  const now = new Date();
  const minuteWindow = getMinuteWindowId(now);
  const dayWindow = getDayWindowId(now);

  // Get current usage counts
  const [minuteUsage, dayUsage] = await Promise.all([
    this.findOne({ key, type: 'minute', windowId: minuteWindow }),
    this.findOne({ key, type: 'day', windowId: dayWindow })
  ]);

  return {
    minute: minuteUsage?.count || 0,
    day: dayUsage?.count || 0
  };
};

// Helper functions
function getMinuteWindowId(date) {
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}-${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}`;
}

function getDayWindowId(date) {
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
}

// Export these helper functions so they can be used in middleware
usageWindowSchema.statics.getMinuteWindowId = getMinuteWindowId;
usageWindowSchema.statics.getDayWindowId = getDayWindowId;

const UsageWindow = mongoose.model('UsageWindow', usageWindowSchema);

module.exports = UsageWindow;
