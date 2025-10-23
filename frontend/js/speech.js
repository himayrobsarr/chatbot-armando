// speech.js - Módulo para Speech-to-Text usando Web Speech API

const SpeechManager = {
    recognition: null,
    isListening: false,
    onResult: null,
    onError: null,
    onStart: null,
    onEnd: null,

    // Inicializar el reconocimiento de voz
    init() {
        // Verificar si el navegador soporta Web Speech API
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            throw new Error('Tu navegador no soporta reconocimiento de voz. Usa Chrome, Edge o Safari.');
        }

        // Crear instancia del reconocimiento
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();

        // Configurar opciones
        this.recognition.continuous = false; // Detener después de una pausa
        this.recognition.interimResults = true; // Mostrar resultados parciales
        this.recognition.lang = 'es-ES'; // Español
        this.recognition.maxAlternatives = 1;

        // Eventos
        this.recognition.onstart = () => {
            this.isListening = true;
            console.log('🎤 Reconocimiento iniciado');
            if (this.onStart) this.onStart();
        };

        this.recognition.onresult = (event) => {
            let finalTranscript = '';
            let interimTranscript = '';

            // Procesar resultados
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }

            // Mostrar resultado final
            if (finalTranscript) {
                console.log('📝 Transcripción final:', finalTranscript);
                if (this.onResult) this.onResult(finalTranscript.trim());
            }
            
            // Mostrar resultado parcial (opcional)
            if (interimTranscript && this.onInterimResult) {
                this.onInterimResult(interimTranscript.trim());
            }
        };

        this.recognition.onerror = (event) => {
            console.error('❌ Error en reconocimiento:', event.error);
            this.isListening = false;
            if (this.onError) this.onError(event.error);
        };

        this.recognition.onend = () => {
            this.isListening = false;
            console.log('🛑 Reconocimiento finalizado');
            if (this.onEnd) this.onEnd();
        };
    },

    // Iniciar reconocimiento
    start() {
        if (!this.recognition) {
            this.init();
        }

        if (this.isListening) {
            console.log('⚠️ Ya está escuchando');
            return;
        }

        try {
            this.recognition.start();
        } catch (error) {
            console.error('❌ Error al iniciar reconocimiento:', error);
            if (this.onError) this.onError(error.message);
        }
    },

    // Detener reconocimiento
    stop() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
        }
    },

    // Abortar reconocimiento
    abort() {
        if (this.recognition && this.isListening) {
            this.recognition.abort();
        }
    },

    // Cambiar idioma
    setLanguage(lang) {
        if (this.recognition) {
            this.recognition.lang = lang;
        }
    },

    // Verificar si está disponible
    isAvailable() {
        return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    },

    // Obtener idiomas soportados
    getSupportedLanguages() {
        return [
            { code: 'es-ES', name: 'Español (España)' },
            { code: 'es-MX', name: 'Español (México)' },
            { code: 'es-AR', name: 'Español (Argentina)' },
            { code: 'en-US', name: 'English (US)' },
            { code: 'en-GB', name: 'English (UK)' }
        ];
    }
};

// Hacer disponible globalmente
window.SpeechManager = SpeechManager;
