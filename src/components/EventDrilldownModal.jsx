import React, { useMemo } from 'react'
import { 
  X, CheckCircle, Clock, XCircle, AlertTriangle, Building2, Calendar, 
  Users, DollarSign, ArrowUpRight, TrendingUp, Sparkles, Receipt, Calculator, PieChart, BookmarkCheck,
  FileSpreadsheet, ShieldAlert
} from 'lucide-react'
import { Bar } from 'react-chartjs-2'
import confetti from 'canvas-confetti'
import { excelExportService } from '../services/excelExportService'
import { canEditEvent, canChangeStatus } from '../services/authService'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

export default function EventDrilldownModal({ event, onClose, onUpdateStatus, onEditInCalculator, currentUser }) {
  if (!event) return null

  const userCanEdit = canEditEvent(currentUser)
  const userCanChange = canChangeStatus(currentUser)

  const grossIncome = Number(event.gross_income) || 0
  const directCosts = Number(event.direct_costs) || 0
  const indirectCosts = Number(event.indirect_costs) || 0
  const totalCosts = Number(event.total_costs) || (directCosts + indirectCosts)
  const netProfit = Number(event.net_profit) || (grossIncome - totalCosts)
  const baroloProfit = Number(event.barolo_profit) || netProfit
  const marginPct = Number(event.margin_pct) || (grossIncome > 0 ? (netProfit / grossIncome * 100) : 0)
  const attendees = Number(event.attendees) || 25
  const profitPerAttendee = attendees > 0 ? (baroloProfit / attendees) : 0
  const costPerAttendee = attendees > 0 ? (totalCosts / attendees) : 0

  // 1. Desglose Detallado de Facturación Bruta
  const incomeBreakdown = useMemo(() => {
    if (event.preventa_qty !== undefined || event.general_qty !== undefined || event.alquiler_espacio !== undefined) {
      const items = []
      const preventaTot = (Number(event.preventa_qty) || 0) * (Number(event.preventa_price) || 0)
      const generalTot = (Number(event.general_qty) || 0) * (Number(event.general_price) || 0)
      const alq = (Number(event.alquiler_espacio) || 0) + (Number(event.contratacion_salon) || 0)

      if (preventaTot > 0) items.push({ label: `Preventa (${event.preventa_qty} u.)`, amount: preventaTot, icon: '🎟️' })
      if (generalTot > 0) items.push({ label: `Entradas Generales (${event.general_qty} u.)`, amount: generalTot, icon: '🎫' })
      if (alq > 0) items.push({ label: 'Alquiler Espacio Barolo', amount: alq, icon: '🏛️' })
      
      if (event.extra_incomes && event.extra_incomes.length > 0) {
        event.extra_incomes.forEach(inc => {
          if (Number(inc.amount) > 0) {
            items.push({ label: inc.concept || 'Otros Ingresos', amount: Number(inc.amount), icon: '✨' })
          }
        })
      }
      if (items.length > 0) return items
    }

    if (event.ticket_qty > 0 && event.ticket_price > 0) {
      const ticketsTotal = Number(event.ticket_qty) * Number(event.ticket_price)
      const otherIncome = Math.max(0, grossIncome - ticketsTotal)
      return [
        { label: `Entradas (${event.ticket_qty} u.)`, amount: ticketsTotal, icon: '🎟️' },
        ...(otherIncome > 0 ? [{ label: 'Canon / Alquiler Espacio', amount: otherIncome, icon: '🏛️' }] : []),
      ]
    } else {
      const canonEspacio = Math.round(grossIncome * 0.75)
      const serviciosExtras = grossIncome - canonEspacio
      return [
        { label: 'Alquiler Espacio Barolo', amount: canonEspacio, icon: '🏛️' },
        { label: 'Servicios de Salón / Extras', amount: serviciosExtras, icon: '✨' }
      ]
    }
  }, [event, grossIncome])

  // 2. Desglose Detallado de Costos Directos
  const directCostsBreakdown = useMemo(() => {
    if (directCosts <= 0) return [{ label: 'Sin costos directos', amount: 0, icon: '✓' }]
    
    // Si el evento ya tiene guardados los rubros específicos, usarlos
    if (event.cost_artistas !== undefined) {
      return [
        { label: 'Honorarios Artistas', amount: Number(event.cost_artistas) || 0, icon: '🎭' },
        { label: 'Técnica & Sonido', amount: Number(event.cost_tecnica) || 0, icon: '🎛️' },
        { label: 'Disertantes / Speakers', amount: Number(event.cost_disertantes) || 0, icon: '🎙️' },
        { label: 'Catering / Gastronomía', amount: Number(event.cost_catering) || 0, icon: '🍽️' },
        { label: 'Mobiliario & Insumos', amount: (Number(event.cost_mobiliario) || 0) + (Number(event.cost_gastronomicos) || 0), icon: '🛋️' }
      ].filter(i => i.amount > 0)
    }

    // Si viene de la base histórica general, aplicar proporciones estándar del Barolo
    const artistas = Math.round(directCosts * 0.55)
    const tecnica = Math.round(directCosts * 0.25)
    const catering = Math.round(directCosts * 0.15)
    const insumos = directCosts - artistas - tecnica - catering
    return [
      { label: 'Honorarios Artistas', amount: artistas, icon: '🎭' },
      { label: 'Técnica & Sonido', amount: tecnica, icon: '🎛️' },
      { label: 'Catering & Bebidas', amount: catering, icon: '🍽️' },
      { label: 'Mobiliario & Insumos', amount: insumos, icon: '🛋️' }
    ]
  }, [directCosts, event])

  // 3. Desglose Detallado de Costos Indirectos
  const indirectCostsBreakdown = useMemo(() => {
    if (indirectCosts <= 0) return [{ label: 'Sin costos indirectos', amount: 0, icon: '✓' }]
    
    if (event.cost_limpieza !== undefined) {
      const items = [
        { label: 'RRHH Salón & Seguridad', amount: Number(event.cost_rrhh) || 0, icon: '👔' },
        { label: 'Limpieza Integral', amount: Number(event.cost_limpieza) || 0, icon: '🧹' },
        { label: 'Seguros del Evento', amount: Number(event.cost_seguros) || 0, icon: '🛡️' },
        { label: 'Canon Espacio / Operación', amount: Number(event.cost_alquiler_espacio) || 0, icon: '🏢' },
        { label: 'Marketing / SADAIC', amount: (Number(event.cost_marketing) || 0) + (Number(event.cost_sadaic) || 0), icon: '📢' }
      ].filter(i => i.amount > 0)

      if (event.extra_expenses && event.extra_expenses.length > 0) {
        event.extra_expenses.forEach(exp => {
          if (Number(exp.amount) > 0) {
            items.push({ label: exp.concept || 'Otros Gastos', amount: Number(exp.amount), icon: '📦' })
          }
        })
      }
      return items.length > 0 ? items : [{ label: 'Costos Indirectos', amount: indirectCosts, icon: '📋' }]
    }

    const limpieza = Math.round(indirectCosts * 0.25)
    const seguros = Math.round(indirectCosts * 0.25)
    const rrhh = Math.round(indirectCosts * 0.35)
    const varios = indirectCosts - limpieza - seguros - rrhh
    return [
      { label: 'RRHH Salón & Seguridad', amount: rrhh, icon: '👔' },
      { label: 'Limpieza Integral', amount: limpieza, icon: '🧹' },
      { label: 'Seguros del Evento', amount: seguros, icon: '🛡️' },
      { label: 'SADAIC / Varios', amount: varios, icon: '📢' }
    ]
  }, [indirectCosts, event])

  // 4. Desglose Detallado de Ganancia Barolo
  const baroloProfitBreakdown = useMemo(() => {
    const terceros = Math.max(0, netProfit - baroloProfit)
    return [
      { label: 'Margen Operativo Bruto', amount: netProfit, icon: '📊' },
      { label: `Parte Barolo (${event.agreement_type || '100%'})`, amount: baroloProfit, icon: '🏛️', highlight: true },
      ...(terceros > 0 ? [{ label: 'Parte Productor / Terceros', amount: terceros, icon: '👤' }] : []),
      { label: 'Ganancia x Asistente', amount: profitPerAttendee, icon: '🎟️' }
    ]
  }, [netProfit, baroloProfit, event, profitPerAttendee])

  // Configuración del Gráfico de Rentabilidad
  const chartData = {
    labels: ['Facturación Bruta', 'Costos Directos', 'Costos Indirectos', 'Costo Total', 'Ganancia Barolo'],
    datasets: [
      {
        label: 'Monto en Pesos ($)',
        data: [grossIncome, directCosts, indirectCosts, totalCosts, baroloProfit],
        backgroundColor: [
          'rgba(27, 42, 74, 0.9)',    // Navy (Facturación)
          'rgba(245, 158, 11, 0.85)', // Amber (Directos)
          'rgba(239, 68, 68, 0.85)',  // Red (Indirectos)
          'rgba(185, 28, 28, 0.9)',   // Dark Red (Total Costos)
          'rgba(16, 185, 129, 0.95)'  // Emerald (Ganancia Barolo)
        ],
        borderColor: [
          '#1B2A4A',
          '#D97706',
          '#DC2626',
          '#991B1B',
          '#059669'
        ],
        borderWidth: 1.5,
        borderRadius: 8,
      }
    ]
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: function (context) {
            return ` $${context.raw.toLocaleString('es-AR')}`
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function (value) {
            return `$${(value / 1000).toLocaleString('es-AR')}k`
          },
          font: { family: 'Segoe UI', size: 11 }
        },
        grid: { color: 'rgba(226, 232, 240, 0.8)' }
      },
      x: {
        ticks: { font: { family: 'Segoe UI', size: 11, weight: 'bold' } },
        grid: { display: false }
      }
    }
  }

  // Confirmar Cotización (Pasa a Contratado y tira confeti)
  const handleConfirmQuote = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    })
    onUpdateStatus(event.id, 'contratado')
  }

  // Cancelar Evento
  const handleCancelQuote = () => {
    const reason = prompt('Por favor ingresá el motivo de cancelación / pérdida:', 'Presupuesto excedido')
    if (reason !== null) {
      onUpdateStatus(event.id, 'cancelado', reason)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-barolo-navy to-barolo-navy-dark text-white p-6 border-b border-barolo-gold/40 flex items-start justify-between">
          <div>
            <div className="flex items-center space-x-2.5 mb-1.5">
              <span className="bg-amber-400/20 text-amber-300 font-mono text-xs px-2.5 py-0.5 rounded-full border border-amber-400/40">
                {event.calc_code || 'CALC-000'}
              </span>
              
              {event.status === 'contratado' && (
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center">
                  <CheckCircle className="w-3.5 h-3.5 mr-1" /> Contratado
                </span>
              )}
              {event.status === 'reservado' && (
                <span className="bg-blue-500/20 text-blue-300 border border-blue-500/40 text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center">
                  <Clock className="w-3.5 h-3.5 mr-1" /> Reservado
                </span>
              )}
              {event.status === 'cotizado' && (
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center">
                  <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Cotizado (En Proceso)
                </span>
              )}
              {event.status === 'cancelado' && (
                <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center">
                  <XCircle className="w-3.5 h-3.5 mr-1" /> Cancelado
                </span>
              )}

              <span className="text-xs text-slate-300">{event.event_type}</span>
            </div>

            <h2 className="text-2xl font-serif font-bold text-white tracking-wide">
              {event.name}
            </h2>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 mt-2">
              <span className="flex items-center"><Calendar className="w-3.5 h-3.5 mr-1 text-amber-300" /> {event.event_date}</span>
              <span className="flex items-center"><Building2 className="w-3.5 h-3.5 mr-1 text-amber-300" /> {event.venue}</span>
              <span className="flex items-center"><Users className="w-3.5 h-3.5 mr-1 text-amber-300" /> {attendees} personas</span>
              <span className="flex items-center"><Receipt className="w-3.5 h-3.5 mr-1 text-amber-300" /> Cliente: {event.client_name}</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => excelExportService.exportSingleEvent(event)}
              className="flex items-center space-x-1.5 bg-emerald-700/80 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
              title="Descargar Ficha Completa del Evento en Excel"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
              <span className="hidden sm:inline">Exportar Excel</span>
            </button>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 bg-slate-50/50">
          
          {/* Motivo de Cancelación si aplica */}
          {event.status === 'cancelado' && event.cancellation_reason && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-rose-900 flex items-start space-x-3">
              <XCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-sm block">Motivo de Cancelación / Pérdida:</span>
                <p className="text-sm">{event.cancellation_reason}</p>
              </div>
            </div>
          )}

          {/* Gráfico de Rentabilidad */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <PieChart className="w-5 h-5 text-barolo-navy" />
                <h3 className="font-serif font-bold text-barolo-navy text-base">
                  Gráfico de Rentabilidad & Estructura Económica
                </h3>
              </div>
              <span className="text-xs text-slate-500 font-medium">Acuerdo: {event.agreement_type || '100% Barolo'}</span>
            </div>

            <div className="h-64 w-full">
              <Bar data={chartData} options={chartOptions} />
            </div>
          </div>

          {/* Grid de 4 Tarjetas con Desglose Detallado Interno */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* 1. Facturación Bruta */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Facturación Bruta</span>
                  <span className="text-xs">💰</span>
                </div>
                <div className="text-2xl font-bold text-barolo-navy my-1">
                  ${grossIncome.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                </div>

                {/* Desglose de Facturación */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1.5 text-[11px]">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Desglose de Ingresos:</span>
                  {incomeBreakdown.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-slate-700">
                      <span className="truncate pr-1 flex items-center">
                        <span className="mr-1 text-[10px]">{item.icon}</span> {item.label}
                      </span>
                      <span className="font-semibold text-slate-900 flex-shrink-0">
                        ${item.amount.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-100 text-[10px] text-slate-400 font-medium">
                100% del ingreso del evento
              </div>
            </div>

            {/* 2. Costos Directos */}
            <div className="bg-amber-50/20 border border-amber-200/90 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Costos Directos</span>
                  <span className="text-xs">🎭</span>
                </div>
                <div className="text-2xl font-bold text-amber-700 my-1">
                  ${directCosts.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                </div>

                {/* Desglose de Costos Directos */}
                <div className="mt-3 pt-2.5 border-t border-amber-200/60 space-y-1.5 text-[11px]">
                  <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block mb-1">Rubros Directos:</span>
                  {directCostsBreakdown.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-amber-900">
                      <span className="truncate pr-1 flex items-center">
                        <span className="mr-1 text-[10px]">{item.icon}</span> {item.label}
                      </span>
                      <span className="font-semibold text-amber-950 flex-shrink-0">
                        ${item.amount.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-amber-200/60 text-[10px] text-amber-700 font-medium">
                {grossIncome > 0 ? ((directCosts / grossIncome) * 100).toFixed(1) : 0}% de la facturación
              </div>
            </div>

            {/* 3. Costos Indirectos */}
            <div className="bg-rose-50/20 border border-rose-200/90 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">Costos Indirectos</span>
                  <span className="text-xs">🏢</span>
                </div>
                <div className="text-2xl font-bold text-rose-700 my-1">
                  ${indirectCosts.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                </div>

                {/* Desglose de Costos Indirectos */}
                <div className="mt-3 pt-2.5 border-t border-rose-200/60 space-y-1.5 text-[11px]">
                  <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block mb-1">Operación & Salón:</span>
                  {indirectCostsBreakdown.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-rose-900">
                      <span className="truncate pr-1 flex items-center">
                        <span className="mr-1 text-[10px]">{item.icon}</span> {item.label}
                      </span>
                      <span className="font-semibold text-rose-950 flex-shrink-0">
                        ${item.amount.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-rose-200/60 text-[10px] text-rose-700 font-medium">
                {grossIncome > 0 ? ((indirectCosts / grossIncome) * 100).toFixed(1) : 0}% de la facturación
              </div>
            </div>

            {/* 4. Ganancia Barolo */}
            <div className="bg-emerald-50/50 border border-emerald-300 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Ganancia Barolo</span>
                  <span className="text-xs">⭐</span>
                </div>
                <div className="text-2xl font-bold text-emerald-900 my-1">
                  ${baroloProfit.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                </div>

                {/* Desglose de Ganancia y Reparto */}
                <div className="mt-3 pt-2.5 border-t border-emerald-200 space-y-1.5 text-[11px]">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block mb-1">Reparto & Margen:</span>
                  {baroloProfitBreakdown.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-emerald-900">
                      <span className="truncate pr-1 flex items-center">
                        <span className="mr-1 text-[10px]">{item.icon}</span> {item.label}
                      </span>
                      <span className={`font-semibold flex-shrink-0 ${item.highlight ? 'font-bold text-emerald-950' : 'text-emerald-800'}`}>
                        ${item.amount.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-emerald-200 text-[11px] font-bold text-emerald-800">
                Margen Neto: {marginPct.toFixed(1)}%
              </div>
            </div>

          </div>

          {/* Métricas por Asistente & Ratios */}
          <div className="bg-gradient-to-br from-slate-900 to-barolo-navy text-white rounded-2xl p-5 shadow-lg flex flex-wrap items-center justify-around gap-4">
            <div className="text-center">
              <span className="text-xs text-slate-400 block">Ganancia x Asistente</span>
              <span className="text-lg font-bold text-emerald-400">
                ${profitPerAttendee.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
              </span>
            </div>

            <div className="w-px h-10 bg-white/10 hidden sm:block"></div>

            <div className="text-center">
              <span className="text-xs text-slate-400 block">Costo Promedio x Asistente</span>
              <span className="text-lg font-bold text-amber-400">
                ${costPerAttendee.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
              </span>
            </div>

            <div className="w-px h-10 bg-white/10 hidden sm:block"></div>

            <div className="text-center">
              <span className="text-xs text-slate-400 block">Relación Ingreso/Costo</span>
              <span className="text-lg font-bold text-cyan-300">
                {totalCosts > 0 ? (grossIncome / totalCosts).toFixed(2) : '1.00'}x
              </span>
            </div>
          </div>

          {/* Notas / Observaciones */}
          {event.notes && (
            <div className="bg-white border border-slate-200 rounded-2xl p-4 text-xs text-slate-600">
              <span className="font-bold text-slate-800 block mb-1">Notas Comerciales:</span>
              <p>{event.notes}</p>
            </div>
          )}

        </div>

        {/* Modal Footer with Actions */}
        <div className="bg-white border-t border-slate-200 p-4 px-6 flex flex-wrap items-center justify-between gap-3">
          
          <div className="flex flex-wrap items-center gap-2">
            {userCanEdit && (
              <button
                onClick={() => onEditInCalculator(event)}
                className="flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              >
                <Calculator className="w-4 h-4 text-barolo-navy" />
                <span>Retocar en Calculadora</span>
              </button>
            )}

            <button
              onClick={() => excelExportService.exportSingleEvent(event)}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 transition-colors"
              title="Descargar Ficha en Excel"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Ficha Excel (.xlsx)</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {userCanChange ? (
              <>
                {event.status === 'cotizado' && (
                  <>
                    <button
                      onClick={handleCancelQuote}
                      className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Marcar Cancelado</span>
                    </button>

                    <button
                      onClick={() => onUpdateStatus && onUpdateStatus(event.id, 'reservado')}
                      className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-sky-500 hover:bg-sky-400 text-white shadow-md shadow-sky-500/20 transition-all transform hover:scale-105"
                      title="Bloquear fecha y pasar a Reservado"
                    >
                      <BookmarkCheck className="w-3.5 h-3.5" />
                      <span>🔵 Reservar Fecha</span>
                    </button>

                    <button
                      onClick={handleConfirmQuote}
                      className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-700/20 hover:from-emerald-500 hover:to-teal-500 transition-all transform hover:scale-105"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>✅ CONFIRMAR Y PASAR A EVENTOS</span>
                    </button>
                  </>
                )}

                {event.status === 'reservado' && (
                  <>
                    <button
                      onClick={handleCancelQuote}
                      className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Marcar Cancelado</span>
                    </button>

                    <button
                      onClick={handleConfirmQuote}
                      className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-700/20 hover:from-emerald-500 hover:to-teal-500 transition-all transform hover:scale-105"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>✅ CONFIRMAR Y PASAR A EVENTOS</span>
                    </button>
                  </>
                )}
              </>
            ) : (
              (event.status === 'cotizado' || event.status === 'reservado') && (
                <span className="text-xs text-slate-400 italic bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                  Modo solo lectura: acciones reservadas para modificador/admin
                </span>
              )
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-100 transition-colors"
            >
              Cerrar
            </button>
          </div>

        </div>

      </div>
    </div>
  )
}
