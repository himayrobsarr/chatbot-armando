// ================================================
// 🤖 AvatarApp - Modo Automático (HeyGen + LiveKit)
// ================================================
class AvatarApp {
    constructor() {
      console.log('🚀 Iniciando AvatarApp (modo automático)');
      this.session = null;
      this.room = null;
      this.isReady = false;
  
      // Config
      this.AVATAR_ID = 'Wayne_20240711';
      this.API_KEY = 'k9K6pjuIAtm';
  
      // Elementos del DOM
      this.video = document.getElementById('avatarVideo');
      this.overlay = document.getElementById('videoOverlay');
      this.input = document.getElementById('testTextInput');
      this.btnSpeak = document.getElementById('testSpeakBtn');
  
      // Eventos
      this.btnSpeak.addEventListener('click', () => this.speakText());
      this.input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.speakText();
      });
  
      // Iniciar automáticamente
      this.initAvatar();
    }
  
    // ============================
    // 1️⃣ Crear sesión automática
    // ============================
    async initAvatar() {
      try {
        this.showOverlay('Inicializando avatar...');
        console.log('🎬 Creando sesión en HeyGen...');
  
        const res = await fetch('https://api.heygen.com/v1/streaming.new', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            avatar_id: this.AVATAR_ID,
            version: 'v2',
            quality: 'low'
          })
        });
  
        const data = await res.json();
        if (!data?.data?.access_token) throw new Error('No se pudo crear la sesión');
  
        this.session = data.data;
        console.log('✅ Sesión creada:', this.session);
        await this.connectLiveKit(this.session.url, this.session.access_token);
      } catch (err) {
        console.error('❌ Error iniciando avatar:', err);
        this.showOverlay('Error al crear sesión');
      }
    }
  
    // ============================
    // 2️⃣ Conectar con LiveKit
    // ============================
    async connectLiveKit(url, token) {
      try {
        const { Room, RoomEvent } = LivekitClient;
        this.room = new Room({ adaptiveStream: true, dynacast: true });
  
        this.room.on(RoomEvent.TrackSubscribed, (track) => {
          if (track.kind === 'video') {
            const stream = track.attach();
            this.video.srcObject = stream;
            this.video.autoplay = true;
            this.video.playsInline = true;
            this.video.muted = false;
            this.video.play();
            this.showOverlay(false);
            this.isReady = true;
            console.log('✅ Avatar visible y listo');
            this.input.disabled = false;
            this.btnSpeak.disabled = false;
          }
          if (track.kind === 'audio') {
            const audioEl = track.attach();
            audioEl.autoplay = true;
            document.body.appendChild(audioEl);
            console.log('🔊 Audio conectado');
          }
        });
  
        this.room.on(RoomEvent.Connected, () => {
          console.log('✅ Conectado al servidor LiveKit');
        });
  
        this.room.on(RoomEvent.Disconnected, () => {
          console.warn('⚠️ Avatar desconectado');
          this.showOverlay('Avatar desconectado');
          this.isReady = false;
        });
  
        await this.room.connect(url, token);
        console.log('🔗 Conectando con token válido...');
      } catch (err) {
        console.error('❌ Error al conectar a LiveKit:', err);
        this.showOverlay('Error en la conexión');
      }
    }
  
    // ============================
    // 3️⃣ Enviar texto (hablar)
    // ============================
    async speakText() {
      if (!this.session?.session_id || !this.isReady) {
        console.warn('⏳ Avatar no está listo aún');
        return;
      }
  
      const text = this.input.value.trim();
      if (!text) return;
  
      try {
        console.log('💬 Enviando texto:', text);
        const res = await fetch('https://api.heygen.com/v1/streaming.task', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            session_id: this.session.session_id,
            task_type: 'talk',
            text
          })
        });
  
        const data = await res.json();
        console.log('🗣️ Respuesta HeyGen:', data);
        if (data.code === 100) {
          this.input.value = '';
          console.log('✅ Avatar hablando');
        } else {
          console.warn('⚠️ Error en respuesta:', data);
        }
      } catch (err) {
        console.error('❌ Error enviando texto:', err);
      }
    }
  
    // ============================
    // 4️⃣ UI helpers
    // ============================
    showOverlay(message = '') {
      if (message) {
        this.overlay.style.display = 'flex';
        this.overlay.querySelector('p').textContent = message;
      } else {
        this.overlay.style.display = 'none';
      }
    }
  }
  
  // ============================
  // 🧩 Inicializar automáticamente
  // ============================
  window.addEventListener('load', () => new AvatarApp());
  
  