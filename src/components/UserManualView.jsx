import React, { useState, useEffect } from 'react'
import { 
  BookOpen, ArrowLeft, Printer, Search, ShieldCheck, Calendar, 
  Calculator, Eye, FileText, LayoutDashboard, ListFilter, Scale, 
  Wand2, Sliders, FileSpreadsheet, HelpCircle, ChevronRight, Lock, 
  CheckCircle2, ExternalLink
} from 'lucide-react'

export default function UserManualView({ currentUser, onBack }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [activeSection, setActiveSection] = useState('introduccion')

  const sections = [
    { id: 'introduccion', title: '1. Acceso y Roles de Usuario', icon: ShieldCheck, badge: 'Seguridad' },
    { id: 'calendario', title: '2. Calendario de Eventos', icon: Calendar, badge: 'Agenda' },
    { id: 'cotizador', title: '3. Cotizador Financiero', icon: Calculator, badge: 'Finanzas' },
    { id: 'vista-cliente', title: '4. Vista Cliente Comercial', icon: Eye, badge: 'Comercial' },
    { id: 'propuestas', title: '5. Propuestas y WhatsApp', icon: FileText, badge: 'Ventas' },
    { id: 'dashboard', title: '6. Dashboard y Métricas', icon: LayoutDashboard, badge: 'Analytics' },
    { id: 'listado', title: '7. Listado y Auditoría', icon: ListFilter, badge: 'Control' },
    { id: 'comparador', title: '8. Comparador de Eventos', icon: Scale, badge: 'Benchmarking' },
    { id: 'copiloto', title: '9. Copiloto IA (Gemini)', icon: Wand2, badge: 'IA' },
    { id: 'administracion', title: '10. Administración y Plantilla', icon: Sliders, badge: 'Config' },
    { id: 'excel', title: '11. Exportaciones Excel', icon: FileSpreadsheet, badge: 'Reportes' },
    { id: 'faq', title: '12. Preguntas Frecuentes', icon: HelpCircle, badge: 'FAQ' },
  ]

  const scrollToSection = (id) => {
    setActiveSection(id)
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-16 animate-fade-in">
      
      {/* Barra de Encabezado Superior del Manual */}
      <div className="sticky top-20 z-30 bg-barolo-navy text-white shadow-xl border-b border-amber-500/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3">
          
          <div className="flex items-center space-x-3">
            <button
              onClick={onBack}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-amber-300 border border-amber-400/30 transition-all cursor-pointer flex items-center space-x-1.5 text-xs font-bold"
              title="Volver al calendario"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver</span>
            </button>

            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-amber-400/20 text-amber-300 flex items-center justify-center border border-amber-400/30">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-serif font-bold text-sm sm:text-base text-white tracking-wide">
                  MANUAL OFICIAL DE USUARIO
                </h2>
                <p className="text-[11px] text-amber-300 uppercase tracking-wider font-semibold hidden sm:block">
                  Palacio Barolo • Sistema Integral de Eventos
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            {/* Buscador dentro del manual */}
            <div className="relative w-48 sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar en el manual..."
                className="w-full bg-white/10 border border-amber-400/30 focus:border-amber-400 rounded-full pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-400 outline-none transition-all"
              />
            </div>

            {/* Botón Imprimir / PDF */}
            <button
              onClick={() => window.print()}
              className="flex items-center space-x-1.5 bg-gradient-to-r from-amber-500 to-barolo-gold hover:from-amber-400 hover:to-amber-500 text-barolo-navy px-3 py-1.5 rounded-full text-xs font-bold shadow transition-all cursor-pointer"
              title="Imprimir o guardar en PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Imprimir / PDF</span>
            </button>

            {/* Enlace a versión HTML externa */}
            <a
              href="/manual-usuario.html"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-amber-300 border border-amber-400/30 transition-colors"
              title="Abrir versión web autónoma en pestaña nueva"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

        </div>
      </div>

      {/* Contenedor Principal de Contenido */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

          {/* Menú Lateral de Navegación de Secciones (Desktop) */}
          <aside className="hidden lg:block lg:col-span-1">
            <div className="sticky top-36 bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-1 max-h-[calc(100vh-10rem)] overflow-y-auto">
              <div className="pb-2 border-b border-slate-100 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Índice de Secciones
                </span>
              </div>
              {sections.map(sec => {
                const Icon = sec.icon
                const isActive = activeSection === sec.id
                return (
                  <button
                    key={sec.id}
                    onClick={() => scrollToSection(sec.id)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                      isActive 
                        ? 'bg-barolo-navy text-amber-300 shadow-sm' 
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{sec.title}</span>
                    </div>
                    <ChevronRight className="w-3 h-3 opacity-60" />
                  </button>
                )
              })}
            </div>
          </aside>

          {/* Cuerpo del Manual */}
          <main className="lg:col-span-3 space-y-6">

            {/* Banner de Bienvenida */}
            <div className="bg-gradient-to-br from-barolo-navy via-slate-900 to-barolo-navy-dark text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-amber-500/30 relative overflow-hidden">
              <div className="relative z-10 space-y-3">
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 text-xs font-bold tracking-wide uppercase font-mono">
                  Guía Oficial de Procedimientos • Versión 2.1
                </span>
                <h1 className="font-serif font-bold text-2xl sm:text-3xl text-white">
                  Manual de Usuario del Palacio Barolo
                </h1>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed max-w-2xl">
                  Bienvenido al centro de procedimientos oficial. Aquí encontrarás el paso a paso detallado para cotizar eventos, coordinar salones, emitir propuestas comerciales y analizar la rentabilidad financiera del Palacio Barolo.
                </p>
                <div className="pt-2 flex flex-wrap gap-4 text-xs text-amber-300/90 font-medium">
                  <span>🏛️ Salón 1923, Espacio Barolo, Terraza, EB + Cielos</span>
                  <span>🛡️ 3 Roles de Usuario</span>
                  <span>🔒 Costos Confidenciales</span>
                </div>
              </div>
            </div>

            {/* SECCIÓN 1: ACCESO Y ROLES */}
            <section id="introduccion" className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 text-amber-600" />
                  <h3 className="font-serif font-bold text-base text-slate-900">1. Acceso, Seguridad y Roles de Usuario</h3>
                </div>
                <span className="text-[10px] bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-mono font-bold">SEGURIDAD</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                El sistema cuenta con un control de acceso por perfiles para garantizar la confidencialidad de los números y la división de tareas:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="font-bold text-xs text-slate-900 block">👑 Administrador General</span>
                  <p className="text-[11px] text-slate-500">Control total: gestión de usuarios, edición de la Plantilla Maestra, visualización de márgenes y eliminación de eventos.</p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="font-bold text-xs text-slate-900 block">📋 Coordinador de Eventos</span>
                  <p className="text-[11px] text-slate-500">Carga de cotizaciones, presupuestos, seguimiento de estados de reservas y emisión de propuestas comerciales.</p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="font-bold text-xs text-slate-900 block">👁️ Operador / Staff</span>
                  <p className="text-[11px] text-slate-500">Acceso operativo de solo lectura a la agenda de eventos para logística y control de accesos, sin acceso a cifras de utilidad.</p>
                </div>
              </div>
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs flex items-start space-x-2">
                <Lock className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Costos Confidenciales con Candado (🔒):</strong> Cualquier costo marcado con el candado se ocultará automáticamente con puntos (••••••) para usuarios no administradores, resguardando acuerdos especiales con proveedores y artistas.
                </div>
              </div>
            </section>

            {/* SECCIÓN 2: CALENDARIO */}
            <section id="calendario" className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <h3 className="font-serif font-bold text-base text-slate-900">2. Calendario General de Eventos</h3>
                </div>
                <span className="text-[10px] bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full font-mono font-bold">AGENDA</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Permite verificar de un vistazo la ocupación de los salones del Palacio Barolo con el código de colores oficial:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block mb-1"></span>
                  <h4 className="font-bold text-xs text-emerald-950">Confirmado</h4>
                  <p className="text-[10px] text-emerald-700">Seña o pago recibido. Sala bloqueada.</p>
                </div>
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-center">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block mb-1"></span>
                  <h4 className="font-bold text-xs text-blue-950">Reserva</h4>
                  <p className="text-[10px] text-blue-700">Fecha apartada de palabra con prioridad.</p>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-center">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block mb-1"></span>
                  <h4 className="font-bold text-xs text-amber-950">Cotización</h4>
                  <p className="text-[10px] text-amber-700">Propuesta enviada (vigencia 15 días).</p>
                </div>
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-center">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block mb-1"></span>
                  <h4 className="font-bold text-xs text-rose-950">Cancelado</h4>
                  <p className="text-[10px] text-rose-700">Baja del evento. Sala liberada.</p>
                </div>
              </div>
              <ul className="list-disc list-inside text-xs text-slate-600 space-y-1 pt-1">
                <li><strong>Clic en un día:</strong> Abre inmediatamente el cotizador con esa fecha preseleccionada.</li>
                <li><strong>Clic en un evento:</strong> Abre la Ficha Rápida (Drilldown) con resumen ejecutivo, contacto y accesos directos.</li>
              </ul>
            </section>

            {/* SECCIÓN 3: COTIZADOR */}
            <section id="cotizador" className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <Calculator className="w-5 h-5 text-amber-600" />
                  <h3 className="font-serif font-bold text-base text-slate-900">3. Cotizador Financiero y Calculadora Comercial</h3>
                </div>
                <span className="text-[10px] bg-amber-50 text-amber-800 px-2.5 py-0.5 rounded-full font-mono font-bold">FINANZAS</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                El cotizador cuenta con 4 bloques ordenados para presupuestar con precisión matemática:
              </p>
              <div className="space-y-2.5 text-xs text-slate-700">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-bold text-slate-900">Bloque 1 • Datos Generales:</span> Cliente, CUIT, contacto, salón (Salón 1923, Espacio Barolo, Terraza, EB + Cielos), fecha, horario y asistentes previstos.
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-bold text-slate-900">Bloque 2 • Ingresos:</span> Alquiler del espacio + Localidades/Tickets (cantidad y precio preventa/general) + Rubros adicionales del catálogo (barra de tragos, comisiones, auspicios).
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-bold text-slate-900">Bloque 3 • Costos:</span> Costos del Productor vs. Costos del Barolo. El botón <em>"➕ Gestionar / Seleccionar Costos"</em> permite sumar únicamente los rubros que aplican a la propuesta.
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-bold text-slate-900">Bloque 4 • Resultados:</span> Total ingresos, costos totales, utilidad neta para el Barolo y margen %. Régimen de facturación: Factura A (con 21% IVA discriminado), Factura B o Presupuesto.
                </div>
              </div>
            </section>

            {/* SECCIÓN 4: VISTA CLIENTE */}
            <section id="vista-cliente" className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <Eye className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-serif font-bold text-base text-slate-900">4. Modo Vista Cliente (Presentación Segura)</h3>
                </div>
                <span className="text-[10px] bg-emerald-50 text-emerald-800 px-2.5 py-0.5 rounded-full font-mono font-bold">MODO SEGURO</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Cuando estés reunido con un cliente o proyectando tu pantalla, activá el botón <strong>"👁️ Vista Cliente"</strong> en la cabecera del cotizador:
              </p>
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2 text-xs text-emerald-950">
                <div className="flex items-center space-x-2 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Sincronización Dinámica de Servicios Incluidos:</span>
                </div>
                <p className="text-slate-700 leading-relaxed">
                  El desglose interno de costos desaparece y se convierte en <strong>"3. SERVICIOS Y COBERTURA OPERATIVA INCLUIDA"</strong>. Según los rubros que tengas cargados en el cotizador, se agregan o quitan dinámicamente los servicios comerciales con tildes verdes (Uso de Sala, Técnica, Catering, Personal de Acceso, Limpieza, etc.), garantizando confidencialidad absoluta.
                </p>
              </div>
            </section>

            {/* SECCIÓN 5: PROPUESTAS */}
            <section id="propuestas" className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-serif font-bold text-base text-slate-900">5. Generador de Propuestas Formales y WhatsApp</h3>
                </div>
                <span className="text-[10px] bg-indigo-50 text-indigo-800 px-2.5 py-0.5 rounded-full font-mono font-bold">VENTAS</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Haciendo clic en <strong>"Ver Propuesta Comercial Formal"</strong> podés emitir la cotización ejecutiva con membrete institucional:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <span className="font-bold text-slate-900 block mb-1">💬 Copiar WhatsApp</span>
                  <p className="text-slate-500 text-[11px]">Copia el texto enriquecido listo para pegar directamente en WhatsApp o correo electrónico.</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <span className="font-bold text-slate-900 block mb-1">🖨️ Imprimir / Guardar PDF</span>
                  <p className="text-slate-500 text-[11px]">Genera la propuesta en formato PDF con membrete del Palacio Barolo y condiciones de contratación.</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <span className="font-bold text-slate-900 block mb-1">🌐 Descargar HTML</span>
                  <p className="text-slate-500 text-[11px]">Exporta un archivo HTML interactivo que el cliente puede visualizar en su celular o computadora.</p>
                </div>
              </div>
            </section>

            {/* SECCIÓN 6: COPILOTO IA */}
            <section id="copiloto" className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <Wand2 className="w-5 h-5 text-amber-500" />
                  <h3 className="font-serif font-bold text-base text-slate-900">6. Copiloto Inteligente (Gemini IA)</h3>
                </div>
                <span className="text-[10px] bg-amber-50 text-amber-900 px-2.5 py-0.5 rounded-full font-mono font-bold">COPILOTO IA</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Hacé clic en el botón de la varita mágica (🪄) en la barra superior para abrir el asistente inteligente:
              </p>
              <div className="space-y-2 text-xs text-slate-700">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="font-bold text-slate-900">Función Pegar WhatsApp:</span> Pegá un mensaje informal de un cliente o productor (ej: <em>"Hola! Necesito el Salón 1923 para el 15 de noviembre, unas 90 personas, entradas $15.000 preventa y $18.000 general, técnica propia"</em>) y el asistente extraerá los datos en una tarjeta lista para cargar al cotizador en 1 clic.
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="font-bold text-slate-900">Consultas de Negocio y Soporte:</span> Podés preguntarle sobre disponibilidad de fechas, rentabilidad acumulada, o dudas sobre cómo usar el sistema (tiene acceso completo a este manual).
                </div>
              </div>
            </section>

            {/* SECCIÓN 7: ADMINISTRACIÓN */}
            <section id="administracion" className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <Sliders className="w-5 h-5 text-slate-700" />
                  <h3 className="font-serif font-bold text-base text-slate-900">7. Administración y Plantilla Maestra</h3>
                </div>
                <span className="text-[10px] bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full font-mono font-bold">AJUSTES</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Desde el icono del engranaje (⚙️) en la barra superior izquierda, los Administradores pueden:
              </p>
              <ul className="list-disc list-inside text-xs text-slate-600 space-y-1">
                <li><strong>Gestión de Usuarios:</strong> Crear nuevas cuentas, redefinir contraseñas y asignar roles (Admin, Coordinador, Operador).</li>
                <li><strong>Plantilla Maestra:</strong> Configurar rubros de costos predeterminados, valores sugeridos de salones y condiciones comerciales de contratación.</li>
                <li><strong>Privacidad de Base de Datos:</strong> Toda la conexión a servidores opera en segundo plano y se configura desde el código de desarrollo, sin exponer claves ni accesos técnicos a los usuarios.</li>
              </ul>
            </section>

          </main>

        </div>
      </div>

    </div>
  )
}
