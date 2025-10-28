// backend/services/HeyGenService.js
const axios = require('axios');

/**
 * Servicio para interactuar con HeyGen Streaming API (Interactive Avatar)
 */
class HeyGenService {
    constructor(apiKey, avatarId) {
        console.log('🔧 HeyGenService constructor llamado con:', {
            apiKey: apiKey ? `[${apiKey.length} chars]` : 'UNDEFINED',
            avatarId: avatarId || 'UNDEFINED'
        });

        if (!apiKey || !avatarId) {
            throw new Error(`HeyGenService: Se requieren apiKey y avatarId. Recibido: apiKey=${!!apiKey}, avatarId=${!!avatarId}`);
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
            const sessionData = {
                avatar_id: this.avatarId,
                version: 'v2',
                quality: options.quality || 'medium',
                voice: {
                    voice_id: options.voiceId || '1bd001e7e50f421d891986aad5158bc8',
                    rate: 1.0,
                    emotion: 'FRIENDLY'
                },
                disable_idle_timeout: true,
                activity_idle_timeout: 3600 // 60 minutos
            };

            const response = await this.client.post('/streaming.new', sessionData);
            const data = response.data.data;
            console.log("Esta es la informacion de /streaming.new", data);

            if (!data?.session_id || !data?.url || !data?.access_token) {
                throw new Error('La respuesta no contiene datos válidos de sesión.');
            }

            console.log('✅ Sesión creada correctamente:', data.session_id);
            await this.client.post('/streaming.start', { session_id: data.session_id });

            // 🔹 Normalizar respuesta para compatibilidad con frontend
            return {
                session_id: data.session_id,
                url: data.url,
                access_token: data.access_token,
                // Mantener estructura anidada para compatibilidad
                video: {
                    url: data.url,
                    token: data.access_token
                }
            };

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
     * Mantiene viva la sesión reiniciando el contador de timeout
     */
    async keepAlive(sessionId) {
        console.log(`💓 Manteniendo viva sesión ${sessionId}...`);
        try {
            const res = await this.client.post('/streaming.keep_alive', { session_id: sessionId });
            console.log('✅ Keep-alive enviado exitosamente');
            return res.data;
        } catch (error) {
            console.error('❌ Error en keep-alive:', error.response?.data || error.message);
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
