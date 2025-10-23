const express = require('express');
const { validateKeys } = require('../utils');
const config = require('../config');

const router = express.Router();

/**
 * Health Check endpoint
 */
router.get('/health', (req, res) => {
  const missingKeys = validateKeys(config);
  res.json({
    status: missingKeys.length === 0 ? 'ok' : 'missing_config',
    timestamp: new Date().toISOString(),
    configs: {
      elevenLabs: !!config.ELEVEN_API_KEY,
      elevenVoice: !!config.ELEVEN_VOICE_ID,
      heyGen: !!config.HEYGEN_API_KEY
    },
    missingKeys: missingKeys.length > 0 ? missingKeys : undefined,
    session: config.heygenSessionData.get() ? 'active' : 'none'
  });
});

module.exports = router;
