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
  const startedAt = Date.now();
  try {
    const { text, sessionId } = req.body;
    if (!text) return res.status(400).json({ error: 'Campo "text" requerido' });

    console.log('[Chatbot] Entrada recibida', {
      sessionId: sessionId || 'default',
      textPreview: String(text).slice(0, 120),
      textLength: String(text).length
    });
    

    // 1️⃣ Enviar el texto al chatbot (n8n)
    const n8nStart = Date.now();
    const chatbotResponse = await axios.post(N8N_WEBHOOK_URL, {
      message: text,
      sessionId: sessionId || 'default',
    });
    const n8nLatency = Date.now() - n8nStart;
    console.log('[Chatbot] Respuesta de n8n', {
      latencyMs: n8nLatency,
      dataKeys: Object.keys(chatbotResponse.data || {})
    });

    const replyText =
      chatbotResponse.data?.response ||
      chatbotResponse.data ||
      'No se recibió respuesta del chatbot';

    // 2️⃣ Generar audio con ElevenLabs
    const ttsStart = Date.now();
    const ttsResult = await elevenLabsService.textToSpeech(replyText);

    const ttsLatency = Date.now() - ttsStart;
    console.log('[Chatbot] Audio TTS generado', {
      ttsLatencyMs: ttsLatency,
      replyPreview: String(replyText).slice(0, 160),
      replyLength: String(replyText).length
    });

    res.set({
      'Content-Type': 'audio/mpeg',
      'X-Chatbot-Response': encodeURIComponent(replyText),
      'Access-Control-Expose-Headers': 'X-Chatbot-Response'
    });

    console.log('[Chatbot] Respondiendo al cliente', {
      totalLatencyMs: Date.now() - startedAt
    });
    res.send(ttsResult.audioBuffer);
  } catch (error) {
    console.error('❌ Error en /api/chatbot:', error.message);
    res.status(500).json({ error: error.message || 'Error interno del servidor' });
  }
});

module.exports = router;
