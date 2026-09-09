import * as XLSX from 'xlsx'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

export const excelExportService = {
  // 1. Exportar listado de eventos a Excel
  exportEventsToExcel(events, filename = 'Palacio_Barolo_Eventos.xlsx', sheetTitle = 'Eventos Barolo') {
    if (!events || events.length === 0) {
      alert('No hay eventos para exportar.')
      return
    }

    const rows = events.map(e => ({
      'Código': e.calc_code || 'CALC',
      'Nombre del Evento': e.name || '',
      'Estado': (e.status || '').toUpperCase(),
      'Fecha': e.event_date || '',
      'Horario': e.event_time || '19:00',
      'Mes': e.month || '',
      'Salón': e.venue || '',
      'Tipo de Evento': e.event_type || '',
      'Convenio': e.agreement_type || '',
      'Cliente': e.client_name || '',
      'CUIT Cliente': e.client_cuit || '',
      'Contacto': e.client_contact || '',
      'Asistentes (Pax)': Number(e.attendees) || 0,
      'Facturación Bruta ($)': Number(e.gross_income) || 0,
      'Costos Directos ($)': Number(e.direct_costs) || 0,
      'Costos Indirectos ($)': Number(e.indirect_costs) || 0,
      'Costo Total ($)': Number(e.total_costs) || 0,
      'Ganancia Barolo ($)': Number(e.barolo_profit) || 0,
      'Margen Barolo (%)': Number(e.margin_pct) || 0,
      'Medio de Pago': e.payment_method || '',
      'Factura': e.invoice_type || '',
      'Notas Comerciales': e.notes || '',
      'Motivo Cancelación': e.cancellation_reason || ''
    }))

    const ws = XLSX.utils.json_to_sheet(rows)

    // Ajustar anchos de columna dinámicamente
    const colWidths = Object.keys(rows[0]).map(key => {
      const maxLen = Math.max(
        key.length,
        ...rows.map(r => String(r[key] || '').length)
      )
      return { wch: Math.min(Math.max(maxLen + 2, 10), 45) }
    })
    ws['!cols'] = colWidths

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, sheetTitle.substring(0, 31))
    XLSX.writeFile(wb, filename)
  },

  // Alias para exportación general
  exportAllEvents(events) {
    this.exportEventsToExcel(events, 'Palacio_Barolo_Eventos_Completo.xlsx', 'Todos los Eventos')
  },

  // 2. Exportar mes específico con fila de Totales
  exportMonthToExcel(events, monthDate = new Date()) {
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

    const rows = inMonth.map(e => ({
      'Código': e.calc_code || 'CALC',
      'Nombre del Evento': e.name || '',
      'Estado': (e.status || '').toUpperCase(),
      'Fecha': e.event_date || '',
      'Salón': e.venue || '',
      'Convenio': e.agreement_type || '',
      'Cliente': e.client_name || '',
      'Pax': Number(e.attendees) || 0,
      'Facturación Bruta ($)': Number(e.gross_income) || 0,
      'Costos Directos ($)': Number(e.direct_costs) || 0,
      'Costos Indirectos ($)': Number(e.indirect_costs) || 0,
      'Costo Total ($)': Number(e.total_costs) || 0,
      'Ganancia Barolo ($)': Number(e.barolo_profit) || 0,
      'Margen (%)': Number(e.margin_pct) || 0
    }))

    // Fila de totales
    const totalGross = inMonth.filter(e => e.status !== 'cancelado').reduce((s, e) => s + (Number(e.gross_income) || 0), 0)
    const totalDirect = inMonth.filter(e => e.status !== 'cancelado').reduce((s, e) => s + (Number(e.direct_costs) || 0), 0)
    const totalIndirect = inMonth.filter(e => e.status !== 'cancelado').reduce((s, e) => s + (Number(e.indirect_costs) || 0), 0)
    const totalCost = inMonth.filter(e => e.status !== 'cancelado').reduce((s, e) => s + (Number(e.total_costs) || 0), 0)
    const totalProfit = inMonth.filter(e => e.status !== 'cancelado').reduce((s, e) => s + (Number(e.barolo_profit) || 0), 0)
    const totalPax = inMonth.filter(e => e.status !== 'cancelado').reduce((s, e) => s + (Number(e.attendees) || 0), 0)
    const avgMargin = totalGross > 0 ? Number(((totalProfit / totalGross) * 100).toFixed(1)) : 0

    rows.push({
      'Código': 'TOTALES',
      'Nombre del Evento': 'TOTAL MES (' + inMonth.length + ' eventos)',
      'Estado': '',
      'Fecha': '',
      'Salón': '',
      'Convenio': '',
      'Cliente': '',
      'Pax': totalPax,
      'Facturación Bruta ($)': totalGross,
      'Costos Directos ($)': totalDirect,
      'Costos Indirectos ($)': totalIndirect,
      'Costo Total ($)': totalCost,
      'Ganancia Barolo ($)': totalProfit,
      'Margen (%)': avgMargin
    })

    const ws = XLSX.utils.json_to_sheet(rows)
    const colWidths = Object.keys(rows[0]).map(key => {
      const maxLen = Math.max(key.length, ...rows.map(r => String(r[key] || '').length))
      return { wch: Math.min(Math.max(maxLen + 2, 10), 40) }
    })
    ws['!cols'] = colWidths

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Mes_' + monthKey)
    XLSX.writeFile(wb, 'Palacio_Barolo_' + monthLabel + '.xlsx')
  },

  // Alias para exportar mes
  exportMonthEvents(events, monthStr) {
    this.exportMonthToExcel(events, monthStr)
  },

  // 3. Exportar Ficha Completa de un Evento Individual
  exportEventDetailToExcel(event) {
    if (!event) return

    const wb = XLSX.utils.book_new()

    // Solapa 1: Resumen General
    const summaryData = [
      { 'Propiedad': 'Código Barolo', 'Detalle': event.calc_code || 'CALC' },
      { 'Propiedad': 'Nombre del Evento', 'Detalle': event.name },
      { 'Propiedad': 'Cliente / Razón Social', 'Detalle': event.client_name || 'Particular' },
      { 'Propiedad': 'CUIT / Identificación', 'Detalle': event.client_cuit || '-' },
      { 'Propiedad': 'Contacto', 'Detalle': event.client_contact || '-' },
      { 'Propiedad': 'Fecha del Evento', 'Detalle': event.event_date },
      { 'Propiedad': 'Horario', 'Detalle': event.event_time || '19:00' },
      { 'Propiedad': 'Salón / Espacio', 'Detalle': event.venue },
      { 'Propiedad': 'Tipo de Evento', 'Detalle': event.event_type },
      { 'Propiedad': 'Modalidad Convenio', 'Detalle': event.agreement_type },
      { 'Propiedad': 'Estado Comercial', 'Detalle': (event.status || '').toUpperCase() },
      { 'Propiedad': 'Asistentes (Pax)', 'Detalle': Number(event.attendees) || 0 },
      { 'Propiedad': '---', 'Detalle': '---' },
      { 'Propiedad': 'Facturación Bruta ($)', 'Detalle': Number(event.gross_income) || 0 },
      { 'Propiedad': 'Costos Directos ($)', 'Detalle': Number(event.direct_costs) || 0 },
      { 'Propiedad': 'Costos Indirectos ($)', 'Detalle': Number(event.indirect_costs) || 0 },
      { 'Propiedad': 'Costo Total ($)', 'Detalle': Number(event.total_costs) || 0 },
      { 'Propiedad': 'Ganancia Barolo ($)', 'Detalle': Number(event.barolo_profit) || 0 },
      { 'Propiedad': 'Margen Rentabilidad (%)', 'Detalle': (Number(event.margin_pct) || 0) + '%' },
      { 'Propiedad': 'Ganancia x Asistente ($)', 'Detalle': event.attendees > 0 ? Math.round((Number(event.barolo_profit) || 0) / event.attendees) : 0 },
      { 'Propiedad': 'Forma de Pago', 'Detalle': event.payment_method || 'Transferencia' },
      { 'Propiedad': 'Tipo Factura', 'Detalle': event.invoice_type || 'Factura A' },
      { 'Propiedad': 'Notas Comerciales', 'Detalle': event.notes || '' },
      { 'Propiedad': 'Motivo Cancelación', 'Detalle': event.cancellation_reason || '' }
    ]

    const wsSummary = XLSX.utils.json_to_sheet(summaryData)
    wsSummary['!cols'] = [{ wch: 28 }, { wch: 45 }]
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen Ejecutivo')

    // Solapa 2: Desglose de Costos e Ingresos
    const breakdownData = [
      { 'Categoría': 'INGRESOS', 'Ítem': 'Venta Entradas Preventa', 'Monto ($)': (Number(event.preventa_qty) || 0) * (Number(event.preventa_price) || 0) },
      { 'Categoría': 'INGRESOS', 'Ítem': 'Venta Entradas General', 'Monto ($)': (Number(event.general_qty) || 0) * (Number(event.general_price) || 0) },
      { 'Categoría': 'INGRESOS', 'Ítem': 'Alquiler de Espacio', 'Monto ($)': Number(event.alquiler_espacio) || 0 },
      { 'Categoría': 'INGRESOS', 'Ítem': 'Contratación Salón', 'Monto ($)': Number(event.contratacion_salon) || 0 },
      { 'Categoría': 'COSTOS DIRECTOS', 'Ítem': 'Honorarios Artistas / Disertantes', 'Monto ($)': (Number(event.cost_artistas) || 0) + (Number(event.cost_disertantes) || 0) },
      { 'Categoría': 'COSTOS DIRECTOS', 'Ítem': 'Técnica, Sonido e Iluminación', 'Monto ($)': Number(event.cost_tecnica) || 0 },
      { 'Categoría': 'COSTOS DIRECTOS', 'Ítem': 'Catering & Gastronomía', 'Monto ($)': (Number(event.cost_catering) || 0) + (Number(event.cost_gastronomicos) || 0) },
      { 'Categoría': 'COSTOS DIRECTOS', 'Ítem': 'Mobiliario & Montaje', 'Monto ($)': Number(event.cost_mobiliario) || 0 },
      { 'Categoría': 'COSTOS DIRECTOS', 'Ítem': 'Alquiler de Espacio Barolo', 'Monto ($)': Number(event.cost_alquiler_espacio) || 0 },
      { 'Categoría': 'COSTOS INDIRECTOS', 'Ítem': 'RRHH Salón, Coordinación y Guardias', 'Monto ($)': Number(event.cost_rrhh) || 0 },
      { 'Categoría': 'COSTOS INDIRECTOS', 'Ítem': 'Limpieza Integral y Desinfección', 'Monto ($)': Number(event.cost_limpieza) || 0 },
      { 'Categoría': 'COSTOS INDIRECTOS', 'Ítem': 'Seguros y Responsabilidad Civil', 'Monto ($)': Number(event.cost_seguros) || 0 },
      { 'Categoría': 'COSTOS INDIRECTOS', 'Ítem': 'Marketing, Difusión y SADAIC', 'Monto ($)': (Number(event.cost_marketing) || 0) + (Number(event.cost_sadaic) || 0) }
    ]

    const wsBreakdown = XLSX.utils.json_to_sheet(breakdownData)
    wsBreakdown['!cols'] = [{ wch: 22 }, { wch: 38 }, { wch: 20 }]
    XLSX.utils.book_append_sheet(wb, wsBreakdown, 'Desglose Económico')

    const cleanCode = (event.calc_code || 'CALC').replace(/[^a-zA-Z0-9_-]/g, '')
    XLSX.writeFile(wb, 'Ficha_Evento_' + cleanCode + '.xlsx')
  },

  // Alias para exportar evento individual
  exportSingleEvent(event) {
    this.exportEventDetailToExcel(event)
  },

  // 4. Exportar Comparativa de 2 o más eventos lado a lado
  exportComparisonToExcel(selectedEvents) {
    if (!selectedEvents || selectedEvents.length < 2) {
      alert('Seleccioná al menos 2 eventos para exportar la comparativa.')
      return
    }

    const metrics = [
      { key: 'calc_code', label: 'Código' },
      { key: 'name', label: 'Nombre del Evento' },
      { key: 'status', label: 'Estado', format: (v) => String(v || '').toUpperCase() },
      { key: 'event_date', label: 'Fecha' },
      { key: 'venue', label: 'Salón' },
      { key: 'agreement_type', label: 'Convenio' },
      { key: 'attendees', label: 'Asistentes (Pax)' },
      { key: 'gross_income', label: 'Facturación Bruta ($)' },
      { key: 'direct_costs', label: 'Costos Directos ($)' },
      { key: 'indirect_costs', label: 'Costos Indirectos ($)' },
      { key: 'total_costs', label: 'Costo Total ($)' },
      { key: 'barolo_profit', label: 'Ganancia Barolo ($)' },
      { key: 'margin_pct', label: 'Margen Barolo (%)', format: (v) => (v || 0) + '%' },
      { key: 'income_per_pax', label: 'Facturación x Pax ($)', calc: (e) => e.attendees > 0 ? Math.round((Number(e.gross_income) || 0) / e.attendees) : 0 },
      { key: 'cost_per_pax', label: 'Costo x Pax ($)', calc: (e) => e.attendees > 0 ? Math.round((Number(e.total_costs) || 0) / e.attendees) : 0 },
      { key: 'profit_per_pax', label: 'Ganancia Barolo x Pax ($)', calc: (e) => e.attendees > 0 ? Math.round((Number(e.barolo_profit) || 0) / e.attendees) : 0 }
    ]

    const comparisonRows = metrics.map(m => {
      const row = { 'Métrica Comparada': m.label }
      selectedEvents.forEach((ev, idx) => {
        const colName = 'Evento ' + (idx + 1) + ': ' + (ev.name || '')
        let val = m.calc ? m.calc(ev) : ev[m.key]
        if (m.format) val = m.format(val)
        row[colName] = val !== undefined && val !== null ? val : ''
      })
      return row
    })

    const ws = XLSX.utils.json_to_sheet(comparisonRows)
    const colWidths = [{ wch: 28 }, ...selectedEvents.map(() => ({ wch: 32 }))]
    ws['!cols'] = colWidths

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Comparativa de Eventos')
    XLSX.writeFile(wb, 'Comparativa_Eventos_Palacio_Barolo.xlsx')
  },

  // Alias para comparativa
  exportComparison(selectedEvents) {
    this.exportComparisonToExcel(selectedEvents)
  }
}
