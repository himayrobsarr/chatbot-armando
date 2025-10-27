// backend/services/HeyGenService.js
const axios = require('axios');

/**
 * Servicio para interactuar con HeyGen Streaming API (Interactive Avatar)
 */
class HeyGenService {
    constructor(apiKey, avatarId) {
        if (!apiKey || !avatarId) {
            throw new Error("HeyGenService: Se requieren apiKey y avatarId.");
        }

        this.apiKey = apiKey;
        this.avatarId = avatarId;
        this.baseUrl = 'https://api.heygen.com/v1';

        this.client = axios.create({
            baseURL: this.baseUrl,
            headers: {
                Authorization: `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        console.log(`✅ HeyGenService inicializado (Avatar: ${this.avatarId})`);
    }

    /**
     * Crea y arranca una nueva sesión de streaming con HeyGen (v2)
     */
    async createSession(options = {}) {
        console.log(`🎬 Creando sesión con avatar ${this.avatarId}...`);
        try {
            // 1️⃣ Crear sesión
            const response = await this.client.post('/streaming.new', {
                avatar_id: this.avatarId,
                version: 'v2',
                quality: options.quality || 'medium'
            });

            const data = response.data.data;
            console.log('📡 Respuesta streaming.new:', data);

            if (!data || !data.session_id || !data.url || !data.access_token) {
                throw new Error('La respuesta no contiene datos válidos de sesión.');
            }

            // 2️⃣ Iniciar stream
            console.log('🚀 Iniciando stream...');
            await this.client.post('/streaming.start', {
                session_id: data.session_id
            });

            console.log('✅ Stream iniciado correctamente');
            return data;

        } catch (error) {
            console.error('❌ Error en createSession:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Enviar texto para que el avatar lo diga en tiempo real
     */
    async sendText(sessionId, text) {
        console.log(`💬 Enviando texto a sesión ${sessionId}...`);
        try {
            const res = await this.client.post('/streaming.task', {
                session_id: sessionId,
                text: text,
                task_type: 'talk'
            });
            console.log('📤 Respuesta streaming.task:', res.data);
            return res.data;
        } catch (error) {
            console.error('❌ Error en sendText:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Finaliza la sesión de streaming
     */
    async stopStreaming(sessionId) {
        console.log(`🛑 Cerrando sesión ${sessionId}...`);
        try {
            const res = await this.client.post('/streaming.stop', { session_id: sessionId });
            console.log('✅ Sesión finalizada');
            return res.data;
        } catch (error) {
            console.error('❌ Error al cerrar sesión:', error.response?.data || error.message);
            throw error;
        }
    }
}

module.exports = HeyGenService;
