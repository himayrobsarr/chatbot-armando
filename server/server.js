require('dotenv').config();
const express = require('express');
const WebSocket = require('ws');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');

const app = express();

// ===== MIDDLEWARES =====
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", "ws:", "wss:", "https://api.elevenlabs.io", "https://api.heygen.com"]
    }
  }
}));
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.raw({ type: 'audio/*', limit: '10mb' }));

// Servir archivos estáticos del cliente
app.use(express.static(path.join(__dirname, '../client')));

const PORT = process.env.PORT || 3000;

// ===== CONFIGURACIÓN APIs =====
const ELEVEN_API_KEY = process.env.ELEVEN_API_KEY;
const ELEVEN_VOICE_ID = process.env.ELEVEN_VOICE_ID;
const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY;

// Estado global para prototipo rápido
let heygenSessionData = null;
let heygenPeerConnection = null;

// ===== UTILIDADES =====
function logMetrics(endpoint, duration, details = {}) {
  console.log(`📊 [${endpoint}] ${duration}ms`, details);
}

function validateKeys() {
  const missing = [];
  if (!ELEVEN_API_KEY) missing.push('ELEVEN_API_KEY');
  if (!ELEVEN_VOICE_ID) missing.push('ELEVEN_VOICE_ID');
  if (!HEYGEN_API_KEY) missing.push('HEYGEN_API_KEY');
  return missing;
}

function validateTextInput(text) {
  if (!text || typeof text !== 'string') {
    return { valid: false, error: 'El campo "text" es requerido y debe ser una cadena' };
  }
  if (text.length > 5000) {
    return { valid: false, error: 'El texto no puede exceder 5000 caracteres' };
  }
  if (text.trim().length === 0) {
    return { valid: false, error: 'El texto no puede estar vacío' };
  }
  return { valid: true };
}

function sanitizeText(text) {
  return text.trim().replace(/[<>]/g, '');
}

// ===== ENDPOINTS =====

// Health Check
app.get('/health', (req, res) => {
  const missingKeys = validateKeys();
  res.json({
    status: missingKeys.length === 0 ? 'ok' : 'missing_config',
    timestamp: new Date().toISOString(),
    configs: {
      elevenLabs: !!ELEVEN_API_KEY,
      elevenVoice: !!ELEVEN_VOICE_ID,
      heyGen: !!HEYGEN_API_KEY
    },
    missingKeys: missingKeys.length > 0 ? missingKeys : undefined,
    session: heygenSessionData ? 'active' : 'none'
  });
});

// ===== 1. TEST ELEVENLABS TTS =====
app.post('/api/test/elevenlabs', async (req, res) => {
  const { text } = req.body;

  // Validar entrada
  const validation = validateTextInput(text);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  const sanitizedText = sanitizeText(text);

  try {
    const startTime = Date.now();

    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${ELEVEN_VOICE_ID}`,
      {
        text: sanitizedText,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true
        }
      },
      {
        headers: {
          Accept: 'audio/mpeg',
          'xi-api-key': ELEVEN_API_KEY,
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer'
      }
    );

    const latency = Date.now() - startTime;

    logMetrics('ElevenLabs TTS', latency, {
      textLength: sanitizedText.length,
      audioSize: `${(response.data.length / 1024).toFixed(2)} KB`
    });

    res.set({
      'Content-Type': 'audio/mpeg',
      'X-Latency-Ms': latency,
      'X-Audio-Size': response.data.length
    });

    res.send(response.data);
  } catch (error) {
    console.error('❌ Error ElevenLabs:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Error en ElevenLabs TTS',
      details: error.response?.data || error.message,
      status: error.response?.status
    });
  }
});

// ===== 2. TEST HEYGEN - CREAR SESIÓN =====
app.post('/api/test/heygen/session', async (req, res) => {
  try {
    const startTime = Date.now();

    // Crear nueva sesión de streaming
    const response = await axios.post(
      'https://api.heygen.com/v1/streaming.new',
      {
        quality: 'medium',
        avatar_name: req.body.avatarId || 'default'
      },
      {
        headers: {
          'X-Api-Key': HEYGEN_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    const latency = Date.now() - startTime;
    heygenSessionData = response.data;

    logMetrics('HeyGen Session', latency, {
      sessionId: response.data.data?.session_id
    });

    res.json({
      success: true,
      latency: `${latency}ms`,
      session: response.data
    });
  } catch (error) {
    console.error('❌ Error HeyGen Session:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Error creando sesión HeyGen',
      details: error.response?.data || error.message,
      status: error.response?.status
    });
  }
});

// ===== 3. TEST HEYGEN - INICIAR STREAMING =====
app.post('/api/test/heygen/start', async (req, res) => {
  if (!heygenSessionData) {
    return res.status(400).json({
      error: 'No hay sesión activa. Ejecuta POST /api/test/heygen/session primero'
    });
  }

  try {
    const sessionId = heygenSessionData.data.session_id;
    const startTime = Date.now();

    const response = await axios.post(
      `https://api.heygen.com/v1/streaming.start`,
      {
        session_id: sessionId
      },
      {
        headers: {
          'X-Api-Key': HEYGEN_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    const latency = Date.now() - startTime;

    logMetrics('HeyGen Start', latency);

    res.json({
      success: true,
      latency: `${latency}ms`,
      response: response.data
    });
  } catch (error) {
    console.error('❌ Error HeyGen Start:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Error iniciando streaming HeyGen',
      details: error.response?.data || error.message
    });
  }
});

// ===== 4. TEST HEYGEN - ENVIAR TEXTO (LIP-SYNC) =====
app.post('/api/test/heygen/speak', async (req, res) => {
  const { text } = req.body;

  if (!heygenSessionData) {
    return res.status(400).json({
      error: 'No hay sesión activa. Ejecuta POST /api/test/heygen/session primero'
    });
  }

  if (!text) {
    return res.status(400).json({ error: 'Campo "text" requerido' });
  }

  try {
    const sessionId = heygenSessionData.data.session_id;
    const startTime = Date.now();

    const response = await axios.post(
      `https://api.heygen.com/v1/streaming.task`,
      {
        session_id: sessionId,
        text: text,
        task_type: 'repeat'
      },
      {
        headers: {
          'X-Api-Key': HEYGEN_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    const latency = Date.now() - startTime;

    logMetrics('HeyGen Speak', latency, { textLength: text.length });

    res.json({
      success: true,
      latency: `${latency}ms`,
      response: response.data
    });
  } catch (error) {
    console.error('❌ Error HeyGen Speak:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Error enviando texto a HeyGen',
      details: error.response?.data || error.message
    });
  }
});

// ===== 5. FLUJO COMPLETO: ELEVENLABS → HEYGEN =====
app.post('/api/test/full-flow', async (req, res) => {
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'Campo "text" requerido' });
  }

  try {
    const flowStart = Date.now();
    const metrics = {};

    console.log('\n🔄 === INICIANDO FLUJO COMPLETO ===');

    // PASO 1: Generar audio con ElevenLabs
    console.log('🎙️  Paso 1: Generando audio con ElevenLabs...');
    const t1 = Date.now();

    const elevenResponse = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${ELEVEN_VOICE_ID}`,
      {
        text: text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75
        }
      },
      {
        headers: {
          'xi-api-key': ELEVEN_API_KEY,
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer'
      }
    );

    metrics.elevenLabs = Date.now() - t1;
    console.log(`   ✅ Audio generado: ${metrics.elevenLabs}ms`);

    // PASO 2: Enviar texto a HeyGen para lip-sync
    if (!heygenSessionData) {
      console.log('   ⚠️  No hay sesión HeyGen activa');
      metrics.heyGen = 0;
      metrics.warning = 'No hay sesión HeyGen activa';
    } else {
      console.log('🎬 Paso 2: Enviando texto a HeyGen...');
      const t2 = Date.now();

      const sessionId = heygenSessionData.data.session_id;

      await axios.post(
        `https://api.heygen.com/v1/streaming.task`,
        {
          session_id: sessionId,
          text: text,
          task_type: 'repeat'
        },
        {
          headers: {
            'X-Api-Key': HEYGEN_API_KEY,
            'Content-Type': 'application/json'
          }
        }
      );

      metrics.heyGen = Date.now() - t2;
      console.log(`   ✅ HeyGen procesado: ${metrics.heyGen}ms`);
    }

    metrics.total = Date.now() - flowStart;

    console.log(`\n✅ === FLUJO COMPLETADO ===`);
    console.log(`   Total: ${metrics.total}ms`);
    console.log(`   - ElevenLabs: ${metrics.elevenLabs}ms`);
    console.log(`   - HeyGen: ${metrics.heyGen}ms\n`);

    res.json({
      success: true,
      metrics: metrics,
      audioSize: `${(elevenResponse.data.length / 1024).toFixed(2)} KB`,
      message: 'Audio generado y texto enviado a HeyGen',
      warningLatency: metrics.total > 700 ? 'Latencia superior a objetivo (700ms)' : null
    });
  } catch (error) {
    console.error('❌ Error en flujo completo:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Error en flujo completo',
      details: error.response?.data || error.message
    });
  }
});

// ===== 6. CERRAR SESIÓN HEYGEN =====
app.post('/api/test/heygen/close', async (req, res) => {
  if (!heygenSessionData) {
    return res.status(400).json({ error: 'No hay sesión activa para cerrar' });
  }

  try {
    const sessionId = heygenSessionData.data.session_id;

    await axios.post(
      `https://api.heygen.com/v1/streaming.stop`,
      { session_id: sessionId },
      {
        headers: {
          'X-Api-Key': HEYGEN_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Sesión HeyGen cerrada');
    heygenSessionData = null;

    res.json({ success: true, message: 'Sesión cerrada' });
  } catch (error) {
    console.error('❌ Error cerrando sesión:', error.message);
    res.status(500).json({
      error: 'Error cerrando sesión',
      details: error.message
    });
  }
});

// ===== WEBSOCKET PARA STREAMING EN TIEMPO REAL =====
const server = app.listen(PORT, () => {
  console.log('\n🚀 ========================================');
  console.log(`   Servidor corriendo en http://localhost:${PORT}`);
  console.log('   ========================================\n');

  const missingKeys = validateKeys();
  if (missingKeys.length > 0) {
    console.log('⚠️  CONFIGURACIÓN INCOMPLETA:');
    missingKeys.forEach((key) => console.log(`   ❌ ${key} no configurada`));
    console.log('\n   Edita server/.env con tus API keys\n');
  } else {
    console.log('✅ Configuración completa\n');
  }

  console.log('📋 Endpoints disponibles:');
  console.log('   GET  /health');
  console.log('   POST /api/test/elevenlabs');
  console.log('   POST /api/test/heygen/session');
  console.log('   POST /api/test/heygen/start');
  console.log('   POST /api/test/heygen/speak');
  console.log('   POST /api/test/heygen/close');
  console.log('   POST /api/test/full-flow');
  console.log('\n');
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('🔌 Cliente WebSocket conectado');

  ws.on('message', async (message) => {
    try {
      // Intentar parsear como JSON
      let data;
      try {
        data = JSON.parse(message);
      } catch {
        // Si no es JSON, asumir que es audio binario
        console.log('🎤 Audio chunk recibido:', message.length, 'bytes');
        ws.send(JSON.stringify({ status: 'audio_received', size: message.length }));
        return;
      }

      if (data.type === 'text') {
        console.log('💬 Texto recibido:', data.text);
        ws.send(JSON.stringify({ status: 'processing', text: data.text }));
      }
    } catch (error) {
      console.error('❌ Error procesando mensaje WS:', error.message);
      ws.send(JSON.stringify({ error: error.message }));
    }
  });

  ws.on('close', () => {
    console.log('❌ Cliente WebSocket desconectado');
  });

  ws.on('error', (error) => {
    console.error('❌ Error WebSocket:', error.message);
  });
});

// Manejo de errores global
process.on('unhandledRejection', (error) => {
  console.error('❌ Error no manejado:', error);
});

process.on('SIGTERM', () => {
  console.log('👋 Cerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor cerrado');
    process.exit(0);
  });
});