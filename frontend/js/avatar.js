import { connect } from 'livekit-client';

async function showAvatar() {
  const url = "wss://heygen-feapbkvq.livekit.cloud"; // el que te dio la API
  const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."; // el access_token recibido

  // Elemento de video en tu HTML
  const videoEl = document.getElementById('avatarVideo');

  // Conectarse a LiveKit
  const room = await connect(url, token);

  room.on('trackSubscribed', (track, publication, participant) => {
    if (track.kind === 'video') {
      track.attach(videoEl);
    }
  });

  console.log('✅ Conectado a LiveKit, avatar listo para mostrarse');
}

showAvatar();
