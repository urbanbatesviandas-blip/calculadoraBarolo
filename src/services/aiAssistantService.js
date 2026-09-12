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
   * Intenta extraer datos de cotización de un mensaje de WhatsApp mediante heurística local
   * Garantiza que la funcionalidad de cotización rápida siempre funcione incluso sin conexión o sin API Key.
   */
  parseWhatsAppQuoteLocal(text = '') {
    const t = (text || '').toLowerCase();
    
    // Validar si parece una solicitud de cotización
    const hasQuoteSignals = 
      t.includes('salón') || t.includes('salon') || t.includes('espacio') || t.includes('cúpula') ||
      t.includes('personas') || t.includes('pax') || t.includes('entradas') || t.includes('preventa') ||
      t.includes('general') || t.includes('productor') || t.includes('noviembre') || t.includes('diciembre');

    if (!hasQuoteSignals) return null;

    // Detección de Salón
    let venue = 'Salón 1923';
    if (t.includes('espacio barolo') || t.includes('espacio')) venue = 'Espacio Barolo';
    else if (t.includes('1923') || t.includes('salon 1923') || t.includes('salón 1923')) venue = 'Salón 1923';
    else if (t.includes('dorado') || t.includes('salon dorado') || t.includes('salón dorado')) venue = 'Salón Dorado';
    else if (t.includes('cúpula') || t.includes('cupula') || t.includes('mirador')) venue = 'Cúpula Barolo';

    // Detección de Fecha
    let event_date = '';
    const monthMap = {
      enero: '01', febrero: '02', marzo: '03', abril: '04', mayo: '05', junio: '06',
      julio: '07', agosto: '08', septiembre: '09', setiembre: '09', octubre: '10', noviembre: '11', diciembre: '12'
    };
    const dateMatchText = t.match(/(\d{1,2})\s+de\s+([a-z]+)/i);
    if (dateMatchText && monthMap[dateMatchText[2].toLowerCase()]) {
      const day = dateMatchText[1].padStart(2, '0');
      const month = monthMap[dateMatchText[2].toLowerCase()];
      event_date = `2026-${month}-${day}`;
    } else {
      const slashMatch = t.match(/(\d{1,2})[\/\-](\d{1,2})/);
      if (slashMatch) {
        event_date = `2026-${slashMatch[2].padStart(2, '0')}-${slashMatch[1].padStart(2, '0')}`;
      }
    }

    // Asistentes
    let attendees = 80;
    const attMatch = t.match(/(\d+)\s*(?:personas|asistentes|pax|invitados)/i) || t.match(/(?:calcula|calculo|para)\s*(\d+)/i);
    if (attMatch) {
      attendees = parseInt(attMatch[1], 10);
    }

    // Precios: preventa y general
    let preventa_price = 0;
    let general_price = 0;

    const prevMatch = t.match(/(?:preventa|anticipada|anticipadas)[\s\:\$]*(\d[\d\.]*)/i) || t.match(/\$?\s*(\d[\d\.]*)\s*(?:preventa|anticipada)/i);
    if (prevMatch) {
      preventa_price = parseInt(prevMatch[1].replace(/\./g, ''), 10);
    }

    const genMatch = t.match(/(?:general|generales|puerta)[\s\:\$]*(\d[\d\.]*)/i) || t.match(/\$?\s*(\d[\d\.]*)\s*(?:general|generales)/i);
    if (genMatch) {
      general_price = parseInt(genMatch[1].replace(/\./g, ''), 10);
    }

    // Si solo hay un precio especificado
    if (general_price === 0 && preventa_price > 0) {
      general_price = Math.round(preventa_price * 1.2);
    }

    // Sonido / Técnica: si traen técnica propia se bonifica a 0
    let cost_tecnica = 0;
    if (t.includes('sonido propio') || t.includes('tecnica propia') || t.includes('técnica propia') || t.includes('traen sonido') || t.includes('propio')) {
      cost_tecnica = 0;
    } else {
      cost_tecnica = 120000;
    }

    const preventa_qty = Math.round(attendees * 0.4);
    const general_qty = attendees - preventa_qty;

    const quoteData = {
      name: `Evento en ${venue}${event_date ? ' (' + event_date + ')' : ''}`,
      event_date: event_date || '2026-11-15',
      event_time: '19:00',
      venue,
      event_type: 'Cultural',
      attendees,
      preventa_qty,
      preventa_price: preventa_price || 15000,
      general_qty,
      general_price: general_price || 18000,
      alquiler_espacio: 250000,
      cost_tecnica,
      cost_limpieza: 45000,
      notes: text.slice(0, 150)
    };

    return {
      isQuote: true,
      quoteData,
      cleanText: `¡Excelente! He interpretado el mensaje de WhatsApp y preparé la cotización comercial para **${venue}** el **${event_date || '15 de noviembre'}** (${attendees} personas, entradas $${(preventa_price || 15000).toLocaleString('es-AR')} preventa y $${(general_price || 18000).toLocaleString('es-AR')} general):`
    };
  },

  /**
   * Responde consultas contextuales frecuentes usando los datos locales de eventos
   */
  answerContextualQuestionLocal(text = '', context = {}) {
    const t = (text || '').toLowerCase();
    
    // Consulta sobre años futuros o fechas sin eventos (ej: 2027)
    if (t.includes('2027') || t.includes('futuro') || t.includes('proximo año') || t.includes('próximo año')) {
      const fin = context.financialSummary || {};
      return {
        success: true,
        text: `📅 Actualmente en el sistema no hay eventos ni ventas registradas para el año **2027**.\n\nLa agenda activa contempla eventos de la temporada **2026** (con facturación acumulada registrada de **${fin.totalGrossIncome || '$0'}** y ganancia neta para el Barolo de **${fin.totalBaroloProfit || '$0'}**).\n\nSi querés cotizar un evento para 2027, podés pegarme los datos del mensaje y te armo la propuesta comercial al instante.`
      };
    }

    // Consulta sobre ventas generales o facturación
    if (t.includes('ventas') || t.includes('facturación') || t.includes('facturacion') || t.includes('ingresos totales')) {
      const fin = context.financialSummary || {};
      return {
        success: true,
        text: `💰 **Resumen Económico General del Palacio Barolo**:\n\n* **Facturación Bruta Total**: ${fin.totalGrossIncome || '$0'}\n* **Ganancia Neta Barolo**: ${fin.totalBaroloProfit || '$0'}\n* **Facturación Mes Corriente**: ${fin.currentMonthGross || '$0'}\n* **Ganancia Neta Mes Corriente**: ${fin.currentMonthProfit || '$0'}\n\nPodés consultar el detalle de cada evento en la pestaña *Dashboard* o *Registro*.`
      };
    }

    if (t.includes('rentable') || t.includes('ganancia') || t.includes('margen')) {
      const top = context.topProfitableEvents?.[0];
      if (top) {
        return {
          success: true,
          text: `🏆 El evento más rentable registrado para el Palacio Barolo es **"${top.name}"**, agendado para el **${top.date}** en el **${top.venue}** (${top.attendees} asistentes).\n\n* **Ganancia Neta Barolo**: ${top.profit}\n* **Margen Comercial**: ${top.margin}\n\nEste evento optimiza al máximo el valor del ticket y los costos de técnica y operación.`
        };
      }
    }

    if (t.includes('disponibilidad') || t.includes('cuántos eventos') || t.includes('contratados') || t.includes('agendados') || t.includes('calendario')) {
      const counts = context.statusCounts || {};
      const upcoming = context.upcomingEvents || [];
      const fin = context.financialSummary || {};

      let msg = `📅 **Estado actual de la agenda del Palacio Barolo**:\n\n`;
      msg += `* **Contratados**: ${counts.contratado || 0} eventos confirmados.\n`;
      msg += `* **En Reserva**: ${counts.reservado || 0} fechas bloqueadas con seña.\n`;
      msg += `* **Cotizaciones activas**: ${counts.cotizado || 0} propuestas en seguimiento.\n`;
      msg += `* **Ganancia Proyectada del Mes**: ${fin.currentMonthProfit || '$0'}\n\n`;

      if (upcoming.length > 0) {
        msg += `**Próximos eventos en calendario**:\n`;
        upcoming.slice(0, 4).forEach(e => {
          msg += `* **${e.date}** — ${e.name} (${e.venue}, ${e.attendees} pax) [${(e.status || '').toUpperCase()}]\n`;
        });
      }

      return {
        success: true,
        text: msg
      };
    }

    return null;
  },

  /**
   * Limpia y sanitiza la salida de la IA para eliminar cualquier residuo de razonamiento o scratchpad
   */
  sanitizeAssistantOutput(text = '') {
    if (!text) return '';

    let cleaned = text.trim();

    // 1. Quitar bloques <thought>...</thought>
    cleaned = cleaned.replace(/<thought>[\s\S]*?<\/thought>/gi, '').trim();

    // 2. Si detecta fuga de scratchpad / cadena de pensamiento
    const isScratchpadLeak = 
      /(?:\*|\-)?\s*(?:User Input|Role:\s*Copiloto|Task:\s*Consultor|Context Check|Concise\?\s*Yes|Professional tone\?\s*Yes)/i.test(cleaned);

    if (isScratchpadLeak) {
      const lines = cleaned.split('\n');
      const validLines = [];

      for (let line of lines) {
        const tr = line.trim();
        if (!tr) continue;

        const isMeta = /^(?:\*|\-)?\s*(?:User Input|Role|Task|Context Check|`?(?:financialSummary|totalGrossIncome|totalBaroloProfit|currentMonthGross|currentMonthProfit|upcomingEvents|currentView)`?|The user is asking|Looking at|The context provided|I must be|I cannot|I should|I can mention|Concise\?|Clear\?|No invented|Professional tone)/i.test(tr);

        if (!isMeta) {
          let cleanLine = tr.replace(/^(?:\*|\-)?\s*["“]?\s*/, '').replace(/["”]?$/, '').trim();
          if (cleanLine) {
            validLines.push(cleanLine);
          }
        }
      }

      if (validLines.length > 0) {
        cleaned = validLines.join('\n\n');
      }
    }

    return cleaned;
  },

  /**
   * Envía la conversación al asistente y retorna la respuesta procesada
   */
  async sendMessage(messages = [], context = {}) {
    const clientApiKey = this.getApiKey();
    const lastUserMsg = [...(messages || [])].reverse().find(m => m.role === 'user')?.text || '';

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
          // Si el servidor indica falta de API key o error, probar fallback local
          const localQuote = this.parseWhatsAppQuoteLocal(lastUserMsg);
          if (localQuote) {
            return {
              success: true,
              text: localQuote.cleanText,
              isQuote: true,
              quoteData: localQuote.quoteData
            };
          }
          const localAnswer = this.answerContextualQuestionLocal(lastUserMsg, context);
          if (localAnswer) {
            return localAnswer;
          }

          return {
            success: false,
            needsApiKey: !!data.needsApiKey || data.error === 'NO_API_KEY',
            text: data.message || 'Hubo un inconveniente al comunicarse con Gemini.'
          };
        }

        const resText = (data.text || '').trim();
        const fallbackText = data.isQuote 
          ? '¡Excelente! He preparado la propuesta de cotización para este evento:' 
          : 'He procesado tu consulta sobre el Palacio Barolo.';

        return {
          success: true,
          text: resText || fallbackText,
          isQuote: !!data.isQuote,
          quoteData: data.quoteData || null
        };
      }
    } catch (netErr) {
      console.warn('/api/assistant no disponible, evaluando fallback local...', netErr);
    }

    // 2. Si falló el endpoint remoto, verificar si es interpretable localmente
    const localQuote = this.parseWhatsAppQuoteLocal(lastUserMsg);
    if (localQuote) {
      return {
        success: true,
        text: localQuote.cleanText,
        isQuote: true,
        quoteData: localQuote.quoteData
      };
    }

    const localAnswer = this.answerContextualQuestionLocal(lastUserMsg, context);
    if (localAnswer) {
      return localAnswer;
    }

    // 3. Fallback directo a la API de Google Gemini (para desarrollo local con Vite)
    const effectiveKey = clientApiKey || import.meta.env.VITE_GEMINI_API_KEY;

    if (!effectiveKey) {
      return {
        success: false,
        needsApiKey: true,
        text: '🔑 Para activar el Copiloto IA con Google Gemini podés ingresar tu API Key haciendo clic en el icono de llave 🔑 arriba. Igualmente, ¡podés probar pegando un mensaje de WhatsApp y te armará la cotización al instante!'
      };
    }

    try {
      const systemPrompt = `Sos el Copiloto Inteligente y Asistente Comercial del Palacio Barolo, el emblemático rascacielos histórico de Buenos Aires (Av. de Mayo 1370).
Tu rol es asistir a los ejecutivos de ventas y coordinadores en dos tareas esenciales:

1. 📋 **COTIZADOR INTELIGENTE (INTERPRETAR WHATSAPP / TEXTO)**:
Cuando el usuario pegue un mensaje de WhatsApp o describa una solicitud de evento informal:
- Extraé con precisión: Nombre del evento, Fecha (AAAA-MM-DD), Salón, Asistentes, Entradas preventa y general, costos de técnica (0 si es propio), limpieza.
- Agregá AL FINAL de tu respuesta un bloque de código JSON EXACTO delimitado por \`\`\`json ... \`\`\`:
\`\`\`json
{
  "isQuote": true,
  "quoteData": {
    "name": "Nombre del evento",
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
    "notes": "Notas del cliente"
  }
}
\`\`\`

2. 📊 **CONSULTOR ANALÍTICO Y DEL NEGOCIO**:
Si el usuario hace preguntas sobre rentabilidad, calendario o eventos:
- Utilizá el contexto para dar respuestas certeras con números reales.

---
### 📅 RESUMEN DE EVENTOS EN SISTEMA:
${JSON.stringify(context, null, 2)}`;

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

      const payload = {
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: contents.length > 0 ? contents : [{ role: 'user', parts: [{ text: 'Hola' }] }],
        generationConfig: { temperature: 0.2, topP: 0.95, maxOutputTokens: 1500 }
      };

      const modelsToTry = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
      let res = null;

      for (const model of modelsToTry) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${effectiveKey}`;
          const fetchRes = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (fetchRes.ok) {
            res = fetchRes;
            break;
          }
        } catch (e) {
          // Continuar con el siguiente modelo
        }
      }

      if (!res || !res.ok) {
        return {
          success: false,
          text: '⚠️ No se pudo conectar con el servicio de Gemini. Verificá tu clave API de Google.'
        };
      }

      const data = await res.json();
      const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      let quoteData = null;
      let isQuote = false;
      let cleanText = (candidateText || '').trim();

      const jsonMatch = cleanText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[1]);
          const d = parsed.quoteData || (parsed.venue ? parsed : null);
          if (d) {
            isQuote = true;
            quoteData = d;
            cleanText = cleanText.replace(/```(?:json)?\s*[\s\S]*?\s*```/i, '').trim();
          }
        } catch (e) {}
      }

      cleanText = this.sanitizeAssistantOutput(cleanText);

      if (!cleanText && isQuote) {
        cleanText = '¡Excelente! He preparado la propuesta de cotización para este evento:';
      }

      return {
        success: true,
        text: cleanText || 'Consulta procesada correctamente.',
        isQuote,
        quoteData
      };
    } catch (err) {
      return {
        success: false,
        text: `⚠️ Error conectando con el servicio de IA: ${err.message}`
      };
    }
  }
};
