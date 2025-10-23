const express = require('express');
const ElevenLabsService = require('../services/ElevenLabsService');
const config = require('../config');

const router = express.Router();

// Inicializar servicio ElevenLabs
const elevenLabsService = new ElevenLabsService(config.ELEVEN_API_KEY, config.ELEVEN_VOICE_ID);

/**
 * Test endpoint para ElevenLabs TTS
 */
router.post('/elevenlabs', async (req, res) => {
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'Campo "text" requerido' });
  }

  try {
    const result = await elevenLabsService.textToSpeech(text);

    res.set({
      'Content-Type': 'audio/mpeg',
      'X-Latency-Ms': result.latency,
      'X-Audio-Size': result.size
    });

    res.send(result.audioBuffer);
  } catch (error) {
    res.status(500).json(error);
  }
});

module.exports = router;
