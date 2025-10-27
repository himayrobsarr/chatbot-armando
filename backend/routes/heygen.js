// backend/routes/heygen.js
const express = require('express');
const router = express.Router();
const axios = require('axios');

const HEYGEN_API_KEY = 'k9K6pjuIAtm';
const AVATAR_ID = 'Wayne_20240711';

router.post('/token', async (req, res) => {
  try {
    console.log('🎬 Creando sesión HeyGen...');
    const response = await axios.post(
      'https://api.heygen.com/v1/streaming.new',
      {
        avatar_id: AVATAR_ID,
        version: 'v2',
        quality: 'medium'
      },
      {
        headers: {
          Authorization: `Bearer ${HEYGEN_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Sesión creada para frontend');
    res.json({
      success: true,
      data: response.data.data
    });
  } catch (error) {
    console.error('❌ Error creando token HeyGen:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: 'Error creando token HeyGen',
      details: error.response?.data || error.message
    });
  }
});

module.exports = router;
