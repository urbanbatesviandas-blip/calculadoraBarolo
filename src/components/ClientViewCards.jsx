import React from 'react'
import { CheckCircle2, Check, DollarSign, Info, FileText, MonitorPlay } from 'lucide-react'

/**
 * 🏛️ PALACIO BAROLO - DICCIONARIO DE SERVICIOS COMERCIALES CLIENT-FACING
 * Mapea cada rubro de costo interno a su equivalente de servicio para la propuesta comercial.
 */
const STANDARD_SERVICES = {
  cost_alquiler_espacio: {
    title: 'Uso Exclusivo de Sala',
    desc: (venue) => `Disponibilidad del salón principal ${venue} con climatización integral y acceso prioritario.`
  },
  cost_tecnica: {
    title: 'Técnica Base, Sonido & Iluminación',
    desc: () => 'Sonorización ambiental, microfonía y soporte técnico especializado durante la jornada.'
  },
  cost_rrhh: {
    title: 'Personal y Control de Accesos',
    desc: () => 'Recepción de invitados y supervisión de seguridad en hall principal y accesos.'
  },
  cost_limpieza: {
    title: 'Limpieza Integral Post-Evento',
    desc: () => 'Acondicionamiento higiénico integral previo, durante y posterior a la jornada.'
  },
  cost_catering: {
    title: 'Servicio de Catering & Bebidas',
    desc: () => 'Propuesta gastronómica integral, servicio de bebidas y atención en salón.'
  },
  cost_gastronomicos: {
    title: 'Insumos Gastronómicos & Barra',
    desc: () => 'Servicio de cafetería, cristalería, vajilla y consumibles de barra.'
  },
  cost_mobiliario: {
    title: 'Mobiliario, Vajilla & Ambientación',
    desc: () => 'Armado, disposición de mesas, sillas de diseño y elementos de ambientación.'
  },
  cost_artistas: {
    title: 'Producción Artística & Shows en Vivo',
    desc: () => 'Coordinación escénica, producción y presentación de artistas contratados.'
  },
  cost_disertantes: {
    title: 'Disertantes, Oradores & Conferencias',
    desc: () => 'Logística, equipamiento y soporte técnico para panelistas y disertantes.'
  },
  cost_seguros: {
    title: 'Seguros & Cobertura Médica',
    desc: () => 'Póliza de responsabilidad civil para eventos y servicio de emergencias médicas.'
  },
  cost_marketing: {
    title: 'Prensa, Marketing & Cobertura',
    desc: () => 'Cobertura fotográfica, difusión institucional y coordinación de prensa.'
  },
  cost_sadaic: {
    title: 'Derechos de Reproducción Musical',
    desc: () => 'Gestión y cobertura de aranceles SADAIC / AADI CAPIF incluidos.'
  },
  cost_otros_operativos: {
    title: 'Coordinación Operativa Integral',
    desc: () => 'Supervisión logística y soporte general para el óptimo desarrollo del evento.'
  }
}

/**
 * 🏛️ PALACIO BAROLO - TARJETA DE SERVICIOS Y COBERTURA OPERATIVA (VISTA CLIENTE)
 * Reemplaza el desglose de costos internos por los servicios incluidos comerciales dinámicos.
 */
export function ClientViewServicesCard({
  venue = 'Salón 1923',
  selectedCosts = [],
  costs = {},
  extraExpenses = [],
  alquilerEspacio = 0
}) {
  const items = []
  const seenKeys = new Set()

  // 1. Verificar Uso Exclusivo de Sala (por costo de alquiler o monto en ingresos)
  const hasAlquilerCost = (Array.isArray(selectedCosts) && selectedCosts.some(c => (c.key === 'cost_alquiler_espacio' || c.key === 'alquiler_espacio'))) ||
    Number(alquilerEspacio) > 0 ||
    Number(costs?.costAlquilerEspacio) > 0 ||
    Number(costs?.cost_alquiler_espacio) > 0

  if (hasAlquilerCost) {
    seenKeys.add('cost_alquiler_espacio')
    seenKeys.add('alquiler_espacio')
    items.push({
      key: 'cost_alquiler_espacio',
      title: 'Uso Exclusivo de Sala',
      desc: `Disponibilidad del salón principal ${venue} con climatización integral y acceso prioritario.`
    })
  }

  // 2. Procesar selectedCosts (rubros seleccionados del evento)
  if (Array.isArray(selectedCosts)) {
    selectedCosts.forEach((c) => {
      if (!c) return
      const k = c.key || c.id
      if (seenKeys.has(k)) return

      const standard = STANDARD_SERVICES[k]
      if (standard) {
        seenKeys.add(k)
        items.push({
          key: k,
          title: standard.title,
          desc: standard.desc(venue)
        })
      } else if (c.name) {
        seenKeys.add(k)
        items.push({
          key: k,
          title: c.name,
          desc: 'Servicio y cobertura operativa contemplado e integrado en la cotización general.'
        })
      }
    })
  }

  // 3. Procesar costs object de respaldo (si vino como objeto plano de costos)
  if (costs && typeof costs === 'object') {
    Object.entries(costs).forEach(([rawKey, val]) => {
      const num = Number(val) || 0
      if (num <= 0) return

      const snakeKey = rawKey.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
      const matchKey = STANDARD_SERVICES[rawKey] ? rawKey : (STANDARD_SERVICES[snakeKey] ? snakeKey : null)

      if (matchKey && !seenKeys.has(matchKey)) {
        seenKeys.add(matchKey)
        const standard = STANDARD_SERVICES[matchKey]
        items.push({
          key: matchKey,
          title: standard.title,
          desc: standard.desc(venue)
        })
      }
    })
  }

  // 4. Procesar extraExpenses (gastos adicionales específicos cargados en el evento)
  if (Array.isArray(extraExpenses)) {
    extraExpenses.forEach((exp, idx) => {
      if (!exp) return
      const conceptName = (exp.concept || exp.name || '').trim()
      if (!conceptName) return

      const key = exp.id || `extra-${idx}`
      if (seenKeys.has(key)) return
      seenKeys.add(key)

      items.push({
        key,
        title: conceptName,
        desc: 'Servicio adicional y soporte operativo integrado en la cotización general.'
      })
    })
  }

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
          {items.length > 0 ? `${items.length} ${items.length === 1 ? 'SERVICIO INCLUIDO' : 'SERVICIOS INCLUIDOS'}` : 'INCLUIDO EN PROPUESTA'}
        </span>
      </div>

      <div className="p-4 sm:p-5 space-y-4 text-xs">
        <p className="text-slate-600 leading-relaxed">
          La presente propuesta contempla la cobertura operativa y técnica requerida para el correcto desarrollo del evento en el <strong>Palacio Barolo</strong>:
        </p>

        {items.length === 0 ? (
          <div className="p-6 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center space-y-1.5">
            <p className="font-semibold text-slate-700 text-xs">Sin costos ni servicios operativos cargados</p>
            <p className="text-slate-400 text-[11px] max-w-md mx-auto">
              Los servicios y coberturas operativas se sincronizan automáticamente con los rubros seleccionados en la cotización del evento.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {items.map((item) => (
              <div
                key={item.key}
                className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start space-x-2.5 transition-all hover:border-emerald-200 hover:bg-emerald-50/20"
              >
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-900 block">{item.title}</span>
                  <span className="text-slate-500 text-[11px] leading-tight block mt-0.5">{item.desc}</span>
                </div>
              </div>
            ))}
          </div>
        )}

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
