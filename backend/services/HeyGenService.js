// backend/services/HeyGenService.js

const axios = require('axios');

/**
 * Servicio para interactuar con HeyGen API (CORREGIDO DE NUEVO)
 */
class HeyGenService {
    
    constructor(apiKey, avatarId) {
        if (!apiKey || !avatarId) {
            throw new Error("HeyGenService: Se requieren apiKey y avatarId en el constructor.");
        }
        
        this.apiKey = apiKey;
        this.avatarId = avatarId;
        
        // =================================================================
        // CORRECCIÓN FINAL: El baseUrl DEBE ser v1
        // =================================================================
        this.baseUrl = 'https://api.heygen.com/v1';

        this.client = axios.create({
            baseURL: this.baseUrl,
            headers: {
                'X-Api-Key': this.apiKey,
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ HeyGenService inicializado (URL v1).');
        console.log(`   > Usando Avatar ID: ${this.avatarId}`);
    }

    /**
     * Crea una nueva sesión de streaming (streaming.new)
     */
// En backend/services/HeyGenService.js
// REEMPLAZA createSession() por esto:

async createSession(options = {}) {
  const startTime = Date.now();
  console.log(`🔍 Creando sesión HeyGen con Avatar ID: ${this.avatarId}`);

  try {
      const response = await this.client.post(
          '/streaming.new',
          {
              avatar_id: this.avatarId,
              quality: options.quality || 'low',
              version: 'v2' // ✅ v2 usa WebSocket/LiveKit
          },
          { timeout: 30000 }
      );

      const latency = Date.now() - startTime;
      console.log(`📊 [HeyGen Session] ${latency}ms`);

      return {
          sessionData: response.data,
          latency
      };
  } catch (error) {
      console.error("❌ Error createSession:", error.response?.data || error.message);
      throw error;
  }
}

    /**
     * Envía texto para lip-sync (streaming.task)
     */
    async sendText(sessionId, text) {
        const startTime = Date.now();
        console.log(`💬 Enviando texto a sesión ${sessionId}...`);

        try {
            // =================================================================
            // CORRECCIÓN FINAL: Usar el endpoint 'streaming.task' (v1)
            // =================================================================
            const response = await this.client.post(
                '/streaming.task', // <-- Endpoint v1
                {
                    session_id: sessionId,
                    text: text,
                    task_type: 'repeat'
                }
            );

            const latency = Date.now() - startTime;
            console.log(`📊 [HeyGen Talk/Task] ${latency}ms`);
            
            return {
                response: response.data,
                latency
            };
        } catch (error) {
            console.error("❌ Error en HeyGenService.sendText:", error.response ? error.response.data : error.message);
            throw error;
        }
    }

    /**
     * Detiene el streaming de una sesión
     */
    async stopStreaming(sessionId) {
        console.log(`🛑 Cerrando sesión ${sessionId}...`);
        try {
            const response = await this.client.post(
                '/streaming.stop',
                { session_id: sessionId }
            );

            console.log('✅ Sesión HeyGen cerrada');
            return response.data;
        } catch (error) {
            console.error("❌ Error en HeyGenService.stopStreaming:", error.response ? error.response.data : error.message);
            throw error;
        }
    }
}

module.exports = HeyGenService;