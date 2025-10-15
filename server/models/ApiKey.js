const mongoose = require('mongoose');
const { nanoid } = require('nanoid');

// API Key Schema
const apiKeySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  key: {
    type: String,
    required: true,
    unique: true,
    default: () => `ak_${nanoid(16)}`
  },
  perMinute: {
    type: Number,
    required: true,
    default: 50,
    min: 1
  },
  perDay: {
    type: Number,
    required: true,
    default: 1000,
    min: 1
  },
  active: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Static method to create a new API key
apiKeySchema.statics.createKey = async function(data) {
  return this.create({
    name: data.name,
    perMinute: data.perMinute,
    perDay: data.perDay
  });
};

// Static method to find an active API key
apiKeySchema.statics.findActiveKey = function(key) {
  return this.findOne({ key, active: true });
};

const ApiKey = mongoose.model('ApiKey', apiKeySchema);

module.exports = ApiKey;
