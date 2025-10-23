# 🤖 Chatbot Avatar con Lip-Sync

Un chatbot con avatar digital que utiliza ElevenLabs para text-to-speech y HeyGen para sincronización de labios en tiempo real.

## 🚀 Configuración Rápida

### 1. Instalar dependencias
```bash
npm install
```

### 2. Configurar variables de entorno
```bash
npm run setup
```
Esto creará un archivo `.env` con las variables necesarias. Edita el archivo `.env` con tus claves API reales:

```env
PORT=3000
NODE_ENV=development
ELEVEN_API_KEY=tu_clave_elevenlabs_aqui
ELEVEN_VOICE_ID=tu_voice_id_aqui
HEYGEN_API_KEY=tu_clave_heygen_aqui
```

**⚠️ IMPORTANTE:** 
- El archivo `.env` se crea automáticamente con `npm run setup`
- Si no existe, cópialo desde `.env.example` (si está disponible)
- Nunca subas el archivo `.env` a Git (está en `.gitignore`)

### 3. Obtener claves API

**ElevenLabs:**
- Ve a [elevenlabs.io](https://elevenlabs.io/)
- Crea una cuenta y obtén tu API key
- Selecciona un voice ID de tu biblioteca

**HeyGen:**
- Ve a [heygen.com](https://heygen.com/)
- Crea una cuenta y obtén tu API key

### 4. Iniciar el servidor
```bash
# Desarrollo (con auto-reload)
npm run dev

# Producción
npm run start:prod
```

## 📋 Scripts Disponibles

- `npm run dev` - Servidor de desarrollo con nodemon
- `npm run start` - Servidor de producción
- `npm run setup` - Crear archivo .env
- `npm run health` - Verificar estado del servidor
- `npm run install:clean` - Reinstalar dependencias limpias

## 🔧 Endpoints API

- `GET /health` - Estado del servidor y configuración
- `POST /api/test/elevenlabs` - Probar ElevenLabs TTS
- `POST /api/test/heygen/session` - Crear sesión HeyGen
- `POST /api/test/heygen/start` - Iniciar streaming
- `POST /api/test/heygen/speak` - Enviar texto para lip-sync
- `POST /api/test/full-flow` - Flujo completo TTS + lip-sync

## 🌐 Cliente Web

El cliente web está disponible en `http://localhost:3000` una vez iniciado el servidor.

## 🔧 Troubleshooting

### Problemas Comunes

**1. Error "missing_config" en /health**
- Verifica que el archivo `.env` existe y tiene las claves correctas
- Ejecuta `npm run setup` para crear el archivo `.env`

**2. Error 401 en ElevenLabs**
- Verifica que `ELEVEN_API_KEY` es correcta
- Asegúrate de que `ELEVEN_VOICE_ID` existe en tu cuenta

**3. Error 401 en HeyGen**
- Verifica que `HEYGEN_API_KEY` es correcta
- Asegúrate de que tu cuenta HeyGen está activa

**4. Script de testing falla**
- Instala `jq` para mejor output JSON: `sudo apt install jq` (Ubuntu/Debian)
- En Windows: `choco install jq`
- En macOS: `brew install jq`

**5. Puerto 3000 ocupado**
- Cambia el puerto en `.env`: `PORT=3001`
- O mata el proceso: `lsof -ti:3000 | xargs kill -9` (macOS/Linux)

### Testing Manual

```bash
# Verificar estado
curl http://localhost:3000/health

# Probar ElevenLabs
curl -X POST http://localhost:3000/api/test/elevenlabs \
  -H "Content-Type: application/json" \
  -d '{"text": "Hola mundo"}' \
  --output test.mp3

# Ejecutar tests completos
chmod +x test-backend.sh
./test-backend.sh
```

## ⚠️ Notas Importantes

- Asegúrate de tener Node.js 18+ instalado
- Las claves API son sensibles, nunca las subas a Git
- El archivo `.env` está en `.gitignore` por seguridad
- Para producción, configura HTTPS y actualiza las políticas CSP