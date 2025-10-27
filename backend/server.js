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

// ==========================
// 🧱 Configuración de CORS
// ==========================
const allowedOrigins = [
  'http://127.0.0.1:8080',
  'http://127.0.0.1:5500',
  'http://localhost:3000',
  'https://chatbot-armando.vercel.app',  // ← AGREGAR ESTO
  'http://127.0.0.1:5500/frontend/index.html'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Origen no permitido por CORS'));
    }
  }
}));

// ==========================
// ⚙️ Configuración general
// ==========================
setupMiddlewares(app);

// ==========================
// 🌐 Rutas principales
// ==========================
app.use('/', healthRoutes);
app.use('/api/test', elevenLabsRoutes);
app.use('/api/heygen', heygenRoutes);
app.use('/api/test', flowRoutes);
app.use('/api', chatbotRoutes);

// ==========================
// 🚀 Inicialización del servidor
// ==========================
let server = null;

// Si estamos en entorno local → iniciar servidor manualmente
if (process.env.NODE_ENV !== 'production') {
  server = app.listen(config.PORT, () => {
    console.log('\n🚀 ========================================');
    console.log(`   Servidor corriendo en http://localhost:${config.PORT}`);
    console.log('   ========================================\n');

    const missingKeys = validateKeys(config);
    if (missingKeys.length > 0) {
      console.log('⚠️  CONFIGURACIÓN INCOMPLETA:');
      missingKeys.forEach((key) => console.log(`   ❌ ${key} no configurada`));
      console.log('\n   Edita backend/.env con tus API keys\n');
    } else {
      console.log('✅ Configuración completa\n');
    }

    console.log('📋 Endpoints disponibles:');
    console.log('   GET  /health');
    console.log('   POST /api/test/elevenlabs');
    console.log('   POST /api/heygen/session');
    console.log('   POST /api/heygen/speak');
    console.log('   POST /api/heygen/stop');
    console.log('   POST /api/test/full-flow');
    console.log('   POST /api/chatbot');
    console.log('\n');
  });

  // Inicializar WebSocket solo en entorno local
  setupWebSocket(server);
}

// ==========================
// ⚠️ Manejo de errores global
// ==========================
process.on('unhandledRejection', (error) => {
  console.error('❌ Error no manejado:', error);
});

process.on('SIGTERM', () => {
  console.log('👋 Cerrando servidor...');
  if (server) {
    server.close(() => {
      console.log('✅ Servidor cerrado');
      process.exit(0);
    });
  }
});

process.on('SIGINT', () => {
  console.log('\n👋 Cerrando servidor...');
  if (server) {
    server.close(() => {
      console.log('✅ Servidor cerrado');
      process.exit(0);
    });
  }
});

// ==========================
// ✅ Exportar app para Vercel
// ==========================
module.exports = app;
