import React, { useMemo } from 'react'
import { X, FileSpreadsheet, Trophy, DollarSign, TrendingUp, Users, Calendar, MapPin, CheckCircle2, Clock, Eye, Trash2, ArrowRight } from 'lucide-react'
import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'
import { excelExportService } from '../services/excelExportService'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
)

export default function EventComparisonModal({ events = [], onClose, onSelectEvent, onRemoveEvent, isOpen }) {
  if (isOpen !== undefined && !isOpen) return null
  if (!events || events.length < 2) return null

  // 1. Calcular Eventos Destacados (Insignias)
  const highlights = useMemo(() => {
    let maxIncome = events[0]
    let maxProfit = events[0]
    let maxMargin = events[0]
    let minCostPerPax = events[0]
    let lowestCostVal = events[0].attendees > 0 ? (Number(events[0].total_costs) || 0) / events[0].attendees : Infinity

    events.forEach(e => {
      const gross = Number(e.gross_income) || 0
      const profit = Number(e.barolo_profit) || 0
      const margin = Number(e.margin_pct) || 0
      const costPerPax = e.attendees > 0 ? (Number(e.total_costs) || 0) / e.attendees : Infinity

      if (gross > (Number(maxIncome.gross_income) || 0)) maxIncome = e
      if (profit > (Number(maxProfit.barolo_profit) || 0)) maxProfit = e
      if (margin > (Number(maxMargin.margin_pct) || 0)) maxMargin = e
      if (costPerPax < lowestCostVal) {
        lowestCostVal = costPerPax
        minCostPerPax = e
      }
    })

    return { maxIncome, maxProfit, maxMargin, minCostPerPax }
  }, [events])

  // 2. Datos para el Gráfico Comparativo de Barras
  const chartData = useMemo(() => {
    const labels = events.map(e => e.calc_code || e.name.substring(0, 15))

    return {
      labels,
      datasets: [
        {
          label: 'Facturación Bruta ($)',
          data: events.map(e => Number(e.gross_income) || 0),
          backgroundColor: 'rgba(59, 130, 246, 0.85)', // Azul
          borderRadius: 6
        },
        {
          label: 'Costo Total ($)',
          data: events.map(e => Number(e.total_costs) || 0),
          backgroundColor: 'rgba(239, 68, 68, 0.85)', // Rojo
          borderRadius: 6
        },
        {
          label: 'Ganancia Barolo ($)',
          data: events.map(e => Number(e.barolo_profit) || 0),
          backgroundColor: 'rgba(16, 185, 129, 0.9)', // Verde esmeralda
          borderRadius: 6
        }
      ]
    }
  }, [events])

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          font: { family: 'Plus Jakarta Sans', size: 11, weight: 'bold' }
        }
      },
      tooltip: {
        callbacks: {
          label: function(ctx) {
            const val = ctx.raw || 0
            return `${ctx.dataset.label}: $${val.toLocaleString('es-AR')}`
          }
        }
      }
    },
    scales: {
      y: {
        ticks: {
          callback: function(v) {
            return `$${(v / 1000).toLocaleString('es-AR')}k`
          },
          font: { size: 10 }
        }
      },
      x: {
        ticks: { font: { size: 11, weight: 'bold' } }
      }
    }
  }

  const handleExportExcel = () => {
    excelExportService.exportComparisonToExcel(events)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-6xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-barolo-navy text-white p-4 sm:p-5 border-b border-barolo-gold/40 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-barolo-gold to-barolo-gold-dark flex items-center justify-center text-barolo-navy font-bold text-lg shadow-md">
              ⚖️
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-serif font-bold text-base sm:text-lg text-white">Comparativa Económica de Eventos</h3>
                <span className="bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {events.length} eventos seleccionados
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-300">Análisis comparativo de facturación, estructura de costos y rentabilidad neta</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleExportExcel}
              className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-xl text-xs font-bold shadow-md transition-all active:scale-95"
              title="Descargar matriz comparativa en formato Excel"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span className="hidden sm:inline">Exportar a Excel</span>
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-white p-1.5 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto p-4 sm:p-6 space-y-6 flex-1 text-xs">
          
          {/* 1. Insignias de Rendimiento (Highlights) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-amber-50 border border-amber-300 rounded-2xl p-3 flex flex-col justify-between">
              <div className="flex items-center space-x-2 text-amber-800 font-bold mb-1">
                <Trophy className="w-4 h-4 text-amber-600" />
                <span className="text-[11px] uppercase tracking-wider">Mayor Rentabilidad</span>
              </div>
              <p className="font-bold text-slate-900 text-xs truncate" title={highlights.maxMargin.name}>
                {highlights.maxMargin.calc_code} — {highlights.maxMargin.name}
              </p>
              <span className="text-base font-extrabold text-amber-900 mt-1">
                {highlights.maxMargin.margin_pct}% margen
              </span>
            </div>

            <div className="bg-blue-50 border border-blue-300 rounded-2xl p-3 flex flex-col justify-between">
              <div className="flex items-center space-x-2 text-blue-800 font-bold mb-1">
                <DollarSign className="w-4 h-4 text-blue-600" />
                <span className="text-[11px] uppercase tracking-wider">Mayor Facturación</span>
              </div>
              <p className="font-bold text-slate-900 text-xs truncate" title={highlights.maxIncome.name}>
                {highlights.maxIncome.calc_code} — {highlights.maxIncome.name}
              </p>
              <span className="text-base font-extrabold text-blue-900 mt-1">
                ${(Number(highlights.maxIncome.gross_income) || 0).toLocaleString('es-AR')}
              </span>
            </div>

            <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-3 flex flex-col justify-between">
              <div className="flex items-center space-x-2 text-emerald-800 font-bold mb-1">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span className="text-[11px] uppercase tracking-wider">Mayor Ganancia Barolo</span>
              </div>
              <p className="font-bold text-slate-900 text-xs truncate" title={highlights.maxProfit.name}>
                {highlights.maxProfit.calc_code} — {highlights.maxProfit.name}
              </p>
              <span className="text-base font-extrabold text-emerald-900 mt-1">
                ${(Number(highlights.maxProfit.barolo_profit) || 0).toLocaleString('es-AR')}
              </span>
            </div>

            <div className="bg-purple-50 border border-purple-300 rounded-2xl p-3 flex flex-col justify-between">
              <div className="flex items-center space-x-2 text-purple-800 font-bold mb-1">
                <Users className="w-4 h-4 text-purple-600" />
                <span className="text-[11px] uppercase tracking-wider">Menor Costo x Pax</span>
              </div>
              <p className="font-bold text-slate-900 text-xs truncate" title={highlights.minCostPerPax.name}>
                {highlights.minCostPerPax.calc_code} — {highlights.minCostPerPax.name}
              </p>
              <span className="text-base font-extrabold text-purple-900 mt-1">
                ${highlights.minCostPerPax.attendees > 0 ? Math.round((Number(highlights.minCostPerPax.total_costs) || 0) / highlights.minCostPerPax.attendees).toLocaleString('es-AR') : 0} / pax
              </span>
            </div>
          </div>

          {/* 2. Gráfico Comparativo Visual */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
            <h4 className="font-bold text-slate-800 text-xs mb-3 flex items-center space-x-1.5">
              <span>📊 Comparación de Facturación vs Costos vs Ganancia Barolo</span>
            </h4>
            <div className="h-56 w-full">
              <Bar data={chartData} options={chartOptions} />
            </div>
          </div>

          {/* 3. Matriz Comparativa Lado a Lado (Table) */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-barolo-navy text-white text-xs border-b border-barolo-gold/40">
                    <th className="p-3.5 font-bold w-48 min-w-[190px] sticky left-0 bg-barolo-navy z-10">
                      Variable Económica
                    </th>
                    {events.map(e => (
                      <th key={e.id} className="p-3.5 font-bold min-w-[220px] max-w-[280px]">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="font-mono text-[10px] bg-amber-400 text-barolo-navy px-1.5 py-0.5 rounded font-bold">
                              {e.calc_code || 'CALC'}
                            </span>
                            <h5 className="font-bold text-white text-xs truncate mt-1" title={e.name}>
                              {e.name}
                            </h5>
                          </div>
                          {onRemoveEvent && events.length > 2 && (
                            <button
                              onClick={() => onRemoveEvent(e.id)}
                              className="text-slate-400 hover:text-rose-300 p-1"
                              title="Quitar de la comparativa"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {/* Fila: Estado */}
                  <tr className="bg-slate-50/50">
                    <td className="p-3 font-semibold text-slate-500 sticky left-0 bg-slate-50/90">Estado Comercial</td>
                    {events.map(e => (
                      <td key={e.id} className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          e.status === 'contratado' ? 'bg-emerald-100 text-emerald-800' :
                          e.status === 'reservado' ? 'bg-blue-100 text-blue-800' :
                          e.status === 'cotizado' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {e.status}
                        </span>
                      </td>
                    ))}
                  </tr>

                  {/* Fila: Fecha */}
                  <tr>
                    <td className="p-3 font-semibold text-slate-500 sticky left-0 bg-white">Fecha del Evento</td>
                    {events.map(e => (
                      <td key={e.id} className="p-3 font-medium">{e.event_date}</td>
                    ))}
                  </tr>

                  {/* Fila: Salón */}
                  <tr className="bg-slate-50/50">
                    <td className="p-3 font-semibold text-slate-500 sticky left-0 bg-slate-50/90">Salón / Espacio</td>
                    {events.map(e => (
                      <td key={e.id} className="p-3 font-medium">{e.venue}</td>
                    ))}
                  </tr>

                  {/* Fila: Modalidad Convenio */}
                  <tr>
                    <td className="p-3 font-semibold text-slate-500 sticky left-0 bg-white">Convenio</td>
                    {events.map(e => (
                      <td key={e.id} className="p-3 font-medium">{e.agreement_type || '100% Barolo'}</td>
                    ))}
                  </tr>

                  {/* Fila: Asistentes */}
                  <tr className="bg-slate-50/50">
                    <td className="p-3 font-semibold text-slate-500 sticky left-0 bg-slate-50/90">Asistentes (Pax)</td>
                    {events.map(e => (
                      <td key={e.id} className="p-3 font-bold">{Number(e.attendees) || 0} personas</td>
                    ))}
                  </tr>

                  {/* SECCIÓN FINANCIERA */}
                  <tr className="bg-amber-100/40 text-amber-950 font-bold border-t-2 border-amber-200">
                    <td colSpan={events.length + 1} className="p-2 text-[11px] uppercase tracking-wider">
                      💰 Totales Económicos
                    </td>
                  </tr>

                  {/* Facturación Bruta */}
                  <tr>
                    <td className="p-3 font-bold text-slate-800 sticky left-0 bg-white">Facturación Bruta</td>
                    {events.map(e => (
                      <td key={e.id} className="p-3 font-bold text-slate-900 text-sm">
                        ${(Number(e.gross_income) || 0).toLocaleString('es-AR')}
                      </td>
                    ))}
                  </tr>

                  {/* Costos Directos */}
                  <tr className="bg-slate-50/50">
                    <td className="p-3 font-semibold text-slate-600 sticky left-0 bg-slate-50/90">Costos Directos</td>
                    {events.map(e => {
                      const gross = Number(e.gross_income) || 1
                      const direct = Number(e.direct_costs) || 0
                      return (
                        <td key={e.id} className="p-3 font-medium text-rose-700">
                          ${direct.toLocaleString('es-AR')}
                          <span className="text-[10px] text-slate-400 block font-normal">
                            {((direct / gross) * 100).toFixed(1)}% de ingresos
                          </span>
                        </td>
                      )
                    })}
                  </tr>

                  {/* Costos Indirectos */}
                  <tr>
                    <td className="p-3 font-semibold text-slate-600 sticky left-0 bg-white">Costos Indirectos</td>
                    {events.map(e => {
                      const gross = Number(e.gross_income) || 1
                      const indirect = Number(e.indirect_costs) || 0
                      return (
                        <td key={e.id} className="p-3 font-medium text-amber-700">
                          ${indirect.toLocaleString('es-AR')}
                          <span className="text-[10px] text-slate-400 block font-normal">
                            {((indirect / gross) * 100).toFixed(1)}% de ingresos
                          </span>
                        </td>
                      )
                    })}
                  </tr>

                  {/* Costo Total */}
                  <tr className="bg-slate-50/50">
                    <td className="p-3 font-bold text-slate-800 sticky left-0 bg-slate-50/90">Costo Total Operativo</td>
                    {events.map(e => (
                      <td key={e.id} className="p-3 font-bold text-rose-800">
                        ${(Number(e.total_costs) || 0).toLocaleString('es-AR')}
                      </td>
                    ))}
                  </tr>

                  {/* Ganancia Barolo */}
                  <tr className="bg-emerald-50/60 font-bold">
                    <td className="p-3 text-emerald-900 sticky left-0 bg-emerald-50/90">Ganancia Neta Barolo</td>
                    {events.map(e => (
                      <td key={e.id} className="p-3 font-extrabold text-emerald-700 text-sm">
                        ${(Number(e.barolo_profit) || 0).toLocaleString('es-AR')}
                      </td>
                    ))}
                  </tr>

                  {/* Margen % */}
                  <tr className="bg-emerald-50/30">
                    <td className="p-3 font-bold text-emerald-900 sticky left-0 bg-emerald-50/80">Margen de Rentabilidad</td>
                    {events.map(e => (
                      <td key={e.id} className="p-3 font-extrabold text-emerald-800">
                        {Number(e.margin_pct) || 0}%
                      </td>
                    ))}
                  </tr>

                  {/* SECCIÓN UNITARIA */}
                  <tr className="bg-sky-100/40 text-sky-950 font-bold border-t-2 border-sky-200">
                    <td colSpan={events.length + 1} className="p-2 text-[11px] uppercase tracking-wider">
                      👥 Métricas Unitarias (Por Persona / Pax)
                    </td>
                  </tr>

                  {/* Facturación x Pax */}
                  <tr>
                    <td className="p-3 font-semibold text-slate-600 sticky left-0 bg-white">Facturación x Asistente</td>
                    {events.map(e => {
                      const pax = Number(e.attendees) || 1
                      const val = Math.round((Number(e.gross_income) || 0) / pax)
                      return (
                        <td key={e.id} className="p-3 font-bold text-slate-800">
                          ${val.toLocaleString('es-AR')}
                        </td>
                      )
                    })}
                  </tr>

                  {/* Costo x Pax */}
                  <tr className="bg-slate-50/50">
                    <td className="p-3 font-semibold text-slate-600 sticky left-0 bg-slate-50/90">Costo Total x Asistente</td>
                    {events.map(e => {
                      const pax = Number(e.attendees) || 1
                      const val = Math.round((Number(e.total_costs) || 0) / pax)
                      return (
                        <td key={e.id} className="p-3 font-medium text-rose-700">
                          ${val.toLocaleString('es-AR')}
                        </td>
                      )
                    })}
                  </tr>

                  {/* Ganancia x Pax */}
                  <tr className="bg-emerald-50/40">
                    <td className="p-3 font-bold text-emerald-900 sticky left-0 bg-emerald-50/90">Ganancia Barolo x Asistente</td>
                    {events.map(e => {
                      const pax = Number(e.attendees) || 1
                      const val = Math.round((Number(e.barolo_profit) || 0) / pax)
                      return (
                        <td key={e.id} className="p-3 font-bold text-emerald-700">
                          ${val.toLocaleString('es-AR')}
                        </td>
                      )
                    })}
                  </tr>

                  {/* Acciones */}
                  <tr>
                    <td className="p-3 font-semibold text-slate-500 sticky left-0 bg-white">Acciones</td>
                    {events.map(e => (
                      <td key={e.id} className="p-3">
                        <button
                          onClick={() => {
                            onClose()
                            onSelectEvent && onSelectEvent(e)
                          }}
                          className="bg-barolo-navy hover:bg-barolo-navy-light text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Ver Ficha</span>
                        </button>
                      </td>
                    ))}
                  </tr>

                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex items-center justify-between flex-shrink-0">
          <span className="text-xs text-slate-500">
            Podés comparar hasta 6 eventos en simultáneo. Para agregar más, marcalos con la casilla en el Registro o Calendario.
          </span>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-sm transition-colors flex items-center space-x-1.5"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Descargar Excel</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-xs transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
