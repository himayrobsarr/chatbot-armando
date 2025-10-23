const axios = require('axios');
const { logMetrics, handleApiError } = require('../utils');

/**
 * Servicio para interactuar con HeyGen API
 */
class HeyGenService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.heygen.com/v1';
  }

  /**
   * Crea una nueva sesión de streaming
   * @param {object} options - Opciones de calidad
   * @returns {Promise<object>} Datos de la sesión
   */
  async createSession(options = {}) {
    const startTime = Date.now();

    try {
      console.log('🔍 Creando sesión HeyGen...');

      const response = await axios.post(
        `${this.baseUrl}/streaming.new`,
        {
          quality: options.quality || 'low',
          version: options.version || 'v2'
        },
        {
          headers: {
            'X-Api-Key': this.apiKey,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      const latency = Date.now() - startTime;
      logMetrics('HeyGen Session', latency, {
        sessionId: response.data.data?.session_id
      });

      return {
        sessionData: response.data,
        latency
      };
    } catch (error) {
      throw handleApiError(error, 'HeyGen Session');
    }
  }

  /**
   * Inicia el streaming de una sesión
   * @param {string} sessionId - ID de la sesión
   * @returns {Promise<object>} Respuesta de inicio
   */
  async startStreaming(sessionId) {
    const startTime = Date.now();

    try {
      const response = await axios.post(
        `${this.baseUrl}/streaming.start`,
        { session_id: sessionId },
        {
          headers: {
            'X-Api-Key': this.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      const latency = Date.now() - startTime;
      logMetrics('HeyGen Start', latency);

      return {
        response: response.data,
        latency
      };
    } catch (error) {
      throw handleApiError(error, 'HeyGen Start');
    }
  }

  /**
   * Envía texto para lip-sync
   * @param {string} sessionId - ID de la sesión
   * @param {string} text - Texto a procesar
   * @param {string} taskType - Tipo de tarea
   * @returns {Promise<object>} Respuesta de la tarea
   */
  async sendText(sessionId, text, taskType = 'repeat') {
    const startTime = Date.now();

    try {
      const response = await axios.post(
        `${this.baseUrl}/streaming.task`,
        {
          session_id: sessionId,
          text: text,
          task_type: taskType
        },
        {
          headers: {
            'X-Api-Key': this.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      const latency = Date.now() - startTime;
      logMetrics('HeyGen Speak', latency, { textLength: text.length });

      return {
        response: response.data,
        latency
      };
    } catch (error) {
      throw handleApiError(error, 'HeyGen Speak');
    }
  }

  /**
   * Detiene el streaming de una sesión
   * @param {string} sessionId - ID de la sesión
   * @returns {Promise<object>} Respuesta de cierre
   */
  async stopStreaming(sessionId) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/streaming.stop`,
        { session_id: sessionId },
        {
          headers: {
            'X-Api-Key': this.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ Sesión HeyGen cerrada');
      return response.data;
    } catch (error) {
      throw handleApiError(error, 'HeyGen Stop');
    }
  }
}

module.exports = HeyGenService;
