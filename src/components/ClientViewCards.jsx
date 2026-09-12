import React from 'react'
import { CheckCircle2, Check, DollarSign, Info, FileText, MonitorPlay } from 'lucide-react'

/**
 * 🏛️ PALACIO BAROLO - TARJETA DE SERVICIOS Y COBERTURA OPERATIVA (VISTA CLIENTE)
 * Reemplaza el desglose de costos internos por los servicios incluidos comerciales.
 */
export function ClientViewServicesCard({ venue = 'Salón 1923' }) {
  return (
    <div className="bg-white rounded-2xl shadow-luxury border border-slate-200 overflow-hidden">
      <div className="bg-[#0f172a] text-white px-4 py-3 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <h2 className="font-serif font-bold text-xs uppercase tracking-wider text-emerald-300">
            3. SERVICIOS Y COBERTURA OPERATIVA INCLUIDA
          </h2>
        </div>
        <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-mono font-bold">
          INCLUIDO EN PROPUESTA
        </span>
      </div>
      <div className="p-4 sm:p-5 space-y-4 text-xs">
        <p className="text-slate-600 leading-relaxed">
          La presente propuesta contempla la cobertura operativa y técnica requerida para el correcto desarrollo del evento en el <strong>Palacio Barolo</strong>:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start space-x-2.5">
            <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-900 block">Uso Exclusivo de Sala</span>
              <span className="text-slate-500 text-[11px]">Disponibilidad del salón principal {venue} con climatización integral.</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start space-x-2.5">
            <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-900 block">Técnica Base & Sonido</span>
              <span className="text-slate-500 text-[11px]">Sonorización ambiental, microfonía y soporte técnico durante la jornada.</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start space-x-2.5">
            <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-900 block">Personal y Control de Accesos</span>
              <span className="text-slate-500 text-[11px]">Recepción de invitados y supervisión de seguridad en hall y accesos.</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start space-x-2.5">
            <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-900 block">Limpieza Integral</span>
              <span className="text-slate-500 text-[11px]">Acondicionamiento higiénico integral previo y posterior a la jornada.</span>
            </div>
          </div>
        </div>

        <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-amber-900 text-xs flex items-center justify-between">
          <span className="italic">Todos los honorarios y servicios operativos quedan cubiertos e integrados en el valor global cotizado.</span>
        </div>
      </div>
    </div>
  )
}

/**
 * 🏛️ PALACIO BAROLO - TARJETA DE RESUMEN DE INVERSIÓN COMERCIAL (VISTA CLIENTE)
 * Presenta el valor comercial para el cliente ocultando rentabilidad y acuerdos internos.
 */
export function ClientViewInvestmentCard({
  totalGrossIncome = 0,
  invoiceType = 'Factura B',
  alquilerEspacio = 0,
  venue = 'Salón 1923',
  totalTicketing = 0,
  totalTicketsVendidos = 0,
  ticketAvgPrice = 0,
  selectedIncomes = [],
  totalExtraIncomes = 0,
  onOpenProposal,
  onExportHtml,
  formatARS
}) {
  return (
    <div className="bg-white rounded-2xl shadow-luxury border border-slate-200 overflow-hidden">
      <div className="bg-[#0f172a] text-white px-4 py-3 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <DollarSign className="w-4 h-4 text-amber-400" />
          <h2 className="font-serif font-bold text-xs uppercase tracking-wider text-amber-300">
            4. RESUMEN DE INVERSIÓN COMERCIAL
          </h2>
        </div>
        <span className="text-[10px] bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2.5 py-0.5 rounded-full font-mono font-bold">
          PRESUPUESTO CLIENTE
        </span>
      </div>

      <div className="p-4 sm:p-5 space-y-4 text-xs">
        {/* Tarjeta destacada Inversión Total */}
        <div className="bg-gradient-to-br from-barolo-navy via-slate-900 to-barolo-navy-dark text-white rounded-2xl p-5 shadow-xl border border-amber-500/30">
          <div className="flex items-center justify-between mb-1">
            <span className="font-serif uppercase tracking-wider text-xs font-bold text-amber-300">
              TOTAL INVERSIÓN PRESUPUESTADA:
            </span>
            <span className="text-[10px] bg-amber-400/20 text-amber-300 px-2.5 py-0.5 rounded-full font-mono font-bold border border-amber-400/30">
              {invoiceType}
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-mono font-black text-amber-400 my-2">
            {formatARS(totalGrossIncome)}
          </div>
          <p className="text-[11px] text-slate-300">
            Importe global cotizado para la contratación integral del espacio y servicios en el Palacio Barolo.
          </p>
        </div>

        {/* Síntesis de Conceptos Presupuestados */}
        <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <h4 className="font-bold text-slate-900 text-xs">Síntesis de Conceptos Cotizados:</h4>
          
          {Number(alquilerEspacio) > 0 && (
            <div className="flex justify-between items-center text-slate-700 py-1.5 border-b border-slate-200/60">
              <span>Uso Exclusivo de Espacio ({venue})</span>
              <span className="font-mono font-bold text-slate-900">{formatARS(alquilerEspacio)}</span>
            </div>
          )}

          {totalTicketing > 0 && (
            <div className="flex justify-between items-center text-slate-700 py-1.5 border-b border-slate-200/60">
              <span>Localidades / Tickets ({totalTicketsVendidos || 0} pax a {formatARS(ticketAvgPrice)})</span>
              <span className="font-mono font-bold text-slate-900">{formatARS(totalTicketing)}</span>
            </div>
          )}

          {selectedIncomes.map((inc, i) => (
            Number(inc.amount) > 0 ? (
              <div key={inc.key || i} className="flex justify-between items-center text-slate-700 py-1.5 border-b border-slate-200/60">
                <span>{inc.name || inc.label || 'Rubro adicional'}</span>
                <span className="font-mono font-bold text-slate-900">{formatARS(inc.amount)}</span>
              </div>
            ) : null
          ))}

          {totalExtraIncomes > 0 && (
            <div className="flex justify-between items-center text-slate-700 py-1.5 border-b border-slate-200/60">
              <span>Servicios Especiales / Extras</span>
              <span className="font-mono font-bold text-slate-900">{formatARS(totalExtraIncomes)}</span>
            </div>
          )}
        </div>

        {/* Condiciones Comerciales y Formas de Pago */}
        <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
          <h4 className="font-bold text-amber-950 text-xs flex items-center space-x-1.5">
            <Info className="w-4 h-4 text-amber-700" />
            <span>Condiciones Comerciales de Contratación:</span>
          </h4>
          <ul className="list-disc list-inside space-y-1 text-slate-700 text-[11px]">
            <li><strong>Reserva de fecha:</strong> 30% del valor total contra confirmación.</li>
            <li><strong>Saldo cancelatorio:</strong> 70% restante hasta 7 días corridos antes del evento.</li>
            <li><strong>Medios de pago:</strong> Transferencia bancaria directa / e-Cheq / Factura legal.</li>
            <li><strong>Vigencia de la oferta:</strong> 15 días corridos a partir de su emisión.</li>
          </ul>
        </div>

        {/* Acciones Rápidas para el Cliente */}
        <div className="pt-2 flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={onOpenProposal}
            className="flex-1 flex items-center justify-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 px-3 rounded-xl shadow transition-colors cursor-pointer"
          >
            <FileText className="w-4 h-4 text-amber-400" />
            <span>Presupuesto Formal PDF</span>
          </button>

          <button
            type="button"
            onClick={onExportHtml}
            className="flex-1 flex items-center justify-center space-x-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs py-2.5 px-3 rounded-xl shadow transition-all cursor-pointer"
          >
            <MonitorPlay className="w-4 h-4 text-slate-950" />
            <span>Presentación HTML</span>
          </button>
        </div>

      </div>
    </div>
  )
}
