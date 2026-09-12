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

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido. Solo se acepta POST.' });
  }

  try {
    const { messages = [], context = {}, clientApiKey } = req.body || {};

    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || clientApiKey;

    if (!apiKey) {
      return res.status(400).json({
        error: 'NO_API_KEY',
        message: 'No se encontró la clave de API de Gemini. Configurala en las variables de entorno de Vercel (GEMINI_API_KEY) o ingresala mediante el icono 🔑 del chat.'
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

    // Mapeo del historial al formato de Gemini
    const contents = [];
    for (const msg of messages) {
      contents.push({
        role: msg.role === 'assistant' || msg.role === 'model' ? 'model' : 'user',
        parts: [{ text: msg.text || msg.content }]
      });
    }

    const payload = {
      system_instruction: {
        parts: [{ text: systemPrompt }]
      },
      contents: contents.length > 0 ? contents : [{ role: 'user', parts: [{ text: 'Hola' }] }],
      generationConfig: {
        temperature: 0.2,
        topP: 0.95,
        maxOutputTokens: 1500
      }
    };

    // Endpoints candidatos en cascada para máxima resiliencia (Gemini 2.0 Flash prioritario)
    const candidates = [
      { version: 'v1beta', model: 'gemini-2.0-flash' },
      { version: 'v1beta', model: 'gemini-2.0-flash-lite' },
      { version: 'v1beta', model: 'gemini-1.5-flash-8b' },
      { version: 'v1beta', model: 'gemini-1.5-flash' },
      { version: 'v1', model: 'gemini-1.5-flash' },
      { version: 'v1beta', model: 'gemini-1.5-pro' }
    ];

    let response = null;
    let lastErrorBody = '';

    for (const item of candidates) {
      const geminiUrl = `https://generativelanguage.googleapis.com/${item.version}/models/${item.model}:generateContent?key=${apiKey}`;
      try {
        const res = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey
          },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          response = res;
          break;
        } else {
          lastErrorBody = await res.text();
          if (res.status === 404) {
            console.warn(`[Gemini] ${item.version}/${item.model} devolvió 404, probando siguiente candidato...`);
            continue;
          } else {
            response = res;
            break;
          }
        }
      } catch (err) {
        lastErrorBody = err.message;
      }
    }

    if (!response || !response.ok) {
      console.error('Gemini API Error:', lastErrorBody);
      let diagInfo = '';
      try {
        const diagRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
          headers: { 'x-goog-api-key': apiKey }
        });
        const diagData = await diagRes.json();
        if (diagData.models && diagData.models.length > 0) {
          const names = diagData.models.map(m => m.name.replace('models/', ''));
          diagInfo = `Modelos activos en tu clave: ${names.slice(0, 6).join(', ')}`;
        } else if (diagData.error) {
          diagInfo = `Diagnóstico de Google: ${diagData.error.message}`;
        }
      } catch (diagErr) {
        diagInfo = `Error de diagnóstico: ${diagErr.message}`;
      }

      return res.status(response ? response.status : 500).json({
        error: 'GEMINI_ERROR',
        message: `Error de Google Gemini (${response ? response.status : 500}): ${lastErrorBody}${diagInfo ? `\n\n📌 ${diagInfo}` : ''}`
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
