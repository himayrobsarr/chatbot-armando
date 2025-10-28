// backend/routes/heygen.js
const express = require('express');
const router = express.Router();
const HeyGenService = require('../services/HeyGenService');
const config = require('../config');

let heygenService = null;

// Inicializar servicio HeyGen
try {
  heygenService = new HeyGenService(config.HEYGEN_API_KEY, config.HEYGEN_AVATAR_ID);
} catch (error) {
  console.error('❌ Error inicializando HeyGenService:', error.message);
}

// Crear sesión de avatar
router.post('/session', async (req, res) => {
  try {
    if (!heygenService) {
      return res.status(500).json({
        success: false,
        error: 'Servicio HeyGen no inicializado'
      });
    }

    console.log('🎬 Creando sesión de avatar...');
    const sessionData = await heygenService.createSession({
      quality: req.body.quality || 'low',
      voiceId: config.HEYGEN_ELEVEN_VOICE_ID
    });

    console.log('✅ Sesión de avatar creada');
    res.json({
      success: true,
      data: sessionData
    });
  } catch (error) {
    console.error('❌ Error creando sesión:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: 'Error creando sesión de avatar',
      details: error.response?.data || error.message
    });
  }
});

// Enviar texto al avatar
router.post('/speak', async (req, res) => {
  try {
    const { sessionId, text } = req.body;

    if (!sessionId || !text) {
      return res.status(400).json({
        success: false,
        error: 'Se requieren sessionId y text'
      });
    }

    if (!heygenService) {
      return res.status(500).json({
        success: false,
        error: 'Servicio HeyGen no inicializado'
      });
    }

    console.log(`💬 Enviando texto al avatar: "${text}"`);
    await heygenService.sendText(sessionId, text);

    res.json({
      success: true,
      message: 'Texto enviado al avatar'
    });
  } catch (error) {
    console.error('❌ Error enviando texto:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: 'Error enviando texto al avatar',
      details: error.response?.data || error.message
    });
  }
});

// Detener sesión de avatar
router.post('/stop', async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere sessionId'
      });
    }

    if (!heygenService) {
      return res.status(500).json({
        success: false,
        error: 'Servicio HeyGen no inicializado'
      });
    }

    console.log(`🛑 Deteniendo sesión ${sessionId}...`);
    await heygenService.stopStreaming(sessionId);

    res.json({
      success: true,
      message: 'Sesión detenida'
    });
  } catch (error) {
    console.error('❌ Error deteniendo sesión:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: 'Error deteniendo sesión',
      details: error.response?.data || error.message
    });
  }
});

module.exports = router;
