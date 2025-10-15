const express = require('express');
const router = express.Router();

// This route uses the rateLimiter middleware (applied in index.js)
router.get('/', (req, res) => {
  // The usage data is attached by the rate limiter middleware
  const { minute, day } = req.usage;
  
  res.json({
    message: "Protected resource accessed successfully",
    usage: {
      minute,
      day
    }
  });
});

module.exports = router;
