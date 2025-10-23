const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Importar variables temporales desde utils
const { ELEVEN_API_KEY, ELEVEN_VOICE_ID, HEYGEN_API_KEY } = require('../utils');

// Configuración de APIs (usando variables temporales)
// const ELEVEN_API_KEY = process.env.ELEVEN_API_KEY;
// const ELEVEN_VOICE_ID = process.env.ELEVEN_VOICE_ID;
// const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY;

// Configuración del servidor
const PORT = process.env.PORT || 3000;

// Estado global para prototipo rápido
let heygenSessionData = null;

// Debug: Mostrar estado de las keys al iniciar
console.log('\n🔑 Estado de API Keys:');
console.log('ELEVEN_API_KEY:', ELEVEN_API_KEY ? `✅ Cargada (${ELEVEN_API_KEY.substring(0, 10)}...)` : '❌ NO cargada');
console.log('ELEVEN_VOICE_ID:', ELEVEN_VOICE_ID ? `✅ Cargada (${ELEVEN_VOICE_ID})` : '❌ NO cargada');
console.log('HEYGEN_API_KEY:', HEYGEN_API_KEY ? `✅ Cargada (${HEYGEN_API_KEY.substring(0, 20)}...)` : '❌ NO cargada');
console.log('');

module.exports = {
  PORT,
  ELEVEN_API_KEY,
  ELEVEN_VOICE_ID,
  HEYGEN_API_KEY,
  heygenSessionData: {
    get: () => heygenSessionData,
    set: (data) => { heygenSessionData = data; },
    clear: () => { heygenSessionData = null; }
  }
};
