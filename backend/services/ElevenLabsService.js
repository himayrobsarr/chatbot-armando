const axios = require('axios');
const { logMetrics, handleApiError } = require('../utils');

/**
 * Servicio para interactuar con ElevenLabs API
 */
class ElevenLabsService {
  constructor(apiKey, voiceId) {
    this.apiKey = apiKey;
    this.voiceId = voiceId;
    this.baseUrl = 'https://api.elevenlabs.io/v1';
  }

  /**
   * Genera audio a partir de texto usando ElevenLabs
   * @param {string} text - Texto a convertir a audio
   * @param {object} options - Opciones adicionales
   * @returns {Promise<Buffer>} Buffer de audio
   */
  async textToSpeech(text, options = {}) {
    const startTime = Date.now();

    try {
      const response = await axios.post(
        `${this.baseUrl}/text-to-speech/${this.voiceId}`,
        {
          text: text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: options.stability || 0.5,
            similarity_boost: options.similarityBoost || 0.75,
            style: options.style || 0.0,
            use_speaker_boost: options.useSpeakerBoost !== false
          }
        },
        {
          headers: {
            Accept: 'audio/mpeg',
            'xi-api-key': this.apiKey,
            'Content-Type': 'application/json'
          },
          responseType: 'arraybuffer'
        }
      );

      const latency = Date.now() - startTime;
      logMetrics('ElevenLabs TTS', latency, {
        textLength: text.length,
        audioSize: `${(response.data.length / 1024).toFixed(2)} KB`
      });

      return {
        audioBuffer: response.data,
        latency,
        size: response.data.length
      };
    } catch (error) {
      throw handleApiError(error, 'ElevenLabs TTS');
    }
  }
}

module.exports = ElevenLabsService;
