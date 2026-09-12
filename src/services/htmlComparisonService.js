/**
 * 🏛️ PALACIO BAROLO - SERVICIO DE PRESENTACIÓN COMPARATIVA EN HTML DINÁMICO
 * Genera un archivo .html autónomo, autocontenido y portable para comparar
 * 2 o más eventos lado a lado en reuniones ejecutivas, pitchs o decisiones de directorio.
 */

import { BAROLO_LOGO_BASE64 } from './htmlPresentationService.js';

const formatCurrency = (val) => {
  const num = Number(val) || 0;
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
};

const formatNumber = (val) => {
  const num = Number(val) || 0;
  return new Intl.NumberFormat('es-AR', {
    maximumFractionDigits: 0
  }).format(num);
};

export const htmlComparisonService = {
  /**
   * Genera el HTML de la comparativa de múltiples eventos
   */
  generateComparisonHtml(selectedEvents = []) {
    const events = Array.isArray(selectedEvents) ? selectedEvents : [];
    if (events.length === 0) return '<html><body>No hay eventos seleccionados</body></html>';

    // Normalizar métricas de cada evento
    const computedEvents = events.map((e, idx) => {
      const attendees = Number(e.attendees) || 0;
      const preventaQty = Number(e.preventa_qty) || 0;
      const preventaPrice = Number(e.preventa_price) || 0;
      const preventaTotal = preventaQty * preventaPrice;

      const invitacionesQty = Number(e.invitaciones_qty) || 0;

      const generalQty = Number(e.general_qty ?? e.ticket_qty) || 0;
      const generalPrice = Number(e.general_price ?? e.ticket_price) || 0;
      const generalTotal = generalQty * generalPrice;

      const alquilerEspacio = Number(e.alquiler_espacio || e.contratacion_salon) || 0;
      const comisionCatering = Number(e.comision_catering) || 0;
      const otrosIngresos = Number(e.otros_ingresos) || 0;

      const extraIncomes = Array.isArray(e.extra_incomes || e.extraIncomes) ? (e.extra_incomes || e.extraIncomes) : [];
      const extraIncomesTotal = extraIncomes.reduce((acc, item) => acc + (Number(item.amount ?? item.value) || 0), 0);

      const grossIncome = Number(e.gross_income) || (preventaTotal + generalTotal + alquilerEspacio + comisionCatering + otrosIngresos + extraIncomesTotal);

      // Costos Productor
      const costArtistas = Number(e.cost_artistas) || 0;
      const costTecnica = Number(e.cost_tecnica) || 0;
      const costDisertantes = Number(e.cost_disertantes) || 0;
      const costMobiliario = Number(e.cost_mobiliario) || 0;
      const costRrhh = Number(e.cost_rrhh) || 0;
      const producerCostsSubtotal = costArtistas + costTecnica + costDisertantes + costMobiliario + costRrhh;

      // Costos Barolo
      const costCatering = Number(e.cost_catering) || 0;
      const costLimpieza = Number(e.cost_limpieza) || 0;
      const costSeguros = Number(e.cost_seguros) || 0;
      const costAlquiler = Number(e.cost_alquiler) || 0;
      const costGastronomicos = Number(e.cost_gastronomicos) || 0;
      const costMarketing = Number(e.cost_marketing) || 0;
      const costSadaic = Number(e.cost_sadaic) || 0;
      const costOtros = Number(e.cost_otros) || 0;

      const extraExpenses = Array.isArray(e.extra_expenses || e.extraExpenses) ? (e.extra_expenses || e.extraExpenses) : [];
      const extraExpensesTotal = extraExpenses.reduce((acc, item) => acc + (Number(item.amount ?? item.value) || 0), 0);

      const baroloCostsSubtotal = costCatering + costLimpieza + costSeguros + costAlquiler + costGastronomicos + costMarketing + costSadaic + costOtros + extraExpensesTotal;
      const totalCosts = Number(e.total_costs) || (producerCostsSubtotal + baroloCostsSubtotal);

      const baroloProfit = Number(e.barolo_profit) || (grossIncome - totalCosts);
      const producerProfit = Number(e.producer_profit) || 0;
      const marginPct = Number(e.margin_pct) || (grossIncome > 0 ? (baroloProfit / grossIncome) * 100 : 0);

      const ticketAvg = (preventaQty + generalQty) > 0 ? (preventaTotal + generalTotal) / (preventaQty + generalQty) : 0;
      const breakEvenTickets = ticketAvg > 0 ? Math.ceil(totalCosts / ticketAvg) : 0;
      const breakEvenOccPct = attendees > 0 ? Math.min(100, Math.round((breakEvenTickets / attendees) * 100)) : 0;

      return {
        ...e,
        idx,
        attendees,
        preventaQty,
        preventaPrice,
        preventaTotal,
        invitacionesQty,
        generalQty,
        generalPrice,
        generalTotal,
        alquilerEspacio,
        comisionCatering,
        otrosIngresos: otrosIngresos + extraIncomesTotal,
        grossIncome,
        costArtistas,
        costTecnica,
        costDisertantes,
        costMobiliario,
        costRrhh,
        producerCostsSubtotal,
        costCatering,
        costLimpieza,
        costSeguros,
        costAlquiler,
        costGastronomicos,
        costMarketing,
        costSadaic,
        costOtros,
        baroloCostsSubtotal,
        totalCosts,
        baroloProfit,
        producerProfit,
        marginPct,
        ticketAvg,
        breakEvenTickets,
        breakEvenOccPct
      };
    });

    // Calcular ganadores / highlights
    let bestProfit = computedEvents[0];
    let bestMargin = computedEvents[0];
    let bestRevenue = computedEvents[0];
    let bestAttendees = computedEvents[0];
    let lowestRisk = computedEvents[0];

    computedEvents.forEach(ev => {
      if (ev.baroloProfit > bestProfit.baroloProfit) bestProfit = ev;
      if (ev.marginPct > bestMargin.marginPct) bestMargin = ev;
      if (ev.grossIncome > bestRevenue.grossIncome) bestRevenue = ev;
      if (ev.attendees > bestAttendees.attendees) bestAttendees = ev;
      if (ev.breakEvenTickets < lowestRisk.breakEvenTickets) lowestRisk = ev;
    });

    const maxGrossChart = Math.max(...computedEvents.map(e => e.grossIncome), 1);

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Comparativa Ejecutiva de Eventos — Palacio Barolo</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,700&display=swap" rel="stylesheet">
  <style>
    :root {
      --barolo-navy: #1B2A4A;
      --barolo-navy-dark: #0B132B;
      --barolo-gold: #C5A059;
      --barolo-gold-light: #E8D5AC;
      --slate-900: #0F172A;
      --slate-800: #1E293B;
      --slate-700: #334155;
      --emerald: #10B981;
      --rose: #EF4444;
      --sky: #0EA5E9;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: radial-gradient(circle at 10% 20%, #152238 0%, #0b111e 90%);
      color: #F8FAFC;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      overflow-x: hidden;
    }

    header {
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(16px);
      border-bottom: 1px solid rgba(197, 160, 89, 0.3);
      padding: 0.75rem 1.5rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 0;
      z-index: 50;
      box-shadow: 0 4px 20px rgba(0,0,0,0.4);
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 0.85rem;
    }

    .brand img {
      width: 48px;
      height: 48px;
      object-fit: contain;
      filter: drop-shadow(0 2px 8px rgba(0,0,0,0.5));
    }

    .brand-text h1 {
      font-size: 1.15rem;
      font-weight: 800;
      letter-spacing: 0.05em;
      color: #FDE047;
      text-transform: uppercase;
      line-height: 1.2;
    }

    .brand-text p {
      font-size: 0.7rem;
      color: #94A3B8;
      letter-spacing: 0.05em;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.45rem 0.85rem;
      border-radius: 0.75rem;
      font-size: 0.75rem;
      font-weight: 700;
      cursor: pointer;
      border: 1px solid transparent;
      transition: all 0.2s ease;
      text-decoration: none;
      user-select: none;
    }

    .btn-gold {
      background: linear-gradient(135deg, #C5A059, #F59E0B);
      color: #0F172A;
      box-shadow: 0 2px 10px rgba(245, 158, 11, 0.3);
    }

    .btn-gold:hover {
      filter: brightness(1.1);
      transform: translateY(-1px);
    }

    .btn-outline {
      background: rgba(30, 41, 59, 0.6);
      border-color: rgba(148, 163, 184, 0.2);
      color: #E2E8F0;
    }

    .btn-outline:hover {
      background: rgba(51, 65, 85, 0.8);
      border-color: var(--barolo-gold);
      color: #FDE047;
    }

    .tabs-bar {
      background: rgba(11, 19, 43, 0.7);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      padding: 0.5rem 1.5rem;
      display: flex;
      gap: 0.5rem;
      overflow-x: auto;
      scrollbar-width: none;
      position: sticky;
      top: 65px;
      z-index: 45;
      backdrop-filter: blur(12px);
    }

    .tabs-bar::-webkit-scrollbar { display: none; }

    .tab-btn {
      background: transparent;
      border: 1px solid transparent;
      color: #94A3B8;
      padding: 0.5rem 1rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 700;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.2s ease;
    }

    .tab-btn:hover {
      color: #FFFFFF;
      background: rgba(255, 255, 255, 0.05);
    }

    .tab-btn.active {
      background: rgba(197, 160, 89, 0.2);
      border-color: #C5A059;
      color: #FDE047;
      box-shadow: 0 0 12px rgba(197, 160, 89, 0.25);
    }

    main {
      flex: 1;
      max-width: 1340px;
      width: 100%;
      margin: 0 auto;
      padding: 1.5rem;
      position: relative;
    }

    .slide {
      display: none;
      animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .slide.active {
      display: block;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .card {
      background: rgba(15, 23, 42, 0.75);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 1.25rem;
      padding: 1.5rem;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(12px);
      margin-bottom: 1.5rem;
    }

    .card-gold {
      border-color: rgba(197, 160, 89, 0.4);
      background: linear-gradient(145deg, rgba(27, 42, 74, 0.8), rgba(15, 23, 42, 0.9));
    }

    .highlights-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .highlight-pill {
      background: rgba(30, 41, 59, 0.7);
      border: 1px solid rgba(197, 160, 89, 0.3);
      border-radius: 1rem;
      padding: 1rem 1.25rem;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .highlight-label {
      font-size: 0.65rem;
      font-weight: 800;
      color: #FDE047;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .highlight-event {
      font-size: 1.1rem;
      font-weight: 800;
      color: #FFFFFF;
      margin: 0.35rem 0 0.15rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .highlight-metric {
      font-size: 0.85rem;
      font-weight: 700;
      color: #34D399;
    }

    .events-cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 1.25rem;
      margin-bottom: 1.5rem;
    }

    .event-col-card {
      background: rgba(30, 41, 59, 0.75);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 1.25rem;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      transition: all 0.2s ease;
    }

    .event-col-card:hover {
      border-color: var(--barolo-gold);
      transform: translateY(-2px);
      box-shadow: 0 10px 25px rgba(0,0,0,0.5);
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.8rem;
    }

    .data-table th {
      background: rgba(30, 41, 59, 0.95);
      color: #94A3B8;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 0.65rem;
      letter-spacing: 0.05em;
      padding: 0.75rem 1rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .data-table td {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      color: #E2E8F0;
    }

    .data-table tr:hover td {
      background: rgba(255, 255, 255, 0.03);
    }

    .data-table td.num {
      text-align: right;
      font-variant-numeric: tabular-nums;
      font-weight: 600;
    }

    .text-gold { color: #FDE047; }
    .text-emerald { color: #34D399; }
    .text-sky { color: #38BDF8; }
    .text-rose { color: #F87171; }

    /* Native SVG Bars chart container */
    .chart-container {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      margin: 1rem 0;
    }

    .chart-row {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .chart-row-label {
      display: flex;
      justify-content: space-between;
      font-size: 0.8rem;
      font-weight: 700;
    }

    .chart-bar-bg {
      background: #1E293B;
      border-radius: 9999px;
      height: 24px;
      overflow: hidden;
      display: flex;
      box-shadow: inset 0 2px 4px rgba(0,0,0,0.5);
    }

    .chart-bar-fill {
      height: 100%;
      border-radius: 9999px;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      padding-right: 0.75rem;
      font-size: 0.7rem;
      font-weight: 800;
      color: #FFFFFF;
      transition: width 0.5s ease;
    }

    footer {
      background: rgba(15, 23, 42, 0.95);
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      padding: 0.75rem 1.5rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      bottom: 0;
      z-index: 40;
    }

    .print-header { display: none; }

    @media print {
      @page {
        size: A4 landscape;
        margin: 10mm 12mm;
      }

      *, *::before, *::after {
        box-shadow: none !important;
        text-shadow: none !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      html, body {
        background: #FFFFFF !important;
        color: #0F172A !important;
        display: block !important;
        width: 100% !important;
        height: auto !important;
        min-height: 0 !important;
        overflow: visible !important;
        position: static !important;
        font-size: 9.5pt !important;
      }

      main {
        display: block !important;
        width: 100% !important;
        max-width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: visible !important;
        position: static !important;
      }

      header, .tabs-bar, footer, .btn {
        display: none !important;
      }

      .print-header {
        display: flex !important;
        justify-content: space-between;
        align-items: center;
        border-bottom: 2px solid #C5A059 !important;
        padding-bottom: 6px !important;
        margin-bottom: 12px !important;
      }

      body:not(.print-current) .slide,
      body.print-all .slide {
        display: block !important;
        opacity: 1 !important;
        transform: none !important;
        animation: none !important;
        page-break-before: always !important;
        break-before: page !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        margin: 0 !important;
        padding: 6mm 0 !important;
        min-height: 0 !important;
        height: auto !important;
      }

      body:not(.print-current) .slide:first-of-type,
      body.print-all .slide:first-of-type {
        page-break-before: avoid !important;
        break-before: avoid !important;
      }

      body.print-current .slide {
        display: none !important;
      }

      body.print-current .slide.active {
        display: block !important;
        page-break-before: avoid !important;
        break-before: avoid !important;
        margin: 0 !important;
        padding: 6mm 0 !important;
      }

      .card, .event-col-card, .highlight-pill {
        background: #F8FAFC !important;
        border: 1px solid #CBD5E1 !important;
        color: #0F172A !important;
        box-shadow: none !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        margin-bottom: 10px !important;
        padding: 10px 14px !important;
      }

      .data-table th {
        background: #F1F5F9 !important;
        color: #0F172A !important;
        border-bottom: 2px solid #94A3B8 !important;
      }

      .data-table td {
        border-bottom: 1px solid #E2E8F0 !important;
        color: #1E293B !important;
      }

      .text-gold { color: #92400E !important; }
      .text-emerald { color: #065F46 !important; }
      .text-sky { color: #075985 !important; }
      .text-rose { color: #991B1B !important; }
    }
  </style>
</head>
<body>

  <!-- Header -->
  <header>
    <div class="brand">
      <img src="${BAROLO_LOGO_BASE64}" alt="Palacio Barolo Tours">
      <div class="brand-text">
        <h1>Palacio Barolo</h1>
        <p>Matriz Comparativa de Rentabilidad & Operaciones</p>
      </div>
    </div>

    <div class="header-actions">
      <span style="font-size: 0.75rem; background: rgba(197, 160, 89, 0.2); border: 1px solid #C5A059; color: #FDE047; padding: 0.35rem 0.65rem; border-radius: 0.5rem; font-weight: 800;">
        ${computedEvents.length} EVENTOS EN COMPARATIVA
      </span>
      <button class="btn btn-outline" onclick="toggleFullscreen()" title="Pantalla Completa (F)">
        ⛶ Pantalla Completa
      </button>
      <button class="btn btn-outline" onclick="printCurrentSlide()" title="Imprimir hoja actual en 1 página limpia (P)">
        🖨️ Hoja Actual
      </button>
      <button class="btn btn-gold" onclick="printAllSlides()" title="Imprimir dossier comparativo completo (PDF)">
        📑 Dossier Completo (PDF)
      </button>
    </div>
  </header>

  <!-- Tabs Navigation -->
  <div class="tabs-bar">
    <button class="tab-btn active" onclick="goToSlide(0)">📌 1. Resumen & Destacados</button>
    <button class="tab-btn" onclick="goToSlide(1)">📊 2. Gráficos Comparativos</button>
    <button class="tab-btn" onclick="goToSlide(2)">⚖️ 3. Matriz Lado a Lado</button>
    <button class="tab-btn" onclick="goToSlide(3)">🎯 4. Conclusiones & Dictamen</button>
  </div>

  <!-- Main Slides -->
  <main>

    <!-- ============================================================ -->
    <!-- SLIDE 1: RESUMEN & DESTACADOS                                -->
    <!-- ============================================================ -->
    <section class="slide active" id="slide-0">
      
      <div class="print-header">
        <div style="display: flex; align-items: center; gap: 10px;">
          <img src="${BAROLO_LOGO_BASE64}" style="width: 40px; height: 40px; object-fit: contain;">
          <div>
            <div style="font-size: 11pt; font-weight: 900; color: #0F172A; letter-spacing: 0.05em;">PALACIO BAROLO</div>
            <div style="font-size: 8pt; color: #64748B;">Matriz Comparativa de ${computedEvents.length} Eventos</div>
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 8.5pt; font-weight: 800; color: #B45309;">COMPARATIVA EJECUTIVA</div>
          <div style="font-size: 7.5pt; color: #64748B;">Diapositiva 1 de 4: Resumen & Destacados</div>
        </div>
      </div>

      <!-- Highlights Banner -->
      <div class="highlights-grid">
        <div class="highlight-pill">
          <span class="highlight-label">🏆 Mayor Ganancia Neta Barolo</span>
          <div class="highlight-event">${bestProfit.name}</div>
          <span class="highlight-metric">${formatCurrency(bestProfit.baroloProfit)} (Margen: ${bestProfit.marginPct.toFixed(1)}%)</span>
        </div>

        <div class="highlight-pill">
          <span class="highlight-label">📈 Mayor Margen Porcentual</span>
          <div class="highlight-event">${bestMargin.name}</div>
          <span class="highlight-metric">${bestMargin.marginPct.toFixed(1)}% sobre facturación</span>
        </div>

        <div class="highlight-pill">
          <span class="highlight-label">💰 Mayor Facturación Bruta</span>
          <div class="highlight-event">${bestRevenue.name}</div>
          <span class="highlight-metric">${formatCurrency(bestRevenue.grossIncome)}</span>
        </div>

        <div class="highlight-pill">
          <span class="highlight-label">👥 Mayor Convocatoria de Asistentes</span>
          <div class="highlight-event">${bestAttendees.name}</div>
          <span class="highlight-metric">${bestAttendees.attendees} asistentes (${bestAttendees.venue})</span>
        </div>
      </div>

      <!-- Events Side by Side Cards -->
      <div class="events-cards-grid">
        ${computedEvents.map((ev) => `
          <div class="event-col-card">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; margin-bottom: 0.5rem;">
                <div>
                  <span style="font-size: 0.65rem; font-weight: 800; color: #FDE047; text-transform: uppercase;">
                    ${ev.calc_code || 'EVENTO ' + (ev.idx + 1)}
                  </span>
                  <h3 style="font-size: 1.15rem; font-weight: 800; margin-top: 0.15rem;">${ev.name}</h3>
                  <p style="font-size: 0.75rem; color: #94A3B8;">${ev.client_name || 'Particular'} • ${ev.venue}</p>
                </div>
                <span style="font-size: 0.65rem; font-weight: 800; text-transform: uppercase; padding: 0.2rem 0.5rem; border-radius: 9999px; background: ${ev.status === 'contratado' ? '#065F46; color: #6EE7B7;' : ev.status === 'reservado' ? '#075985; color: #7DD3FC;' : '#78350F; color: #FDE68A;'}">
                  ${ev.status || 'cotizado'}
                </span>
              </div>

              <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(255,255,255,0.08); border-radius: 1rem; padding: 1rem; margin: 1rem 0; display: flex; flex-direction: column; gap: 0.65rem;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span style="font-size: 0.7rem; color: #94A3B8; text-transform: uppercase;">Facturación</span>
                  <span style="font-weight: 800; color: #FDE047;">${formatCurrency(ev.grossIncome)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span style="font-size: 0.7rem; color: #94A3B8; text-transform: uppercase;">Costos Totales</span>
                  <span style="font-weight: 800; color: #F87171;">${formatCurrency(ev.totalCosts)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; pt-2; border-top: 1px dashed rgba(255,255,255,0.1);">
                  <span style="font-size: 0.75rem; font-weight: 700; color: #34D399; text-transform: uppercase;">Ganancia Barolo</span>
                  <span style="font-size: 1.15rem; font-weight: 900; color: #34D399;">${formatCurrency(ev.baroloProfit)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span style="font-size: 0.7rem; color: #94A3B8; text-transform: uppercase;">Margen Neto</span>
                  <span style="font-weight: 800; color: #FDE047;">${ev.marginPct.toFixed(1)}%</span>
                </div>
              </div>

              <div style="font-size: 0.75rem; color: #CBD5E1; display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
                <div>Asistentes: <strong>${ev.attendees} pax</strong></div>
                <div>Ticket Prom.: <strong>${formatCurrency(ev.ticketAvg)}</strong></div>
                <div>P. Equilibrio: <strong>${ev.breakEvenTickets} tickets</strong></div>
                <div>Convenio: <strong>${ev.agreement_type || '50-50'}</strong></div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>

    </section>

    <!-- ============================================================ -->
    <!-- SLIDE 2: GRÁFICOS COMPARATIVOS VISUALES                      -->
    <!-- ============================================================ -->
    <section class="slide" id="slide-1">
      
      <div class="print-header">
        <div style="display: flex; align-items: center; gap: 10px;">
          <img src="${BAROLO_LOGO_BASE64}" style="width: 40px; height: 40px; object-fit: contain;">
          <div>
            <div style="font-size: 11pt; font-weight: 900; color: #0F172A; letter-spacing: 0.05em;">PALACIO BAROLO</div>
            <div style="font-size: 8pt; color: #64748B;">Matriz Comparativa de ${computedEvents.length} Eventos</div>
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 8.5pt; font-weight: 800; color: #B45309;">COMPARATIVA EJECUTIVA</div>
          <div style="font-size: 7.5pt; color: #64748B;">Diapositiva 2 de 4: Gráficos Comparativos</div>
        </div>
      </div>

      <div class="card card-gold">
        <h2 style="font-size: 1.25rem; font-weight: 800; color: #FDE047; margin-bottom: 0.5rem;">
          Gráfico Comparativo de Facturación vs. Ganancia Neta Barolo
        </h2>
        <p style="font-size: 0.75rem; color: #CBD5E1; margin-bottom: 1.5rem;">
          Magnitud de ingresos brutos y remanente neto generado para el establecimiento
        </p>

        <div class="chart-container">
          ${computedEvents.map(ev => {
            const baroloPct = maxGrossChart > 0 ? (ev.grossIncome / maxGrossChart) * 100 : 0;
            const profitPct = maxGrossChart > 0 ? (ev.baroloProfit / maxGrossChart) * 100 : 0;
            return `
              <div class="chart-row">
                <div class="chart-row-label">
                  <span><strong>${ev.name}</strong> (${ev.calc_code || 'CALC'}) — ${ev.venue}</span>
                  <span class="text-gold">${formatCurrency(ev.grossIncome)} | Ganancia: <strong class="text-emerald">${formatCurrency(ev.baroloProfit)}</strong></span>
                </div>
                <div class="chart-bar-bg">
                  <div class="chart-bar-fill" style="width: ${baroloPct}%; background: linear-gradient(90deg, #3B82F6, #C5A059);">
                    Facturación ${formatCurrency(ev.grossIncome)}
                  </div>
                </div>
                <div class="chart-bar-bg" style="height: 16px; margin-top: 2px;">
                  <div class="chart-bar-fill" style="width: ${profitPct}%; background: #10B981;">
                    Ganancia Barolo ${formatCurrency(ev.baroloProfit)} (${ev.marginPct.toFixed(1)}%)
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

    </section>

    <!-- ============================================================ -->
    <!-- SLIDE 3: MATRIZ LADO A LADO DETALLADA                         -->
    <!-- ============================================================ -->
    <section class="slide" id="slide-2">
      
      <div class="print-header">
        <div style="display: flex; align-items: center; gap: 10px;">
          <img src="${BAROLO_LOGO_BASE64}" style="width: 40px; height: 40px; object-fit: contain;">
          <div>
            <div style="font-size: 11pt; font-weight: 900; color: #0F172A; letter-spacing: 0.05em;">PALACIO BAROLO</div>
            <div style="font-size: 8pt; color: #64748B;">Matriz Comparativa de ${computedEvents.length} Eventos</div>
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 8.5pt; font-weight: 800; color: #B45309;">COMPARATIVA EJECUTIVA</div>
          <div style="font-size: 7.5pt; color: #64748B;">Diapositiva 3 de 4: Matriz Lado a Lado</div>
        </div>
      </div>

      <div class="card" style="overflow-x: auto;">
        <h2 style="font-size: 1.25rem; font-weight: 800; color: #FDE047; margin-bottom: 0.5rem;">
          Matriz Financiera Consolidada
        </h2>
        <p style="font-size: 0.75rem; color: #94A3B8; margin-bottom: 1.25rem;">
          Comparativa de variables operativas, rubros de costo y márgenes de liquidación
        </p>

        <table class="data-table">
          <thead>
            <tr>
              <th style="min-width: 220px;">Concepto / Métrica</th>
              ${computedEvents.map(e => `
                <th style="text-align: right; min-width: 170px;">
                  ${e.calc_code || 'CALC'}<br>
                  <span style="font-size: 0.75rem; color: #FDE047;">${e.name}</span>
                </th>
              `).join('')}
            </tr>
          </thead>
          <tbody>
            <!-- GENERAL -->
            <tr style="background: rgba(255,255,255,0.03);"><td colspan="${computedEvents.length + 1}"><strong>1. DATOS GENERALES</strong></td></tr>
            <tr><td>Cliente / Organizador</td>${computedEvents.map(e => `<td class="num">${e.client_name || '-'}</td>`).join('')}</tr>
            <tr><td>Fecha & Horario</td>${computedEvents.map(e => `<td class="num">${e.event_date || '-'} (${e.event_time || '19:00'})</td>`).join('')}</tr>
            <tr><td>Salón Asignado</td>${computedEvents.map(e => `<td class="num">${e.venue || '-'}</td>`).join('')}</tr>
            <tr><td>Convenio / Split</td>${computedEvents.map(e => `<td class="num">${e.agreement_type || '-'}</td>`).join('')}</tr>
            <tr><td>Asistentes Convocados</td>${computedEvents.map(e => `<td class="num">${e.attendees} pax</td>`).join('')}</tr>

            <!-- INGRESOS -->
            <tr style="background: rgba(255,255,255,0.03);"><td colspan="${computedEvents.length + 1}"><strong>2. FUENTES DE INGRESO</strong></td></tr>
            <tr><td>Tickets Preventa</td>${computedEvents.map(e => `<td class="num">${e.preventaQty} x ${formatCurrency(e.preventaPrice)}</td>`).join('')}</tr>
            <tr><td>Tickets Generales</td>${computedEvents.map(e => `<td class="num">${e.generalQty} x ${formatCurrency(e.generalPrice)}</td>`).join('')}</tr>
            <tr><td>Canon / Alquiler Salón</td>${computedEvents.map(e => `<td class="num">${formatCurrency(e.alquilerEspacio)}</td>`).join('')}</tr>
            <tr><td>Comisión Catering / Barra</td>${computedEvents.map(e => `<td class="num">${formatCurrency(e.comisionCatering)}</td>`).join('')}</tr>
            <tr style="background: rgba(197, 160, 89, 0.15); font-weight: 800;">
              <td style="color: #FDE047;">TOTAL FACTURACIÓN BRUTA</td>
              ${computedEvents.map(e => `<td class="num text-gold">${formatCurrency(e.grossIncome)}</td>`).join('')}
            </tr>

            <!-- COSTOS -->
            <tr style="background: rgba(255,255,255,0.03);"><td colspan="${computedEvents.length + 1}"><strong>3. ESTRUCTURA DE COSTOS</strong></td></tr>
            <tr><td>Subtotal Costos Productor</td>${computedEvents.map(e => `<td class="num text-rose">${formatCurrency(e.producerCostsSubtotal)}</td>`).join('')}</tr>
            <tr><td>Subtotal Costos Barolo</td>${computedEvents.map(e => `<td class="num" style="color: #FB923C;">${formatCurrency(e.baroloCostsSubtotal)}</td>`).join('')}</tr>
            <tr style="background: rgba(239, 68, 68, 0.15); font-weight: 800;">
              <td style="color: #F87171;">TOTAL COSTOS DEL EVENTO</td>
              ${computedEvents.map(e => `<td class="num text-rose">${formatCurrency(e.totalCosts)}</td>`).join('')}
            </tr>

            <!-- LIQUIDACIÓN -->
            <tr style="background: rgba(255,255,255,0.03);"><td colspan="${computedEvents.length + 1}"><strong>4. RESULTADOS & LIQUIDACIÓN</strong></td></tr>
            <tr><td>Ganancia Productor</td>${computedEvents.map(e => `<td class="num text-sky">${formatCurrency(e.producerProfit)}</td>`).join('')}</tr>
            <tr style="background: rgba(16, 185, 129, 0.2); font-weight: 900;">
              <td style="color: #34D399; font-size: 0.95rem;">GANANCIA NETA BAROLO</td>
              ${computedEvents.map(e => `<td class="num text-emerald" style="font-size: 1rem;">${formatCurrency(e.baroloProfit)}</td>`).join('')}
            </tr>
            <tr><td>Margen Operativo Barolo</td>${computedEvents.map(e => `<td class="num text-gold font-bold">${e.marginPct.toFixed(1)}%</td>`).join('')}</tr>
            <tr><td>Ticket Promedio</td>${computedEvents.map(e => `<td class="num">${formatCurrency(e.ticketAvg)}</td>`).join('')}</tr>
            <tr><td>Punto de Equilibrio (Break-Even)</td>${computedEvents.map(e => `<td class="num">${e.breakEvenTickets} tickets (${e.breakEvenOccPct}%)</td>`).join('')}</tr>
          </tbody>
        </table>
      </div>

    </section>

    <!-- ============================================================ -->
    <!-- SLIDE 4: CONCLUSIONES & DICTAMEN                             -->
    <!-- ============================================================ -->
    <section class="slide" id="slide-3">
      
      <div class="print-header">
        <div style="display: flex; align-items: center; gap: 10px;">
          <img src="${BAROLO_LOGO_BASE64}" style="width: 40px; height: 40px; object-fit: contain;">
          <div>
            <div style="font-size: 11pt; font-weight: 900; color: #0F172A; letter-spacing: 0.05em;">PALACIO BAROLO</div>
            <div style="font-size: 8pt; color: #64748B;">Matriz Comparativa de ${computedEvents.length} Eventos</div>
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 8.5pt; font-weight: 800; color: #B45309;">COMPARATIVA EJECUTIVA</div>
          <div style="font-size: 7.5pt; color: #64748B;">Diapositiva 4 de 4: Conclusiones & Dictamen</div>
        </div>
      </div>

      <div class="card card-gold">
        <h2 style="font-size: 1.3rem; font-weight: 800; color: #FDE047; margin-bottom: 0.5rem;">
          🎯 Dictamen Comercial & Recomendación Ejecutiva
        </h2>
        <p style="font-size: 0.75rem; color: #CBD5E1; margin-bottom: 1.5rem;">
          Evaluación estratégica comparada para asignación de fechas y salones
        </p>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem;">
          
          <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(255,255,255,0.1); border-radius: 1rem; padding: 1.25rem;">
            <h4 style="font-size: 0.9rem; font-weight: 800; color: #34D399; margin-bottom: 0.5rem;">
              🏆 Opción Financiera Óptima
            </h4>
            <p style="font-size: 0.8rem; color: #E2E8F0; line-height: 1.6;">
              El evento <strong>${bestProfit.name}</strong> (${bestProfit.client_name || 'Particular'}) presenta el mayor retorno absoluto con <strong>${formatCurrency(bestProfit.baroloProfit)}</strong> de ganancia neta líquida para el Palacio Barolo, logrando un margen del <strong>${bestProfit.marginPct.toFixed(1)}%</strong>.
            </p>
          </div>

          <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(255,255,255,0.1); border-radius: 1rem; padding: 1.25rem;">
            <h4 style="font-size: 0.9rem; font-weight: 800; color: #38BDF8; margin-bottom: 0.5rem;">
              ⚖️ Opción de Menor Riesgo Operativo
            </h4>
            <p style="font-size: 0.8rem; color: #E2E8F0; line-height: 1.6;">
              El evento <strong>${lowestRisk.name}</strong> requiere solo <strong>${lowestRisk.breakEvenTickets} tickets</strong> (${lowestRisk.breakEvenOccPct}% del aforo) para alcanzar el punto de equilibrio y amortizar el 100% de los costos operativos fijos.
            </p>
          </div>

        </div>

        <div style="margin-top: 1.5rem; pt-4; border-top: 1px solid rgba(255, 255, 255, 0.1); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; font-size: 0.75rem; color: #94A3B8;">
          <div>
            Palacio Barolo • Matriz Comparativa Oficial • Av. de Mayo 1370, CABA
          </div>
          <div style="font-weight: 700; color: #FDE047;">
            Generado el ${new Date().toLocaleDateString('es-AR')}
          </div>
        </div>

      </div>
    </section>

  </main>

  <!-- Footer -->
  <footer>
    <div style="display: flex; align-items: center; gap: 0.75rem;">
      <button class="btn btn-outline" onclick="prevSlide()" style="padding: 0.35rem 0.65rem;">◀ Anterior</button>
      <span id="slide-counter" style="font-size: 0.75rem; font-weight: 800; color: #FDE047;">1 / 4</span>
      <button class="btn btn-outline" onclick="nextSlide()" style="padding: 0.35rem 0.65rem;">Siguiente ▶</button>
    </div>

    <div style="font-size: 0.7rem; color: #64748B;">
      💡 Teclado: <strong>← →</strong> Cambiar Diapositiva | <strong>F</strong> Pantalla Completa | <strong>P</strong> Imprimir PDF
    </div>

    <div style="font-size: 0.7rem; color: #94A3B8;">
      Palacio Barolo • Sistema Oficial de Comparativas
    </div>
  </footer>

  <script>
    let currentSlide = 0;
    const totalSlides = 4;

    function goToSlide(index) {
      if (index < 0 || index >= totalSlides) return;
      currentSlide = index;
      
      document.querySelectorAll('.slide').forEach((s, idx) => {
        s.classList.toggle('active', idx === currentSlide);
      });
      document.querySelectorAll('.tab-btn').forEach((b, idx) => {
        b.classList.toggle('active', idx === currentSlide);
      });
      document.getElementById('slide-counter').textContent = (currentSlide + 1) + ' / ' + totalSlides;
    }

    function nextSlide() {
      goToSlide((currentSlide + 1) % totalSlides);
    }

    function prevSlide() {
      goToSlide((currentSlide - 1 + totalSlides) % totalSlides);
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown') nextSlide();
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') prevSlide();
      if (e.key === 'f' || e.key === 'F') toggleFullscreen();
      if (e.key === 'p' || e.key === 'P') printCurrentSlide();
    });

    function toggleFullscreen() {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        if (document.exitFullscreen) document.exitFullscreen();
      }
    }

    function printCurrentSlide() {
      document.body.classList.remove('print-all');
      document.body.classList.add('print-current');
      window.print();
    }

    function printAllSlides() {
      document.body.classList.remove('print-current');
      document.body.classList.add('print-all');
      window.print();
    }

    window.addEventListener('afterprint', () => {
      document.body.classList.remove('print-current', 'print-all');
    });
  </script>
</body>
</html>`;
  },

  downloadComparisonHtml(selectedEvents = []) {
    const htmlContent = this.generateComparisonHtml(selectedEvents);
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    const dateStr = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `Comparativa_Palacio_Barolo_${selectedEvents.length}_Eventos_${dateStr}.html`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};
