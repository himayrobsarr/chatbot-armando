/**
 * Utilidades y funciones helper
 */

// Variables de entorno (TEMPORAL - Solo para pruebas)
const ELEVEN_API_KEY = '679b4626ae90f5ba131773293827f69568861885ae5ce07fcbde05698a284169';
const ELEVEN_VOICE_ID = 'YExhVa4bZONzeingloMX';
const HEYGEN_API_KEY = 'k9K6pjuIAtm';

/**
 * Registra métricas de rendimiento
 * @param {string} endpoint - Nombre del endpoint
 * @param {number} duration - Duración en milisegundos
 * @param {object} details - Detalles adicionales
 */
function logMetrics(endpoint, duration, details = {}) {
  console.log(`📊 [${endpoint}] ${duration}ms`, details);
}

/**
 * Valida que todas las API keys estén configuradas
 * @param {object} config - Configuración con las API keys
 * @returns {string[]} Array de keys faltantes
 */
function validateKeys(config) {
  const missing = [];
  if (!config.ELEVEN_API_KEY) missing.push('ELEVEN_API_KEY');
  if (!config.ELEVEN_VOICE_ID) missing.push('ELEVEN_VOICE_ID');
  if (!config.HEYGEN_API_KEY) missing.push('HEYGEN_API_KEY');
  return missing;
}

/**
 * Maneja errores de API de forma consistente
 * @param {Error} error - Error capturado
 * @param {string} service - Nombre del servicio
 * @returns {object} Respuesta de error estandarizada
 */
function handleApiError(error, service) {
  console.error(`❌ Error ${service}:`, error.response?.data || error.message);
  return {
    error: `Error en ${service}`,
    details: error.response?.data || error.message,
    status: error.response?.status
  };
}

module.exports = {
  logMetrics,
  validateKeys,
  handleApiError,
  // Variables de entorno temporales
  ELEVEN_API_KEY,
  ELEVEN_VOICE_ID,
  HEYGEN_API_KEY
};
