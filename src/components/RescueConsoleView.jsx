import React, { useState, useEffect } from 'react'
import { 
  Shield, 
  KeyRound, 
  RotateCcw, 
  Trash2, 
  Clock, 
  Database, 
  Download, 
  FileSpreadsheet, 
  ArrowLeft, 
  LogOut, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw,
  Eye,
  EyeOff,
  Server
} from 'lucide-react'
import { eventService } from '../services/eventService'
import { excelExportService } from '../services/excelExportService'
import { isSupabaseConfigured } from '../services/supabaseClient'

// Credenciales exclusivas del programador / soporte técnico
const DEV_USER = 'zencio'
const DEV_PASS = '15Pato1981'
const AUTH_STORAGE_KEY = 'barolo_dev_rescue_auth_v1'

export default function RescueConsoleView({ onExitToApp }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem(AUTH_STORAGE_KEY) === 'true'
  })

  // Credenciales form
  const [usernameInput, setUsernameInput] = useState('')
  const [passwordInput, setPasswordInput] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [authError, setAuthError] = useState('')

  // Estado del panel de rescate
  const [activeTab, setActiveTab] = useState('deleted') // 'deleted', 'snapshots', 'tools'
  const [deletedEvents, setDeletedEvents] = useState([])
  const [snapshots, setSnapshots] = useState([])
  const [activeEventsCount, setActiveEventsCount] = useState(0)
  const [activeEvents, setActiveEvents] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusMessage, setStatusMessage] = useState(null)
  const [isRestoring, setIsRestoring] = useState(false)

  // Cargar datos al autenticar
  const loadRescueData = async () => {
    setLoading(true)
    try {
      const [delEvents, allActive, snaps] = await Promise.all([
        eventService.getDeletedEvents(),
        eventService.getEvents(),
        Promise.resolve(eventService.getSnapshots())
      ])
      setDeletedEvents(delEvents || [])
      setActiveEvents(allActive || [])
      setActiveEventsCount((allActive || []).length)
      setSnapshots(snaps || [])
    } catch (err) {
      console.error('Error loading rescue data:', err)
      showMessage('Error al cargar datos de la bóveda.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      loadRescueData()
    }
  }, [isAuthenticated])

  const showMessage = (text, type = 'success') => {
    setStatusMessage({ text, type })
    setTimeout(() => {
      setStatusMessage(null)
    }, 4000)
  }

  // Manejo de Login
  const handleLogin = (e) => {
    e.preventDefault()
    setAuthError('')

    if (usernameInput.trim() === DEV_USER && passwordInput === DEV_PASS) {
      sessionStorage.setItem(AUTH_STORAGE_KEY, 'true')
      setIsAuthenticated(true)
      setUsernameInput('')
      setPasswordInput('')
    } else {
      setAuthError('Credenciales incorrectas. Acceso exclusivo para el programador.')
    }
  }

  const handleLogout = () => {
    sessionStorage.removeItem(AUTH_STORAGE_KEY)
    setIsAuthenticated(false)
  }

  // Restaurar un evento eliminado
  const handleRestoreEvent = async (event) => {
    const code = event.calc_code || event.id
    if (!window.confirm(`¿Confirmás la restauración del evento "${event.name || event.client_name}" (${code}) a la lista activa de la calculadora?`)) {
      return
    }

    setIsRestoring(true)
    try {
      const res = await eventService.restoreDeletedEvent(code)
      if (res.success) {
        showMessage(`✅ ¡Evento ${code} restaurado con éxito! Ya está disponible en la app.`, 'success')
        await loadRescueData()
      } else {
        showMessage(`⚠️ Error al restaurar: ${res.error}`, 'error')
      }
    } catch (err) {
      showMessage(`Error inesperado: ${err.message}`, 'error')
    } finally {
      setIsRestoring(false)
    }
  }

  // Restaurar un snapshot completo
  const handleRestoreSnapshot = async (snap) => {
    if (!window.confirm(`⚠️ ¡ATENCIÓN! Vas a restaurar el sistema completo al estado del ${new Date(snap.timestamp).toLocaleString('es-AR')}.\n\nSe restablecerán ${snap.count} eventos. ¿Deseas continuar?`)) {
      return
    }

    setIsRestoring(true)
    try {
      const res = await eventService.restoreSnapshot(snap.id)
      if (res.success) {
        showMessage(`✅ ¡Sistema restaurado! Se recuperaron ${res.count} eventos.`, 'success')
        await loadRescueData()
      } else {
        showMessage(`Error: ${res.error}`, 'error')
      }
    } catch (err) {
      showMessage(`Error al restaurar copia: ${err.message}`, 'error')
    } finally {
      setIsRestoring(false)
    }
  }

  // Exportar respaldo JSON completo
  const handleDownloadJsonBackup = () => {
    try {
      const backupData = {
        title: 'Palacio Barolo - Copia de Seguridad de Emergencia',
        exportedAt: new Date().toISOString(),
        exportedBy: DEV_USER,
        activeEventsCount: activeEvents.length,
        deletedEventsCount: deletedEvents.length,
        activeEvents,
        deletedEvents,
        snapshots
      }
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Palacio_Barolo_BACKUP_COMPLETO_${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      showMessage('📥 Respaldo JSON descargado en tu equipo.', 'success')
    } catch (e) {
      showMessage('Error al generar respaldo JSON.', 'error')
    }
  }

  // Forzar resincronización Supabase
  const handleForceSync = async () => {
    setLoading(true)
    try {
      const res = await eventService.forceSyncFromSupabase()
      if (res.success) {
        showMessage(`☁️ Supabase sincronizado: ${res.count} eventos al día.`, 'success')
      } else {
        showMessage(`Información de Supabase: ${res.error}`, 'error')
      }
      await loadRescueData()
    } catch (e) {
      showMessage('Error al conectar con Supabase.', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Filtrado de eventos eliminados
  const filteredDeleted = deletedEvents.filter(ev => {
    const q = searchTerm.toLowerCase().trim()
    if (!q) return true
    return (
      (ev.calc_code && ev.calc_code.toLowerCase().includes(q)) ||
      (ev.name && ev.name.toLowerCase().includes(q)) ||
      (ev.client_name && ev.client_name.toLowerCase().includes(q)) ||
      (ev.event_date && ev.event_date.includes(q))
    )
  })

  // =========================================================================
  // PANTALLA 1: ACCESO DE SEGURIDAD PARA PROGRAMADOR (LOGIN)
  // =========================================================================
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 selection:bg-cyan-500 selection:text-black">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-8 relative overflow-hidden">
          
          {/* Fondo sutil tipo terminal */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-bold text-white tracking-wide">Barolo Rescue</h1>
                <span className="text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-500/30">
                  DEV-OPS
                </span>
              </div>
              <p className="text-xs text-slate-400">Consola de Mantenimiento y Recuperación</p>
            </div>
          </div>

          <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-3.5 mb-6 text-xs text-slate-400 space-y-1">
            <div className="flex items-center space-x-1.5 text-cyan-400 font-medium">
              <KeyRound className="w-3.5 h-3.5" />
              <span>Acceso Estrictamente Confidencial</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Esta herramienta permite restaurar información borrada por error. Solo accesible para el programador del sistema.
            </p>
          </div>

          {authError && (
            <div className="mb-4 bg-rose-500/10 border border-rose-500/30 text-rose-300 px-3.5 py-2.5 rounded-xl text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Usuario de Soporte
              </label>
              <input
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="ej: zencio"
                autoFocus
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Contraseña Maestra
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold py-2.5 rounded-xl text-sm shadow-lg shadow-cyan-500/25 transition-all active:scale-[0.98] cursor-pointer mt-2"
            >
              Acceder a la Consola
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <button
              onClick={onExitToApp}
              className="text-slate-400 hover:text-white flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Volver a la Calculadora</span>
            </button>
            <span className="text-[10px] text-slate-600 font-mono">v1.0.0</span>
          </div>
        </div>
      </div>
    )
  }

  // =========================================================================
  // PANTALLA 2: PANEL DE MANTENIMIENTO DEL PROGRAMADOR (AUTENTICADO)
  // =========================================================================
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-black">
      
      {/* Toast Notifier */}
      {statusMessage && (
        <div className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-2xl shadow-2xl text-xs font-semibold flex items-center space-x-2 border animate-in slide-in-from-top-3 ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/40' 
            : 'bg-rose-950/90 text-rose-300 border-rose-500/40'
        }`}>
          {statusMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Top Header Bar */}
      <header className="border-b border-slate-800 bg-slate-900/70 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-sm tracking-wide text-white">Barolo Rescue Console</span>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-mono px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>En Línea</span>
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                Operador: <strong className="text-cyan-300 font-mono">{DEV_USER}</strong> (Soporte Técnico)
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={loadRescueData}
              disabled={loading}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center space-x-1.5 transition-all cursor-pointer border border-slate-700 disabled:opacity-50"
              title="Refrescar datos"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
              <span className="hidden sm:inline">Actualizar</span>
            </button>

            <button
              onClick={onExitToApp}
              className="px-3.5 py-1.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 text-xs font-semibold flex items-center space-x-1.5 transition-all border border-cyan-500/30 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Ir a la Calculadora</span>
            </button>

            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 text-xs font-medium flex items-center space-x-1 transition-all border border-slate-700 hover:border-rose-500/30 cursor-pointer"
              title="Bloquear consola"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 space-y-6">
        
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Eventos en Bóveda</p>
              <p className="text-xl font-bold text-white font-mono">{deletedEvents.length}</p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Puntos de Respaldo</p>
              <p className="text-xl font-bold text-white font-mono">{snapshots.length}</p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Eventos Activos</p>
              <p className="text-xl font-bold text-white font-mono">{activeEventsCount}</p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Nube Supabase</p>
              <p className="text-xs font-bold text-emerald-300 font-mono">
                {isSupabaseConfigured() ? 'Sincronizado' : 'Modo Local'}
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 space-x-2">
          <button
            onClick={() => setActiveTab('deleted')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all flex items-center space-x-2 cursor-pointer ${
              activeTab === 'deleted'
                ? 'bg-slate-900 text-cyan-300 border-t-2 border-cyan-400 border-x border-slate-800'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            <span>Eventos Eliminados (Soft-Delete)</span>
            <span className="bg-rose-500/20 text-rose-300 text-[10px] font-mono px-1.5 py-0.5 rounded-full font-bold">
              {deletedEvents.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('snapshots')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all flex items-center space-x-2 cursor-pointer ${
              activeTab === 'snapshots'
                ? 'bg-slate-900 text-cyan-300 border-t-2 border-cyan-400 border-x border-slate-800'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Puntos de Restauración ({snapshots.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('tools')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all flex items-center space-x-2 cursor-pointer ${
              activeTab === 'tools'
                ? 'bg-slate-900 text-cyan-300 border-t-2 border-cyan-400 border-x border-slate-800'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Herramientas de Emergencia</span>
          </button>
        </div>

        {/* TAB CONTENT 1: EVENTOS ELIMINADOS */}
        {activeTab === 'deleted' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center space-x-2">
                  <span>Bóveda de Rescate de Eventos</span>
                  <span className="text-xs text-slate-400 font-normal">
                    (Eventos que los usuarios borraron pero que nunca se destruyeron)
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Podés restaurar cualquier evento haciendo clic en "Restaurar". Volverá instantáneamente a la grilla y calendario.
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por código, cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {filteredDeleted.length === 0 ? (
              <div className="py-16 text-center text-slate-500 space-y-2 border border-dashed border-slate-800 rounded-xl">
                <CheckCircle2 className="w-8 h-8 text-emerald-500/40 mx-auto" />
                <p className="text-xs font-semibold text-slate-400">
                  {searchTerm ? 'No se encontraron eventos con ese filtro.' : 'La bóveda está limpia. No hay eventos eliminados recientemente.'}
                </p>
                <p className="text-[11px] text-slate-600">
                  Todos los eventos creados por el Palacio Barolo están activos e intactos.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/60 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-3">Código</th>
                      <th className="py-3 px-3">Evento / Cliente</th>
                      <th className="py-3 px-3">Fecha Evento</th>
                      <th className="py-3 px-3">Estado Previo</th>
                      <th className="py-3 px-3">Eliminado El</th>
                      <th className="py-3 px-3 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredDeleted.map((ev) => (
                      <tr key={ev.id || ev.calc_code} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-cyan-400">
                          {ev.calc_code || ev.id}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-200">{ev.name || 'Sin título'}</div>
                          <div className="text-[11px] text-slate-400">{ev.client_name || ev.client_contact || '-'}</div>
                        </td>
                        <td className="py-3 px-3 text-slate-300 font-mono">
                          {ev.event_date || 'Sin fecha'}
                        </td>
                        <td className="py-3 px-3">
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                            {ev.status || 'cotizado'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-[11px] text-slate-400 font-mono">
                          {ev.deleted_at ? new Date(ev.deleted_at).toLocaleString('es-AR') : 'Reciente'}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => handleRestoreEvent(ev)}
                            disabled={isRestoring}
                            className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 px-3 py-1 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer disabled:opacity-40 inline-flex items-center space-x-1"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Restaurar</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB CONTENT 2: PUNTOS DE RESTAURACIÓN (SNAPSHOTS) */}
        {activeTab === 'snapshots' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center space-x-2">
                <span>Historial de Snapshots Automáticos</span>
                <span className="text-xs text-slate-400 font-normal">
                  (Puntos de recuperación generados en segundo plano)
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Si hubo una falla o borrado masivo por error humano, podés rebobinar la base de datos al estado exacto que tenía en cualquiera de estas fechas.
              </p>
            </div>

            {snapshots.length === 0 ? (
              <div className="py-12 text-center text-slate-500 space-y-2 border border-dashed border-slate-800 rounded-xl">
                <Clock className="w-8 h-8 text-amber-500/40 mx-auto" />
                <p className="text-xs font-semibold text-slate-400">Aún no se generaron snapshots adicionales.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/60 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-3">Identificador</th>
                      <th className="py-3 px-3">Fecha y Hora de la Copia</th>
                      <th className="py-3 px-3">Total de Eventos Guardados</th>
                      <th className="py-3 px-3 text-right">Acción de Recuperación</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {snapshots.map((snap, idx) => (
                      <tr key={snap.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-3 font-mono text-cyan-400">
                          {snap.id} {idx === 0 && <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded font-bold ml-1.5">MÁS RECIENTE</span>}
                        </td>
                        <td className="py-3 px-3 text-slate-200 font-mono">
                          {new Date(snap.timestamp).toLocaleString('es-AR')}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-amber-300">
                          {snap.count} eventos
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => handleRestoreSnapshot(snap)}
                            disabled={isRestoring}
                            className="bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 px-3 py-1 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer disabled:opacity-40 inline-flex items-center space-x-1"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Restaurar a este Punto</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB CONTENT 3: HERRAMIENTAS DE EMERGENCIA */}
        {activeTab === 'tools' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Tarjeta 1: Exportar Respaldo JSON */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Respaldo Completo en JSON</h3>
                  <p className="text-xs text-slate-400">Exporta toda la base de datos a un archivo local</p>
                </div>
              </div>
              <p className="text-xs text-slate-400">
                Genera una copia en texto JSON que contiene todos los eventos activos ({activeEventsCount}), los eventos eliminados en la papelera ({deletedEvents.length}) y el historial de snapshots.
              </p>
              <button
                onClick={handleDownloadJsonBackup}
                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-semibold py-2 rounded-xl text-xs flex items-center justify-center space-x-2 shadow-lg shadow-cyan-600/20 cursor-pointer transition-all active:scale-98"
              >
                <Download className="w-4 h-4" />
                <span>Descargar Base de Datos (.JSON)</span>
              </button>
            </div>

            {/* Tarjeta 2: Exportar Planilla Excel */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Planilla Maestra en Excel</h3>
                  <p className="text-xs text-slate-400">Matriz con todos los cálculos y desglose de costos</p>
                </div>
              </div>
              <p className="text-xs text-slate-400">
                Genera el Excel oficial del Palacio Barolo con todas las fórmulas de márgenes, costos de técnica, catering, rentabilidad y semáforos comerciales.
              </p>
              <button
                onClick={() => excelExportService.exportAllEvents(activeEvents)}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 rounded-xl text-xs flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/20 cursor-pointer transition-all active:scale-98"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Descargar Planilla General (.XLSX)</span>
              </button>
            </div>

            {/* Tarjeta 3: Sincronización Forzada */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Forzar Sincronización Nube</h3>
                  <p className="text-xs text-slate-400">Descarga el estado más reciente desde Supabase</p>
                </div>
              </div>
              <p className="text-xs text-slate-400">
                Limpia cualquier caché local desfasada y reconstruye el catálogo de eventos consultando directamente la base de datos PostgreSQL de Supabase.
              </p>
              <button
                onClick={handleForceSync}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 rounded-xl text-xs flex items-center justify-center space-x-2 shadow-lg shadow-blue-600/20 cursor-pointer transition-all active:scale-98 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span>Sincronizar Ahora con Supabase</span>
              </button>
            </div>

            {/* Tarjeta 4: Registro de Seguridad */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Bóveda de Credenciales</h3>
                  <p className="text-xs text-slate-400">Configuración de acceso de soporte técnico</p>
                </div>
              </div>
              <div className="bg-slate-950/80 rounded-xl p-3 text-[11px] font-mono text-slate-400 space-y-1 border border-slate-800">
                <div>Usuario Soporte: <span className="text-cyan-300 font-bold">{DEV_USER}</span></div>
                <div>Ruta de Acceso: <span className="text-emerald-300 font-bold">/rescue</span></div>
                <div>Archivo de Respaldo: <span className="text-amber-300 font-bold">soporteTecnico.txt</span></div>
              </div>
              <p className="text-[11px] text-slate-500 italic">
                Solo el programador debe conocer esta ruta. Ningún usuario común ni administrador de salón tiene acceso a estas herramientas.
              </p>
            </div>

          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 text-center py-4 text-[11px] text-slate-600 font-mono">
        Palacio Barolo Web // Modulo de Respaldo & Rescate // v1.0.0 // Todos los derechos reservados
      </footer>

    </div>
  )
}

