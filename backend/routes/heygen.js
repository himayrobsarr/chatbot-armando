// backend/routes/heygen.js

const express = require('express');
const HeyGenService = require('../services/HeyGenService');
const config = require('../config'); // Lo usamos para las claves

const router = express.Router(); // <-- ¡Exportamos un router!

// =================================================================
// TUS CLAVES (HARDCODEADAS)
// ¡USA TUS CLAVES NUEVAS COMPLETAS AQUÍ!
// =================================================================
const MI_HEYGEN_API_KEY = "sk_V2_hgu_knS2fHStXbM_vGSQyQPMtnGON2brKRqyOaEWmp4EvIq2"; 
const MI_HEYGEN_AVATAR_ID = "Thaddeus_CasualLook_public";
// =================================================================

// Inicializar servicio HeyGen con las claves
// Usamos las claves de ARRIBA, no las de 'config'
const heyGenService = new HeyGenService(MI_HEYGEN_API_KEY, MI_HEYGEN_AVATAR_ID);

/**
 * Crear nueva sesión HeyGen
 * Esto llama a streaming.new y debe devolver session_id Y sdp.
 */
// En backend/routes/heygen.js
// REEMPLAZA router.post('/session') por esto:

router.post('/session', async (req, res) => {
  try {
      const result = await heyGenService.createSession();
      const sessionData = result.sessionData.data;
      
      // ✅ Verificar realtime_endpoint en vez de sdp
      if (!sessionData || !sessionData.session_id || !sessionData.realtime_endpoint) {
          console.error('❌ Respuesta incompleta:', result.sessionData);
          return res.status(500).json({ 
              error: 'HeyGen no devolvió session_id o realtime_endpoint' 
          });
      }
      
      // Devolver datos para WebSocket
      res.json({
          sessionId: sessionData.session_id,
          webrtcData: {
              realtime_endpoint: sessionData.realtime_endpoint,
              session_duration_limit: sessionData.session_duration_limit,
              url: sessionData.url,
              access_token: sessionData.access_token
          }
      });

  } catch (error) {
      console.error('❌ Error /session:', error.message);
      res.status(500).json({ error: error.message });
  }
});

/**
 * Enviar texto para lip-sync
 */
router.post('/speak', async (req, res) => {
    // Leemos ambos del body (esto ya estaba correcto)
    const { text, sessionId } = req.body; 

    if (!sessionId) {
        return res.status(400).json({ error: 'sessionId (string) requerido' });
    }
    if (!text) {
        return res.status(400).json({ error: 'Campo "text" requerido' });
    }

    try {
        const result = await heyGenService.sendText(sessionId, text); // Llama a streaming.talk (o task)

        res.json({
            success: true,
            latency: `${result.latency}ms`,
            response: result.response
        });
    } catch (error) {
        console.error('❌ Error en /speak:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Los endpoints /start y /close ya no son necesarios para este flujo
router.post('/start', (req, res) => {
    res.status(404).json({ error: 'Endpoint no usado. La sesión se inicia en /session.' });
});
router.post('/close', (req, res) => {
    res.json({ success: true, message: 'Cierre no implementado en este flujo.' });
});

module.exports = router;