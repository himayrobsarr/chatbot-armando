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
    
    async startSession() {
        try {
            this.updateStatus('Obteniendo token de acceso...');
            this.startBtn.disabled = true;
            
            // Paso 1: Obtener token de HeyGen
            const tokenResponse = await fetch(`${this.BACKEND_URL}/api/heygen/token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!tokenResponse.ok) {
                throw new Error('Error al obtener el token');
            }
            
            const { token } = await tokenResponse.json();
            console.log('✅ Token obtenido correctamente');
            
            this.updateStatus('Creando sesión con el avatar...');
            
            // Paso 2: Crear sesión de streaming con HeyGen
            const sessionResponse = await fetch('https://api.heygen.com/v1/streaming.new', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Api-Key': token
                },
                body: JSON.stringify({
                    quality: 'medium',
                    avatar_id: this.avatarId,
                    voice: {
                        voice_id: this.voiceId
                    }
                })
            });
            
            if (!sessionResponse.ok) {
                throw new Error('Error al crear la sesión');
            }
            
            this.sessionInfo = await sessionResponse.json();
            console.log('✅ Sesión creada:', this.sessionInfo);
            
            this.updateStatus('Conectando con el avatar...');
            
            // Paso 3: Conectar con WebRTC/LiveKit
            await this.connectToStream();
            
        } catch (error) {
            console.error('❌ Error al iniciar sesión:', error);
            this.updateStatus(`Error: ${error.message}`, true);
            this.startBtn.disabled = false;
        }
    }
    
    async connectToStream() {
        try {
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
            
            // Configurar eventos del room
            this.room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
                console.log('📹 Track suscrito:', track.kind);
                
                if (track.kind === 'video') {
                    track.attach(this.videoElement);
                    this.updateStatus('✅ Avatar conectado y visible');
                    this.enableControls();
                }
            });
            
            this.room.on(RoomEvent.TrackUnsubscribed, (track) => {
                if (track.kind === 'video') {
                    track.detach(this.videoElement);
                }
            });
            
            this.room.on(RoomEvent.Disconnected, () => {
                console.log('🔌 Desconectado del room');
                this.updateStatus('Desconectado');
                this.disableControls();
            });
            
            // Conectar al room con el token de LiveKit
            const { url, access_token } = this.sessionInfo.data;
            await this.room.connect(url, access_token);
            
            console.log('✅ Conectado a LiveKit');
            this.isConnected = true;
            
            // Conectar WebSocket para comandos
            this.connectWebSocket();
            
        } catch (error) {
            console.error('❌ Error al conectar stream:', error);
            throw error;
        }
    }
    
    connectWebSocket() {
        // El WebSocket URL viene en sessionInfo
        const wsUrl = this.sessionInfo.data.ws_url || this.sessionInfo.ws_url;
        
        if (!wsUrl) {
            console.warn('⚠️ No hay WebSocket URL disponible');
            return;
        }
        
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
            console.log('✅ WebSocket conectado');
        };
        
        this.ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            console.log('📨 Mensaje WebSocket:', message);
        };
        
        this.ws.onerror = (error) => {
            console.error('❌ Error WebSocket:', error);
        };
        
        this.ws.onclose = () => {
            console.log('🔌 WebSocket cerrado');
        };
    }
    
    async speak() {
        const text = this.textInput.value.trim();
        if (!text || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
            return;
        }
        
        try {
            // Enviar comando de hablar vía WebSocket
            const command = {
                type: 'speak',
                text: text,
                voice: {
                    voice_id: this.voiceId
                }
            };
            
            this.ws.send(JSON.stringify(command));
            console.log('📤 Comando enviado:', command);
            
            this.textInput.value = '';
            
        } catch (error) {
            console.error('❌ Error al enviar comando:', error);
            this.updateStatus('Error al enviar texto', true);
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
            
            // Enviar comando de cierre a HeyGen si tenemos session_id
            if (this.sessionInfo?.data?.session_id) {
                await fetch(`https://api.heygen.com/v1/streaming.stop`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        session_id: this.sessionInfo.data.session_id
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