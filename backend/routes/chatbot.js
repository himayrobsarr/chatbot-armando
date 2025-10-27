const n8nResponse = await axios.post(N8N_WEBHOOK_URL, {
    message: message.trim(),
    sessionId: req.headers['x-session-id'] || 'default-session', // AGREGAR ESTO
    timestamp: new Date().toISOString()
  }, {
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json'
    }
  });