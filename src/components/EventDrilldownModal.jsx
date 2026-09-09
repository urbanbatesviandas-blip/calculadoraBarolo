import React from 'react'
import { 
  X, CheckCircle, Clock, XCircle, AlertTriangle, Building2, Calendar, 
  Users, DollarSign, ArrowUpRight, TrendingUp, Sparkles, Receipt, Calculator, PieChart 
} from 'lucide-react'
import { Bar } from 'react-chartjs-2'
import confetti from 'canvas-confetti'
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

export default function EventDrilldownModal({ event, onClose, onUpdateStatus, onEditInCalculator }) {
  if (!event) return null

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

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
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

          {/* Grid de Métricas Clave */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Facturación Bruta</span>
              <span className="text-lg font-bold text-barolo-navy">
                ${grossIncome.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">100% del ingreso</span>
            </div>

            <div className="bg-white border border-amber-200/80 rounded-2xl p-4 shadow-sm bg-amber-50/20">
              <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider block">Costos Directos</span>
              <span className="text-lg font-bold text-amber-700">
                ${directCosts.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
              </span>
              <span className="text-[10px] text-amber-600 block mt-0.5">Artistas, técnica, catering</span>
            </div>

            <div className="bg-white border border-rose-200/80 rounded-2xl p-4 shadow-sm bg-rose-50/20">
              <span className="text-xs font-semibold text-rose-800 uppercase tracking-wider block">Costos Indirectos</span>
              <span className="text-lg font-bold text-rose-700">
                ${indirectCosts.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
              </span>
              <span className="text-[10px] text-rose-600 block mt-0.5">Limpieza, seguros, salón</span>
            </div>

            <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-4 shadow-sm">
              <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider block">Ganancia Barolo</span>
              <span className="text-xl font-bold text-emerald-900">
                ${baroloProfit.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
              </span>
              <span className="text-[11px] font-bold text-emerald-700 block mt-0.5">
                Margen: {marginPct.toFixed(1)}%
              </span>
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
          
          <button
            onClick={() => onEditInCalculator(event)}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            <Calculator className="w-4 h-4 text-barolo-navy" />
            <span>Retocar en Calculadora Madre</span>
          </button>

          <div className="flex items-center space-x-2">
            {event.status === 'cotizado' && (
              <>
                <button
                  onClick={handleCancelQuote}
                  className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Marcar Cancelado</span>
                </button>

                <button
                  onClick={handleConfirmQuote}
                  className="flex items-center space-x-1.5 px-5 py-2 rounded-xl text-sm font-bold bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-700/20 hover:from-emerald-500 hover:to-teal-500 transition-all transform hover:scale-105"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>✅ CONFIRMAR Y PASAR A EVENTOS</span>
                </button>
              </>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-100"
            >
              Cerrar
            </button>
          </div>

        </div>

      </div>
    </div>
  )
}
