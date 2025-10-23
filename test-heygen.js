require('dotenv').config({ path: './server/.env' });
const axios = require('axios');

async function testHeyGen() {
  console.log('🧪 Testeando HeyGen API...\n');
  
  const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY;
  
  console.log('📋 Configuración:');
  console.log('   Key presente:', !!HEYGEN_API_KEY);
  console.log('   Key length:', HEYGEN_API_KEY?.length);
  console.log('   Key primeros 10:', HEYGEN_API_KEY?.substring(0, 10));
  console.log('');

  try {
    console.log('🔄 Creando sesión HeyGen...');
    
    const response = await axios.post(
      'https://api.heygen.com/v1/streaming.new',
      {
        quality: 'low',
        version: 'v2'
      },
      {
        headers: {
          'X-Api-Key': HEYGEN_API_KEY,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    console.log('✅ ¡Éxito!');
    console.log('Session ID:', response.data.data.session_id);
    console.log('Status:', response.status);
    console.log('\nRespuesta completa:');
    console.log(JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error:');
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    console.error('Message:', error.message);
  }
}

testHeyGen();