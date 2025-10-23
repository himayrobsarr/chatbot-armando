// api.js - Módulo para comunicación con el backend

const API = {
    baseURL: 'http://localhost:3000',
    
    // Verificar estado del backend
    async checkHealth() {
        try {
            const response = await fetch(`${this.baseURL}/health`);
            return await response.json();
        } catch (error) {
            console.error('Error checking health:', error);
            throw error;
        }
    },

    // Crear sesión con HeyGen
    async createHeyGenSession() {
        try {
            const response = await fetch(`${this.baseURL}/api/test/heygen/session`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error creating HeyGen session:', error);
            throw error;
        }
    },

    // Enviar texto a ElevenLabs para generar audio
    async sendTextToElevenLabs(text) {
        try {
            const response = await fetch(`${this.baseURL}/api/test/elevenlabs`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            // Devolver el audio como blob
            return await response.blob();
        } catch (error) {
            console.error('Error sending text to ElevenLabs:', error);
            throw error;
        }
    },

    // Enviar texto a HeyGen para lip-sync
    async sendTextToHeyGen(text) {
        try {
            const response = await fetch(`${this.baseURL}/api/test/heygen/speak`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error sending text to HeyGen:', error);
            throw error;
        }
    },

    // Establecer conexión WebSocket para streaming en tiempo real
    createWebSocket() {
        const ws = new WebSocket('ws://localhost:3000');
        
        ws.onopen = () => {
            console.log('✅ WebSocket conectado');
        };
        
        ws.onerror = (error) => {
            console.error('❌ Error WebSocket:', error);
        };
        
        ws.onclose = () => {
            console.log('🔌 WebSocket desconectado');
        };
        
        return ws;
    }
};

// Hacer disponible globalmente
window.API = API;