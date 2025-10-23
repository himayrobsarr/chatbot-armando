const express = require('express');
const HeyGenService = require('../services/HeyGenService');
const config = require('../config');

const router = express.Router();

// Inicializar servicio HeyGen
const heyGenService = new HeyGenService(config.HEYGEN_API_KEY);

/**
 * Crear nueva sesión HeyGen
 */
router.post('/session', async (req, res) => {
  try {
    const result = await heyGenService.createSession();
    config.heygenSessionData.set(result.sessionData);

    res.json({
      success: true,
      latency: `${result.latency}ms`,
      session: result.sessionData
    });
  } catch (error) {
    res.status(error.status || 500).json(error);
  }
});

/**
 * Iniciar streaming HeyGen
 */
router.post('/start', async (req, res) => {
  const sessionData = config.heygenSessionData.get();
  
  if (!sessionData) {
    return res.status(400).json({
      error: 'No hay sesión activa. Ejecuta POST /api/test/heygen/session primero'
    });
  }

  try {
    const sessionId = sessionData.data.session_id;
    const result = await heyGenService.startStreaming(sessionId);

    res.json({
      success: true,
      latency: `${result.latency}ms`,
      response: result.response
    });
  } catch (error) {
    res.status(500).json(error);
  }
});

/**
 * Enviar texto para lip-sync
 */
router.post('/speak', async (req, res) => {
  const { text } = req.body;
  const sessionData = config.heygenSessionData.get();

  if (!sessionData) {
    return res.status(400).json({
      error: 'No hay sesión activa. Ejecuta POST /api/test/heygen/session primero'
    });
  }

  if (!text) {
    return res.status(400).json({ error: 'Campo "text" requerido' });
  }

  try {
    const sessionId = sessionData.data.session_id;
    const result = await heyGenService.sendText(sessionId, text);

    res.json({
      success: true,
      latency: `${result.latency}ms`,
      response: result.response
    });
  } catch (error) {
    res.status(500).json(error);
  }
});

/**
 * Cerrar sesión HeyGen
 */
router.post('/close', async (req, res) => {
  const sessionData = config.heygenSessionData.get();
  
  if (!sessionData) {
    return res.status(400).json({ error: 'No hay sesión activa para cerrar' });
  }

  try {
    const sessionId = sessionData.data.session_id;
    await heyGenService.stopStreaming(sessionId);
    config.heygenSessionData.clear();

    res.json({ success: true, message: 'Sesión cerrada' });
  } catch (error) {
    res.status(500).json(error);
  }
});

module.exports = router;
