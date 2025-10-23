// audio.js - Módulo para manejo de audio

const AudioManager = {
    mediaRecorder: null,
    audioChunks: [],
    stream: null,

    // Solicitar permiso y obtener acceso al micrófono
    async requestMicrophoneAccess() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100
                }
            });
            console.log('✅ Micrófono accesible');
            return true;
        } catch (error) {
            console.error('❌ Error al acceder al micrófono:', error);
            throw new Error('No se pudo acceder al micrófono. Verifica los permisos.');
        }
    },

    // Iniciar grabación
    startRecording() {
        if (!this.stream) {
            throw new Error('Primero debes solicitar acceso al micrófono');
        }

        this.audioChunks = [];
        this.mediaRecorder = new MediaRecorder(this.stream);

        this.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                this.audioChunks.push(event.data);
            }
        };

        this.mediaRecorder.start(100); // Capturar cada 100ms
        console.log('🎤 Grabación iniciada');
    },

    // Detener grabación
    stopRecording() {
        return new Promise((resolve) => {
            if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
                resolve(null);
                return;
            }

            this.mediaRecorder.onstop = () => {
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
                console.log('✅ Grabación detenida. Tamaño:', audioBlob.size, 'bytes');
                resolve(audioBlob);
            };

            this.mediaRecorder.stop();
        });
    },

    // Reproducir audio
    playAudio(audioBlob) {
        return new Promise((resolve, reject) => {
            const audioURL = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioURL);
            
            audio.onended = () => {
                URL.revokeObjectURL(audioURL);
                resolve();
            };
            
            audio.onerror = (error) => {
                reject(error);
            };
            
            audio.play();
        });
    },

    // Liberar recursos
    cleanup() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        this.mediaRecorder = null;
        this.audioChunks = [];
    }
};

// Hacer disponible globalmente
window.AudioManager = AudioManager;