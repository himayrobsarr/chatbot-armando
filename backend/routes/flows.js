const express = require('express');
const ElevenLabsService = require('../services/ElevenLabsService');
const HeyGenService = require('../services/HeyGenService');
const config = require('../config');

const router = express.Router();

// Inicializar servicios
const elevenLabsService = new ElevenLabsService(config.ELEVEN_API_KEY, config.ELEVEN_VOICE_ID);
const heyGenService = new HeyGenService(config.HEYGEN_API_KEY);

/**
 * Flujo completo: ElevenLabs → HeyGen
 */
router.post('/full-flow', async (req, res) => {
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
    const elevenResult = await elevenLabsService.textToSpeech(text, {
      stability: 0.5,
      similarityBoost: 0.75
    });
    metrics.elevenLabs = elevenResult.latency;
    console.log(`   ✅ Audio generado: ${metrics.elevenLabs}ms`);

    // PASO 2: Enviar texto a HeyGen para lip-sync
    const sessionData = config.heygenSessionData.get();
    if (!sessionData) {
      console.log('   ⚠️  No hay sesión HeyGen activa');
      metrics.heyGen = 0;
      metrics.warning = 'No hay sesión HeyGen activa';
    } else {
      console.log('🎬 Paso 2: Enviando texto a HeyGen...');
      const sessionId = sessionData.data.session_id;
      const heyGenResult = await heyGenService.sendText(sessionId, text);
      metrics.heyGen = heyGenResult.latency;
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
      audioSize: `${(elevenResult.size / 1024).toFixed(2)} KB`,
      message: 'Audio generado y texto enviado a HeyGen',
      warningLatency: metrics.total > 700 ? 'Latencia superior a objetivo (700ms)' : null
    });
  } catch (error) {
    console.error('❌ Error en flujo completo:', error);
    res.status(500).json(error);
  }
});

/**
 * Prueba: ElevenLabs → HeyGen (TEXTO A VOZ)
 */
router.post('/elevenlabs-to-heygen', async (req, res) => {
  console.log('📌 Cargando endpoint /api/test/elevenlabs-to-heygen');

  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'Campo "text" requerido' });
  }

  if (!config.HEYGEN_API_KEY || !config.ELEVEN_API_KEY || !config.ELEVEN_VOICE_ID) {
    return res.status(400).json({ error: 'Faltan configuraciones de API en .env' });
  }

  try {
    console.log('\n🔄 Iniciando prueba ElevenLabs → HeyGen');
    const startTime = Date.now();

    // === Paso 1: Generar audio con ElevenLabs ===
    console.log('🎙️ Generando audio con ElevenLabs...');
    const elevenResult = await elevenLabsService.textToSpeech(text, {
      stability: 0.6,
      similarityBoost: 0.8
    });

    const audioBuffer = elevenResult.audioBuffer;
    const audioBase64 = Buffer.from(audioBuffer).toString('base64');
    const audioUrl = `data:audio/mpeg;base64,${audioBase64}`;

    console.log(`✅ Audio generado (${(audioBuffer.length / 1024).toFixed(1)} KB)`);

    // === Paso 2: Crear sesión HeyGen (si no existe) ===
    let sessionData = config.heygenSessionData.get();
    if (!sessionData) {
      console.log('🧩 Creando nueva sesión HeyGen...');
      const sessionResult = await heyGenService.createSession();
      sessionData = sessionResult.sessionData;
      config.heygenSessionData.set(sessionData);
    }

    const sessionId = sessionData.data.session_id;

    // === Paso 3: Enviar texto a HeyGen para lip-sync ===
    console.log('🎬 Enviando texto a HeyGen...');
    const heyGenResult = await heyGenService.sendText(sessionId, text);

    const total = Date.now() - startTime;
    console.log(`✅ Flujo completo exitoso (${total}ms)`);

    res.json({
      success: true,
      message: 'Audio generado y enviado a HeyGen correctamente',
      latency: `${total}ms`,
      audioSizeKB: (audioBuffer.length / 1024).toFixed(1),
      heygenResponse: heyGenResult.response
    });

  } catch (error) {
    console.error('❌ Error en prueba ElevenLabs → HeyGen:', error);
    res.status(500).json(error);
  }
});

module.exports = router;
