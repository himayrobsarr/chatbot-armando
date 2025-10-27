// backend/routes/chatbot.js
const express = require('express');
const axios = require('axios');
const ElevenLabsService = require('../services/ElevenLabsService');
const config = require('../config');

const router = express.Router();
const elevenLabsService = new ElevenLabsService(config.ELEVEN_API_KEY, config.ELEVEN_VOICE_ID);

// URL del webhook de n8n (tu endpoint de producción)
const N8N_WEBHOOK_URL = 'https://n8n.ia-academy.com.co/webhook/chatbot';

router.post('/chatbot', async (req, res) => {
  try {
    const { text, sessionId } = req.body;
    if (!text) return res.status(400).json({ error: 'Campo "text" requerido' });

    // 1️⃣ Enviar el texto al chatbot (n8n)
    const chatbotResponse = await axios.post(N8N_WEBHOOK_URL, {
      message: text,
      sessionId: sessionId || 'default',
    });

    const replyText =
      chatbotResponse.data?.response ||
      chatbotResponse.data ||
      'No se recibió respuesta del chatbot';

    // 2️⃣ Generar audio con ElevenLabs
    const ttsResult = await elevenLabsService.textToSpeech(replyText);

    res.set({
      'Content-Type': 'audio/mpeg',
      'X-Chatbot-Response': encodeURIComponent(replyText),
    });

    res.send(ttsResult.audioBuffer);
  } catch (error) {
    console.error('❌ Error en /api/chatbot:', error.message);
    res.status(500).json({ error: error.message || 'Error interno del servidor' });
  }
});

module.exports = router;
