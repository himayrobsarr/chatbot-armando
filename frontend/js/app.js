// app.js - Lógica principal de la aplicación

class AvatarApp {
    constructor() {
        this.heygenSession = null;
        this.isRecording = false;
        this.isInitialized = false;
        
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

    // Inicializar avatar
    async initializeAvatar() {
        this.log('🚀 Iniciando avatar...');
        this.updateStatus('Inicializando...', 'processing');
        this.elements.initBtn.disabled = true;

        try {
            // 1. Solicitar acceso al micrófono
            this.log('🎤 Solicitando acceso al micrófono...');
            await AudioManager.requestMicrophoneAccess();
            this.log('✅ Micrófono accesible', 'success');

            // 2. Crear sesión con HeyGen
            this.log('🎬 Creando sesión con HeyGen...');
            const startTime = Date.now();
            this.heygenSession = await API.createHeyGenSession();
            const latency = Date.now() - startTime;
            
            this.log(`✅ Sesión HeyGen creada: ${this.heygenSession.sessionId}`, 'success');
            this.log(`⏱️ Latencia: ${latency}ms`);
            this.updateLatency(latency);

            // 3. Ocultar overlay del video (cuando implementemos WebRTC)
            // this.elements.videoOverlay.classList.add('hidden');

            // 4. Actualizar UI
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
        
        // Iniciar reconocimiento de voz
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
        
        // Detener reconocimiento de voz
        SpeechManager.stop();
        this.log('🛑 Reconocimiento de voz detenido');
    }

    // Manejar resultado del reconocimiento de voz
    async handleSpeechResult(text) {
        if (!text || text.trim().length === 0) {
            this.log('⚠️ No se detectó texto', 'warning');
            this.resetRecordButton();
            return;
        }

        this.log(`📝 Texto detectado: "${text}"`, 'success');

        try {
            // 1. Enviar texto a ElevenLabs para generar audio
            this.log('🎙️ Enviando texto a ElevenLabs...');
            const startTime = Date.now();
            
            const responseAudio = await API.sendTextToElevenLabs(text);
            
            const latency = Date.now() - startTime;
            this.log(`✅ Audio generado en ${latency}ms`, 'success');
            this.updateLatency(latency);

            // 2. Reproducir audio
            this.log('🔊 Reproduciendo respuesta...');
            await AudioManager.playAudio(responseAudio);
            
            // 3. Enviar texto a HeyGen para lip-sync
            if (this.heygenSession) {
                this.log('🎬 Enviando texto a HeyGen para lip-sync...');
                await API.sendTextToHeyGen(text);
                this.log('✅ Lip-sync iniciado', 'success');
            }

            this.log('✅ Proceso completado', 'success');

        } catch (error) {
            this.log(`❌ Error: ${error.message}`, 'error');
        } finally {
            this.resetRecordButton();
        }
    }

    // Manejar errores del reconocimiento de voz
    handleSpeechError(error) {
        this.log(`❌ Error de reconocimiento: ${error}`, 'error');
        this.resetRecordButton();
    }

    // Detener sesión
    stopSession() {
        this.log('🛑 Cerrando sesión...');
        
        // Detener reconocimiento si está activo
        if (this.isRecording) {
            SpeechManager.stop();
        }
        
        AudioManager.cleanup();
        this.heygenSession = null;
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

    // Helpers
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