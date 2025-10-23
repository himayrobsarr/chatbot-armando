const WebSocket = require('ws');

/**
 * Configuración y manejo de WebSocket
 * @param {Server} server - Servidor HTTP de Express
 */
function setupWebSocket(server) {
  const wss = new WebSocket.Server({ server });

  wss.on('connection', (ws) => {
    console.log('🔌 Cliente WebSocket conectado');

    ws.on('message', async (message) => {
      try {
        let data;
        try {
          data = JSON.parse(message);
        } catch {
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

  return wss;
}

module.exports = {
  setupWebSocket
};
