// backend/routes/health.js

const express = require('express');
const router = express.Router();
const config = require('../config'); // Importamos la config para chequear las claves

/**
 * Endpoint para verificar la salud del servidor
 */
router.get('/health', (req, res) => {
    
    // Verificamos que las claves estén cargadas desde config.js
    const keysLoaded = config.ELEVEN_API_KEY && 
                       config.HEYGEN_API_KEY && 
                       config.HEYGEN_AVATAR_ID &&
                       config.ELEVEN_VOICE_ID;
    
    if (!keysLoaded) {
        // Si faltan claves, el servidor funciona pero da una advertencia
        return res.json({
            status: 'warning',
            message: 'Servidor corriendo, pero faltan una o más API keys en config.js'
        });
    }
    
    // Si todo está bien
    res.json({
        status: 'ok',
        message: 'Servidor corriendo y todas las claves están cargadas.'
    });
});

// ¡LA LÍNEA MÁS IMPORTANTE! Esto lo convierte en un router válido.
module.exports = router;