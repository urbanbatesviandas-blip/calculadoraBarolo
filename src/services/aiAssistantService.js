/**
 * 🏛️ PALACIO BAROLO - SERVICIO DE COPILOTO INTELIGENTE (GEMINI IA)
 * Conecta el frontend con el endpoint seguro /api/assistant y provee
 * fallback directo a la API de Google Gemini en entornos de desarrollo local.
 */

const STORAGE_KEY = 'barolo_gemini_api_key';

export const aiAssistantService = {
  getApiKey() {
    try {
      return localStorage.getItem(STORAGE_KEY) || import.meta.env.VITE_GEMINI_API_KEY || '';
    } catch (e) {
      return import.meta.env.VITE_GEMINI_API_KEY || '';
    }
  },

  setApiKey(key) {
    try {
      if (!key) {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY, key.trim());
      }
    } catch (e) {
      console.warn('LocalStorage not available', e);
    }
  },

  /**
   * Genera un resumen compacto y optimizado del estado actual del sistema
   * para alimentar la memoria de contexto de Gemini sin exceder cuotas de tokens.
   */
  buildContext(events = [], currentView = 'calendar', calculatorState = null) {
    const list = Array.isArray(events) ? events : [];
    
    const now = new Date();
    const currentMonthPrefix = now.toISOString().slice(0, 7); // "YYYY-MM"

    // Conteo por estado
    const statusCounts = {
      cotizado: 0,
      reservado: 0,
      contratado: 0,
      cancelado: 0
    };

    let totalGrossIncome = 0;
    let totalBaroloProfit = 0;
    let monthGrossIncome = 0;
    let monthBaroloProfit = 0;

    list.forEach(e => {
      const st = (e.status || 'cotizado').toLowerCase();
      if (statusCounts[st] !== undefined) statusCounts[st]++;

      const gross = Number(e.gross_income) || 0;
      const profit = Number(e.barolo_profit) || 0;

      totalGrossIncome += gross;
      totalBaroloProfit += profit;

      if (e.event_date && e.event_date.startsWith(currentMonthPrefix)) {
        monthGrossIncome += gross;
        monthBaroloProfit += profit;
      }
    });

    // Próximos 12 eventos agendados (ordenados cronológicamente)
    const upcoming = list
      .filter(e => e.event_date && e.status !== 'cancelado')
      .sort((a, b) => (a.event_date || '').localeCompare(b.event_date || ''))
      .slice(0, 12)
      .map(e => ({
        name: e.name,
        date: e.event_date,
        venue: e.venue || 'Salón 1923',
        attendees: e.attendees,
        status: e.status,
        profit: e.barolo_profit ? `$${Math.round(e.barolo_profit).toLocaleString('es-AR')}` : 'N/D'
      }));

    // Top 5 eventos con mayor ganancia para el Barolo
    const topProfitable = [...list]
      .filter(e => Number(e.barolo_profit) > 0)
      .sort((a, b) => Number(b.barolo_profit) - Number(a.barolo_profit))
      .slice(0, 5)
      .map(e => ({
        name: e.name,
        date: e.event_date,
        venue: e.venue,
        attendees: e.attendees,
        profit: `$${Math.round(Number(e.barolo_profit)).toLocaleString('es-AR')}`,
        margin: `${Number(e.margin_pct || 0).toFixed(1)}%`
      }));

    return {
      currentView,
      totalEventsCount: list.length,
      statusCounts,
      financialSummary: {
        totalGrossIncome: `$${Math.round(totalGrossIncome).toLocaleString('es-AR')}`,
        totalBaroloProfit: `$${Math.round(totalBaroloProfit).toLocaleString('es-AR')}`,
        currentMonthGross: `$${Math.round(monthGrossIncome).toLocaleString('es-AR')}`,
        currentMonthProfit: `$${Math.round(monthBaroloProfit).toLocaleString('es-AR')}`
      },
      upcomingEvents: upcoming,
      topProfitableEvents: topProfitable,
      calculatorDraft: calculatorState ? {
        name: calculatorState.name,
        date: calculatorState.date,
        venue: calculatorState.venue,
        attendees: calculatorState.attendees,
        ticketPrice: calculatorState.general_price
      } : null
    };
  },

  /**
   * Envía la conversación al asistente y retorna la respuesta procesada
   */
  async sendMessage(messages = [], context = {}) {
    const clientApiKey = this.getApiKey();

    // 1. Intentar primero a través de la Serverless Function de Vercel (/api/assistant)
    try {
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          context,
          clientApiKey
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success === false) {
          return {
            success: false,
            needsApiKey: !!data.needsApiKey || data.error === 'NO_API_KEY',
            text: data.message || 'Hubo un inconveniente al comunicarse con Gemini.'
          };
        }
        return {
          success: true,
          text: data.text,
          isQuote: !!data.isQuote,
          quoteData: data.quoteData || null
        };
      }

      // Si el servidor devolvió un error específico
      if (response.status !== 404) {
        const errData = await response.json().catch(() => ({}));
        if (errData.error === 'NO_API_KEY') {
          return {
            success: false,
            needsApiKey: true,
            text: '🔑 Para activar el Copiloto IA se requiere una clave de Google Gemini. Podés configurarla en Vercel como `GEMINI_API_KEY` o ingresarla haciendo clic en el icono de llave 🔑 arriba.'
          };
        }
        return {
          success: false,
          text: errData.message || `⚠️ Error del servidor (${response.status}): ${JSON.stringify(errData)}`
        };
      }
    } catch (netErr) {
      console.warn('/api/assistant no disponible, probando fallback directo...', netErr);
    }

    // 2. Fallback directo a la API de Google Gemini (para desarrollo local con Vite)
    const effectiveKey = clientApiKey || import.meta.env.VITE_GEMINI_API_KEY;

    if (!effectiveKey) {
      return {
        success: false,
        needsApiKey: true,
        text: '🔑 No se encontró la clave de API de Google Gemini. Por favor ingresá tu API Key haciendo clic en el icono de llave 🔑 en la esquina superior del chat.'
      };
    }

    try {
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

      // Endpoints candidatos en cascada para máxima resiliencia (Gemini 2.0 Flash prioritario)
      const candidates = [
        { version: 'v1beta', model: 'gemini-2.0-flash' },
        { version: 'v1beta', model: 'gemini-2.0-flash-lite' },
        { version: 'v1beta', model: 'gemini-1.5-flash-8b' },
        { version: 'v1beta', model: 'gemini-1.5-flash' },
        { version: 'v1beta', model: 'gemini-1.5-pro' }
      ];

      const payload = {
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: contents.length > 0 ? contents : [{ role: 'user', parts: [{ text: 'Hola' }] }],
        generationConfig: {
          temperature: 0.2,
          topP: 0.95,
          maxOutputTokens: 1500
        }
      };

      let res = null;
      let lastErrText = '';

      for (const item of candidates) {
        const geminiUrl = `https://generativelanguage.googleapis.com/${item.version}/models/${item.model}:generateContent?key=${effectiveKey}`;
        try {
          const fetchRes = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'x-goog-api-key': effectiveKey
            },
            body: JSON.stringify(payload)
          });

          if (fetchRes.ok) {
            res = fetchRes;
            break;
          } else {
            lastErrText = await fetchRes.text();
            if (fetchRes.status === 404) {
              console.warn(`[Gemini client] ${item.version}/${item.model} devolvió 404, probando siguiente candidato...`);
              continue;
            } else {
              res = fetchRes;
              break;
            }
          }
        } catch (e) {
          lastErrText = e.message;
        }
      }

      if (!res || !res.ok) {
        let diagInfo = '';
        try {
          const diagRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${effectiveKey}`);
          const diagData = await diagRes.json();
          if (diagData.models && diagData.models.length > 0) {
            const names = diagData.models.map(m => m.name.replace('models/', ''));
            diagInfo = `Modelos disponibles para tu clave: ${names.slice(0, 6).join(', ')}`;
          } else if (diagData.error) {
            diagInfo = `Diagnóstico de Google: ${diagData.error.message}`;
          }
        } catch (diagErr) {
          diagInfo = `Error de diagnóstico: ${diagErr.message}`;
        }

        return {
          success: false,
          text: `⚠️ Error de Google Gemini (${res ? res.status : 500}): ${lastErrText}${diagInfo ? `\n\n📌 ${diagInfo}` : ''}`
        };
      }

      const data = await res.json();
      const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

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
          console.warn('Fallback JSON parse error:', e);
        }
      }

      return {
        success: true,
        text: cleanText,
        isQuote,
        quoteData
      };
    } catch (err) {
      console.error('Gemini fallback fetch failed:', err);
      return {
        success: false,
        text: `⚠️ No se pudo conectar con el servicio de IA: ${err.message}`
      };
    }
  }
};
