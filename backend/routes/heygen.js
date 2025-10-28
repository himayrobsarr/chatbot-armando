// backend/routes/heygen.js
const express = require('express');
const router = express.Router();
const HeyGenService = require('../services/HeyGenService');
const config = require('../config');

let heygenService = null;

// Inicializar servicio HeyGen
try {
  console.log('🚀 Inicializando HeyGenService...');
  console.log('🔑 Configuración cargada:', {
    HEYGEN_API_KEY: config.HEYGEN_API_KEY ? `[${config.HEYGEN_API_KEY.length} chars]` : 'UNDEFINED',
    HEYGEN_AVATAR_ID: config.HEYGEN_AVATAR_ID || 'UNDEFINED'
  });

  heygenService = new HeyGenService(config.HEYGEN_API_KEY, config.HEYGEN_AVATAR_ID);
  console.log('✅ HeyGenService inicializado correctamente');
} catch (error) {
  console.error('❌ Error inicializando HeyGenService:', error.message);
  console.error('🔍 Verifica que HEYGEN_API_KEY y HEYGEN_AVATAR_ID estén configurados');
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
    console.log('📋 Parámetros:', {
      quality: req.body.quality || 'medium',
      voiceId: config.HEYGEN_ELEVEN_VOICE_ID,
      apiKey: config.HEYGEN_API_KEY ? '[PRESENTE]' : '[AUSENTE]',
      avatarId: config.HEYGEN_AVATAR_ID
    });

    const sessionData = await heygenService.createSession({
      quality: req.body.quality || 'medium',
      voiceId: config.HEYGEN_ELEVEN_VOICE_ID
    });

    console.log('✅ Sesión de avatar creada en routes');
    console.log('📦 Datos retornados:', {
      has_session_id: !!sessionData.session_id,
      has_url: !!sessionData.url,
      has_token: !!sessionData.access_token,
      has_video: !!sessionData.video
    });
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
    const { sessionId, text, source } = req.body;

    if (!sessionId || !text) {
      return res.status(400).json({
        success: false,
        error: 'Se requieren sessionId y text'
      });
    }

    // Permitir chatbot, user y keepalive para mantener sesiones activas
    if (source !== 'chatbot' && source !== 'user' && source !== 'keepalive') {
      console.warn('[HeyGenSpeak] Bloqueado intento de speak sin source válido', {
        hasSession: Boolean(sessionId),
        textPreview: typeof text === 'string' ? text.slice(0, 80) : undefined,
        source
      });
      return res.status(403).json({
        success: false,
        error: 'Forbidden: source debe ser "chatbot", "user" o "keepalive"'
      });
    }

    if (!heygenService) {
      return res.status(500).json({
        success: false,
        error: 'Servicio HeyGen no inicializado'
      });
    }

    console.log(`💬 Enviando texto al avatar: "${text}"`);
    console.log(`[HeyGenSpeak] Enviando texto al avatar (session=${sessionId}): "${String(text).slice(0, 120)}"`);
    console.log('🔧 Llamando a heygenService.sendText...');
    const result = await heygenService.sendText(sessionId, text);
    console.log('📤 Resultado de sendText:', result);

    res.json({
      success: true,
      message: 'Texto enviado al avatar',
      source
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
    console.log('🔧 Llamando a heygenService.stopStreaming...');
    const result = await heygenService.stopStreaming(sessionId);
    console.log('🛑 Resultado de stopStreaming:', result);

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

// Registrar sesión para seguimiento
router.post('/register-session', async (req, res) => {
  try {
    const { userId, sessionId } = req.body;

    if (!userId || !sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Se requieren userId y sessionId'
      });
    }

    // Aquí iría la lógica para guardar en base de datos
    // Por ahora, solo loggeamos
    console.log('📝 Sesión registrada:', { userId, sessionId, created_at: new Date().toISOString() });

    // Simular almacenamiento en memoria (reemplazar con DB real)
    if (!global.sessions) global.sessions = {};
    global.sessions[sessionId] = {
      userId,
      sessionId,
      created_at: new Date(),
      last_active: new Date(),
      status: 'active'
    };

    res.json({
      success: true,
      message: 'Sesión registrada'
    });
  } catch (error) {
    console.error('❌ Error registrando sesión:', error);
    res.status(500).json({
      success: false,
      error: 'Error registrando sesión'
    });
  }
});

// Heartbeat para mantener sesión activa
router.post('/heartbeat', async (req, res) => {
  try {
    const { userId, sessionId, lastActivity } = req.body;

    if (!userId || !sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Se requieren userId y sessionId'
      });
    }

    // Actualizar last_active en la "base de datos"
    if (global.sessions && global.sessions[sessionId]) {
      global.sessions[sessionId].last_active = new Date();
      global.sessions[sessionId].lastActivity = lastActivity ? new Date(lastActivity) : new Date();
    }

    // Enviar keep-alive a HeyGen para resetear timeout
    if (heygenService) {
      try {
        await heygenService.keepAlive(sessionId);
        console.log('💓 Keep-alive enviado a HeyGen para sesión:', sessionId);
      } catch (keepAliveError) {
        console.warn('⚠️ Error enviando keep-alive a HeyGen:', keepAliveError.message);
        // No fallar el heartbeat por error en keep-alive
      }
    }

    res.json({
      success: true,
      message: 'Heartbeat recibido y keep-alive enviado'
    });
  } catch (error) {
    console.error('❌ Error en heartbeat:', error);
    res.status(500).json({
      success: false,
      error: 'Error en heartbeat'
    });
  }
});

// Reportar parada de usuario
router.post('/user-stop', async (req, res) => {
  try {
    const { userId, sessionId } = req.body;

    console.log('🛑 Usuario reportó parada:', { userId, sessionId });

    // Marcar como candidato para cierre
    if (global.sessions && global.sessions[sessionId]) {
      global.sessions[sessionId].user_stop_reported = new Date();
    }

    res.json({
      success: true,
      message: 'Parada de usuario reportada'
    });
  } catch (error) {
    console.error('❌ Error reportando parada de usuario:', error);
    res.status(500).json({
      success: false,
      error: 'Error reportando parada de usuario'
    });
  }
});

// Finalizar sesión
router.post('/end-session', async (req, res) => {
  try {
    const { userId, sessionId } = req.body;

    console.log('🏁 Finalizando sesión:', { userId, sessionId });

    // Marcar sesión como cerrada
    if (global.sessions && global.sessions[sessionId]) {
      global.sessions[sessionId].status = 'closed';
      global.sessions[sessionId].closed_at = new Date();
    }

    res.json({
      success: true,
      message: 'Sesión finalizada'
    });
  } catch (error) {
    console.error('❌ Error finalizando sesión:', error);
    res.status(500).json({
      success: false,
      error: 'Error finalizando sesión'
    });
  }
});

// Tarea de limpieza automática (simulada - en producción usar cron job)
setInterval(() => {
  if (!global.sessions) return;

  const now = new Date();
  const timeoutMs = 5 * 60 * 1000; // 5 minutos sin actividad

  for (const [sessionId, session] of Object.entries(global.sessions)) {
    if (session.status === 'active') {
      const timeSinceLastActive = now - session.last_active;

      // Cerrar sesiones sin heartbeat por más de 5 minutos
      if (timeSinceLastActive > timeoutMs) {
        console.log('🧹 Cerrando sesión inactiva:', sessionId);
        // Aquí iría la llamada a HeyGen para cerrar la sesión
        session.status = 'closed';
        session.auto_closed_at = new Date();
      }

      // Cerrar sesiones donde el usuario reportó parada hace más de 5 minutos
      if (session.user_stop_reported) {
        const timeSinceUserStop = now - session.user_stop_reported;
        if (timeSinceUserStop > timeoutMs) {
          console.log('🧹 Cerrando sesión por parada de usuario:', sessionId);
          session.status = 'closed';
          session.user_closed_at = new Date();
        }
      }
    }
  }
}, 60 * 1000); // Revisar cada minuto

module.exports = router;
