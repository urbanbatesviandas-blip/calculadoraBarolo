/**
 * 🏛️ PALACIO BAROLO - VERCEL SERVERLESS FUNCTION
 * Endpoint seguro para el Copiloto Inteligente (Google Gemini).
 * Mantiene la clave API protegida en el backend sin exponerla al cliente.
 */

const SYSTEM_PROMPT_BASE = `Sos el Copiloto Inteligente y Asistente Comercial del Palacio Barolo, el emblemático rascacielos histórico de Buenos Aires (Av. de Mayo 1370).
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
- **Acuerdos habituales**: 50% - 50% con productor, o Alquiler Fijo + Comisión.`;

/**
 * Convierte el historial de mensajes de la app al formato esperado por Gemini
 */
function formatGeminiContents(messages = []) {
  const validMessages = (messages || [])
    .filter(m => !m.isError && (m.text || m.content || '').trim().length > 0);

  const firstUserIndex = validMessages.findIndex(m => m.role === 'user');
  const conversation = firstUserIndex >= 0 ? validMessages.slice(firstUserIndex) : [];

  const contents = [];
  for (const msg of conversation) {
    const role = (msg.role === 'assistant' || msg.role === 'model') ? 'model' : 'user';
    const text = msg.text || msg.content;
    if (contents.length > 0 && contents[contents.length - 1].role === role) {
      contents[contents.length - 1].parts[0].text += `\n\n${text}`;
    } else {
      contents.push({
        role,
        parts: [{ text }]
      });
    }
  }

  return contents.length > 0 ? contents : [{ role: 'user', parts: [{ text: 'Hola' }] }];
}

/**
 * Parsea y extrae el bloque JSON de cotización si está presente en la respuesta
 */
function extractQuoteData(rawText = '') {
  let isQuote = false;
  let quoteData = null;
  let cleanText = (rawText || '').trim();

  // 1. Buscar bloque markdown ```json ... ``` o ``` ... ```
  let jsonString = null;
  const mdMatch = cleanText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (mdMatch) {
    jsonString = mdMatch[1].trim();
    cleanText = cleanText.replace(/```(?:json)?\s*[\s\S]*?\s*```/i, '').trim();
  } else {
    // 2. Buscar bloque JSON bare que empiece con { y termine con }
    const bareMatch = cleanText.match(/(\{[\s\S]*"venue"[\s\S]*\})/i) || cleanText.match(/(\{[\s\S]*"isQuote"[\s\S]*\})/i);
    if (bareMatch) {
      jsonString = bareMatch[1].trim();
      cleanText = cleanText.replace(bareMatch[1], '').trim();
    }
  }

  if (jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      const data = parsed.quoteData || (parsed.venue || parsed.attendees ? parsed : null);
      if (data) {
        isQuote = true;
        quoteData = {
          name: data.name || 'Propuesta de Evento Barolo',
          event_date: data.event_date || '',
          event_time: data.event_time || '19:00',
          venue: data.venue || 'Salón 1923',
          event_type: data.event_type || 'Cultural',
          attendees: Number(data.attendees) || 80,
          preventa_qty: Number(data.preventa_qty) || Math.round((Number(data.attendees) || 80) * 0.4),
          preventa_price: Number(data.preventa_price) || 0,
          general_qty: Number(data.general_qty) || Math.round((Number(data.attendees) || 80) * 0.6),
          general_price: Number(data.general_price) || 0,
          alquiler_espacio: Number(data.alquiler_espacio) || 0,
          cost_tecnica: Number(data.cost_tecnica) || 0,
          cost_limpieza: Number(data.cost_limpieza) || 45000,
          notes: data.notes || ''
        };
      }
    } catch (e) {
      console.warn('Failed to parse quote JSON block:', e);
    }
  }

  // Si cleanText quedó vacío pero tenemos una cotización detectada, proveer texto natural elegante
  if (!cleanText && isQuote) {
    cleanText = '¡Excelente! He procesado los datos del mensaje y preparé la propuesta de cotización para este evento:';
  }

  return { isQuote, quoteData, cleanText };
}

/**
 * Consulta la API de Gemini para un modelo específico
 */
async function callGemini(model, apiKey, payload) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res;
}

export default async function handler(req, res) {
  // Manejo de CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
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
      message: 'El endpoint de IA del Palacio Barolo está activo.'
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
        message: '🔑 Para activar el Copiloto IA se requiere una clave de Google Gemini. Podés configurarla en Vercel como `GEMINI_API_KEY` o ingresarla en el icono de llave 🔑.'
      });
    }

    const systemPrompt = `${SYSTEM_PROMPT_BASE}\n\n---\n### 📅 RESUMEN DE EVENTOS EN SISTEMA:\n${JSON.stringify(context, null, 2)}`;
    const contents = formatGeminiContents(messages);

    const payload = {
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: {
        temperature: 0.2,
        topP: 0.95,
        maxOutputTokens: 1500
      }
    };

    // 1. Probar directamente los modelos modernos oficiales (Gemini 2.0 Flash / 1.5 Flash / 1.5 Pro)
    const primaryModels = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
    let geminiResponse = null;

    for (const model of primaryModels) {
      try {
        const response = await callGemini(model, apiKey, payload);
        if (response.ok) {
          geminiResponse = response;
          break;
        }
      } catch (err) {
        // Continuar al siguiente modelo
      }
    }

    // 2. Si fallaron los modelos primarios, descubrir dinámicamente qué modelos soporta la key
    if (!geminiResponse) {
      try {
        const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        if (listRes.ok) {
          const listData = await listRes.json();
          const supportingModels = (listData.models || [])
            .filter(m => (m.supportedGenerationMethods || []).includes('generateContent'))
            .map(m => m.name.replace('models/', ''));

          for (const fallbackModel of supportingModels) {
            if (primaryModels.includes(fallbackModel)) continue;
            try {
              const resFallback = await callGemini(fallbackModel, apiKey, payload);
              if (resFallback.ok) {
                geminiResponse = resFallback;
                break;
              }
            } catch (e) {}
          }
        }
      } catch (e) {}
    }

    if (!geminiResponse || !geminiResponse.ok) {
      return res.status(200).json({
        success: false,
        error: 'GEMINI_ERROR',
        message: '⚠️ No se pudo obtener respuesta del servicio de Google Gemini. Verificá la validez de tu API Key o la cuota disponible.'
      });
    }

    const data = await geminiResponse.json();
    const candidate = data.candidates?.[0];
    const rawCandidateText = candidate?.content?.parts?.[0]?.text || '';
    const { isQuote, quoteData, cleanText } = extractQuoteData(rawCandidateText);

    const finalText = cleanText || (isQuote ? '¡Excelente! He preparado la propuesta de cotización para este evento:' : (candidate?.finishReason === 'SAFETY' ? '⚠️ La consulta no pudo ser completada por los filtros de seguridad de IA.' : 'He recibido tu consulta pero no pude generar un resumen detallado. ¿Podrías reformularla?'));

    return res.status(200).json({
      success: true,
      text: finalText,
      isQuote,
      quoteData,
      raw: rawCandidateText
    });

  } catch (error) {
    return res.status(500).json({
      error: 'SERVER_ERROR',
      message: error.message || 'Error interno del servidor procesando la consulta.'
    });
  }
}
