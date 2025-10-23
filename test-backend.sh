#!/bin/bash

# Script de testing automático para Avatar Live Backend
# Ejecuta todos los endpoints en secuencia

echo "🧪 ============================================"
echo "   TESTING AVATAR LIVE BACKEND"
echo "============================================"
echo ""

# Verificar dependencias
if ! command -v curl &> /dev/null; then
    echo "❌ Error: curl no está instalado"
    exit 1
fi

if ! command -v jq &> /dev/null; then
    echo "⚠️  Advertencia: jq no está instalado. Instálalo para mejor output JSON"
    echo "   En Ubuntu/Debian: sudo apt install jq"
    echo "   En macOS: brew install jq"
    echo "   En Windows: choco install jq"
    echo ""
    JQ_AVAILABLE=false
else
    JQ_AVAILABLE=true
fi

BASE_URL="http://localhost:3000"

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 0: Health Check
echo "📋 Test 0: Health Check"
echo "----------------------------------------"
response=$(curl -s "${BASE_URL}/health")

if [ "$JQ_AVAILABLE" = true ]; then
    echo "$response" | jq '.'
    if echo "$response" | jq -e '.status == "ok"' > /dev/null; then
        echo -e "${GREEN}✅ Health check OK${NC}\n"
    else
        echo -e "${RED}❌ Health check FAILED - Verifica tus API keys en .env${NC}\n"
        exit 1
    fi
else
    echo "$response"
    if echo "$response" | grep -q '"status":"ok"'; then
        echo -e "${GREEN}✅ Health check OK${NC}\n"
    else
        echo -e "${RED}❌ Health check FAILED - Verifica tus API keys en .env${NC}\n"
        exit 1
    fi
fi

sleep 1

# Test 1: ElevenLabs TTS
echo "🎙️  Test 1: ElevenLabs TTS"
echo "----------------------------------------"
curl -X POST "${BASE_URL}/api/test/elevenlabs" \
  -H "Content-Type: application/json" \
  -d '{"text": "Hola, esta es una prueba en español de Colombia"}' \
  --output test-audio.mp3 \
  -w "\nHTTP Status: %{http_code}\nLatencia: %{time_total}s\n" \
  -s

if [ -f test-audio.mp3 ]; then
    size=$(ls -lh test-audio.mp3 | awk '{print $5}')
    echo -e "${GREEN}✅ Audio generado: test-audio.mp3 ($size)${NC}"
    echo "   Reproduce el archivo para verificar calidad"
else
    echo -e "${RED}❌ No se generó el audio${NC}"
fi
echo ""

sleep 2

# Test 2: HeyGen - Crear Sesión
echo "🎬 Test 2: HeyGen - Crear Sesión"
echo "----------------------------------------"
session_response=$(curl -s -X POST "${BASE_URL}/api/test/heygen/session" \
  -H "Content-Type: application/json" \
  -d '{"avatarId": "default"}')

if [ "$JQ_AVAILABLE" = true ]; then
    echo "$session_response" | jq '.'
    if echo "$session_response" | jq -e '.success == true' > /dev/null; then
        echo -e "${GREEN}✅ Sesión HeyGen creada${NC}\n"
    else
        echo -e "${RED}❌ Error creando sesión HeyGen${NC}\n"
    fi
else
    echo "$session_response"
    if echo "$session_response" | grep -q '"success":true'; then
        echo -e "${GREEN}✅ Sesión HeyGen creada${NC}\n"
    else
        echo -e "${RED}❌ Error creando sesión HeyGen${NC}\n"
    fi
fi

sleep 2

# Test 3: HeyGen - Iniciar Streaming
echo "▶️  Test 3: HeyGen - Iniciar Streaming"
echo "----------------------------------------"
start_response=$(curl -s -X POST "${BASE_URL}/api/test/heygen/start" \
  -H "Content-Type: application/json")

echo "$start_response" | jq '.'

if echo "$start_response" | jq -e '.success == true' > /dev/null; then
    echo -e "${GREEN}✅ Streaming iniciado${NC}\n"
else
    echo -e "${YELLOW}⚠️  Revisa el error - puede ser normal si HeyGen no soporta este endpoint${NC}\n"
fi

sleep 2

# Test 4: HeyGen - Enviar Texto (Lip-Sync)
echo "💬 Test 4: HeyGen - Enviar Texto"
echo "----------------------------------------"
speak_response=$(curl -s -X POST "${BASE_URL}/api/test/heygen/speak" \
  -H "Content-Type: application/json" \
  -d '{"text": "Hola, soy tu avatar digital hablando en español"}')

echo "$speak_response" | jq '.'

if echo "$speak_response" | jq -e '.success == true' > /dev/null; then
    echo -e "${GREEN}✅ Texto enviado a HeyGen${NC}\n"
else
    echo -e "${RED}❌ Error enviando texto${NC}\n"
fi

sleep 2

# Test 5: Flujo Completo
echo "🔄 Test 5: Flujo Completo (ElevenLabs → HeyGen)"
echo "----------------------------------------"
flow_response=$(curl -s -X POST "${BASE_URL}/api/test/full-flow" \
  -H "Content-Type: application/json" \
  -d '{"text": "Esta es una prueba completa del sistema en tiempo real"}')

echo "$flow_response" | jq '.'

if echo "$flow_response" | jq -e '.success == true' > /dev/null; then
    total=$(echo "$flow_response" | jq -r '.metrics.total')
    eleven=$(echo "$flow_response" | jq -r '.metrics.elevenLabs')
    heygen=$(echo "$flow_response" | jq -r '.metrics.heyGen')
    
    echo -e "${GREEN}✅ Flujo completo exitoso${NC}"
    echo "   Latencias:"
    echo "   - ElevenLabs: ${eleven}ms"
    echo "   - HeyGen: ${heygen}ms"
    echo "   - Total: ${total}ms"
    
    if [ "$total" -lt 700 ]; then
        echo -e "${GREEN}   ✅ Latencia dentro del objetivo (<700ms)${NC}\n"
    else
        echo -e "${YELLOW}   ⚠️  Latencia superior al objetivo (>700ms)${NC}\n"
    fi
else
    echo -e "${RED}❌ Error en flujo completo${NC}\n"
fi

sleep 2

# Resumen Final
echo "============================================"
echo "   RESUMEN DE TESTS"
echo "============================================"
echo ""
echo "Archivos generados:"
ls -lh test-audio.mp3 2>/dev/null && echo "  ✅ test-audio.mp3" || echo "  ❌ test-audio.mp3"
echo ""
echo "Próximos pasos:"
echo "  1. Reproduce test-audio.mp3 para verificar calidad"
echo "  2. Si todos los tests pasaron, procede con frontend"
echo "  3. Si hay errores, revisa README.md sección Troubleshooting"
echo ""