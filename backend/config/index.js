// backend/config/index.js

const path = require('path');
// No necesitamos dotenv porque estamos poniendo las claves a mano
// require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// =================================================================
// TUS CLAVES (HARDCODEADAS)
// =================================================================
// (Asegúrate de que tu clave de ElevenLabs esté completa si la anterior estaba cortada)
const ELEVEN_API_KEY = "679b4626ae90f5ba131773293827f69568861885ae5ce07fcbde05698a284169"; // <-- ¡PON TU CLAVE COMPLETA DE ELEVENLABS!
const ELEVEN_VOICE_ID = "YExhVa4bZONzeingloMX";

// ¡AQUÍ ESTÁ LA CLAVE NUEVA!
const HEYGEN_API_KEY = "sk_V2_hgu_kZEI9FtB1ee_ehoXWplHb3kjgrRsPY1LG2WA67sx5d2l"; 
const HEYGEN_AVATAR_ID = "Thaddeus_CasualLook_public";
const HEYGEN_ELEVEN_VOICE_ID = 'e70a2982263f45fdbb06a1da8fd68002'
// =================================================================

// Configuración del servidor
const PORT = process.env.PORT || 3000;

// Debug: Mostrar estado de las keys al iniciar
console.log('\n🔑 Estado de API Keys (Hardcodeadas):');
console.log('ELEVEN_API_KEY:', ELEVEN_API_KEY ? `✅ Cargada (${ELEVEN_API_KEY.substring(0, 10)}...)` : '❌ NO cargada');
console.log('ELEVEN_VOICE_ID:', ELEVEN_VOICE_ID ? `✅ Cargada (${ELEVEN_VOICE_ID})` : '❌ NO cargada');
console.log('HEYGEN_API_KEY:', HEYGEN_API_KEY ? `✅ Cargada (${HEYGEN_API_KEY.substring(0, 20)}...)` : '❌ NO cargada');
console.log('HEYGEN_AVATAR_ID:', HEYGEN_AVATAR_ID ? `✅ Cargada (${HEYGEN_AVATAR_ID.substring(0, 10)}...)` : '❌ NO cargada');
console.log('HEYGEN_ELEVEN_VOICE_ID:', HEYGEN_ELEVEN_VOICE_ID ? `✅ Cargada (${HEYGEN_ELEVEN_VOICE_ID.substring(0, 10)}...)` : '❌ NO cargada');
console.log('');

module.exports = {
  PORT,
  ELEVEN_API_KEY,
  ELEVEN_VOICE_ID,
  HEYGEN_API_KEY,
  HEYGEN_AVATAR_ID,
  HEYGEN_ELEVEN_VOICE_ID,
  
  heygenSessionData: {
    get: () => null,
    set: (data) => {},
    clear: () => {}
  }
};
