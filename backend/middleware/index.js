const cors = require('cors');
const express = require('express');
const path = require('path');

/**
 * Configuración de middlewares para Express
 * @param {Express} app - Instancia de Express
 */
function setupMiddlewares(app) {
  // CORS
  app.use(cors());
  
  // Parseo de JSON
  app.use(express.json());
  
  // Parseo de audio (raw data)
  app.use(express.raw({ type: 'audio/*', limit: '10mb' }));
  
  // Servir archivos estáticos del cliente
  app.use(express.static(path.join(__dirname, '../../frontend')));
}

module.exports = {
  setupMiddlewares
};
