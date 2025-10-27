const express = require('express');
const cors = require('cors');
const { setupMiddlewares } = require('./middleware');
const { setupWebSocket } = require('./websocket');
const config = require('./config');
const { validateKeys } = require('./utils');

// Importar rutas
const healthRoutes = require('./routes/health');
const elevenLabsRoutes = require('./routes/elevenlabs');
const heygenRoutes = require('./routes/heygen');
const flowRoutes = require('./routes/flows');
const chatbotRoutes = require('./routes/chatbot');

const app = express();

// Configurar middlewares
// ...
// Habilitar CORS para múltiples orígenes
const allowedOrigins = [
  'http://127.0.0.1:8080', // Puerto antiguo
  'http://127.0.0.1:5500'  // Puerto nuevo
];

app.use(cors({
  origin: function (origin, callback) {
      // Permitir peticiones si el origen está en la lista blanca
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
          callback(null, true);
      } else {
          callback(new Error('Origen no permitido por CORS'));
      }
  }
}));
// ...
setupMiddlewares(app);

// Configurar rutas
app.use('/', healthRoutes);
app.use('/api/test', elevenLabsRoutes);
app.use('/api/heygen', heygenRoutes);
app.use('/api/test', flowRoutes);
app.use('/api', chatbotRoutes);


// Iniciar servidor
const server = app.listen(config.PORT, () => {
  console.log('\n🚀 ========================================');
  console.log(`   Servidor corriendo en http://localhost:${config.PORT}`);
  console.log('   ========================================\n');

  const missingKeys = validateKeys(config);
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

// Configurar WebSocket
setupWebSocket(server);

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

process.on('SIGINT', () => {
  console.log('\n👋 Cerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor cerrado');
    process.exit(0);
  });
});

module.exports = { app, server };