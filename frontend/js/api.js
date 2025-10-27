// frontend/js/api.js
const BACKEND_URL = 'http://localhost:3000';

const API = {

    async checkHealth() {
        try {
            // Llama a la ruta definida en 'backend/routes/health.js'
            const response = await fetch(`${BACKEND_URL}/health`);
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Error de red: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error en API.checkHealth:', error);
            throw new Error('No se pudo conectar al backend.');
        }
    },

  
    async getHeyGenToken() {
        try {
            // Llama a la NUEVA ruta definida en 'backend/routes/heygen.js'
            const response = await fetch(`${BACKEND_URL}/api/heygen/token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || `Error del backend (${response.status})`);
            }

            const data = await response.json();
            if (!data.token) {
                throw new Error('El backend no devolvió un token.');
            }
            
            return data.token; // 'app.js' recibirá este token

        } catch (error) {
            console.error('Error en API.getHeyGenToken:', error);
            throw error; // Propaga el error para que app.js lo maneje
        }
    }


};