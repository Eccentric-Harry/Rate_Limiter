const mongoose = require('mongoose');

// Access Log Schema
const accessLogSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    index: true
  },
  endpoint: {
    type: String,
    required: true
  },
  status: {
    type: Number,
    required: true,
    enum: [200, 429] // Success or Rate Limited
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  minuteCount: {
    type: Number,
    required: true
  },
  dayCount: {
    type: Number,
    required: true
  }
});

// Create index for efficient querying by date ranges
accessLogSchema.index({ timestamp: -1 });
accessLogSchema.index({ key: 1, timestamp: -1 });

const AccessLog = mongoose.model('AccessLog', accessLogSchema);

module.exports = AccessLog;
