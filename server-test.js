const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3000;

// KEYS HARDCODEADAS
const ELEVEN_API_KEY = '679b4626ae90f5ba131773293827f69568861885ae5ce07fcbde05698a284169';
const ELEVEN_VOICE_ID = 'YExhVa4bZONzeingloMX';
const HEYGEN_API_KEY = 'sk_V2_hgu_k9K6pjuIAtm_Ajt8FSwhdZXEv8qjyY7OFamirOF19nLe';

console.log('\n��� Keys cargadas:');
console.log('ELEVEN_API_KEY:', ELEVEN_API_KEY ? '✅ OK' : '❌ FALTA');
console.log('ELEVEN_VOICE_ID:', ELEVEN_VOICE_ID ? '✅ OK' : '❌ FALTA');
console.log('HEYGEN_API_KEY:', HEYGEN_API_KEY ? '✅ OK' : '❌ FALTA');
console.log('');

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    keys: {
      elevenLabs: !!ELEVEN_API_KEY,
      elevenVoice: !!ELEVEN_VOICE_ID,
      heyGen: !!HEYGEN_API_KEY
    }
  });
});

// Test ElevenLabs
app.post('/test/elevenlabs', async (req, res) => {
  try {
    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${ELEVEN_VOICE_ID}`,
      {
        text: 'Hola, esta es una prueba',
        model_id: 'eleven_multilingual_v2'
      },
      {
        headers: {
          'xi-api-key': ELEVEN_API_KEY,
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer'
      }
    );
    
    res.set('Content-Type', 'audio/mpeg');
    res.send(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test HeyGen
app.post('/test/heygen', async (req, res) => {
  try {
    const response = await axios.post(
      'https://api.heygen.com/v1/streaming.new',
      {
        quality: 'medium',
        version: 'v2'
      },
      {
        headers: {
          'X-Api-Key': HEYGEN_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );
    
    res.json({
      success: true,
      sessionId: response.data.data.session_id
    });
  } catch (error) {
    res.status(500).json({ 
      error: error.message,
      details: error.response?.data 
    });
  }
});

app.listen(PORT, () => {
  console.log(`��� Servidor test en http://localhost:${PORT}`);
  console.log('\nEndpoints:');
  console.log('  GET  /health');
  console.log('  POST /test/elevenlabs');
  console.log('  POST /test/heygen\n');
});
