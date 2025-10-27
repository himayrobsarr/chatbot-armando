// frontend/js/livekit-loader.js
// Cargar LiveKit dinámicamente desde CDN
(async function() {
  try {
    console.log('🔄 Cargando LiveKit desde CDN...');

    // Cargar el script UMD de LiveKit
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/livekit-client@2.15.13/dist/livekit-client.umd.js';
    script.onload = function() {
      console.log('✅ LiveKit UMD cargado exitosamente');

      // Verificar qué global está disponible
      if (typeof window.livekit !== 'undefined') {
        window.LivekitClient = window.livekit;
        console.log('✅ LiveKit disponible como window.livekit');
      } else if (typeof window.LiveKit !== 'undefined') {
        window.LivekitClient = window.LiveKit;
        console.log('✅ LiveKit disponible como window.LiveKit');
      } else {
        console.log('🔍 Buscando namespace de LiveKit...');
        // Buscar en window cualquier propiedad que contenga 'livekit'
        const lkKeys = Object.keys(window).filter(k =>
          k.toLowerCase().includes('livekit') ||
          k.toLowerCase().includes('lk')
        );
        console.log('🔍 Posibles namespaces:', lkKeys);

        if (lkKeys.length > 0) {
          window.LivekitClient = window[lkKeys[0]];
          console.log('✅ LiveKit encontrado en:', lkKeys[0]);
        } else {
          console.error('❌ No se pudo encontrar el namespace de LiveKit');
        }
      }
    };

    script.onerror = function() {
      console.error('❌ Error cargando LiveKit desde CDN');
    };

    document.head.appendChild(script);

  } catch (error) {
    console.error('❌ Error en livekit-loader.js:', error);
  }
})();