import ExcelJS from 'exceljs'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { canViewSensitiveData } from './authService.js'

// Paleta de colores oficial Palacio Barolo
const COLORS = {
  navyDark: '1B2A4A',      // Azul Noche Barolo
  navyMedium: '24375A',    // Azul Medio
  navyHeader: '1E293B',    // Slate oscuro para tabla
  goldPrimary: 'D4AF37',   // Dorado Barolo
  goldLight: 'FEF3C7',     // Dorado suave para destacados
  goldBg: 'FFFBEB',        // Fondo crema/dorado tenue
  white: 'FFFFFF',
  slateDark: '0F172A',
  slateLight: 'F8FAFC',    // Fila cebreada
  slateBorder: 'CBD5E1',   // Borde fino
  textMuted: '64748B',
  
  // Semáforo comercial
  statusContratadoBg: 'DCFCE7',
  statusContratadoText: '166534',
  statusReservadoBg: 'DBEAFE',
  statusReservadoText: '1E40AF',
  statusCotizadoBg: 'FEF3C7',
  statusCotizadoText: '92400E',
  statusCanceladoBg: 'FEE2E2',
  statusCanceladoText: '991B1B',

  // Desglose de costos
  producerCostBg: 'EFF6FF',
  producerCostText: '1E40AF',
  baroloCostBg: 'FEF2F2',
  baroloCostText: '991B1B',
  kpiBg: 'F1F5F9'
}

// Formateadores estándar
const CURRENCY_FORMAT = '"$"#,##0.00'
const INTEGER_FORMAT = '#,##0'
const PERCENT_FORMAT = '0.0%'

// Bordes estándar
const thinBorder = {
  top: { style: 'thin', color: { argb: COLORS.slateBorder } },
  left: { style: 'thin', color: { argb: COLORS.slateBorder } },
  bottom: { style: 'thin', color: { argb: COLORS.slateBorder } },
  right: { style: 'thin', color: { argb: COLORS.slateBorder } }
}

const doubleBottomBorder = {
  top: { style: 'thin', color: { argb: COLORS.slateBorder } },
  left: { style: 'thin', color: { argb: COLORS.slateBorder } },
  bottom: { style: 'double', color: { argb: COLORS.navyDark } },
  right: { style: 'thin', color: { argb: COLORS.slateBorder } }
}

// Helper para descargar en navegador
async function saveWorkbook(workbook, filename) {
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.URL.revokeObjectURL(url)
}

// Helper para calcular métricas financieras idénticas a la calculadora
function computeEventMetrics(e) {
  const preventaQty = Number(e.preventa_qty) || 0
  const invitacionesQty = Number(e.invitaciones_qty) || 0
  const preventaPrice = Number(e.preventa_price) || 0
  const preventaTotal = preventaQty * preventaPrice

  const generalQty = Number(e.general_qty ?? e.ticket_qty) || 0
  const generalPrice = Number(e.general_price ?? e.ticket_price) || 0
  const generalTotal = generalQty * generalPrice

  const ticketGrossIncome = preventaTotal + generalTotal
  const totalTickets = preventaQty + generalQty
  const ticketAvgPrice = totalTickets > 0 ? (ticketGrossIncome / totalTickets) : 0

  const alquilerEspacio = Number(e.alquiler_espacio) || 0
  const contratacionSalon = Number(e.contratacion_salon) || 0
  const comisionCatering = Number(e.comision_catering) || 0
  const otrosIngresos = Number(e.otros_ingresos) || 0

  let extraIncomesTotal = 0
  if (Array.isArray(e.extra_incomes)) {
    extraIncomesTotal = e.extra_incomes.reduce((acc, i) => acc + (Number(i.amount ?? i.value) || 0), 0)
  }

  const fixedIncome = alquilerEspacio + contratacionSalon + comisionCatering + otrosIngresos
  const grossIncome = Number(e.gross_income) || (ticketGrossIncome + fixedIncome + extraIncomesTotal)

  // Costos Productor
  const costArtistas = Number(e.cost_artistas) || 0
  const costTecnica = Number(e.cost_tecnica) || 0
  const costDisertantes = Number(e.cost_disertantes) || 0
  const costMobiliario = Number(e.cost_mobiliario) || 0
  const costRrhh = Number(e.cost_rrhh) || 0
  const subtotalProductor = costArtistas + costTecnica + costDisertantes + costMobiliario + costRrhh

  // Costos Barolo
  const costCatering = Number(e.cost_catering) || 0
  const costLimpieza = Number(e.cost_limpieza) || 0
  const costSeguros = Number(e.cost_seguros) || 0
  const costAlquilerEspacio = Number(e.cost_alquiler_espacio) || 0
  const costGastronomicos = Number(e.cost_gastronomicos) || 0
  const costMarketing = Number(e.cost_marketing) || 0
  const costSadaic = Number(e.cost_sadaic) || 0
  const costOtrosOperativos = Number(e.cost_otros_operativos) || 0
  const subtotalBarolo = costCatering + costLimpieza + costSeguros + costAlquilerEspacio + costGastronomicos + costMarketing + costSadaic + costOtrosOperativos

  let extraExpensesTotal = 0
  if (Array.isArray(e.extra_expenses)) {
    extraExpensesTotal = e.extra_expenses.reduce((acc, x) => acc + (Number(x.amount ?? x.value) || 0), 0)
  }

  const totalCosts = Number(e.total_costs) || (subtotalProductor + subtotalBarolo + extraExpensesTotal)
  const netMargin = grossIncome - totalCosts

  // Liquidación según convenio
  const agreement = e.agreement_type || '50% - 50%'
  let baroloProfit = 0
  let producerProfit = 0
  let baroloSplitLabel = '50%'
  let producerSplitLabel = '50%'

  if (agreement === '100% Barolo' || agreement === 'Solo Alquiler') {
    baroloProfit = netMargin
    producerProfit = 0
    baroloSplitLabel = '100%'
    producerSplitLabel = '0%'
  } else if (agreement === '50% - 50%') {
    baroloProfit = netMargin * 0.50
    producerProfit = netMargin * 0.50
    baroloSplitLabel = '50%'
    producerSplitLabel = '50%'
  } else if (agreement === '70% Barolo - 30% Productor') {
    baroloProfit = netMargin * 0.70
    producerProfit = netMargin * 0.30
    baroloSplitLabel = '70%'
    producerSplitLabel = '30%'
  } else if (agreement === '30% Barolo - 70% Productor') {
    baroloProfit = netMargin * 0.30
    producerProfit = netMargin * 0.70
    baroloSplitLabel = '30%'
    producerSplitLabel = '70%'
  } else {
    baroloProfit = Number(e.barolo_profit) || (netMargin * 0.50)
    producerProfit = netMargin - baroloProfit
  }

  const marginPct = grossIncome > 0 ? ((baroloProfit / grossIncome) * 100) : 0

  // Punto de equilibrio
  const breakEvenTickets = ticketAvgPrice > 0 ? Math.ceil(totalCosts / ticketAvgPrice) : 0
  const attendees = Number(e.attendees) || totalTickets || 0
  const breakEvenPct = attendees > 0 ? ((breakEvenTickets / attendees) * 100) : 0

  // Semáforo
  let breakEvenBadge = '🟢 EXCELENTE (< 70% cupos)'
  if (totalCosts === 0) breakEvenBadge = '🟢 SIN COSTOS'
  else if (breakEvenPct > 90) breakEvenBadge = '🔴 RIESGO ALTO (> 90% cupos)'
  else if (breakEvenPct > 70) breakEvenBadge = '🟡 MODERADO (70% - 90% cupos)'

  // Ratios
  const gananciaNetaXAsistente = attendees > 0 ? (baroloProfit / attendees) : 0
  const costoPromedioXAsistente = attendees > 0 ? (totalCosts / attendees) : 0
  const relacionIngresoCosto = totalCosts > 0 ? (grossIncome / totalCosts) : (grossIncome > 0 ? 99 : 0)

  // Dictamen financiero
  let financialAdvice = '✅ VIABILIDAD ECONÓMICA APROBADA: Parámetros dentro de los rangos históricos promedio de Barolo.'
  if (baroloProfit < 0) {
    financialAdvice = '⚠️ ATENCIÓN: El evento proyecta un margen negativo para Barolo. Se sugiere incrementar el valor de entradas o renegociar costos.'
  } else if (breakEvenPct > 90) {
    financialAdvice = '⚠️ RIESGO COMERCIAL ELEVADO: El punto de equilibrio supera el 90% de ocupación. Requiere asegurar preventas firmes.'
  } else if (marginPct >= 30) {
    financialAdvice = '⭐ EXCELENTE RENTABILIDAD: Margen superior al 30% con excelente retorno sobre costo.'
  }

  return {
    preventaQty, preventaPrice, preventaTotal,
    invitacionesQty,
    generalQty, generalPrice, generalTotal,
    totalTickets, ticketAvgPrice,
    alquilerEspacio, contratacionSalon, comisionCatering, otrosIngresos,
    extraIncomesTotal, grossIncome,
    costArtistas, costTecnica, costDisertantes, costMobiliario, costRrhh, subtotalProductor,
    costCatering, costLimpieza, costSeguros, costAlquilerEspacio, costGastronomicos, costMarketing, costSadaic, costOtrosOperativos, subtotalBarolo,
    extraExpensesTotal, totalCosts,
    netMargin, baroloProfit, producerProfit, baroloSplitLabel, producerSplitLabel, marginPct,
    breakEvenTickets, attendees, breakEvenPct, breakEvenBadge,
    gananciaNetaXAsistente, costoPromedioXAsistente, relacionIngresoCosto, financialAdvice
  }
}

export const excelExportService = {

  // =========================================================================
  // 1. EXPORTACIÓN EJECUTIVA MAESTRA DE LA CALCULADORA (6 BLOQUES OFICIALES)
  // =========================================================================
  async exportCalculatorMatrix(eventData, currentUser) {
    if (!eventData) {
      alert('No hay datos para exportar.')
      return
    }

    const m = computeEventMetrics(eventData)
    const canViewSens = canViewSensitiveData(eventData, currentUser)
    const cleanCode = (eventData.calc_code || 'CALC').replace(/[^a-zA-Z0-9_-]/g, '')

    const wb = new ExcelJS.Workbook()
    wb.creator = 'Palacio Barolo — Sistema de Cotizaciones & Liquidaciones'
    wb.created = new Date()

    const ws = wb.addWorksheet('Liquidación Barolo', {
      views: [{ showGridLines: true }]
    })

    // Anchos de columna óptimos
    ws.getColumn(1).width = 28
    ws.getColumn(2).width = 38
    ws.getColumn(3).width = 24
    ws.getColumn(4).width = 38

    // --- ENCABEZADO INSTITUCIONAL ---
    ws.mergeCells('A1:D1')
    const h1 = ws.getCell('A1')
    h1.value = '🏛️ PALACIO BAROLO — MATRIZ EJECUTIVA DE COTIZACIÓN Y LIQUIDACIÓN'
    h1.font = { name: 'Calibri', size: 15, bold: true, color: { argb: COLORS.goldPrimary } }
    h1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.navyDark } }
    h1.alignment = { vertical: 'middle', horizontal: 'center' }
    ws.getRow(1).height = 32

    ws.mergeCells('A2:D2')
    const h2 = ws.getCell('A2')
    h2.value = `Código Oficial: ${eventData.calc_code || eventData.id || 'COTIZACIÓN'} | Emisión: ${format(new Date(), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: es })} hs | Estado: ${(eventData.status || 'COTIZADO').toUpperCase()}`
    h2.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'CBD5E1' } }
    h2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.navyMedium } }
    h2.alignment = { vertical: 'middle', horizontal: 'center' }
    ws.getRow(2).height = 20

    // --- TARJETAS KPIS RÁPIDAS ---
    ws.mergeCells('A4:B4')
    const kpi1 = ws.getCell('A4')
    kpi1.value = `💰 FACTURACIÓN BRUTA: $ ${m.grossIncome.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    kpi1.font = { bold: true, size: 11, color: { argb: COLORS.navyDark } }
    kpi1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E0F2FE' } }
    kpi1.alignment = { vertical: 'middle', horizontal: 'center' }

    ws.mergeCells('C4:D4')
    const kpi2 = ws.getCell('C4')
    kpi2.value = `⭐ GANANCIA PALACIO BAROLO: $ ${m.baroloProfit.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${m.marginPct.toFixed(1)}%)`
    kpi2.font = { bold: true, size: 11, color: { argb: '166534' } }
    kpi2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'DCFCE7' } }
    kpi2.alignment = { vertical: 'middle', horizontal: 'center' }
    ws.getRow(4).height = 26

    let rIdx = 6

    // Helper para sección
    const renderSectionHeader = (title, icon) => {
      ws.mergeCells(rIdx, 1, rIdx, 4)
      const cell = ws.getCell(rIdx, 1)
      cell.value = `${icon} ${title}`
      cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: COLORS.goldPrimary } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.navyDark } }
      cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
      ws.getRow(rIdx).height = 24
      rIdx++
    }

    // Helper para pares clave-valor
    const addParamRow = (l1, v1, l2, v2, isCurrency = false) => {
      const row = ws.getRow(rIdx)
      row.getCell(1).value = l1
      row.getCell(2).value = v1
      row.getCell(3).value = l2
      row.getCell(4).value = v2

      row.getCell(1).font = { bold: true, size: 10, color: { argb: COLORS.slateDark } }
      row.getCell(3).font = { bold: true, size: 10, color: { argb: COLORS.slateDark } }
      row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.slateLight } }
      row.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.slateLight } }
      
      row.getCell(2).font = { size: 10 }
      row.getCell(4).font = { size: 10 }

      if (isCurrency) {
        if (typeof v1 === 'number') row.getCell(2).numFmt = CURRENCY_FORMAT
        if (typeof v2 === 'number') row.getCell(4).numFmt = CURRENCY_FORMAT
      }

      for (let c = 1; c <= 4; c++) row.getCell(c).border = thinBorder
      row.height = 21
      rIdx++
    }

    // ==========================================
    // BLOQUE 1: DATOS GENERALES Y DEL CLIENTE
    // ==========================================
    renderSectionHeader('1. DATOS GENERALES Y DEL CLIENTE', '📋')
    addParamRow('Nombre del Evento', eventData.name || '-', 'Código Liquidación', eventData.calc_code || '-')
    addParamRow('Cliente / Razón Social', eventData.client_name || '-', 'CUIT / DNI', eventData.client_cuit || '-')
    addParamRow('Teléfono de Contacto', eventData.client_contact || '-', 'Correo Electrónico', eventData.client_email || '-')
    addParamRow('Fecha del Evento', eventData.event_date || '-', 'Horario / Mes', `${eventData.event_time || '19:00'} hs (${eventData.month || 'Mes'})`)
    addParamRow('Salón / Espacio', eventData.venue || 'Espacio Barolo', 'Tipo de Evento', eventData.event_type || 'Cultural')
    addParamRow('Origen del Evento', eventData.origin || 'Fundación', 'Tipo de Factura', eventData.invoice_type || 'Factura A')
    addParamRow('Medio de Pago', eventData.payment_method || 'Transferencia', 'Convenio / Split', eventData.agreement_type || '50% - 50%')
    addParamRow('Cupos / Capacidad Total', `${m.attendees} personas`, 'Estado Comercial', (eventData.status || 'cotizado').toUpperCase())
    rIdx++

    // ==========================================
    // BLOQUE 2: DETALLE DE INGRESOS BRUTOS
    // ==========================================
    renderSectionHeader('2. DETALLE DE FACTURACIÓN E INGRESOS BRUTOS', '💵')
    
    // Cabecera tabla ingresos
    const incHRow = ws.getRow(rIdx)
    incHRow.values = ['Concepto de Ingreso', 'Detalle / Cupos', 'Precio Unitario ($)', 'Subtotal Facturado ($)']
    incHRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: COLORS.white }, size: 10 }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.navyHeader } }
      cell.alignment = { vertical: 'middle', horizontal: 'center' }
      cell.border = thinBorder
    })
    incHRow.height = 22
    rIdx++

    const addIncomeItem = (concepto, detalle, pUnit, subtotal) => {
      const row = ws.getRow(rIdx)
      row.values = [concepto, detalle, pUnit, subtotal]
      row.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' }
      row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' }
      row.getCell(3).alignment = { horizontal: 'right', vertical: 'middle' }
      row.getCell(4).alignment = { horizontal: 'right', vertical: 'middle' }
      
      row.getCell(3).numFmt = CURRENCY_FORMAT
      row.getCell(4).numFmt = CURRENCY_FORMAT

      for (let c = 1; c <= 4; c++) {
        row.getCell(c).border = thinBorder
        row.getCell(c).font = { size: 10 }
      }
      row.height = 20
      rIdx++
    }

    addIncomeItem('Entradas Preventa', `${m.preventaQty} tickets`, m.preventaPrice, m.preventaTotal)
    addIncomeItem('Invitaciones Sin Cargo', `${m.invitacionesQty} cortesías`, 0, 0)
    addIncomeItem('Entradas Generales', `${m.generalQty} tickets`, m.generalPrice, m.generalTotal)
    if (Array.isArray(eventData.event_incomes) && eventData.event_incomes.length > 0) {
      eventData.event_incomes.forEach((inc) => {
        const isSens = inc.is_sensitive && !canViewSens
        const val = Number(inc.amount ?? inc.value) || 0
        const catName = inc.category === 'locacion' ? 'Canon Locación' :
          inc.category === 'gastronomia' ? 'Gastronomía / Barra' :
          inc.category === 'produccion' ? 'Canon Producción' :
          inc.category === 'comercial' ? 'Comercial / Sponsor' : 'Ingreso Operativo'
        addIncomeItem(isSens ? '🔒 [Ingreso Confidencial]' : inc.name, catName, val, val)
      })
    } else {
      if (m.alquilerEspacio > 0) addIncomeItem('Alquiler de Espacio', 'Canon locativo base', m.alquilerEspacio, m.alquilerEspacio)
      if (m.contratacionSalon > 0) addIncomeItem('Contratación de Salón', 'Canon adicional salón', m.contratacionSalon, m.contratacionSalon)
      if (m.comisionCatering > 0) addIncomeItem('Comisión de Catering', 'Porcentaje acordado', m.comisionCatering, m.comisionCatering)
      if (m.otrosIngresos > 0) addIncomeItem('Otros Ingresos', 'Conceptos base varios', m.otrosIngresos, m.otrosIngresos)
    }

    if (Array.isArray(eventData.extra_incomes)) {
      eventData.extra_incomes.forEach((inc) => {
        const isSens = inc.is_sensitive && !canViewSens
        const val = Number(inc.amount ?? inc.value) || 0
        addIncomeItem(isSens ? '🔒 [Ingreso Confidencial]' : (inc.concept || 'Ingreso Extra'), 'Ingreso Adicional', val, val)
      })
    }

    // Fila Total Ingresos
    const totIncRow = ws.getRow(rIdx)
    ws.mergeCells(rIdx, 1, rIdx, 3)
    totIncRow.getCell(1).value = 'TOTAL FACTURACIÓN BRUTA (INGRESOS):'
    totIncRow.getCell(1).font = { bold: true, size: 11, color: { argb: COLORS.navyDark } }
    totIncRow.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' }
    totIncRow.getCell(4).value = m.grossIncome
    totIncRow.getCell(4).numFmt = CURRENCY_FORMAT
    totIncRow.getCell(4).font = { bold: true, size: 11, color: { argb: COLORS.navyDark } }
    totIncRow.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E0F2FE' } }
    for (let c = 1; c <= 4; c++) totIncRow.getCell(c).border = doubleBottomBorder
    totIncRow.height = 24
    rIdx += 2

    // ==========================================
    // BLOQUE 3: ESTRUCTURA COMPLETA DE COSTOS
    // ==========================================
    renderSectionHeader('3. ESTRUCTURA COMPLETA DE COSTOS (PRODUCTOR VS BAROLO)', '🏷️')

    const costHRow = ws.getRow(rIdx)
    costHRow.values = ['Clasificación', 'Rubro / Detalle de Gasto', 'Responsable / Asignación', 'Importe ($)']
    costHRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: COLORS.white }, size: 10 }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.navyHeader } }
      cell.alignment = { vertical: 'middle', horizontal: 'center' }
      cell.border = thinBorder
    })
    costHRow.height = 22
    rIdx++

    const sensitiveCostsList = Array.isArray(eventData.sensitive_costs) ? eventData.sensitive_costs : []

    const addCostItem = (clasif, rubro, resp, monto, bg = COLORS.white, costKey = null) => {
      const isSens = costKey && sensitiveCostsList.includes(costKey) && !canViewSens
      const row = ws.getRow(rIdx)
      row.values = [
        clasif, 
        isSens ? `🔒 ${rubro} [CONFIDENCIAL]` : rubro, 
        resp, 
        isSens ? '[CONFIDENCIAL]' : monto
      ]
      row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' }
      row.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' }
      row.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' }
      row.getCell(4).alignment = { horizontal: isSens ? 'center' : 'right', vertical: 'middle' }

      if (isSens) {
        row.getCell(4).font = { italic: true, size: 9, color: { argb: 'DC2626' } }
      } else {
        row.getCell(4).numFmt = CURRENCY_FORMAT
      }

      for (let c = 1; c <= 4; c++) {
        row.getCell(c).border = thinBorder
        if (!isSens || c !== 4) row.getCell(c).font = { size: 10 }
        row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } }
      }
      row.height = 20
      rIdx++
    }

    // Costos Productor
    addCostItem('Costo Productor', 'Honorarios Artistas / Cachets', 'Productor / Tercero', m.costArtistas, COLORS.producerCostBg, 'cost_artistas')
    addCostItem('Costo Productor', 'Honorarios Técnica / Sonido / Luces', 'Productor / Tercero', m.costTecnica, COLORS.producerCostBg, 'cost_tecnica')
    addCostItem('Costo Productor', 'Honorarios Disertantes / Speakers', 'Productor / Tercero', m.costDisertantes, COLORS.producerCostBg, 'cost_disertantes')
    addCostItem('Costo Productor', 'Mobiliario, Vajilla & Ambientación', 'Productor / Tercero', m.costMobiliario, COLORS.producerCostBg, 'cost_mobiliario')
    addCostItem('Costo Productor', 'RRHH Salón, Personal & Seguridad', 'Productor / Tercero', m.costRrhh, COLORS.producerCostBg, 'cost_rrhh')

    // Subtotal Productor
    const subProdRow = ws.getRow(rIdx)
    ws.mergeCells(rIdx, 1, rIdx, 3)
    subProdRow.getCell(1).value = 'SUBTOTAL COSTOS PRODUCTOR / ARTÍSTICOS:'
    subProdRow.getCell(1).font = { bold: true, size: 10, color: { argb: '1E40AF' } }
    subProdRow.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' }
    subProdRow.getCell(4).value = m.subtotalProductor
    subProdRow.getCell(4).numFmt = CURRENCY_FORMAT
    subProdRow.getCell(4).font = { bold: true, size: 10, color: { argb: '1E40AF' } }
    subProdRow.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'DBEAFE' } }
    for (let c = 1; c <= 4; c++) subProdRow.getCell(c).border = thinBorder
    subProdRow.height = 22
    rIdx++

    // Costos Barolo
    addCostItem('Costo Barolo', 'Catering, Alimentos & Bebidas', 'Palacio Barolo', m.costCatering, COLORS.baroloCostBg, 'cost_catering')
    addCostItem('Costo Barolo', 'Limpieza Integral Post-Evento', 'Palacio Barolo', m.costLimpieza, COLORS.baroloCostBg, 'cost_limpieza')
    addCostItem('Costo Barolo', 'Seguros de Responsabilidad Civil', 'Palacio Barolo', m.costSeguros, COLORS.baroloCostBg, 'cost_seguros')
    addCostItem('Costo Barolo', 'Alquiler de Espacio Barolo (Costo)', 'Palacio Barolo', m.costAlquilerEspacio, COLORS.baroloCostBg, 'cost_alquiler_espacio')
    addCostItem('Costo Barolo', 'Gastronómicos / Insumos Salón', 'Palacio Barolo', m.costGastronomicos, COLORS.baroloCostBg, 'cost_gastronomicos')
    addCostItem('Costo Barolo', 'Marketing, Redes & Publicidad', 'Palacio Barolo', m.costMarketing, COLORS.baroloCostBg, 'cost_marketing')
    addCostItem('Costo Barolo', 'Derechos SADAIC / AADI CAPIF', 'Palacio Barolo', m.costSadaic, COLORS.baroloCostBg, 'cost_sadaic')
    addCostItem('Costo Barolo', 'Otros Gastos Operativos', 'Palacio Barolo', m.costOtrosOperativos, COLORS.baroloCostBg, 'cost_otros_operativos')

    if (Array.isArray(eventData.extra_expenses)) {
      eventData.extra_expenses.forEach((exp) => {
        const isSens = exp.is_sensitive && !canViewSens
        const val = Number(exp.amount ?? exp.value) || 0
        addCostItem('Gasto Adicional', isSens ? '🔒 [Gasto Confidencial]' : (exp.concept || 'Gasto Extra'), 'Operativo', val, COLORS.slateLight)
      })
    }

    // Subtotal Barolo
    const subBaroloRow = ws.getRow(rIdx)
    ws.mergeCells(rIdx, 1, rIdx, 3)
    subBaroloRow.getCell(1).value = 'SUBTOTAL COSTOS PALACIO BAROLO / OPERATIVOS:'
    subBaroloRow.getCell(1).font = { bold: true, size: 10, color: { argb: '991B1B' } }
    subBaroloRow.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' }
    subBaroloRow.getCell(4).value = m.subtotalBarolo + m.extraExpensesTotal
    subBaroloRow.getCell(4).numFmt = CURRENCY_FORMAT
    subBaroloRow.getCell(4).font = { bold: true, size: 10, color: { argb: '991B1B' } }
    subBaroloRow.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEE2E2' } }
    for (let c = 1; c <= 4; c++) subBaroloRow.getCell(c).border = thinBorder
    subBaroloRow.height = 22
    rIdx++

    // Fila TOTAL COSTOS
    const totCostRow = ws.getRow(rIdx)
    ws.mergeCells(rIdx, 1, rIdx, 3)
    totCostRow.getCell(1).value = 'TOTAL COSTOS DEL EVENTO (PRODUCTOR + BAROLO):'
    totCostRow.getCell(1).font = { bold: true, size: 11, color: { argb: '991B1B' } }
    totCostRow.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' }
    totCostRow.getCell(4).value = m.totalCosts
    totCostRow.getCell(4).numFmt = CURRENCY_FORMAT
    totCostRow.getCell(4).font = { bold: true, size: 11, color: { argb: '991B1B' } }
    totCostRow.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEE2E2' } }
    for (let c = 1; c <= 4; c++) totCostRow.getCell(c).border = doubleBottomBorder
    totCostRow.height = 24
    rIdx += 2

    // ==========================================
    // BLOQUE 4: LIQUIDACIÓN Y DISTRIBUCIÓN DE GANANCIAS
    // ==========================================
    renderSectionHeader('4. LIQUIDACIÓN Y DISTRIBUCIÓN DE MARGEN NETO', '⚖️')
    addParamRow('Total Facturación Bruta', m.grossIncome, 'Total Costos del Evento', -m.totalCosts, true)
    addParamRow('Margen Bruto de la Operación', m.netMargin, 'Convenio Aplicado', eventData.agreement_type || '50% - 50%', true)
    addParamRow(`⭐ GANANCIA NETA PALACIO BAROLO (${m.baroloSplitLabel})`, m.baroloProfit, `🎭 Ganancia Productor / Cliente (${m.producerSplitLabel})`, m.producerProfit, true)
    rIdx++

    // ==========================================
    // BLOQUE 5: ANÁLISIS DE PUNTO DE EQUILIBRIO (BREAK-EVEN)
    // ==========================================
    renderSectionHeader('5. ANÁLISIS DEL PUNTO DE EQUILIBRIO (BREAK-EVEN)', '🎯')
    addParamRow('Costos Fijos a Cubrir ($)', m.totalCosts, 'Precio Promedio x Entrada ($)', m.ticketAvgPrice, true)
    addParamRow('Entradas Necesarias (PE)', `${m.breakEvenTickets} tickets`, 'Capacidad / Cupos Totales', `${m.attendees} personas`)
    addParamRow('% Ocupación Necesaria para PE', `${m.breakEvenPct.toFixed(1)}%`, 'Semáforo de Viabilidad', m.breakEvenBadge)
    rIdx++

    // ==========================================
    // BLOQUE 6: EVALUACIÓN FINANCIERA & RATIOS
    // ==========================================
    renderSectionHeader('6. EVALUACIÓN FINANCIERA & RATIOS POR ASISTENTE', '📊')
    addParamRow('Margen % sobre Facturación', `${m.marginPct.toFixed(1)}%`, 'Relación Ingreso / Costo', `${m.relacionIngresoCosto.toFixed(2)}x`)
    addParamRow('Ganancia Neta x Asistente ($)', m.gananciaNetaXAsistente, 'Costo Promedio x Asistente ($)', m.costoPromedioXAsistente, true)

    // Dictamen oficial
    ws.mergeCells(rIdx, 1, rIdx, 4)
    const dictCell = ws.getCell(rIdx, 1)
    dictCell.value = `DIAGNOSTICO FINANCIERO OFICIAL: ${m.financialAdvice}`
    dictCell.font = { bold: true, size: 10, color: { argb: COLORS.navyDark } }
    dictCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.goldLight } }
    dictCell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true, indent: 1 }
    for (let c = 1; c <= 4; c++) ws.getCell(rIdx, c).border = thinBorder
    ws.getRow(rIdx).height = 28
    rIdx += 2

    // ==========================================
    // NOTAS Y CONDICIONES
    // ==========================================
    renderSectionHeader('NOTAS COMERCIALES & OPERATIVAS', '📝')
    ws.mergeCells(rIdx, 1, rIdx + 2, 4)
    const notesCell = ws.getCell(rIdx, 1)
    const cleanNotes = eventData.notes ? eventData.notes.replace(/<!--[\s\S]*?-->/g, '').trim() : 'Sin notas registradas.'
    notesCell.value = cleanNotes
    notesCell.font = { size: 10, italic: true }
    notesCell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true }
    for (let r = rIdx; r <= rIdx + 2; r++) {
      for (let c = 1; c <= 4; c++) ws.getCell(r, c).border = thinBorder
    }
    rIdx += 3

    if (canViewSens && eventData.sensitive_notes) {
      rIdx++
      renderSectionHeader('NOTAS CONFIDENCIALES / PRIVADAS (RESTRINGIDO)', '🔒')
      ws.mergeCells(rIdx, 1, rIdx + 1, 4)
      const sensCell = ws.getCell(rIdx, 1)
      sensCell.value = eventData.sensitive_notes
      sensCell.font = { size: 10, italic: true, color: { argb: '991B1B' } }
      sensCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEF2F2' } }
      sensCell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true }
      for (let r = rIdx; r <= rIdx + 1; r++) {
        for (let c = 1; c <= 4; c++) ws.getCell(r, c).border = thinBorder
      }
    }

    await saveWorkbook(wb, `Palacio_Barolo_Liquidacion_${cleanCode}.xlsx`)
  },

  // =========================================================================
  // 2. EXPORTACIÓN MAESTRA DE TODOS LOS EVENTOS (MULTI-PESTAÑA CON 34+ CAMPOS)
  // =========================================================================
  async exportEventsToExcel(events, filename = 'Palacio_Barolo_Eventos_Completo.xlsx', sheetTitle = 'Matriz General') {
    if (!events || events.length === 0) {
      alert('No hay eventos para exportar.')
      return
    }

    const wb = new ExcelJS.Workbook()
    wb.creator = 'Palacio Barolo — Sistema de Gestión Comercial'
    wb.created = new Date()

    // -----------------------------------------------------------------------
    // PESTAÑA 1: MATRIZ GENERAL COMPLETA (34+ COLUMNAS ANALÍTICAS)
    // -----------------------------------------------------------------------
    const ws1 = wb.addWorksheet(sheetTitle.substring(0, 31), {
      views: [{ state: 'frozen', xSplit: 2, ySplit: 7 }]
    })

    const totalGross = events.reduce((sum, e) => sum + (Number(e.gross_income) || 0), 0)
    const totalCosts = events.reduce((sum, e) => sum + (Number(e.total_costs) || 0), 0)
    const totalProfit = events.reduce((sum, e) => sum + (Number(e.barolo_profit) || 0), 0)
    const avgMargin = totalGross > 0 ? (totalProfit / totalGross) : 0

    // Banner titular
    ws1.mergeCells('A1:R1')
    const titleCell = ws1.getCell('A1')
    titleCell.value = '🏛️ PALACIO BAROLO — BASE MAESTRA HISTÓRICA DE EVENTOS & LIQUIDACIONES'
    titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: COLORS.goldPrimary } }
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.navyDark } }
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' }
    ws1.getRow(1).height = 32

    ws1.mergeCells('A2:R2')
    const subCell = ws1.getCell('A2')
    subCell.value = `Generado el ${format(new Date(), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: es })} hs | Total de eventos: ${events.length}`
    subCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'CBD5E1' } }
    subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.navyMedium } }
    subCell.alignment = { vertical: 'middle', horizontal: 'center' }
    ws1.getRow(2).height = 20

    // Tarjetas KPIs
    ws1.mergeCells('B4:D4')
    ws1.mergeCells('F4:H4')
    ws1.mergeCells('J4:L4')
    ws1.mergeCells('N4:P4')

    ws1.getCell('B4').value = `🎟️ Eventos Registrados: ${events.length}`
    ws1.getCell('B4').font = { bold: true, size: 11, color: { argb: COLORS.navyDark } }
    ws1.getCell('B4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E2E8F0' } }
    ws1.getCell('B4').alignment = { horizontal: 'center', vertical: 'middle' }

    ws1.getCell('F4').value = `💰 Facturación: $ ${totalGross.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    ws1.getCell('F4').font = { bold: true, size: 11, color: { argb: COLORS.navyDark } }
    ws1.getCell('F4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E0F2FE' } }
    ws1.getCell('F4').alignment = { horizontal: 'center', vertical: 'middle' }

    ws1.getCell('J4').value = `🎭 Costos Totales: $ ${totalCosts.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    ws1.getCell('J4').font = { bold: true, size: 11, color: { argb: '991B1B' } }
    ws1.getCell('J4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEE2E2' } }
    ws1.getCell('J4').alignment = { horizontal: 'center', vertical: 'middle' }

    ws1.getCell('N4').value = `⭐ Ganancia Barolo: $ ${totalProfit.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${(avgMargin * 100).toFixed(1)}%)`
    ws1.getCell('N4').font = { bold: true, size: 11, color: { argb: '166534' } }
    ws1.getCell('N4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'DCFCE7' } }
    ws1.getCell('N4').alignment = { horizontal: 'center', vertical: 'middle' }
    ws1.getRow(4).height = 24
    ws1.getRow(5).height = 10

    // Columnas completas de la matriz analítica
    const masterHeaders = [
      { header: 'Código ID', key: 'calc_code', width: 14, align: 'center' },
      { header: 'Nombre del Evento', key: 'name', width: 34, align: 'left' },
      { header: 'Cliente / Empresa', key: 'client_name', width: 25, align: 'left' },
      { header: 'CUIT / DNI', key: 'client_cuit', width: 16, align: 'center' },
      { header: 'Contacto Tel.', key: 'client_contact', width: 18, align: 'center' },
      { header: 'Email Cliente', key: 'client_email', width: 25, align: 'left' },
      { header: 'Estado', key: 'status', width: 14, align: 'center' },
      { header: 'Fecha Evento', key: 'event_date', width: 13, align: 'center' },
      { header: 'Horario', key: 'event_time', width: 11, align: 'center' },
      { header: 'Mes', key: 'month', width: 13, align: 'center' },
      { header: 'Salón', key: 'venue', width: 22, align: 'left' },
      { header: 'Tipo Evento', key: 'event_type', width: 16, align: 'center' },
      { header: 'Origen', key: 'origin', width: 16, align: 'center' },
      { header: 'Facturación', key: 'invoice_type', width: 16, align: 'center' },
      { header: 'Medio Pago', key: 'payment_method', width: 18, align: 'center' },
      { header: 'Convenio / Split', key: 'agreement_type', width: 20, align: 'left' },
      { header: 'Cupos / Pax', key: 'attendees', width: 12, align: 'right', numFmt: INTEGER_FORMAT },
      { header: 'Tickets Preventa', key: 'preventa_qty', width: 14, align: 'right', numFmt: INTEGER_FORMAT },
      { header: 'Precio Preventa ($)', key: 'preventa_price', width: 16, align: 'right', numFmt: CURRENCY_FORMAT },
      { header: 'Invitaciones Sin Cargo', key: 'invitaciones_qty', width: 18, align: 'right', numFmt: INTEGER_FORMAT },
      { header: 'Tickets General', key: 'general_qty', width: 14, align: 'right', numFmt: INTEGER_FORMAT },
      { header: 'Precio General ($)', key: 'general_price', width: 16, align: 'right', numFmt: CURRENCY_FORMAT },
      { header: 'Total Facturación ($)', key: 'gross_income', width: 20, align: 'right', numFmt: CURRENCY_FORMAT },
      { header: 'Costos Productor ($)', key: 'subtotal_productor', width: 19, align: 'right', numFmt: CURRENCY_FORMAT },
      { header: 'Costos Barolo ($)', key: 'subtotal_barolo', width: 19, align: 'right', numFmt: CURRENCY_FORMAT },
      { header: 'Costos Totales ($)', key: 'total_costs', width: 19, align: 'right', numFmt: CURRENCY_FORMAT },
      { header: 'Margen Bruto ($)', key: 'net_margin', width: 19, align: 'right', numFmt: CURRENCY_FORMAT },
      { header: 'Ganancia Barolo ($)', key: 'barolo_profit', width: 20, align: 'right', numFmt: CURRENCY_FORMAT },
      { header: 'Ganancia Productor ($)', key: 'producer_profit', width: 20, align: 'right', numFmt: CURRENCY_FORMAT },
      { header: 'Margen Barolo (%)', key: 'margin_pct', width: 16, align: 'right', numFmt: PERCENT_FORMAT },
      { header: 'PE Tickets', key: 'break_even_tickets', width: 13, align: 'right', numFmt: INTEGER_FORMAT },
      { header: 'PE Ocupación (%)', key: 'break_even_pct', width: 16, align: 'right', numFmt: PERCENT_FORMAT },
      { header: 'Ganancia x Pax ($)', key: 'profit_per_pax', width: 18, align: 'right', numFmt: CURRENCY_FORMAT },
      { header: 'Costo x Pax ($)', key: 'cost_per_pax', width: 18, align: 'right', numFmt: CURRENCY_FORMAT },
      { header: 'Ratio Ingreso/Costo', key: 'ratio_ic', width: 18, align: 'right' }
    ]

    const hRow = ws1.getRow(6)
    masterHeaders.forEach((h, idx) => {
      const cell = hRow.getCell(idx + 1)
      cell.value = h.header
      cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.white } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.navyHeader } }
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
      cell.border = thinBorder
      ws1.getColumn(idx + 1).width = h.width
    })
    hRow.height = 28

    let rowIdx = 7
    events.forEach((ev, idx) => {
      const m = computeEventMetrics(ev)
      const row = ws1.getRow(rowIdx)
      const isEven = idx % 2 === 0
      const rowBg = isEven ? COLORS.white : COLORS.slateLight

      row.values = [
        ev.calc_code || ev.id || '-',
        ev.name || '',
        ev.client_name || 'Particular',
        ev.client_cuit || '-',
        ev.client_contact || '-',
        ev.client_email || '-',
        (ev.status || 'cotizado').toUpperCase(),
        ev.event_date || '',
        ev.event_time || '19:00',
        ev.month || '',
        ev.venue || '',
        ev.event_type || '',
        ev.origin || '',
        ev.invoice_type || '',
        ev.payment_method || '',
        ev.agreement_type || '',
        m.attendees,
        m.preventaQty,
        m.preventaPrice,
        m.invitacionesQty,
        m.generalQty,
        m.generalPrice,
        m.grossIncome,
        m.subtotalProductor,
        m.subtotalBarolo + m.extraExpensesTotal,
        m.totalCosts,
        m.netMargin,
        m.baroloProfit,
        m.producerProfit,
        m.marginPct / 100,
        m.breakEvenTickets,
        m.breakEvenPct / 100,
        m.gananciaNetaXAsistente,
        m.costoPromedioXAsistente,
        `${m.relacionIngresoCosto.toFixed(2)}x`
      ]

      masterHeaders.forEach((h, colIdx) => {
        const cell = row.getCell(colIdx + 1)
        cell.font = { name: 'Calibri', size: 10 }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } }
        cell.border = thinBorder
        cell.alignment = { vertical: 'middle', horizontal: h.align || 'left' }
        if (h.numFmt) cell.numFmt = h.numFmt
      })

      // Semáforo Estado
      const stCell = row.getCell(7)
      const st = (ev.status || '').toLowerCase()
      if (st === 'contratado') {
        stCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.statusContratadoBg } }
        stCell.font = { bold: true, color: { argb: COLORS.statusContratadoText }, size: 9 }
      } else if (st === 'reservado') {
        stCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.statusReservadoBg } }
        stCell.font = { bold: true, color: { argb: COLORS.statusReservadoText }, size: 9 }
      } else if (st === 'cancelado') {
        stCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.statusCanceladoBg } }
        stCell.font = { bold: true, color: { argb: COLORS.statusCanceladoText }, size: 9 }
      } else {
        stCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.statusCotizadoBg } }
        stCell.font = { bold: true, color: { argb: COLORS.statusCotizadoText }, size: 9 }
      }

      row.height = 20
      rowIdx++
    })

    // -----------------------------------------------------------------------
    // PESTAÑA 2: RESUMEN Y RENTABILIDAD POR SALÓN
    // -----------------------------------------------------------------------
    const ws2 = wb.addWorksheet('Rentabilidad por Salón', {
      views: [{ showGridLines: true }]
    })

    ws2.getColumn(1).width = 28
    ws2.getColumn(2).width = 16
    ws2.getColumn(3).width = 22
    ws2.getColumn(4).width = 22
    ws2.getColumn(5).width = 22
    ws2.getColumn(6).width = 16
    ws2.getColumn(7).width = 16

    ws2.mergeCells('A1:G1')
    ws2.getCell('A1').value = '🏛️ PALACIO BAROLO — CONSOLIDADO DE RENDIMIENTO POR SALÓN'
    ws2.getCell('A1').font = { size: 14, bold: true, color: { argb: COLORS.goldPrimary } }
    ws2.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.navyDark } }
    ws2.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' }
    ws2.getRow(1).height = 30

    const venueHeaders = ['Espacio / Salón', 'Total Eventos', 'Facturación Total ($)', 'Costos Totales ($)', 'Ganancia Barolo ($)', 'Margen Prom. (%)', 'Asistentes Total']
    const vHRow = ws2.getRow(3)
    vHRow.values = venueHeaders
    vHRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: COLORS.white }, size: 10 }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.navyHeader } }
      cell.alignment = { vertical: 'middle', horizontal: 'center' }
      cell.border = thinBorder
    })
    vHRow.height = 24

    // Agrupación por salón
    const venueMap = new Map()
    events.forEach(e => {
      const v = e.venue || 'Sin Asignar'
      if (!venueMap.has(v)) {
        venueMap.set(v, { count: 0, gross: 0, costs: 0, profit: 0, attendees: 0 })
      }
      const data = venueMap.get(v)
      data.count++
      data.gross += Number(e.gross_income) || 0
      data.costs += Number(e.total_costs) || 0
      data.profit += Number(e.barolo_profit) || 0
      data.attendees += Number(e.attendees) || 0
    })

    let vIdx = 4
    venueMap.forEach((val, key) => {
      const row = ws2.getRow(vIdx)
      const avgM = val.gross > 0 ? (val.profit / val.gross) : 0
      row.values = [key, val.count, val.gross, val.costs, val.profit, avgM, val.attendees]
      row.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' }
      row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' }
      row.getCell(3).alignment = { horizontal: 'right', vertical: 'middle' }
      row.getCell(4).alignment = { horizontal: 'right', vertical: 'middle' }
      row.getCell(5).alignment = { horizontal: 'right', vertical: 'middle' }
      row.getCell(6).alignment = { horizontal: 'right', vertical: 'middle' }
      row.getCell(7).alignment = { horizontal: 'right', vertical: 'middle' }

      row.getCell(3).numFmt = CURRENCY_FORMAT
      row.getCell(4).numFmt = CURRENCY_FORMAT
      row.getCell(5).numFmt = CURRENCY_FORMAT
      row.getCell(6).numFmt = PERCENT_FORMAT
      row.getCell(7).numFmt = INTEGER_FORMAT

      for (let c = 1; c <= 7; c++) {
        row.getCell(c).border = thinBorder
        row.getCell(c).font = { size: 10 }
        row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: vIdx % 2 === 0 ? COLORS.white : COLORS.slateLight } }
      }
      row.height = 20
      vIdx++
    })

    // -----------------------------------------------------------------------
    // PESTAÑA 3: ESTRUCTURA ACUMULADA DE COSTOS
    // -----------------------------------------------------------------------
    const ws3 = wb.addWorksheet('Estructura de Costos', {
      views: [{ showGridLines: true }]
    })

    ws3.getColumn(1).width = 34
    ws3.getColumn(2).width = 24
    ws3.getColumn(3).width = 20
    ws3.getColumn(4).width = 20

    ws3.mergeCells('A1:D1')
    ws3.getCell('A1').value = '🏛️ PALACIO BAROLO — ESTRUCTURA HISTÓRICA POR RUBRO DE COSTO'
    ws3.getCell('A1').font = { size: 14, bold: true, color: { argb: COLORS.goldPrimary } }
    ws3.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.navyDark } }
    ws3.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' }
    ws3.getRow(1).height = 30

    const costCatHeaders = ['Rubro de Costo', 'Gasto Acumulado ($)', '% s/ Costo Total', 'Promedio x Evento ($)']
    const cHRow = ws3.getRow(3)
    cHRow.values = costCatHeaders
    cHRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: COLORS.white }, size: 10 }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.navyHeader } }
      cell.alignment = { vertical: 'middle', horizontal: 'center' }
      cell.border = thinBorder
    })
    cHRow.height = 24

    const costCats = [
      { name: 'Honorarios Artistas / Cachets', key: 'cost_artistas' },
      { name: 'Honorarios Técnica / Sonido', key: 'cost_tecnica' },
      { name: 'Honorarios Disertantes', key: 'cost_disertantes' },
      { name: 'Mobiliario & Montaje', key: 'cost_mobiliario' },
      { name: 'RRHH Salón & Seguridad', key: 'cost_rrhh' },
      { name: 'Catering & Bebidas', key: 'cost_catering' },
      { name: 'Limpieza Integral Post-Evento', key: 'cost_limpieza' },
      { name: 'Seguros de Responsabilidad Civil', key: 'cost_seguros' },
      { name: 'Alquiler de Espacio Barolo (Costo)', key: 'cost_alquiler_espacio' },
      { name: 'Gastronómicos / Insumos Salón', key: 'cost_gastronomicos' },
      { name: 'Marketing & Publicidad', key: 'cost_marketing' },
      { name: 'Derechos SADAIC / AADI CAPIF', key: 'cost_sadaic' },
      { name: 'Otros Operativos', key: 'cost_otros_operativos' }
    ]

    let cIdx = 4
    costCats.forEach(cat => {
      const sum = events.reduce((acc, e) => acc + (Number(e[cat.key]) || 0), 0)
      const pct = totalCosts > 0 ? (sum / totalCosts) : 0
      const avg = events.length > 0 ? (sum / events.length) : 0
      const row = ws3.getRow(cIdx)
      row.values = [cat.name, sum, pct, avg]
      row.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' }
      row.getCell(2).alignment = { horizontal: 'right', vertical: 'middle' }
      row.getCell(3).alignment = { horizontal: 'right', vertical: 'middle' }
      row.getCell(4).alignment = { horizontal: 'right', vertical: 'middle' }

      row.getCell(2).numFmt = CURRENCY_FORMAT
      row.getCell(3).numFmt = PERCENT_FORMAT
      row.getCell(4).numFmt = CURRENCY_FORMAT

      for (let c = 1; c <= 4; c++) {
        row.getCell(c).border = thinBorder
        row.getCell(c).font = { size: 10 }
        row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: cIdx % 2 === 0 ? COLORS.white : COLORS.slateLight } }
      }
      row.height = 20
      cIdx++
    })

    await saveWorkbook(wb, filename)
  },

  // Alias
  exportAllEvents(events) {
    this.exportEventsToExcel(events, 'Palacio_Barolo_Eventos_Completo.xlsx', 'Matriz General')
  },

  // Exportar Mes Específico
  async exportMonthToExcel(events, monthDate = new Date()) {
    let monthKey = ''
    let monthLabel = ''
    let monthName = ''

    if (typeof monthDate === 'string') {
      monthKey = monthDate.substring(0, 7)
      try {
        const d = parseISO(monthKey + '-01')
        monthLabel = format(d, 'MMMM_yyyy', { locale: es })
        monthName = format(d, 'MMMM yyyy', { locale: es })
      } catch (err) {
        monthLabel = monthKey
        monthName = monthKey
      }
    } else {
      monthKey = format(monthDate, 'yyyy-MM')
      monthLabel = format(monthDate, 'MMMM_yyyy', { locale: es })
      monthName = format(monthDate, 'MMMM yyyy', { locale: es })
    }
    
    const inMonth = events.filter(e => e.event_date && e.event_date.startsWith(monthKey))
    if (inMonth.length === 0) {
      alert('No hay eventos registrados en ' + monthName + ' para exportar.')
      return
    }

    const title = `Eventos ${monthName.toUpperCase()}`
    const filename = `Palacio_Barolo_Eventos_${monthLabel}.xlsx`
    await this.exportEventsToExcel(inMonth, filename, title)
  },

  exportMonthEvents(events, monthDate) {
    this.exportMonthToExcel(events, monthDate)
  },

  // =========================================================================
  // 3. COMPARATIVA LADO A LADO ENRIQUECIDA
  // =========================================================================
  async exportComparisonToExcel(selectedEvents) {
    if (!selectedEvents || selectedEvents.length < 2) {
      alert('Seleccioná al menos 2 eventos para exportar la comparativa.')
      return
    }

    const wb = new ExcelJS.Workbook()
    wb.creator = 'Palacio Barolo'
    wb.created = new Date()

    const ws = wb.addWorksheet('Comparativa de Eventos', {
      views: [{ state: 'frozen', xSplit: 2, ySplit: 5 }]
    })

    const totalCols = selectedEvents.length + 2

    ws.mergeCells(1, 1, 1, totalCols)
    ws.getCell(1, 1).value = '⚖️ PALACIO BAROLO — MATRIZ COMPARATIVA DE EVENTOS & COSTOS ASOCIADOS'
    ws.getCell(1, 1).font = { name: 'Calibri', size: 15, bold: true, color: { argb: COLORS.goldPrimary } }
    ws.getCell(1, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.navyDark } }
    ws.getCell(1, 1).alignment = { vertical: 'middle', horizontal: 'center' }
    ws.getRow(1).height = 32

    ws.mergeCells(2, 1, 2, totalCols)
    ws.getCell(2, 1).value = `Análisis comparativo de ${selectedEvents.length} eventos | Generado el ${format(new Date(), "dd/MM/yyyy HH:mm")} hs`
    ws.getCell(2, 1).font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'CBD5E1' } }
    ws.getCell(2, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.navyMedium } }
    ws.getCell(2, 1).alignment = { vertical: 'middle', horizontal: 'center' }
    ws.getRow(2).height = 20
    ws.getRow(3).height = 10

    ws.getColumn(1).width = 22
    ws.getColumn(2).width = 30

    const headerRow = ws.getRow(5)
    headerRow.getCell(1).value = 'Rubro / Categoría'
    headerRow.getCell(2).value = 'Parámetro Financiero'
    headerRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.navyHeader } }
    headerRow.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.navyHeader } }
    headerRow.getCell(1).font = { bold: true, color: { argb: COLORS.white }, size: 10 }
    headerRow.getCell(2).font = { bold: true, color: { argb: COLORS.white }, size: 10 }
    headerRow.getCell(1).border = thinBorder
    headerRow.getCell(2).border = thinBorder

    selectedEvents.forEach((e, idx) => {
      const col = idx + 3
      ws.getColumn(col).width = 26
      const cell = headerRow.getCell(col)
      cell.value = `${e.calc_code || 'CALC'}\n${e.name || ''}`
      cell.font = { bold: true, color: { argb: COLORS.white }, size: 10 }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.navyHeader } }
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
      cell.border = thinBorder
    })
    headerRow.height = 36

    const compMetrics = selectedEvents.map(computeEventMetrics)

    const params = [
      { cat: 'GENERAL', label: 'Cliente / Empresa', getter: (e) => e.client_name || '-' },
      { cat: 'GENERAL', label: 'Fecha de Realización', getter: (e) => e.event_date || '-' },
      { cat: 'GENERAL', label: 'Salón Asignado', getter: (e) => e.venue || '-' },
      { cat: 'GENERAL', label: 'Tipo de Evento', getter: (e) => e.event_type || '-' },
      { cat: 'GENERAL', label: 'Convenio / Split', getter: (e) => e.agreement_type || '-' },
      { cat: 'GENERAL', label: 'Cupos / Asistentes', getter: (e, m) => m.attendees, numFmt: INTEGER_FORMAT },

      { cat: 'INGRESOS', label: 'Tickets Preventa (Qty x $)', getter: (e, m) => `${m.preventaQty} x $${m.preventaPrice.toLocaleString('es-AR')}` },
      { cat: 'INGRESOS', label: 'Tickets Generales (Qty x $)', getter: (e, m) => `${m.generalQty} x $${m.generalPrice.toLocaleString('es-AR')}` },
      { cat: 'INGRESOS', label: 'Alquiler de Espacio ($)', getter: (e, m) => m.alquilerEspacio, numFmt: CURRENCY_FORMAT },
      { cat: 'INGRESOS', label: 'Facturación Bruta Total ($)', getter: (e, m) => m.grossIncome, numFmt: CURRENCY_FORMAT, bold: true, bg: 'E0F2FE' },

      { cat: 'COSTOS', label: 'Artistas / Cachets ($)', getter: (e, m) => m.costArtistas, numFmt: CURRENCY_FORMAT },
      { cat: 'COSTOS', label: 'Técnica / Sonido ($)', getter: (e, m) => m.costTecnica, numFmt: CURRENCY_FORMAT },
      { cat: 'COSTOS', label: 'Mobiliario & Montaje ($)', getter: (e, m) => m.costMobiliario, numFmt: CURRENCY_FORMAT },
      { cat: 'COSTOS', label: 'RRHH Salón ($)', getter: (e, m) => m.costRrhh, numFmt: CURRENCY_FORMAT },
      { cat: 'COSTOS', label: 'Catering ($)', getter: (e, m) => m.costCatering, numFmt: CURRENCY_FORMAT },
      { cat: 'COSTOS', label: 'Limpieza Integral ($)', getter: (e, m) => m.costLimpieza, numFmt: CURRENCY_FORMAT },
      { cat: 'COSTOS', label: 'Seguros ($)', getter: (e, m) => m.costSeguros, numFmt: CURRENCY_FORMAT },
      { cat: 'COSTOS', label: 'Gastronómicos Salón ($)', getter: (e, m) => m.costGastronomicos, numFmt: CURRENCY_FORMAT },
      { cat: 'COSTOS', label: 'Costos Subtotal Productor ($)', getter: (e, m) => m.subtotalProductor, numFmt: CURRENCY_FORMAT, bold: true },
      { cat: 'COSTOS', label: 'Costos Subtotal Barolo ($)', getter: (e, m) => m.subtotalBarolo + m.extraExpensesTotal, numFmt: CURRENCY_FORMAT, bold: true },
      { cat: 'COSTOS', label: 'Costos Totales del Evento ($)', getter: (e, m) => m.totalCosts, numFmt: CURRENCY_FORMAT, bold: true, bg: 'FEE2E2' },

      { cat: 'LIQUIDACIÓN', label: 'Margen Bruto Operación ($)', getter: (e, m) => m.netMargin, numFmt: CURRENCY_FORMAT, bold: true },
      { cat: 'LIQUIDACIÓN', label: 'Ganancia Neta Barolo ($)', getter: (e, m) => m.baroloProfit, numFmt: CURRENCY_FORMAT, bold: true, bg: 'DCFCE7' },
      { cat: 'LIQUIDACIÓN', label: 'Ganancia Productor ($)', getter: (e, m) => m.producerProfit, numFmt: CURRENCY_FORMAT },
      { cat: 'LIQUIDACIÓN', label: 'Margen Rentabilidad (%)', getter: (e, m) => m.marginPct / 100, numFmt: PERCENT_FORMAT, bold: true },

      { cat: 'RATIOS', label: 'Punto de Equilibrio (Tickets)', getter: (e, m) => `${m.breakEvenTickets} tickets` },
      { cat: 'RATIOS', label: 'Punto de Equilibrio (Ocupación)', getter: (e, m) => m.breakEvenPct / 100, numFmt: PERCENT_FORMAT },
      { cat: 'RATIOS', label: 'Ganancia Neta x Asistente ($)', getter: (e, m) => m.gananciaNetaXAsistente, numFmt: CURRENCY_FORMAT },
      { cat: 'RATIOS', label: 'Costo Promedio x Asistente ($)', getter: (e, m) => m.costoPromedioXAsistente, numFmt: CURRENCY_FORMAT },
      { cat: 'RATIOS', label: 'Relación Ingreso / Costo', getter: (e, m) => `${m.relacionIngresoCosto.toFixed(2)}x` }
    ]

    let cRowIdx = 6
    params.forEach((p, idx) => {
      const row = ws.getRow(cRowIdx)
      row.getCell(1).value = p.cat
      row.getCell(2).value = p.label
      row.getCell(1).font = { bold: true, size: 9, color: { argb: COLORS.navyDark } }
      row.getCell(2).font = { bold: p.bold || false, size: 10, color: { argb: COLORS.slateDark } }
      row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.slateLight } }
      row.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: p.bg || (idx % 2 === 0 ? COLORS.white : COLORS.slateLight) } }
      row.getCell(1).border = thinBorder
      row.getCell(2).border = thinBorder

      selectedEvents.forEach((ev, evIdx) => {
        const col = evIdx + 3
        const m = compMetrics[evIdx]
        const cell = row.getCell(col)
        cell.value = p.getter(ev, m)
        cell.font = { bold: p.bold || false, size: 10 }
        if (p.numFmt) cell.numFmt = p.numFmt
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: p.bg || (idx % 2 === 0 ? COLORS.white : COLORS.slateLight) } }
        cell.alignment = { vertical: 'middle', horizontal: p.numFmt ? 'right' : 'center' }
        cell.border = thinBorder
      })

      row.height = 20
      cRowIdx++
    })

    await saveWorkbook(wb, 'Palacio_Barolo_Comparativa_Eventos.xlsx')
  },

  exportComparison(selectedEvents) {
    this.exportComparisonToExcel(selectedEvents)
  },

  // Exportar Detalle de Evento Individual (Ahora usa la Matriz Oficial de 6 Bloques)
  async exportEventDetailToExcel(event, currentUser) {
    await this.exportCalculatorMatrix(event, currentUser)
  },

  exportSingleEvent(event, currentUser) {
    this.exportEventDetailToExcel(event, currentUser)
  }
}
