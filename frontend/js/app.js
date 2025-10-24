// app.js - Lógica principal de la aplicación

class AvatarApp {
    constructor() {
        this.sessionId = null;
        this.isRecording = false;
        this.isInitialized = false;
        this.peerConnection = null; 
        
        // Referencias DOM
        this.elements = {
            initBtn: document.getElementById('initBtn'),
            recordBtn: document.getElementById('recordBtn'),
            stopBtn: document.getElementById('stopBtn'),
            recordBtnText: document.getElementById('recordBtnText'),
            statusValue: document.getElementById('statusValue'),
            latencyValue: document.getElementById('latencyValue'),
            videoOverlay: document.getElementById('videoOverlay'),
            avatarVideo: document.getElementById('avatarVideo'),
            debugConsole: document.getElementById('debugConsole')
        };
        
        this.bindEvents();
        this.init();
    }

    // Vincular eventos
    bindEvents() {
        this.elements.initBtn.addEventListener('click', () => this.initializeAvatar());
        
        // Mantener presionado para grabar
        this.elements.recordBtn.addEventListener('mousedown', () => this.startRecording());
        this.elements.recordBtn.addEventListener('mouseup', () => this.stopRecording());
        this.elements.recordBtn.addEventListener('mouseleave', () => {
            if (this.isRecording) this.stopRecording();
        });
        
        // Touch events para móviles
        this.elements.recordBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.startRecording();
        });
        this.elements.recordBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.stopRecording();
        });
        
        this.elements.stopBtn.addEventListener('click', () => this.stopSession());
    }

    // Inicialización
    async init() {
        this.log('Sistema inicializado. Esperando interacción del usuario...');
        
        // Verificar soporte de Speech API
        if (!SpeechManager.isAvailable()) {
            this.log('❌ Tu navegador no soporta reconocimiento de voz. Usa Chrome, Edge o Safari.', 'error');
            return;
        }
        
        // Configurar eventos de Speech Manager
        SpeechManager.onResult = (text) => this.handleSpeechResult(text);
        SpeechManager.onError = (error) => this.handleSpeechError(error);
        SpeechManager.onStart = () => this.log('🎤 Escuchando...');
        SpeechManager.onEnd = () => this.log('✅ Escucha finalizada');
        
        // Verificar salud del backend
        try {
            const health = await API.checkHealth();
            if (health.status === 'ok') {
                this.log('✅ Backend conectado correctamente', 'success');
            } else {
                this.log('⚠️ Backend responde pero hay configuración incompleta', 'warning');
            }
        } catch (error) {
            this.log('❌ No se pudo conectar con el backend. Verifica que esté corriendo en localhost:3000', 'error');
        }
    }

    // Inicializar avatar (MODIFICADA)
    async initializeAvatar() {
        this.log('🚀 Iniciando avatar...');
        this.updateStatus('Inicializando...', 'processing');
        this.elements.initBtn.disabled = true;

        try {
            // 1. Solicitar acceso al micrófono
            this.log('🎤 Solicitando acceso al micrófono...');
            await AudioManager.requestMicrophoneAccess();
            this.log('✅ Micrófono accesible', 'success');

            // 2. Crear sesión Y OBTENER DATOS WebRTC (Paso único)
            this.log('🎬 Creando sesión con HeyGen (Paso único)...');
            const startTime = Date.now();
            
            // sessionData ahora contiene { sessionId: "...", webrtcData: { ... } }
            const sessionData = await API.createHeyGenSession();
            
            // ✅ CORRECTO - Buscar realtime_endpoint
if (!sessionData.sessionId || !sessionData.webrtcData || !sessionData.webrtcData.realtime_endpoint) {
    console.error("Respuesta de /session incompleta:", sessionData);
    throw new Error("El backend no devolvió sessionId y realtime_endpoint en /session.");
}

            // Guardamos el ID de sesión
            this.sessionId = sessionData.sessionId; 
            this.log(`✅ Sesión HeyGen creada: ${this.sessionId}`, 'success');
            
            // 3. Configurar WebRTC con los datos recibidos
            this.log('🔌 Configurando conexión WebRTC...');
            // Pasamos los datos de WebRTC (sdp, server_url, etc.)
            await this.setupWebRTC(sessionData.webrtcData); 
            this.log('✅ Conexión WebRTC establecida.', 'success');

            const latency = Date.now() - startTime;
            this.log(`✅ Sesión activada y lista en ${latency}ms`, 'success');
            this.updateLatency(latency);
            
            // 4. Ocultar overlay del video
            this.elements.videoOverlay.classList.add('hidden');

            // 5. Actualizar UI
            this.isInitialized = true;
            this.updateStatus('Listo', 'ready');
            this.elements.recordBtn.disabled = false;
            this.elements.stopBtn.disabled = false;
            this.elements.initBtn.style.display = 'none';
            this.elements.recordBtn.style.display = 'flex';
            
            this.log('✅ Sistema listo. Mantén presionado el botón rojo para hablar', 'success');

        } catch (error) {
            this.log(`❌ Error al inicializar: ${error.message}`, 'error');
            this.updateStatus('Error', 'idle');
            this.elements.initBtn.disabled = false;
        }
    }

    // Iniciar grabación
    startRecording() {
        if (!this.isInitialized || this.isRecording) return;

        this.isRecording = true;
        this.elements.recordBtn.classList.add('recording');
        this.elements.recordBtnText.textContent = '🔴 Escuchando...';
        this.updateStatus('Escuchando', 'recording');
        
        SpeechManager.start();
        this.log('🎤 Reconocimiento de voz iniciado');
    }

    // Detener grabación y procesar
    async stopRecording() {
        if (!this.isRecording) return;

        this.isRecording = false;
        this.elements.recordBtn.classList.remove('recording');
        this.elements.recordBtnText.textContent = 'Procesando...';
        this.updateStatus('Procesando', 'processing');
        
        SpeechManager.stop();
        this.log('🛑 Reconocimiento de voz detenido');
    }
    
    // Función de WebRTC (sin cambios desde la última vez)
// En app.js, REEMPLAZA la función setupWebRTC() por esta:

async setupWebRTC(webrtcData) {
    // Ya NO usamos sdp, usamos el realtime_endpoint
    if (!webrtcData.realtime_endpoint) {
        console.error("Falta realtime_endpoint:", webrtcData);
        throw new Error("HeyGen no devolvió realtime_endpoint");
    }

    this.log('🔌 Conectando via WebSocket a HeyGen...');
    
    // Crear conexión WebSocket
    this.ws = new WebSocket(webrtcData.realtime_endpoint);
    
    this.ws.onopen = () => {
        this.log('✅ WebSocket conectado al avatar', 'success');
    };
    
    this.ws.onmessage = (event) => {
        this.handleAvatarMessage(event);
    };
    
    this.ws.onerror = (error) => {
        this.log('❌ Error WebSocket: ' + error, 'error');
    };
    
    this.ws.onclose = () => {
        this.log('🔌 WebSocket cerrado');
    };

    // Esperar a que conecte
    return new Promise((resolve, reject) => {
        this.ws.onopen = () => {
            this.log('✅ WebSocket conectado', 'success');
            resolve();
        };
        this.ws.onerror = (error) => {
            reject(error);
        };
    });
}

// Agregar DESPUÉS de setupWebRTC() en app.js

handleAvatarMessage(event) {
    try {
        const data = JSON.parse(event.data);
        
        console.log('📩 Mensaje del avatar:', data);
        
        switch(data.type) {
            case 'avatar_start_talking':
                this.log('🗣️ Avatar hablando...', 'success');
                break;
                
            case 'avatar_stop_talking':
                this.log('🤐 Avatar terminó', 'success');
                break;
                
            case 'stream':
                // Video stream - actualizar video
                if (data.video_url) {
                    this.elements.avatarVideo.src = data.video_url;
                    this.elements.avatarVideo.play();
                }
                break;
                
                case 'error':
                    this.log('❌ Error avatar: ' + (data.error?.message || JSON.stringify(data.error)), 'error');
                    console.error('Error completo:', data);
                    break;
        }
    } catch (error) {
        console.error('Error procesando mensaje:', error);
    }
}

    // Manejar resultado del reconocimiento de voz (sin cambios)
// REEMPLAZA la parte de HeyGen en handleSpeechResult() por esto:

async handleSpeechResult(text) {
    if (!text || text.trim().length === 0) {
        this.log('⚠️ No se detectó texto', 'warning');
        this.resetRecordButton();
        return;
    }

    this.log(`📝 Texto detectado: "${text}"`, 'success');

    try {
        // 1. Generar audio con ElevenLabs (mantener igual)
        this.log('🎙️ Enviando texto a ElevenLabs...');
        const startTime = Date.now();
        const responseAudio = await API.sendTextToElevenLabs(text);
        const latency = Date.now() - startTime;
        this.log(`✅ Audio generado en ${latency}ms`, 'success');
        this.updateLatency(latency);
        
        // 2. Enviar a HeyGen VIA WEBSOCKET (NUEVO)
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.log('🎬 Enviando a avatar via WebSocket...');
            
            const message = {
                type: 'repeat',  // ✅ Cambiar de 'speak' a 'repeat'
                text: text
            };
            
            this.ws.send(JSON.stringify(message));
            this.log('✅ Lip-sync enviado', 'success');
        } else {
            this.log('⚠️ WebSocket no conectado', 'warning');
        }

        // 3. Reproducir audio (mantener igual)
        this.log('🔊 Reproduciendo respuesta...');
        await AudioManager.playAudio(responseAudio);
        this.log('✅ Proceso completado', 'success');

    } catch (error) {
        this.log(`❌ Error: ${error.message}`, 'error');
    } finally {
        this.resetRecordButton();
    }
}

    // Manejar errores del reconocimiento de voz (sin cambios)
    handleSpeechError(error) {
        this.log(`❌ Error de reconocimiento: ${error}`, 'error');
        this.resetRecordButton();
    }

    // Detener sesión (sin cambios)
// REEMPLAZA stopSession() por esto:

stopSession() {
    this.log('🛑 Cerrando sesión...');
    
    // Cerrar WebSocket en vez de RTCPeerConnection
    if (this.ws) {
        this.ws.close();
        this.ws = null;
        this.log('🔌 WebSocket cerrado');
    }
    
    if (this.isRecording) {
        SpeechManager.stop();
    }
    
    AudioManager.cleanup();
    
    this.sessionId = null;
    this.isInitialized = false;
    
    this.updateStatus('Desconectado', 'idle');
    this.elements.initBtn.disabled = false;
    this.elements.recordBtn.disabled = true;
    this.elements.stopBtn.disabled = true;
    this.elements.initBtn.style.display = 'flex';
    this.elements.recordBtn.style.display = 'none';
    this.updateLatency(0);
    
    this.log('✅ Sesión cerrada', 'success');
}

    // Helpers (sin cambios)
    resetRecordButton() {
        this.elements.recordBtnText.textContent = 'Mantén presionado para hablar';
        this.updateStatus('Listo', 'ready');
    }

    updateStatus(text, type) {
        const statusClasses = {
            idle: 'status-idle',
            ready: 'status-ready',
            recording: 'status-recording',
            processing: 'status-processing'
        };

        const dot = this.elements.statusValue.querySelector('.status-dot');
        if (dot) {
            dot.className = `status-dot ${statusClasses[type]}`;
        }

        const textNode = this.elements.statusValue.childNodes[2];
        if (textNode) {
            textNode.textContent = text;
        }
    }

    updateLatency(ms) {
        this.elements.latencyValue.textContent = ms > 0 ? `${ms} ms` : '--- ms';
    }

    log(message, type = 'info') {
        const p = document.createElement('p');
        p.className = `console-msg ${type}`;
        p.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        this.elements.debugConsole.appendChild(p);
        this.elements.debugConsole.scrollTop = this.elements.debugConsole.scrollHeight;
        
        console.log(message);
    }
}

// Inicializar aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.app = new AvatarApp();
});