/**
 * 🏛️ PALACIO BAROLO - VERCEL SERVERLESS FUNCTION
 * Endpoint seguro para el Asistente Inteligente (Gemini).
 * Mantiene la clave API protegida en el backend sin exponerla al cliente.
 */

export default async function handler(req, res) {
  // Manejo de CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    const hasEnvKey = !!(process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY);
    return res.status(200).json({
      status: 'online',
      service: 'Palacio Barolo Copilot IA API',
      hasServerApiKey: hasEnvKey,
      message: 'El endpoint de IA del Palacio Barolo está activo. Para consultar al copiloto, la aplicación realiza peticiones vía POST.'
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido. Solo se acepta POST.' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) {}
    }
    const { messages = [], context = {}, clientApiKey } = body || {};

    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || clientApiKey;

    if (!apiKey) {
      return res.status(200).json({
        success: false,
        needsApiKey: true,
        error: 'NO_API_KEY',
        message: '🔑 Para activar el Copiloto IA se requiere una clave de Google Gemini. Podés configurarla en Vercel como `GEMINI_API_KEY` o ingresarla haciendo clic en el icono de llave 🔑 arriba.'
      });
    }

    // Construcción del System Prompt con contexto dinámico del Barolo
    const systemPrompt = `Sos el Copiloto Inteligente y Asistente Comercial del Palacio Barolo, el emblemático rascacielos histórico de Buenos Aires (Av. de Mayo 1370).
Tu rol es asistir a los ejecutivos de ventas y coordinadores en dos tareas esenciales:

1. 📋 **COTIZADOR INTELIGENTE (INTERPRETAR WHATSAPP / TEXTO)**:
Cuando el usuario pegue un mensaje de WhatsApp o describa una solicitud de evento informal:
- Extraé con precisión:
  * Nombre del evento o tipo (ej: "Cata de Vinos de Autor", "Concierto Íntimo", "Cumpleaños 50", "Conferencia Corporativa").
  * Fecha del evento en formato AAAA-MM-DD (si dicen "el 24 de noviembre", asumí año corriente 2026).
  * Salón / Espacio (Opciones válidas: "Salón 1923", "Espacio Barolo", "Salón Dorado", "Cúpula Barolo", "Mirador").
  * Asistentes / Cupo total esperado.
  * Entradas: Preventa (cantidad y precio) y General (cantidad y precio).
  * Alquiler de espacio (canon base del salón si aplica).
  * Costos mencionados: Si traen técnica propia (cost_tecnica: 0), catering, artistas, limpieza, etc.
- Respondé en lenguaje natural cálido, profesional y ejecutivo confirmando los detalles detectados.
- **MUY IMPORTANTE**: Si detectás una intención de cotizar o pegar un WhatsApp, agregá AL FINAL de tu respuesta un bloque de código JSON EXACTO con la siguiente estructura delimitada por \`\`\`json ... \`\`\`:
\`\`\`json
{
  "isQuote": true,
  "quoteData": {
    "name": "Nombre descriptivo del evento",
    "event_date": "YYYY-MM-DD",
    "event_time": "19:00",
    "venue": "Salón 1923",
    "event_type": "Cultural",
    "attendees": 80,
    "preventa_qty": 30,
    "preventa_price": 12000,
    "general_qty": 50,
    "general_price": 15000,
    "alquiler_espacio": 250000,
    "cost_tecnica": 0,
    "cost_limpieza": 45000,
    "notes": "Resumen de requisitos o notas del cliente"
  }
}
\`\`\`

2. 📊 **CONSULTOR ANALÍTICO Y DEL NEGOCIO**:
Si el usuario hace preguntas sobre el calendario, disponibilidad, qué fechas están libres, eventos cargados, rentabilidad o finanzas del Barolo:
- Utilizá el contexto provisto abajo para dar respuestas certeras con números reales.
- Sé conciso, claro y destacá insights comerciales (márgenes, costos, puntos de equilibrio).
- No inventes eventos que no estén en el contexto.

---
### 🏛️ CONTEXTO DEL PALACIO BAROLO:
- **Salones y Aforos**:
  * Salón 1923 (Piso 14, estilo belle époque, vistas panorámicas, aforo típico 80-120 personas).
  * Espacio Barolo (Planta baja y subsuelo histórico, capacidad hasta 150 personas).
  * Cúpula / Mirador (Piso 22, exclusivo para recepciones VIP íntimas, 20-35 personas).
- **Modelo de Ingresos**: Venta de tickets (Preventa + General), Canon locativo del salón, comisiones gastronómicas y servicios adicionales.
- **Acuerdos habituales**: 50% - 50% con productor, o Alquiler Fijo + Comisión.

---
### 📅 RESUMEN DE EVENTOS EN SISTEMA:
${JSON.stringify(context, null, 2)}
`;

    // Filtrar y formatear historial según las especificaciones de Google Gemini:
    // - Debe comenzar con el primer turno de 'user' (omitir bienvenida del asistente)
    // - No debe incluir mensajes de error
    // - Debe alternar estrictamente 'user' y 'model' (si son consecutivos, se concatenan)
    const validMessages = (messages || [])
      .filter(m => !m.isError && (m.text || m.content || '').trim().length > 0);

    const firstUserIndex = validMessages.findIndex(m => m.role === 'user');
    const conversationFromFirstUser = firstUserIndex >= 0 ? validMessages.slice(firstUserIndex) : [];

    const contents = [];
    for (const msg of conversationFromFirstUser) {
      const role = (msg.role === 'assistant' || msg.role === 'model') ? 'model' : 'user';
      if (contents.length > 0 && contents[contents.length - 1].role === role) {
        contents[contents.length - 1].parts[0].text += `\n\n${msg.text || msg.content}`;
      } else {
        contents.push({
          role,
          parts: [{ text: msg.text || msg.content }]
        });
      }
    }

    // Crear versión estándar (con system_instruction) y versión universal (con prompt en user turn)
    const standardPayload = {
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: contents.length > 0 ? contents : [{ role: 'user', parts: [{ text: 'Hola' }] }],
      generationConfig: { temperature: 0.2, topP: 0.95, maxOutputTokens: 1500 }
    };

    // Versión universal compatible con cualquier modelo (Gemma, Gemini 2.5, etc.)
    const firstUserText = contents[0]?.parts?.[0]?.text || 'Hola';
    const universalContents = [
      {
        role: 'user',
        parts: [{ text: `[INSTRUCCIONES DEL SISTEMA DEL PALACIO BAROLO]\n${systemPrompt}\n[FIN DE INSTRUCCIONES]\n\n${firstUserText}` }]
      },
      ...contents.slice(1)
    ];
    const universalPayload = {
      contents: universalContents,
      generationConfig: { temperature: 0.2, topP: 0.95, maxOutputTokens: 1500 }
    };

    // 1. Descubrir modelos activos directamente desde la API de Google
    let discoveredModels = [];
    try {
      const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      if (listRes.ok) {
        const listData = await listRes.json();
        discoveredModels = (listData.models || []).map(m => ({
          name: m.name.replace('models/', ''),
          methods: m.supportedGenerationMethods || []
        }));
      }
    } catch (e) {}

    // Ordenar modelos a probar: primero los que tienen 'generateContent', priorizando 'flash' luego 'pro'
    let modelsToTry = [];
    if (discoveredModels.length > 0) {
      const supporting = discoveredModels
        .filter(m => m.methods.includes('generateContent'))
        .map(m => m.name);
      
      const allNames = discoveredModels.map(m => m.name);
      const baseList = supporting.length > 0 ? supporting : allNames;

      // Ordenar: flash primero, luego pro, luego otros
      modelsToTry = [
        ...baseList.filter(m => m.includes('flash')),
        ...baseList.filter(m => m.includes('pro') && !m.includes('flash')),
        ...baseList.filter(m => !m.includes('flash') && !m.includes('pro'))
      ];
    }

    // Si no se descubrieron modelos, usar lista por defecto
    if (modelsToTry.length === 0) {
      modelsToTry = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-1.5-flash'];
    }

    let response = null;
    const attemptLogs = [];

    // 2. Probar cada modelo con payloads y versiones de API
    for (const model of modelsToTry) {
      const variations = [
        { version: 'v1beta', payload: standardPayload, label: 'std' },
        { version: 'v1beta', payload: universalPayload, label: 'universal' },
        { version: 'v1alpha', payload: universalPayload, label: 'v1alpha' }
      ];

      for (const variant of variations) {
        const url = `https://generativelanguage.googleapis.com/${variant.version}/models/${model}:generateContent?key=${apiKey}`;
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(variant.payload)
          });

          if (res.ok) {
            response = res;
            break;
          } else {
            const errText = await res.text();
            let parsedMsg = errText;
            try {
              const j = JSON.parse(errText);
              if (j?.error?.message) parsedMsg = j.error.message;
            } catch (e) {}
            attemptLogs.push(`${model} [${variant.version}/${variant.label}]: HTTP ${res.status} (${parsedMsg})`);
            
            // Si el error es 403 o 429, no seguir probando variaciones de este modelo
            if (res.status !== 404 && res.status !== 400) {
              break;
            }
          }
        } catch (err) {
          attemptLogs.push(`${model} [${variant.version}]: Error de red (${err.message})`);
        }
      }

      if (response && response.ok) {
        break;
      }
    }

    if (!response || !response.ok) {
      console.error('Gemini API Error:', attemptLogs);
      const availableList = discoveredModels.map(m => m.name).slice(0, 6).join(', ');

      return res.status(200).json({
        success: false,
        error: 'GEMINI_ERROR',
        message: `⚠️ No se pudo conectar con ningún modelo de Gemini:\n\n${attemptLogs.slice(0, 5).join('\n')}${availableList ? `\n\n📌 Modelos en tu clave: ${availableList}` : ''}`
      });
    }

    const data = await response.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Extraer bloque JSON de cotización si existe
    let quoteData = null;
    let isQuote = false;
    let cleanText = candidateText;

    const jsonMatch = candidateText.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        if (parsed && parsed.isQuote && parsed.quoteData) {
          isQuote = true;
          quoteData = parsed.quoteData;
          cleanText = candidateText.replace(/```json\s*[\s\S]*?\s*```/, '').trim();
        }
      } catch (e) {
        console.warn('Could not parse quote JSON from model output:', e);
      }
    }

    return res.status(200).json({
      text: cleanText,
      isQuote,
      quoteData,
      raw: candidateText
    });

  } catch (error) {
    console.error('Handler error:', error);
    return res.status(500).json({
      error: 'SERVER_ERROR',
      message: error.message || 'Error interno del servidor procesando la consulta.'
    });
  }
}
