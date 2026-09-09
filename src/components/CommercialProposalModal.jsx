import React from 'react'
import { X, Printer, Download, Building, Calendar, Users, DollarSign, Clock, ShieldCheck, Mail, Phone, FileText } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const formatARS = (val) => {
  const num = Number(val) || 0
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0
  }).format(num)
}

export default function CommercialProposalModal({ event, onClose, currentUser }) {
  if (!event) return null

  const handlePrint = () => {
    window.print()
  }

  const todayStr = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: es })
  
  // Formatear fecha del evento
  let eventDateFormatted = event.event_date || 'A convenir'
  try {
    if (event.event_date) {
      const parts = event.event_date.split('-')
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10))
        eventDateFormatted = format(d, "EEEE dd 'de' MMMM 'de' yyyy", { locale: es })
      }
    }
  } catch (e) {}

  const grossIncome = Number(event.gross_income) || 0
  const attendees = Number(event.attendees) || 0
  const canonAlquiler = Number(event.alquiler_espacio) || Number(event.contratacion_salon) || 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto animate-fade-in print:p-0 print:bg-white print:static print:inset-auto">
      
      {/* Container Modal */}
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-4 flex flex-col max-h-[94vh] print:max-h-none print:shadow-none print:border-none print:rounded-none print:m-0 print:w-full">
        
        {/* Modal Toolbar (Oculto al imprimir) */}
        <div className="bg-barolo-navy text-white px-6 py-4 flex items-center justify-between flex-shrink-0 border-b border-barolo-gold/40 print:hidden">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-barolo-gold to-barolo-gold-dark flex items-center justify-center text-barolo-navy font-bold text-sm shadow">
              PB
            </div>
            <div>
              <h3 className="font-serif font-bold text-sm sm:text-base text-white">
                Presupuesto Comercial Formal
              </h3>
              <p className="text-[11px] text-slate-300">
                Propuesta lista para imprimir o guardar como PDF oficial
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 bg-gradient-to-r from-barolo-gold to-amber-400 hover:from-amber-400 hover:to-amber-300 text-barolo-navy px-4 py-2 rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Guardar PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-300 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Hoja de Impresión A4 Formal */}
        <div className="p-8 sm:p-12 overflow-y-auto flex-1 bg-white text-slate-800 font-sans print:p-0 print:overflow-visible">
          
          {/* Encabezado con Membrete Oficial */}
          <div className="border-b-2 border-[#1B2A4A] pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-12 h-12 rounded-xl bg-[#1B2A4A] text-[#D4AF37] font-serif font-bold text-2xl flex items-center justify-center border-2 border-[#D4AF37]">
                  PB
                </div>
                <div>
                  <h1 className="font-serif font-extrabold text-2xl tracking-wider text-[#1B2A4A] uppercase">
                    Palacio Barolo
                  </h1>
                  <p className="text-xs text-[#D4AF37] font-bold tracking-widest uppercase">
                    Patrimonio Arquitectónico de Buenos Aires
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-500">
                Av. de Mayo 1370, Ciudad Autónoma de Buenos Aires • www.palaciobarolo.com.ar
              </p>
            </div>

            <div className="text-left sm:text-right">
              <div className="inline-block bg-slate-100 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-[#1B2A4A] mb-1">
                PRESUPUESTO: {event.calc_code || 'CALC-PROPOSAL'}
              </div>
              <p className="text-xs text-slate-500">
                Fecha de emisión: <strong className="text-slate-800">{todayStr}</strong>
              </p>
              <p className="text-[11px] text-amber-800 font-semibold mt-0.5">
                Validez de la oferta: 15 días corridos
              </p>
            </div>
          </div>

          {/* Destinatario & Datos del Evento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 my-6 p-5 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Cliente / Organizador
              </p>
              <h2 className="text-base font-bold text-[#1B2A4A]">
                {event.client_name || 'Cliente Particular'}
              </h2>
              {event.client_cuit && (
                <p className="text-slate-600 mt-0.5"><strong>CUIT/DNI:</strong> {event.client_cuit}</p>
              )}
              {event.client_contact && (
                <p className="text-slate-600"><strong>Contacto:</strong> {event.client_contact}</p>
              )}
              {event.client_email && (
                <p className="text-slate-600"><strong>Email:</strong> {event.client_email}</p>
              )}
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Detalles del Evento Solicitado
              </p>
              <h3 className="text-sm font-bold text-slate-900">{event.name}</h3>
              <p className="text-slate-600 mt-0.5">
                <strong>🏛️ Salón / Locación:</strong> {event.venue || 'Espacio Barolo'}
              </p>
              <p className="text-slate-600">
                <strong>📅 Fecha prevista:</strong> {eventDateFormatted}
              </p>
              <p className="text-slate-600">
                <strong>⏰ Horario:</strong> {event.event_time || '19:00'} hs
              </p>
              <p className="text-slate-600">
                <strong>👥 Cantidad de Asistentes:</strong> {attendees} personas
              </p>
            </div>
          </div>

          {/* Cuadro de Inversión y Rubros Cotizados */}
          <div className="my-6">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#1B2A4A] mb-3 flex items-center">
              <FileText className="w-4 h-4 mr-1.5 text-[#D4AF37]" />
              Detalle de Servicios e Inversión Presupuestada
            </h4>

            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-[#1B2A4A] text-white">
                  <th className="py-2.5 px-4 text-left font-bold rounded-l-xl">Concepto / Servicio</th>
                  <th className="py-2.5 px-3 text-center font-bold">Unidades / Detalle</th>
                  <th className="py-2.5 px-4 text-right font-bold rounded-r-xl">Importe Estimado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr className="hover:bg-slate-50">
                  <td className="py-3 px-4">
                    <p className="font-bold text-slate-800">Uso Exclusivo de Espacio & Salón</p>
                    <p className="text-[11px] text-slate-500">
                      Disponibilidad de {event.venue} con climatización, sonido base e iluminación ambiental patrimonial.
                    </p>
                  </td>
                  <td className="py-3 px-3 text-center text-slate-600">1 jornada</td>
                  <td className="py-3 px-4 text-right font-bold text-slate-900">
                    {formatARS(canonAlquiler > 0 ? canonAlquiler : grossIncome * 0.7)}
                  </td>
                </tr>

                {event.ticket_qty > 0 && event.ticket_price > 0 && (
                  <tr className="hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-800">Acceso / Entradas por Asistente</p>
                      <p className="text-[11px] text-slate-500">Tarifa por persona ({event.ticket_qty} localidades)</p>
                    </td>
                    <td className="py-3 px-3 text-center text-slate-600">{event.ticket_qty} pax</td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      {formatARS(event.ticket_qty * event.ticket_price)}
                    </td>
                  </tr>
                )}

                {/* Servicios Operativos Incluidos */}
                <tr className="hover:bg-slate-50">
                  <td className="py-3 px-4">
                    <p className="font-bold text-slate-800">Coordinación Operativa, Limpieza & Personal</p>
                    <p className="text-[11px] text-slate-500">
                      Supervisión de sala, control de accesos, soporte técnico en vivo y limpieza integral post-evento.
                    </p>
                  </td>
                  <td className="py-3 px-3 text-center text-slate-600">Incluido</td>
                  <td className="py-3 px-4 text-right font-semibold text-emerald-700">
                    Bonificado
                  </td>
                </tr>

                {/* Gastos o Extras dinámicos si existen */}
                {Array.isArray(event.extra_incomes) && event.extra_incomes.map((inc, i) => (
                  inc.amount > 0 ? (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-800">{inc.concept || 'Servicio Adicional'}</p>
                      </td>
                      <td className="py-3 px-3 text-center text-slate-600">1 ítem</td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        {formatARS(inc.amount)}
                      </td>
                    </tr>
                  ) : null
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-900 bg-amber-50/60 font-bold text-sm">
                  <td colSpan={2} className="py-4 px-4 text-left text-slate-900">
                    TOTAL PRESUPUESTO ({event.invoice_type || 'Factura A'})
                  </td>
                  <td className="py-4 px-4 text-right text-base text-[#1B2A4A] font-extrabold">
                    {formatARS(grossIncome)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Cláusulas Comerciales Oficiales */}
          <div className="my-6 p-4 rounded-2xl border border-slate-200 bg-slate-50 text-[11px] text-slate-600 space-y-2 leading-relaxed">
            <h5 className="font-bold uppercase text-slate-700 text-xs tracking-wider">
              Términos & Condiciones Comerciales:
            </h5>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Reserva de Fecha:</strong> La fecha queda bloqueada formalmente con el abono del 30% en concepto de seña. El saldo restante (70%) debe cancelarse hasta 7 días hábiles previos a la realización del evento.</li>
              <li><strong>Medios de Pago:</strong> Transferencia Bancaria Oficial o MercadoPago. Emisión de {event.invoice_type || 'Factura A'}.</li>
              <li><strong>Catering y Proveedores:</strong> Todo servicio gastronómico externo debe ser previamente homologado y cumplir los protocolos de seguridad edilicia y bromatológica del Palacio Barolo.</li>
              <li><strong>Seguridad y Seguros:</strong> El Palacio Barolo cuenta con cobertura de responsabilidad civil de predio. El organizador deberá presentar nómina de personal de soporte para ingreso de carga y técnica.</li>
            </ul>
          </div>

          {/* Espacio para Firmas */}
          <div className="mt-12 pt-8 border-t border-slate-300 grid grid-cols-2 gap-8 text-center text-xs">
            <div>
              <div className="border-b border-slate-400 w-48 mx-auto mb-2"></div>
              <p className="font-bold text-slate-800">Dirección Comercial</p>
              <p className="text-slate-500">Palacio Barolo Eventos</p>
            </div>
            <div>
              <div className="border-b border-slate-400 w-48 mx-auto mb-2"></div>
              <p className="font-bold text-slate-800">Aceptación de Presupuesto</p>
              <p className="text-slate-500">{event.client_name || 'Firma del Cliente'}</p>
            </div>
          </div>

        </div>

      </div>

    </div>
  )
}

