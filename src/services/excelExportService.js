import ExcelJS from 'exceljs'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { canViewSensitiveData } from './authService'

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
  costHeaderBg: 'FEE2E2',
  costHeaderText: '991B1B',
  indirectCostBg: 'FEF3C7',
  indirectCostText: '92400E'
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

// Formateador de moneda en ARS
const CURRENCY_FORMAT = '"$"#,##0'
const PERCENT_FORMAT = '0.0%'

// Borde estándar fino
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

export const excelExportService = {

  // =========================================================================
  // 1. EXPORTAR TODOS LOS EVENTOS (Histórico Ejecutivo de Lujo)
  // =========================================================================
  async exportEventsToExcel(events, filename = 'Palacio_Barolo_Eventos_Completo.xlsx', sheetTitle = 'Eventos Barolo') {
    if (!events || events.length === 0) {
      alert('No hay eventos para exportar.')
      return
    }

    const wb = new ExcelJS.Workbook()
    wb.creator = 'Palacio Barolo — Sistema de Gestión Comercial'
    wb.created = new Date()

    const ws = wb.addWorksheet(sheetTitle.substring(0, 31), {
      views: [{ state: 'frozen', ySplit: 7 }] // Congelar cabeceras
    })

    // Métricas para el banner
    const totalGross = events.reduce((sum, e) => sum + (Number(e.gross_income) || 0), 0)
    const totalCosts = events.reduce((sum, e) => sum + (Number(e.total_costs) || 0), 0)
    const totalProfit = events.reduce((sum, e) => sum + (Number(e.barolo_profit) || 0), 0)
    const avgMargin = totalGross > 0 ? (totalProfit / totalGross) : 0

    // --- FILA 1: BANNER TITULAR PALACIO BAROLO ---
    ws.mergeCells('A1:O1')
    const titleCell = ws.getCell('A1')
    titleCell.value = '🏛️ PALACIO BAROLO — REPORTE OFICIAL DE EVENTOS & RENTABILIDAD'
    titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: COLORS.goldPrimary } }
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.navyDark } }
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' }
    ws.getRow(1).height = 32

    // --- FILA 2: SUBTÍTULO CON FECHA Y RESUMEN ---
    ws.mergeCells('A2:O2')
    const subCell = ws.getCell('A2')
    subCell.value = `Generado el ${format(new Date(), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: es })} hs | Base Total: ${events.length} eventos registrados`
    subCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'CBD5E1' } }
    subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.navyMedium } }
    subCell.alignment = { vertical: 'middle', horizontal: 'center' }
    ws.getRow(2).height = 20

    // --- FILAS 3 Y 4: TARJETAS KPIS RESUMEN EJECUTIVO ---
    ws.mergeCells('B4:D4')
    ws.mergeCells('F4:H4')
    ws.mergeCells('J4:L4')
    ws.mergeCells('M4:O4')

    ws.getCell('B4').value = `🎟️ Total Eventos: ${events.length}`
    ws.getCell('B4').font = { bold: true, size: 11, color: { argb: COLORS.navyDark } }
    ws.getCell('B4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E2E8F0' } }
    ws.getCell('B4').alignment = { horizontal: 'center', vertical: 'middle' }

    ws.getCell('F4').value = `💰 Facturación: $ ${totalGross.toLocaleString('es-AR')}`
    ws.getCell('F4').font = { bold: true, size: 11, color: { argb: COLORS.navyDark } }
    ws.getCell('F4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E0F2FE' } }
    ws.getCell('F4').alignment = { horizontal: 'center', vertical: 'middle' }

    ws.getCell('J4').value = `🎭 Costos: $ ${totalCosts.toLocaleString('es-AR')}`
    ws.getCell('J4').font = { bold: true, size: 11, color: { argb: '991B1B' } }
    ws.getCell('J4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEE2E2' } }
    ws.getCell('J4').alignment = { horizontal: 'center', vertical: 'middle' }

    ws.getCell('M4').value = `⭐ Ganancia: $ ${totalProfit.toLocaleString('es-AR')} (${(avgMargin * 100).toFixed(1)}%)`
    ws.getCell('M4').font = { bold: true, size: 11, color: { argb: '166534' } }
    ws.getCell('M4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'DCFCE7' } }
    ws.getCell('M4').alignment = { horizontal: 'center', vertical: 'middle' }
    ws.getRow(4).height = 24

    ws.getRow(5).height = 10 // Espaciador

    // --- FILA 6: CABECERAS DE TABLA ---
    const headers = [
      { header: 'Nombre del Evento', key: 'name', width: 34, align: 'left' },
      { header: 'Cliente', key: 'client_name', width: 22, align: 'left' },
      { header: 'Estado', key: 'status', width: 15, align: 'center' },
      { header: 'Fecha', key: 'event_date', width: 13, align: 'center' },
      { header: 'Salón', key: 'venue', width: 22, align: 'left' },
      { header: 'Tipo', key: 'event_type', width: 15, align: 'center' },
      { header: 'Convenio', key: 'agreement_type', width: 16, align: 'left' },
      { header: 'Asistentes', key: 'attendees', width: 12, align: 'right', numFmt: '#,##0' },
      { header: 'Facturación ($)', key: 'gross_income', width: 18, align: 'right', numFmt: CURRENCY_FORMAT },
      { header: 'Costos Directos ($)', key: 'direct_costs', width: 18, align: 'right', numFmt: CURRENCY_FORMAT },
      { header: 'Costos Indirectos ($)', key: 'indirect_costs', width: 18, align: 'right', numFmt: CURRENCY_FORMAT },
      { header: 'Costo Total ($)', key: 'total_costs', width: 18, align: 'right', numFmt: CURRENCY_FORMAT },
      { header: 'Ganancia Barolo ($)', key: 'barolo_profit', width: 19, align: 'right', numFmt: CURRENCY_FORMAT },
      { header: 'Margen (%)', key: 'margin_pct', width: 13, align: 'right', numFmt: PERCENT_FORMAT },
      { header: 'Código ID', key: 'calc_code', width: 13, align: 'center' },
      { header: 'Medio de Pago', key: 'payment_method', width: 16, align: 'center' }
    ]

    const headerRow = ws.getRow(6)
    headers.forEach((h, idx) => {
      const cell = headerRow.getCell(idx + 1)
      cell.value = h.header
      cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: COLORS.white } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.navyHeader } }
      cell.alignment = { vertical: 'middle', horizontal: 'center' }
      cell.border = thinBorder
      ws.getColumn(idx + 1).width = h.width
    })
    headerRow.height = 28

    // --- FILAS DE DATOS ---
    let currentRowIdx = 7
    events.forEach((e, idx) => {
      const row = ws.getRow(currentRowIdx)
      const isEven = idx % 2 === 0
      const rowBg = isEven ? COLORS.white : COLORS.slateLight

      const statusUpper = (e.status || '').toUpperCase()
      const gross = Number(e.gross_income) || 0
      const direct = Number(e.direct_costs) || 0
      const indirect = Number(e.indirect_costs) || 0
      const totalCost = Number(e.total_costs) || 0
      const profit = Number(e.barolo_profit) || 0
      const margin = gross > 0 ? (profit / gross) : 0

      row.values = [
        e.name || '',
        e.client_name || 'Particular',
        statusUpper,
        e.event_date || '',
        e.venue || '',
        e.event_type || '',
        e.agreement_type || '100% Barolo',
        Number(e.attendees) || 0,
        gross,
        direct,
        indirect,
        totalCost,
        profit,
        margin,
        e.calc_code || `CALC-${String(idx + 1).padStart(3, '0')}`,
        e.payment_method || 'Transferencia'
      ]

      // Estilos celda por celda
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const colDef = headers[colNumber - 1]
        cell.font = { name: 'Calibri', size: 10, color: { argb: COLORS.slateDark } }
        cell.border = thinBorder
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } }
        cell.alignment = { vertical: 'middle', horizontal: colDef?.align || 'left' }

        if (colDef?.numFmt) {
          cell.numFmt = colDef.numFmt
        }

        // Semáforo Estado
        if (colNumber === 3) {
          cell.font = { bold: true, size: 9 }
          if (statusUpper === 'CONTRATADO') {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.statusContratadoBg } }
            cell.font = { bold: true, color: { argb: COLORS.statusContratadoText } }
          } else if (statusUpper === 'RESERVADO') {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.statusReservadoBg } }
            cell.font = { bold: true, color: { argb: COLORS.statusReservadoText } }
          } else if (statusUpper === 'COTIZADO') {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.statusCotizadoBg } }
            cell.font = { bold: true, color: { argb: COLORS.statusCotizadoText } }
          } else if (statusUpper === 'CANCELADO') {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.statusCanceladoBg } }
            cell.font = { bold: true, color: { argb: COLORS.statusCanceladoText } }
          }
        }

        // Ganancia destacada
        if (colNumber === 13) {
          cell.font = { bold: true, color: { argb: '15803D' } } // Verde oscuro
        }
      })

      row.height = 22
      currentRowIdx++
    })

    // --- FILA FINAL: TOTALES Y PROMEDIOS ---
    const totalRow = ws.getRow(currentRowIdx)
    totalRow.getCell(1).value = 'TOTALES'
    totalRow.getCell(2).value = `${events.length} EVENTOS REGISTRADOS`
    totalRow.getCell(8).value = events.reduce((sum, e) => sum + (Number(e.attendees) || 0), 0)
    totalRow.getCell(9).value = totalGross
    totalRow.getCell(10).value = events.reduce((sum, e) => sum + (Number(e.direct_costs) || 0), 0)
    totalRow.getCell(11).value = events.reduce((sum, e) => sum + (Number(e.indirect_costs) || 0), 0)
    totalRow.getCell(12).value = totalCosts
    totalRow.getCell(13).value = totalProfit
    totalRow.getCell(14).value = avgMargin

    totalRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: COLORS.navyDark } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.goldLight } }
      cell.border = doubleBottomBorder
      const colDef = headers[colNumber - 1]
      cell.alignment = { vertical: 'middle', horizontal: colDef?.align || 'left' }
      if (colDef?.numFmt) {
        cell.numFmt = colDef.numFmt
      }
    })
    totalRow.height = 26

    await saveWorkbook(wb, filename)
  },

  // Alias para exportación general
  exportAllEvents(events) {
    this.exportEventsToExcel(events, 'Palacio_Barolo_Eventos_Completo.xlsx', 'Todos los Eventos')
  },

  // =========================================================================
  // 2. EXPORTAR MES ESPECÍFICO
  // =========================================================================
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

  // =========================================================================
  // 3. COMPARATIVA DE EVENTOS LADO A LADO (Con Costos Asociados Desglosados)
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
      views: [{ state: 'frozen', xSplit: 2, ySplit: 6 }]
    })

    const eventCols = selectedEvents.map((e, idx) => ({
      index: idx + 1,
      colNumber: idx + 3,
      event: e,
      headerTitle: `${e.calc_code || 'CALC'}\n${e.name || ''}`
    }))

    const totalCols = eventCols.length + 2

    // --- BANNER TITULAR ---
    ws.mergeCells(1, 1, 1, totalCols)
    const titleCell = ws.getCell(1, 1)
    titleCell.value = '⚖️ PALACIO BAROLO — MATRIZ COMPARATIVA DE EVENTOS & COSTOS ASOCIADOS'
    titleCell.font = { name: 'Calibri', size: 15, bold: true, color: { argb: COLORS.goldPrimary } }
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.navyDark } }
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' }
    ws.getRow(1).height = 32

    // Subtítulo
    ws.mergeCells(2, 1, 2, totalCols)
    const subCell = ws.getCell(2, 1)
    subCell.value = `Análisis comparativo de ${selectedEvents.length} eventos | Generado el ${format(new Date(), "dd/MM/yyyy HH:mm")} hs`
    subCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'CBD5E1' } }
    subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.navyMedium } }
    subCell.alignment = { vertical: 'middle', horizontal: 'center' }
    ws.getRow(2).height = 20

    ws.getRow(3).height = 10 // Espaciador

    // Anchos de columna fijos
    ws.getColumn(1).width = 24 // Categoría
    ws.getColumn(2).width = 32 // Métrica / Rubro de Costo
    eventCols.forEach(col => {
      ws.getColumn(col.colNumber).width = 26
    })

    // --- FILA 5 Y 6: ENCABEZADOS DE COLUMNA DE EVENTOS ---
    ws.mergeCells('A5:B6')
    const cornerCell = ws.getCell('A5')
    cornerCell.value = 'PARÁMETRO / RUBRO ECONÓMICO'
    cornerCell.font = { bold: true, size: 11, color: { argb: COLORS.white } }
    cornerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.navyHeader } }
    cornerCell.alignment = { vertical: 'middle', horizontal: 'center' }
    cornerCell.border = thinBorder

    eventCols.forEach(col => {
      const cell = ws.getCell(5, col.colNumber)
      cell.value = col.event.name || `Evento ${col.index}`
      cell.font = { bold: true, size: 10, color: { argb: COLORS.white } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.navyDark } }
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
      cell.border = thinBorder

      const subHeader = ws.getCell(6, col.colNumber)
      subHeader.value = `${col.event.client_name || 'Particular'} (${col.event.calc_code || 'CALC'})`
      subHeader.font = { bold: false, size: 9, color: { argb: COLORS.goldLight } }
      subHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.navyHeader } }
      subHeader.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
      subHeader.border = thinBorder
    })
    ws.getRow(5).height = 24
    ws.getRow(6).height = 24

    // Helper para insertar sección de tabla
    let curRow = 7

    const addSectionHeader = (title, bgArgb, textArgb) => {
      ws.mergeCells(curRow, 1, curRow, totalCols)
      const cell = ws.getCell(curRow, 1)
      cell.value = title
      cell.font = { bold: true, size: 11, color: { argb: textArgb } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } }
      cell.alignment = { vertical: 'middle', horizontal: 'left' }
      cell.border = thinBorder
      ws.getRow(curRow).height = 24
      curRow++
    }

    const addRow = (category, metricLabel, getValueFn, numFmt = null, isBold = false, rowBg = COLORS.white) => {
      const row = ws.getRow(curRow)
      row.getCell(1).value = category
      row.getCell(2).value = metricLabel

      row.getCell(1).font = { size: 10, bold: isBold, color: { argb: COLORS.slateDark } }
      row.getCell(2).font = { size: 10, bold: isBold, color: { argb: COLORS.slateDark } }
      row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } }
      row.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } }
      row.getCell(1).border = thinBorder
      row.getCell(2).border = thinBorder
      row.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' }
      row.getCell(2).alignment = { vertical: 'middle', horizontal: 'left' }

      eventCols.forEach(col => {
        const val = getValueFn(col.event)
        const cell = row.getCell(col.colNumber)
        cell.value = val !== undefined && val !== null ? val : '-'
        cell.font = { size: 10, bold: isBold, color: { argb: COLORS.slateDark } }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } }
        cell.border = thinBorder
        cell.alignment = { vertical: 'middle', horizontal: typeof val === 'number' ? 'right' : 'center' }
        if (numFmt && typeof val === 'number') {
          cell.numFmt = numFmt
        }
      })

      row.height = 22
      curRow++
    }

    // --- SECCIÓN 1: DATOS GENERALES ---
    addSectionHeader('📋 1. PARÁMETROS GENERALES DEL EVENTO', 'E2E8F0', COLORS.navyDark)
    addRow('General', 'Nombre del Evento', e => e.name || '-', null, true)
    addRow('General', 'Cliente / Organizador', e => e.client_name || 'Particular', null, true)
    addRow('General', 'Código ID', e => e.calc_code || 'CALC')
    addRow('General', 'Estado Comercial', e => (e.status || '').toUpperCase(), null, true)
    addRow('General', 'Fecha del Evento', e => e.event_date || '-')
    addRow('General', 'Salón / Espacio', e => e.venue || '-')
    addRow('General', 'Tipo de Evento', e => e.event_type || '-')
    addRow('General', 'Modalidad de Convenio', e => e.agreement_type || '100% Barolo')
    addRow('General', 'Cantidad de Asistentes (Pax)', e => Number(e.attendees) || 0, '#,##0', true)

    // --- SECCIÓN 2: TOTALES FINANCIEROS CONSOLIDADOS ---
    addSectionHeader('💰 2. TOTALES FINANCIEROS CONSOLIDADOS', 'FEF3C7', '92400E')
    addRow('Financiero', 'Facturación Bruta Total ($)', e => Number(e.gross_income) || 0, CURRENCY_FORMAT, true, 'FEF9C3')
    addRow('Financiero', 'Costos Directos Totales ($)', e => Number(e.direct_costs) || 0, CURRENCY_FORMAT)
    addRow('Financiero', 'Costos Indirectos Totales ($)', e => Number(e.indirect_costs) || 0, CURRENCY_FORMAT)
    addRow('Financiero', 'Costo Total Operativo ($)', e => Number(e.total_costs) || 0, CURRENCY_FORMAT, true, 'FEE2E2')
    addRow('Financiero', 'Ganancia Neta Final Barolo ($)', e => Number(e.barolo_profit) || 0, CURRENCY_FORMAT, true, 'DCFCE7')
    addRow('Financiero', 'Margen de Rentabilidad (%)', e => (Number(e.gross_income) > 0 ? (Number(e.barolo_profit) / Number(e.gross_income)) : 0), PERCENT_FORMAT, true, 'DCFCE7')

    // --- SECCIÓN 3: DESGLOSE DE COSTOS ASOCIADOS (LO PEDIDO POR EL USUARIO) ---
    addSectionHeader('📦 3. DESGLOSE DETALLADO DE COSTOS ASOCIADOS (RUBRO POR RUBRO)', 'FEE2E2', '991B1B')
    addRow('Costo Asociado Directo', '🎭 Artistas, Shows & Honorarios ($)', e => Number(e.cost_artistas) || 0, CURRENCY_FORMAT)
    addRow('Costo Asociado Directo', '🔊 Técnica, Luces & Sonido ($)', e => Number(e.cost_tecnica) || 0, CURRENCY_FORMAT)
    addRow('Costo Asociado Directo', '🎤 Disertantes & Conferencistas ($)', e => Number(e.cost_disertantes) || 0, CURRENCY_FORMAT)
    addRow('Costo Asociado Directo', '🍽️ Catering, Bebidas & Servicio ($)', e => Number(e.cost_catering) || 0, CURRENCY_FORMAT)
    addRow('Costo Asociado Directo', '🪑 Mobiliario & Montaje Especial ($)', e => Number(e.cost_mobiliario) || 0, CURRENCY_FORMAT)
    addRow('Costo Asociado Directo', '🍷 Gastronómicos Varios ($)', e => Number(e.cost_gastronomicos) || 0, CURRENCY_FORMAT)
    addRow('Costo Asociado Indirecto', '👥 Personal RRHH, Salón & Seguridad ($)', e => Number(e.cost_rrhh) || 0, CURRENCY_FORMAT)
    addRow('Costo Asociado Indirecto', '🧹 Limpieza Integral Salón ($)', e => Number(e.cost_limpieza) || 0, CURRENCY_FORMAT)
    addRow('Costo Asociado Indirecto', '🛡️ Seguros Obligatorios de Evento ($)', e => Number(e.cost_seguros) || 0, CURRENCY_FORMAT)
    addRow('Costo Asociado Indirecto', '🏢 Canon / Alquiler Espacio Barolo ($)', e => Number(e.cost_alquiler_espacio) || 0, CURRENCY_FORMAT)
    addRow('Costo Asociado Indirecto', '📢 Marketing, Pauta & Publicidad ($)', e => Number(e.cost_marketing) || 0, CURRENCY_FORMAT)
    addRow('Costo Asociado Indirecto', '🎵 SADAIC / AADI CAPIF / Permisos ($)', e => Number(e.cost_sadaic) || 0, CURRENCY_FORMAT)
    
    // Otros Gastos dinámicos
    addRow('Costo Asociado Extra', '🏷️ Otros Gastos Adicionales Dinámicos ($)', e => {
      const extras = Array.isArray(e.extra_expenses) ? e.extra_expenses : []
      return extras.reduce((sum, item) => sum + (Number(item.value) || 0), 0)
      return extras.reduce((sum, item) => sum + (Number(item.amount ?? item.value) || 0), 0)
    }, CURRENCY_FORMAT)

    // --- SECCIÓN 4: EFICIENCIA UNITARIA POR ASISTENTE (PAX) ---
    addSectionHeader('👥 4. EFICIENCIA FINANCIERA POR ASISTENTE (POR PAX)', 'E0F2FE', '0369A1')
    addRow('Unitario', 'Facturación Bruta x Pax ($)', e => e.attendees > 0 ? Math.round((Number(e.gross_income) || 0) / e.attendees) : 0, CURRENCY_FORMAT)
    addRow('Unitario', 'Costo Operativo x Pax ($)', e => e.attendees > 0 ? Math.round((Number(e.total_costs) || 0) / e.attendees) : 0, CURRENCY_FORMAT)
    addRow('Unitario', 'Ganancia Barolo x Pax ($)', e => e.attendees > 0 ? Math.round((Number(e.barolo_profit) || 0) / e.attendees) : 0, CURRENCY_FORMAT, true, 'DCFCE7')

    await saveWorkbook(wb, 'Palacio_Barolo_Comparativa_Eventos.xlsx')
  },

  // Alias
  exportComparison(selectedEvents) {
    this.exportComparisonToExcel(selectedEvents)
  },

  // =========================================================================
  // 4. EXPORTAR FICHA INDIVIDUAL DE UN EVENTO (Resumen + Desglose)
  // =========================================================================
  async exportEventDetailToExcel(event, currentUser) {
    if (!event) return

    const wb = new ExcelJS.Workbook()
    wb.creator = 'Palacio Barolo'
    const canViewSens = canViewSensitiveData(event, currentUser)
    const cleanCode = (event.calc_code || 'CALC').replace(/[^a-zA-Z0-9_-]/g, '')

    // --- HOJA 1: RESUMEN EJECUTIVO ---
    const ws1 = wb.addWorksheet('Resumen Ejecutivo', { views: [{ showGridLines: true }] })
    ws1.getColumn(1).width = 24
    ws1.getColumn(2).width = 40
    ws1.getColumn(3).width = 18
    ws1.getColumn(4).width = 30

    // Banner
    ws1.mergeCells('A1:D1')
    ws1.getCell('A1').value = `🏛️ PALACIO BAROLO — FICHA FINANCIERA EJECUTIVA: ${event.calc_code || 'CALC'}`
    ws1.getCell('A1').font = { name: 'Calibri', size: 14, bold: true, color: { argb: COLORS.goldPrimary } }
    ws1.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.navyDark } }
    ws1.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' }
    ws1.getRow(1).height = 30

    ws1.mergeCells('A2:D2')
    ws1.getCell('A2').value = `Evento: ${event.name || ''} | Estado: ${(event.status || '').toUpperCase()} | Fecha: ${event.event_date || ''} | Salón: ${event.venue || ''}`
    ws1.getCell('A2').font = { size: 10, italic: true, color: { argb: 'CBD5E1' } }
    ws1.getCell('A2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.navyMedium } }
    ws1.getCell('A2').alignment = { vertical: 'middle', horizontal: 'center' }
    ws1.getRow(2).height = 20

    // Tarjetas KPIs
    const gross = Number(event.gross_income) || 0
    const totalCost = Number(event.total_costs) || 0
    const profit = Number(event.barolo_profit) || 0
    const margin = gross > 0 ? (profit / gross) : 0

    ws1.mergeCells('A4:B4')
    ws1.getCell('A4').value = `💰 FACTURACIÓN BRUTA: $ ${gross.toLocaleString('es-AR')}`
    ws1.getCell('A4').font = { bold: true, size: 11, color: { argb: COLORS.navyDark } }
    ws1.getCell('A4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E0F2FE' } }
    ws1.getCell('A4').alignment = { vertical: 'middle', horizontal: 'center' }

    ws1.mergeCells('C4:D4')
    ws1.getCell('C4').value = `⭐ GANANCIA BAROLO: $ ${profit.toLocaleString('es-AR')} (${(margin * 100).toFixed(1)}%)`
    ws1.getCell('C4').font = { bold: true, size: 11, color: { argb: '166534' } }
    ws1.getCell('C4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'DCFCE7' } }
    ws1.getCell('C4').alignment = { vertical: 'middle', horizontal: 'center' }
    ws1.getRow(4).height = 26

    // Tabla de Parámetros
    const addRowH1 = (rIdx, label1, val1, label2, val2) => {
      const row = ws1.getRow(rIdx)
      row.getCell(1).value = label1
      row.getCell(2).value = val1
      row.getCell(3).value = label2
      row.getCell(4).value = val2

      row.getCell(1).font = { bold: true, size: 10, color: { argb: COLORS.slateDark } }
      row.getCell(3).font = { bold: true, size: 10, color: { argb: COLORS.slateDark } }
      row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.slateLight } }
      row.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.slateLight } }
      row.getCell(1).border = thinBorder
      row.getCell(2).border = thinBorder
      row.getCell(3).border = thinBorder
      row.getCell(4).border = thinBorder
      row.height = 22
    }

    addRowH1(6, 'Cliente', event.client_name || '-', 'CUIT', event.client_cuit || '-')
    addRowH1(7, 'Contacto', event.client_contact || '-', 'Convenio', event.agreement_type || '100% Barolo')
    addRowH1(8, 'Tipo de Evento', event.event_type || '-', 'Origen', event.origin || 'Externo')
    addRowH1(9, 'Horario', event.event_time || '19:00', 'Asistentes (Pax)', Number(event.attendees) || 0)
    addRowH1(10, 'Forma de Pago', event.payment_method || 'Transferencia', 'Factura', event.invoice_type || 'Factura A')
    addRowH1(11, 'Costos Directos', `$ ${Number(event.direct_costs || 0).toLocaleString('es-AR')}`, 'Costos Indirectos', `$ ${Number(event.indirect_costs || 0).toLocaleString('es-AR')}`)

    // Notas Comerciales
    ws1.mergeCells('A13:D13')
    ws1.getCell('A13').value = '📝 NOTAS COMERCIALES & OPERATIVAS'
    ws1.getCell('A13').font = { bold: true, size: 10, color: { argb: COLORS.navyDark } }
    ws1.getCell('A13').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.goldLight } }

    ws1.mergeCells('A14:D16')
    const noteText = event.notes ? event.notes.replace(/<!--[\s\S]*?-->/g, '').trim() : 'Sin notas registradas.'
    ws1.getCell('A14').value = noteText
    ws1.getCell('A14').font = { size: 10, italic: true }
    ws1.getCell('A14').alignment = { vertical: 'top', horizontal: 'left', wrapText: true }
    ws1.getCell('A14').border = thinBorder

    // --- HOJA 2: DESGLOSE ECONÓMICO DETALLADO ---
    const ws2 = wb.addWorksheet('Desglose Económico', { views: [{ showGridLines: true }] })
    ws2.getColumn(1).width = 20
    ws2.getColumn(2).width = 42
    ws2.getColumn(3).width = 22

    ws2.mergeCells('A1:C1')
    ws2.getCell('A1').value = `📦 DESGLOSE DE INGRESOS Y COSTOS ASOCIADOS — ${event.calc_code || 'CALC'}`
    ws2.getCell('A1').font = { size: 13, bold: true, color: { argb: COLORS.goldPrimary } }
    ws2.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.navyDark } }
    ws2.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' }
    ws2.getRow(1).height = 28

    // Cabecera tabla
    ws2.getRow(3).values = ['Tipo de Rubro', 'Concepto / Ítem', 'Importe ($)']
    ws2.getRow(3).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: COLORS.white }, size: 10 }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.navyHeader } }
      cell.alignment = { vertical: 'middle', horizontal: 'center' }
      cell.border = thinBorder
    })
    ws2.getRow(3).height = 24

    const breakdownItems = [
      { tipo: 'Ingreso', concepto: 'Entradas Preventa', val: (Number(event.preventa_qty) || 0) * (Number(event.preventa_price) || 0) },
      { tipo: 'Ingreso', concepto: 'Entradas Generales', val: (Number(event.general_qty) || Number(event.ticket_qty) || 0) * (Number(event.general_price) || Number(event.ticket_price) || 0) },
      { tipo: 'Ingreso', concepto: 'Alquiler de Espacio', val: Number(event.alquiler_espacio) || 0 },
      { tipo: 'Ingreso', concepto: 'Contratación / Canon de Salón', val: Number(event.contratacion_salon) || 0 },
      
      { tipo: 'Costo Directo', concepto: '🎭 Artistas, Shows & Honorarios', val: Number(event.cost_artistas) || 0 },
      { tipo: 'Costo Directo', concepto: '🔊 Técnica, Iluminación & Sonido', val: Number(event.cost_tecnica) || 0 },
      { tipo: 'Costo Directo', concepto: '🎤 Disertantes & Conferencistas', val: Number(event.cost_disertantes) || 0 },
      { tipo: 'Costo Directo', concepto: '🍽️ Catering, Gastronomía & Bebidas', val: Number(event.cost_catering) || 0 },
      { tipo: 'Costo Directo', concepto: '🪑 Mobiliario, Vajilla & Ambientación', val: Number(event.cost_mobiliario) || 0 },
      { tipo: 'Costo Directo', concepto: '🍷 Gastronómicos Varios', val: Number(event.cost_gastronomicos) || 0 },

      { tipo: 'Costo Indirecto', concepto: '👥 RRHH Salón, Personal & Seguridad', val: Number(event.cost_rrhh) || 0 },
      { tipo: 'Costo Indirecto', concepto: '🧹 Limpieza Integral Post-Evento', val: Number(event.cost_limpieza) || 0 },
      { tipo: 'Costo Indirecto', concepto: '🛡️ Seguros de Responsabilidad Civil', val: Number(event.cost_seguros) || 0 },
      { tipo: 'Costo Indirecto', concepto: '🏢 Alquiler de Espacio Barolo', val: Number(event.cost_alquiler_espacio) || 0 },
      { tipo: 'Costo Indirecto', concepto: '📢 Marketing, Redes & Publicidad', val: Number(event.cost_marketing) || 0 },
      { tipo: 'Costo Indirecto', concepto: '🎵 Derechos SADAIC / AADI CAPIF', val: Number(event.cost_sadaic) || 0 }
    ]

    // Añadir extra incomes
    if (Array.isArray(event.extra_incomes)) {
      event.extra_incomes.forEach((inc) => {
        const isSens = inc.is_sensitive && !canViewSens
        breakdownItems.push({
          tipo: 'Ingreso Adicional',
          concepto: isSens ? '🔒 [Ingreso Confidencial]' : (inc.concept || 'Ingreso Extra'),
          val: Number(inc.amount ?? inc.value) || 0
        })
      })
    }

    // Añadir extra expenses
    if (Array.isArray(event.extra_expenses)) {
      event.extra_expenses.forEach((exp) => {
        const isSens = exp.is_sensitive && !canViewSens
        breakdownItems.push({
          tipo: 'Gasto Adicional',
          concepto: isSens ? '🔒 [Gasto Confidencial]' : (exp.concept || 'Gasto Extra'),
          val: Number(exp.amount ?? exp.value) || 0
        })
      })
    }

    let bRowIdx = 4
    breakdownItems.forEach((item, idx) => {
      if (item.val === 0 && !item.tipo.includes('Adicional')) return // Omitir ceros standard para limpieza visual
      const row = ws2.getRow(bRowIdx)
      const isEven = idx % 2 === 0
      const rowBg = isEven ? COLORS.white : COLORS.slateLight

      row.values = [item.tipo, item.concepto, item.val]
      row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' }
      row.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' }
      row.getCell(3).alignment = { horizontal: 'right', vertical: 'middle' }
      row.getCell(3).numFmt = CURRENCY_FORMAT

      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.font = { name: 'Calibri', size: 10 }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } }
        cell.border = thinBorder
      })
      row.height = 20
      bRowIdx++
    })

    await saveWorkbook(wb, `Palacio_Barolo_Evento_${cleanCode}.xlsx`)
  },

  // Alias
  exportSingleEvent(event, currentUser) {
    this.exportEventDetailToExcel(event, currentUser)
  }
}
