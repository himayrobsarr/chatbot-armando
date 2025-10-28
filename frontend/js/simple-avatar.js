// simple-avatar.js - Implementación directa sin SDK complejo
class AvatarManager {
    constructor() {
        this.sessionInfo = null;
        this.room = null;
        this.ws = null;
        this.isConnected = false;
        
        // Configuración del backend
        this.BACKEND_URL = 'http://localhost:3000';
        
        // IDs por defecto (puedes cambiarlos)
        this.avatarId = 'Wayne_20240711'; // Avatar público de ejemplo
        this.voiceId = '1bd001e7e50f421d891986aad5158bc8'; // Voz de ejemplo
        
        this.initializeElements();
        this.attachEventListeners();
    }
    
    initializeElements() {
        this.videoElement = document.getElementById('avatarVideo');
        this.statusElement = document.getElementById('status');
        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.textInput = document.getElementById('textInput');
        this.speakBtn = document.getElementById('speakBtn');
    }
    
    attachEventListeners() {
        this.startBtn.addEventListener('click', () => this.startSession());
        this.stopBtn.addEventListener('click', () => this.stopSession());
        this.speakBtn.addEventListener('click', () => this.speak());
        
        // Enter key para hablar
        this.textInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !this.speakBtn.disabled) {
                this.speak();
            }
        });
    }
    
    updateStatus(message, isError = false) {
        this.statusElement.textContent = `Estado: ${message}`;
        this.statusElement.className = isError 
            ? 'text-center mt-2 text-sm text-red-600' 
            : 'text-center mt-2 text-sm text-gray-600';
        console.log(`[Status] ${message}`);
    }
    
    async startSession(retryCount = 0) {
        const maxRetries = 3;
        try {
            this.updateStatus('Creando sesión con el avatar...');
            this.startBtn.disabled = true;

            // Crear sesión usando el backend (que ahora incluye los ajustes de timeout)
            const sessionResponse = await fetch(`${this.BACKEND_URL}/api/heygen/session`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    quality: 'medium'
                })
            });

            if (!sessionResponse.ok) {
                const errorData = await sessionResponse.json();
                throw new Error(errorData.error || 'Error al crear la sesión');
            }

            const responseData = await sessionResponse.json();
            this.sessionInfo = responseData.data;
            console.log('✅ Sesión creada:', {
                session_id: this.sessionInfo.session_id,
                url: this.sessionInfo.url,
                access_token: this.sessionInfo.access_token ? '[PRESENTE]' : '[AUSENTE]',
                has_token: !!this.sessionInfo.access_token
            });

            this.updateStatus('Esperando inicialización de HeyGen...');

            // ⏳ Esperar 800ms para que HeyGen levante el canal LiveKit
            await new Promise(resolve => setTimeout(resolve, 800));

            this.updateStatus('Conectando con el avatar...');

            // Conectar con WebRTC/LiveKit
            await this.connectToStream();

        } catch (error) {
            console.error('❌ Error al iniciar sesión:', error);

            if (retryCount < maxRetries) {
                console.log(`🔄 Reintentando creación de sesión (${retryCount + 1}/${maxRetries})...`);
                this.updateStatus(`Reintentando... (${retryCount + 1}/${maxRetries})`);
                // Espera exponencial: 2s, 4s, 8s
                const delay = Math.min(2000 * Math.pow(2, retryCount), 8000);
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.startSession(retryCount + 1);
            }

            this.updateStatus(`Error: ${error.message}`, true);
            this.startBtn.disabled = false;
        }
    }
    
    async connectToStream(retryCount = 0) {
        const maxRetries = 3;
        try {
            // Verificar token antes de conectar
            if (!this.sessionInfo || !this.sessionInfo.access_token) {
                throw new Error('Token de acceso no disponible');
            }

            console.log('🔍 Verificando token:', {
                has_token: !!this.sessionInfo.access_token,
                token_length: this.sessionInfo.access_token.length,
                url: this.sessionInfo.url
            });

            // Verificar si tenemos LiveKit disponible
            if (!window.LivekitClient) {
                throw new Error('LiveKit no está cargado. Verifica el CDN.');
            }

            const { Room, RoomEvent, VideoPresets } = window.LivekitClient;

            // Crear room de LiveKit
            this.room = new Room({
                adaptiveStream: true,
                dynacast: true,
                videoCaptureDefaults: {
                    resolution: VideoPresets.h720.resolution
                }
            });

            // Configurar eventos del room con logging detallado
            this.room.on(RoomEvent.ConnectionStateChanged, (state) => {
                console.log('🔄 Estado de conexión LiveKit:', state);
            });

            this.room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
                console.log('📹 Track suscrito:', {
                    kind: track.kind,
                    participant_id: participant?.identity,
                    publication_id: publication?.trackSid
                });

                if (track.kind === 'video') {
                    track.attach(this.videoElement);
                    this.updateStatus('✅ Avatar conectado y visible');
                    this.enableControls();
                    console.log('🎥 Video del avatar adjuntado al elemento DOM');
                } else if (track.kind === 'audio') {
                    console.log('🔊 Track de audio recibido (será silenciado)');
                }
            });

            this.room.on(RoomEvent.TrackUnsubscribed, (track) => {
                console.log('📹 Track removido:', track.kind);
                if (track.kind === 'video') {
                    track.detach(this.videoElement);
                }
            });

            this.room.on(RoomEvent.Disconnected, () => {
                console.log('🔌 Desconectado del room LiveKit');
                this.updateStatus('Desconectado');
                this.disableControls();
                this.isConnected = false;
            });

            this.room.on(RoomEvent.Reconnecting, () => {
                console.log('🔄 Reconectando a LiveKit...');
                this.updateStatus('Reconectando...');
            });

            this.room.on(RoomEvent.Reconnected, () => {
                console.log('✅ Reconectado a LiveKit');
                this.updateStatus('Reconectado');
            });

            // Conectar al room con el token de LiveKit
            const { url, access_token } = this.sessionInfo;
            console.log('🔗 Conectando a LiveKit...', { url: url.substring(0, 50) + '...' });

            await this.room.connect(url, access_token);

            console.log('✅ Conectado exitosamente a LiveKit');
            this.isConnected = true;

            // Conectar WebSocket para comandos
            this.connectWebSocket();

        } catch (error) {
            console.error('❌ Error al conectar stream:', error);

            if (retryCount < maxRetries) {
                console.log(`🔄 Reintentando conexión (${retryCount + 1}/${maxRetries})...`);
                this.updateStatus(`Reintentando conexión... (${retryCount + 1}/${maxRetries})`);
                // Espera exponencial: 1s, 2s, 4s
                const delay = 1000 * Math.pow(2, retryCount);
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.connectToStream(retryCount + 1);
            }

            throw error;
        }
    }
    
    connectWebSocket() {
        // El WebSocket URL viene en sessionInfo
        const wsUrl = this.sessionInfo.ws_url || this.sessionInfo.data?.ws_url;

        if (!wsUrl) {
            console.warn('⚠️ No hay WebSocket URL disponible - usando solo LiveKit');
            return;
        }

        console.log('🔌 Conectando WebSocket:', wsUrl.substring(0, 50) + '...');
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
            console.log('✅ WebSocket conectado para comandos');
        };

        this.ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                console.log('📨 Mensaje WebSocket:', message);
            } catch (e) {
                console.log('📨 Mensaje WebSocket (raw):', event.data);
            }
        };

        this.ws.onerror = (error) => {
            console.error('❌ Error WebSocket:', error);
        };

        this.ws.onclose = (event) => {
            console.log('🔌 WebSocket cerrado:', { code: event.code, reason: event.reason });
        };
    }
    
    async speak() {
        const text = this.textInput.value.trim();
        if (!text) {
            console.warn('⚠️ No hay texto para enviar');
            return;
        }

        if (!this.sessionInfo?.session_id) {
            console.warn('⚠️ No hay sesión activa');
            this.updateStatus('Sesión no activa', true);
            return;
        }

        console.log('💬 Enviando texto al avatar:', {
            session_id: this.sessionInfo.session_id,
            text_length: text.length,
            is_connected: this.isConnected
        });

        try {
            // Enviar texto usando el backend
            const speakResponse = await fetch(`${this.BACKEND_URL}/api/heygen/speak`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sessionId: this.sessionInfo.session_id,
                    text: text,
                    source: 'user' // Input directo del usuario
                })
            });

            if (!speakResponse.ok) {
                const errorData = await speakResponse.json().catch(() => ({}));
                throw new Error(errorData.error || `Error HTTP ${speakResponse.status}`);
            }

            const responseData = await speakResponse.json();
            console.log('✅ Texto enviado exitosamente:', responseData);
            this.textInput.value = '';

        } catch (error) {
            console.error('❌ Error al enviar texto al avatar:', error);
            this.updateStatus(`Error al enviar texto: ${error.message}`, true);
        }
    }

    // Método público para enviar texto desde el chatbot
    async sendTextToAvatar(text) {
        if (!text || !text.trim()) {
            console.warn('⚠️ Texto vacío para enviar al avatar');
            return;
        }

        if (!this.sessionInfo?.session_id) {
            console.warn('⚠️ No hay sesión activa para enviar texto');
            return;
        }

        console.log('🤖 Enviando respuesta del chatbot al avatar:', text);

        try {
            const speakResponse = await fetch(`${this.BACKEND_URL}/api/heygen/speak`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sessionId: this.sessionInfo.session_id,
                    text: text.trim(),
                    source: 'chatbot'
                })
            });

            if (!speakResponse.ok) {
                const errorData = await speakResponse.json().catch(() => ({}));
                throw new Error(errorData.error || `Error HTTP ${speakResponse.status}`);
            }

            console.log('✅ Respuesta del chatbot enviada al avatar');

        } catch (error) {
            console.error('❌ Error enviando respuesta del chatbot al avatar:', error);
        }
    }
    
    async stopSession() {
        try {
            this.updateStatus('Cerrando sesión...');

            // Cerrar WebSocket
            if (this.ws) {
                this.ws.close();
                this.ws = null;
            }

            // Desconectar LiveKit
            if (this.room) {
                await this.room.disconnect();
                this.room = null;
            }

            // Enviar comando de cierre usando el backend
            if (this.sessionInfo?.session_id) {
                await fetch(`${this.BACKEND_URL}/api/heygen/stop`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        sessionId: this.sessionInfo.session_id
                    })
                });
            }

            this.sessionInfo = null;
            this.isConnected = false;
            this.updateStatus('Sesión cerrada');
            this.disableControls();

        } catch (error) {
            console.error('❌ Error al cerrar sesión:', error);
        }
    }
    
    enableControls() {
        this.stopBtn.disabled = false;
        this.speakBtn.disabled = false;
        this.startBtn.disabled = true;
    }
    
    disableControls() {
        this.stopBtn.disabled = true;
        this.speakBtn.disabled = true;
        this.startBtn.disabled = false;
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Iniciando Avatar Manager...');
    
    // Verificar si LiveKit está disponible
    if (typeof LivekitClient === 'undefined') {
        console.error('❌ LiveKit no está cargado. Verifica el CDN.');
        document.getElementById('status').textContent = 
            'Error: LiveKit no se pudo cargar. Revisa la consola.';
        return;
    }
    
    console.log('✅ LiveKit cargado correctamente');
    window.avatarManager = new AvatarManager();
});