const ApiKey = require('../models/ApiKey');
const UsageWindow = require('../models/UsageWindow');
const AccessLog = require('../models/AccessLog');

/**
 * Rate limiter middleware
 * 
 * Checks API key against minute and day rate limits
 * Uses atomic MongoDB operations for counting
 * 
 * Note: In production, Redis would be better for this:
 * - INCR key (increment counter)
 * - EXPIRE key ttl (set expiry)
 * - GET key (check current count)
 * All with O(1) complexity and lower latency
 */
const rateLimiter = (io) => async (req, res, next) => {
  // Get API key from header
  const apiKey = req.header('x-api-key');
  if (!apiKey) {
    return res.status(401).json({ error: 'API key is required' });
  }

  try {
    // Check if API key exists and is active
    const keyData = await ApiKey.findActiveKey(apiKey);
    if (!keyData) {
      return res.status(401).json({ error: 'Invalid or inactive API key' });
    }

    // Get current timestamp and window IDs
    const now = new Date();
    const minuteWindowId = UsageWindow.getMinuteWindowId(now);
    const dayWindowId = UsageWindow.getDayWindowId(now);

    // Set expiry dates for windows
    const minuteExpiry = new Date(now);
    minuteExpiry.setMinutes(minuteExpiry.getMinutes() + 1);
    
    const dayExpiry = new Date(now);
    dayExpiry.setDate(dayExpiry.getDate() + 1);
    dayExpiry.setHours(0, 0, 0, 0);

    // Increment usage counters atomically
    const [minuteCount, dayCount] = await Promise.all([
      UsageWindow.incrementAndGet(apiKey, 'minute', minuteWindowId, minuteExpiry),
      UsageWindow.incrementAndGet(apiKey, 'day', dayWindowId, dayExpiry)
    ]);

    // Check rate limits
    let status = 200;
    if (minuteCount > keyData.perMinute) {
      status = 429;
      await AccessLog.create({
        key: apiKey,
        endpoint: req.path,
        status,
        minuteCount,
        dayCount
      });
      return res.status(429).json({ error: 'Too Many Requests', limit: keyData.perMinute });
    }

    if (dayCount > keyData.perDay) {
      status = 429;
      await AccessLog.create({
        key: apiKey,
        endpoint: req.path,
        status,
        minuteCount,
        dayCount
      });
      return res.status(429).json({ error: 'Daily quota exceeded', limit: keyData.perDay });
    }

    // Store usage info for downstream middleware/routes
    req.usage = { minute: minuteCount, day: dayCount };
    req.apiKeyData = keyData;

    // Log successful access
    await AccessLog.create({
      key: apiKey,
      endpoint: req.path,
      status: 200,
      minuteCount,
      dayCount
    });

    // Emit real-time update via Socket.io
    if (io) {
      io.emit('usage.update', {
        key: apiKey,
        minute: minuteCount,
        day: dayCount,
        keyId: keyData._id
      });
    }

    next();
  } catch (error) {
    console.error('Rate limiter error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = rateLimiter;
