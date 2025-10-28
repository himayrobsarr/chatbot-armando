// simple-avatar.js - Versión ajustada para API v1/streaming.create_session
class AvatarManager {
    constructor() {
        this.sessionInfo = null;
        this.room = null;
        this.ws = null;
        this.isConnected = false;
        this.reconnectTimeout = null;

        // Sistema de gestión de sesiones
        this.userId = this.generateUserId();
        this.heartbeatInterval = null;
        this.lastActivity = Date.now();
        this.sessionStartTime = null;

        // Configuración del backend
        this.BACKEND_URL = 'http://localhost:3000';

        // IDs por defecto
        this.avatarId = 'Wayne_20240711';
        this.voiceId = '1bd001e7e50f421d891986aad5158bc8';

        this.initializeElements();
        this.attachEventListeners();
        this.setupActivityTracking();
    }

    /** Genera un ID único para el usuario */
    generateUserId() {
        return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /** Configura el seguimiento de actividad del usuario */
    setupActivityTracking() {
        // Detectar actividad del usuario (mouse, teclado, touch)
        const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
        activityEvents.forEach(event => {
            document.addEventListener(event, () => this.updateActivity(), { passive: true });
        });

        // Detectar cambios de visibilidad de la página
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                console.log('👁️ Página oculta - usuario inactivo');
                this.handleVisibilityChange(false);
            } else {
                console.log('👁️ Página visible - usuario activo');
                this.updateActivity();
                this.handleVisibilityChange(true);
            }
        });

        // Detectar cuando el usuario abandona la página
        window.addEventListener('beforeunload', () => {
            this.reportUserStop();
        });
    }

    /** Actualiza la marca de tiempo de última actividad */
    updateActivity() {
        this.lastActivity = Date.now();
    }

    /** Maneja cambios de visibilidad */
    handleVisibilityChange(isVisible) {
        if (isVisible) {
            // Usuario regresó - enviar heartbeat inmediato
            this.sendHeartbeat();
        } else {
            // Usuario se fue - programar reporte de inactividad
            setTimeout(() => {
                if (document.hidden) {
                    this.reportUserStop();
                }
            }, 5 * 60 * 1000); // 5 minutos
        }
    }

    /** Reporta que el usuario se detuvo */
    async reportUserStop() {
        if (!this.sessionInfo?.session_id) return;

        console.log('🛑 Reportando parada de usuario');
        try {
            await fetch(`${this.BACKEND_URL}/api/heygen/user-stop`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: this.userId,
                    sessionId: this.sessionInfo.session_id
                })
            });
        } catch (error) {
            console.warn('⚠️ Error reportando parada de usuario:', error);
        }
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
        this.textInput.addEventListener('keypress', e => {
            if (e.key === 'Enter' && !this.speakBtn.disabled) this.speak();
        });
    }

    updateStatus(message, isError = false) {
        this.statusElement.textContent = `Estado: ${message}`;
        this.statusElement.className = isError
            ? 'text-center mt-2 text-sm text-red-600'
            : 'text-center mt-2 text-sm text-gray-600';
        console.log(`[Status] ${message}`);
    }

    /** Crear nueva sesión (versión persistente con token fresco) */
    async startSession(retryCount = 0) {
        const maxRetries = 3;
        try {
            this.updateStatus('Creando sesión con el avatar...');
            this.startBtn.disabled = true;

            const sessionResponse = await fetch(`${this.BACKEND_URL}/api/heygen/session`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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

            // Verificar que tenemos los datos necesarios (soporta ambas estructuras)
            const url = this.sessionInfo.url || this.sessionInfo.video?.url;
            const token = this.sessionInfo.access_token || this.sessionInfo.video?.token;

            if (!url || !token || !this.sessionInfo.session_id) {
                console.error('Datos de sesión incompletos:', this.sessionInfo);
                throw new Error('La respuesta del backend no contiene datos válidos de sesión');
            }

            // Normalizar la estructura para uso interno
            this.sessionInfo.url = url;
            this.sessionInfo.access_token = token;
            this.sessionInfo.video = { url, token };

            console.log('✅ Sesión creada:', {
                session_id: this.sessionInfo.session_id,
                url: this.sessionInfo.url.substring(0, 50) + '...',
                token: '[PRESENTE]',
                has_video_data: !!this.sessionInfo.video
            });

            // Registrar sesión en backend para seguimiento
            await this.registerSession();

            this.updateStatus('Esperando inicialización de HeyGen...');
            await new Promise(r => setTimeout(r, 800));

            this.updateStatus('Conectando con el avatar...');
            await this.connectToStream();

            // Iniciar heartbeats para mantener sesión activa
            this.startHeartbeats();

            // Programar renovación del token antes del vencimiento
            this.scheduleTokenRenewal(this.sessionInfo.video.token);

        } catch (error) {
            console.error('❌ Error al iniciar sesión:', error);
            if (retryCount < maxRetries) {
                const delay = Math.min(2000 * Math.pow(2, retryCount), 8000);
                console.log(`🔄 Reintentando creación de sesión (${retryCount + 1}/${maxRetries})...`);
                await new Promise(r => setTimeout(r, delay));
                return this.startSession(retryCount + 1);
            }
            this.updateStatus(`Error: ${error.message}`, true);
            this.startBtn.disabled = false;
        }
    }

    /** Conecta a LiveKit con reintentos controlados */
    async connectToStream(retryCount = 0) {
        const maxRetries = 3;
        try {
            // Usar datos normalizados
            const url = this.sessionInfo.url;
            const token = this.sessionInfo.access_token;

            if (!url || !token) {
                throw new Error('URL o token de LiveKit no disponibles');
            }

            console.log('🔍 Verificando conexión:', {
                has_url: !!url,
                has_token: !!token,
                url_preview: url.substring(0, 50) + '...'
            });

            const { Room, RoomEvent, VideoPresets } = window.LivekitClient;
            this.room = new Room({
                adaptiveStream: true,
                dynacast: true,
                videoCaptureDefaults: { resolution: VideoPresets.h720.resolution }
            });

            this.room.on(RoomEvent.ConnectionStateChanged, s => {
                console.log('🔄 Estado LiveKit:', s);
                // Actualizar estado de conexión basado en el estado de LiveKit
                if (s === 'connected') {
                    this.isConnected = true;
                    console.log('✅ LiveKit reporta conexión activa');
                } else if (s === 'disconnected') {
                    this.isConnected = false;
                    console.log('❌ LiveKit reporta desconexión');
                }
            });

            this.room.on(RoomEvent.TrackSubscribed, (track) => {
                console.log('📹 Track suscrito:', track.kind);
                if (track.kind === 'video') {
                    track.attach(this.videoElement);
                    this.updateStatus('✅ Avatar conectado y visible');
                    this.enableControls();
                    this.isConnected = true;
                    console.log('🎥 Video adjuntado al elemento DOM');
                    // Keep-alive eliminado - las sesiones se mantienen por actividad natural
                }
            });

            this.room.on(RoomEvent.Disconnected, () => {
                console.warn('🔌 Desconectado de LiveKit - Verificando si es error temporal...');

                // No detener inmediatamente, verificar si es reconexión automática de LiveKit
                setTimeout(async () => {
                    // Verificar si LiveKit se reconectó automáticamente
                    if (this.room && this.room.connectionState === 'connected' && this.isConnected) {
                        console.log('✅ LiveKit se reconectó automáticamente, manteniendo sesión');
                        return;
                    }

                    // Si no se reconectó, entonces proceder con nueva sesión
                    console.warn('🔌 Desconexión permanente, creando nueva sesión...');
                    this.isConnected = false;
                    this.updateStatus('Desconectado - Creando nueva sesión...');
                    this.disableControls();
                    setTimeout(() => this.startSession(), 1000);
                }, 3000); // Esperar 3 segundos para ver si se reconecta automáticamente
            });

            console.log('🔗 Conectando a LiveKit...');
            const connectPromise = this.room.connect(url, token);
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout de conexión')), 10000));
            await Promise.race([connectPromise, timeoutPromise]);

            console.log('✅ Conectado exitosamente a LiveKit');
            this.isConnected = true;

        } catch (error) {
            console.error('❌ Error conectando stream:', error);
            if (retryCount < maxRetries) {
                const delay = 1000 * Math.pow(2, retryCount);
                console.log(`🔄 Reintentando conexión (${retryCount + 1}/${maxRetries}) en ${delay}ms...`);
                await new Promise(r => setTimeout(r, delay));
                return this.connectToStream(retryCount + 1);
            }
            this.updateStatus('Error en conexión LiveKit', true);
        }
    }

    /** Registra la sesión en el backend para seguimiento */
    async registerSession() {
        if (!this.sessionInfo?.session_id) return;

        console.log('📝 Registrando sesión en backend...');
        try {
            const res = await fetch(`${this.BACKEND_URL}/api/heygen/register-session`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: this.userId,
                    sessionId: this.sessionInfo.session_id
                })
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            console.log('✅ Sesión registrada en backend');
            this.sessionStartTime = Date.now();
        } catch (error) {
            console.warn('⚠️ Error registrando sesión:', error);
        }
    }

    /** Inicia heartbeats para mantener sesión activa */
    startHeartbeats() {
        console.log('💓 Iniciando heartbeats cada 10 segundos');
        this.heartbeatInterval = setInterval(() => {
            this.sendHeartbeat();
        }, 10 * 1000); // Cada 10 segundos
    }

    /** Detiene heartbeats */
    stopHeartbeats() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    /** Envía heartbeat al backend */
    async sendHeartbeat() {
        if (!this.sessionInfo?.session_id || !this.isConnected) return;

        try {
            const res = await fetch(`${this.BACKEND_URL}/api/heygen/heartbeat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: this.userId,
                    sessionId: this.sessionInfo.session_id,
                    lastActivity: this.lastActivity
                })
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            // Heartbeat silencioso - no loggear cada vez
        } catch (error) {
            console.warn('⚠️ Error en heartbeat:', error);
        }
    }

    // Keep-alive methods eliminadas

    /** Programa renovación del token LiveKit antes del vencimiento */
    scheduleTokenRenewal(token) {
        try {
            // Solo intentar si es un JWT válido
            if (!token || !token.includes('.')) {
                console.log('ℹ️ Token no es JWT, omitiendo renovación automática');
                return;
            }

            const payload = JSON.parse(atob(token.split('.')[1]));
            const expMs = payload.exp * 1000 - Date.now();

            if (expMs > 0) {
                const renewAt = Math.max(expMs - 30000, 15000); // Renovar 30s antes o mínimo 15s
                console.log(`⏳ Token expira en ${(expMs / 1000).toFixed(1)}s — renovación en ${(renewAt / 1000).toFixed(1)}s`);
                setTimeout(() => {
                    if (this.isConnected) {
                        console.log('♻️ Renovando sesión antes de expiración...');
                        this.startSession();
                    }
                }, renewAt);
            } else {
                console.warn('⚠️ Token ya expiró, renovando inmediatamente...');
                setTimeout(() => this.startSession(), 1000);
            }
        } catch (err) {
            console.warn('No se pudo programar renovación de token:', err.message);
        }
    }

    async speak() {
        const text = this.textInput.value.trim();
        if (!text) return;
        if (!this.sessionInfo?.session_id) {
            this.updateStatus('Sesión no activa', true);
            return;
        }

        console.log('🎤 Usuario enviando texto al avatar:', text);

        try {
            const res = await fetch(`${this.BACKEND_URL}/api/heygen/speak`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: this.sessionInfo.session_id,
                    text,
                    source: 'user'
                })
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(`HTTP ${res.status}: ${errorData.error || 'Error enviando texto'}`);
            }

            console.log('✅ Texto enviado al avatar exitosamente');
            this.textInput.value = '';

            // Actualizar actividad por interacción del usuario
            this.updateActivity();

        } catch (err) {
            console.error('❌ Error enviando texto:', err);
            this.updateStatus(`Error al enviar texto: ${err.message}`, true);
        }
    }

    // Keep-alive methods eliminados

    /** Enviar texto al avatar desde el chatbot (usado por processWithChatbot) */
    async sendTextToAvatar(text) {
        if (!text || !text.trim()) {
            console.warn('⚠️ Texto vacío para enviar al avatar');
            return;
        }

        if (!this.sessionInfo?.session_id) {
            console.warn('⚠️ No hay sesión activa para enviar texto');
            this.updateStatus('Avatar no conectado', true);
            return;
        }

        console.log('🤖 Enviando texto del chatbot al avatar:', text);

        try {
            const res = await fetch(`${this.BACKEND_URL}/api/heygen/speak`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: this.sessionInfo.session_id,
                    text: text.trim(),
                    source: 'chatbot'
                })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || `Error HTTP ${res.status}`);
            }

            console.log('✅ Texto del chatbot enviado al avatar');
        } catch (err) {
            console.error('❌ Error enviando texto al avatar:', err);
            this.updateStatus(`Error al enviar texto: ${err.message}`, true);
        }
    }

    async stopSession() {
        try {
            this.updateStatus('Cerrando sesión...');
            if (this.ws) { this.ws.close(); this.ws = null; }
            if (this.room) { await this.room.disconnect(); this.room = null; }
            if (this.sessionInfo?.session_id) {
                await fetch(`${this.BACKEND_URL}/api/heygen/stop`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sessionId: this.sessionInfo.session_id })
                });
            }
            // Detener heartbeats y reportar cierre
            this.stopHeartbeats();
            await this.reportSessionEnd();
    
            this.sessionInfo = null;
            this.isConnected = false;
            this.disableControls();
            this.updateStatus('Sesión cerrada');
        } catch (err) {
            console.error('❌ Error al cerrar sesión:', err);
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

    /** Reporta el fin de la sesión al backend */
    async reportSessionEnd() {
        if (!this.sessionInfo?.session_id) return;

        console.log('📤 Reportando fin de sesión al backend');
        try {
            await fetch(`${this.BACKEND_URL}/api/heygen/end-session`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: this.userId,
                    sessionId: this.sessionInfo.session_id
                })
            });
        } catch (error) {
            console.warn('⚠️ Error reportando fin de sesión:', error);
        }
    }

    async attemptReconnect() {
        if (this.reconnectTimeout) return;
        this.reconnectTimeout = setTimeout(() => {
            if (!this.isConnected) {
                console.log('🔄 Reintentando nueva sesión...');
                this.startSession();
            }
            this.reconnectTimeout = null;
        }, 1000);
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Iniciando Avatar Manager...');
    if (typeof LivekitClient === 'undefined') {
        console.error('❌ LiveKit no cargado.');
        document.getElementById('status').textContent =
            'Error: LiveKit no se pudo cargar.';
        return;
    }
    console.log('✅ LiveKit cargado correctamente');
    window.avatarManager = new AvatarManager();
});
