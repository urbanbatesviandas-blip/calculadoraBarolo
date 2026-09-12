import React, { useState, useRef, useEffect } from 'react'
import { 
  Calendar, Calculator, LayoutDashboard, ListFilter, PlusCircle, 
  FileSpreadsheet, Scale, ChevronDown, Settings, LogOut, Sliders, Users, Cloud, Wand2
} from 'lucide-react'
import { canCreateEvent, isAdmin } from '../services/authService'

export default function Navbar({ 
  currentView, 
  setCurrentView, 
  onOpenSettings,
  onOpenComparison,
  comparisonCount = 0,
  currentUser,
  onLogout,
  onNewEvent, 
  eventsCount, 
  quotesCount, 
  onExportAllExcel,
  onExportMonthExcel,
  onToggleAdminSidebar,
  onToggleAiAssistant
}) {
  const [showExcelMenu, setShowExcelMenu] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const excelMenuRef = useRef(null)
  const userMenuRef = useRef(null)

  // Cerrar menús al hacer click afuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (excelMenuRef.current && !excelMenuRef.current.contains(e.target)) {
        setShowExcelMenu(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const userCanCreate = canCreateEvent(currentUser)
  const isUserAdmin = isAdmin(currentUser)
  const roleBadge = currentUser?.roleBadge || { title: 'Admin', icon: '👑', badgeClass: 'bg-amber-100 text-amber-900 border-amber-300' }

  return (
    <header className="sticky top-0 z-40 bg-barolo-navy text-white shadow-xl border-b border-barolo-gold/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Left: Admin Gear Sidebar Trigger + Logo */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            
            {/* Engranaje lateral izquierdo (exclusivo Administrador) */}
            {isUserAdmin && (
              <button
                onClick={onToggleAdminSidebar}
                className="p-2.5 rounded-xl bg-barolo-navy-dark hover:bg-barolo-navy-light text-amber-300 border border-amber-400/40 hover:border-amber-400 transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center group"
                title="Abrir Menú de Administración (Usuarios y Plantilla)"
              >
                <Settings className="w-5 h-5 text-amber-300 group-hover:rotate-45 transition-transform duration-300" />
              </button>
            )}

            {/* Logo & Palacio Barolo Brand */}
            <div className="flex items-center space-x-3 cursor-pointer select-none group" onClick={() => setCurrentView('calendar')}>
              <img 
                src="/logo-barolo.png" 
                alt="Palacio Barolo Tours" 
                className="w-[51px] h-[51px] object-contain drop-shadow-md group-hover:scale-105 transition-transform"
              />
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-serif font-bold text-base sm:text-lg tracking-wide uppercase text-amber-200">Palacio Barolo</span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-300 tracking-wider hidden xs:block">Sistema de Eventos & Rentabilidad</p>
              </div>
            </div>

          </div>

          {/* Navigation Tabs: EXACTLY 4 TABS: Calendario | Cotizador | Eventos | Dashboard */}
          <nav className="hidden md:flex items-center space-x-1 bg-barolo-navy-dark/60 p-1.5 rounded-2xl border border-white/10 backdrop-blur-md">
            
            {/* 1. Calendario */}
            <button
              onClick={() => setCurrentView('calendar')}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 cursor-pointer ${
                currentView === 'calendar'
                  ? 'bg-gradient-to-r from-barolo-gold to-amber-500 text-barolo-navy font-bold shadow-md shadow-amber-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Calendario</span>
            </button>

            {/* 2. Cotizador */}
            <button
              onClick={() => setCurrentView('calculator')}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 cursor-pointer ${
                currentView === 'calculator'
                  ? 'bg-gradient-to-r from-barolo-gold to-amber-500 text-barolo-navy font-bold shadow-md shadow-amber-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <Calculator className="w-4 h-4" />
              <span>Cotizador</span>
            </button>

            {/* 3. Eventos */}
            <button
              onClick={() => setCurrentView('list')}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 cursor-pointer ${
                currentView === 'list'
                  ? 'bg-gradient-to-r from-barolo-gold to-amber-500 text-barolo-navy font-bold shadow-md shadow-amber-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <ListFilter className="w-4 h-4" />
              <span>Eventos</span>
              {quotesCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-amber-400 text-barolo-navy font-bold rounded-full">
                  {quotesCount}
                </span>
              )}
            </button>

            {/* 4. Dashboard */}
            <button
              onClick={() => setCurrentView('dashboard')}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 cursor-pointer ${
                currentView === 'dashboard'
                  ? 'bg-gradient-to-r from-barolo-gold to-amber-500 text-barolo-navy font-bold shadow-md shadow-amber-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </button>

          </nav>

          {/* Right Actions: Excel, Compare, Nueva Cotización & User Profile */}
          <div className="flex items-center space-x-2 sm:space-x-2.5">
            
            {/* Excel Export Dropdown */}
            <div className="relative" ref={excelMenuRef}>
              <button
                onClick={() => setShowExcelMenu(!showExcelMenu)}
                className="flex items-center space-x-1.5 bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 border border-emerald-500/50 px-2.5 sm:px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
                title="Descargar datos en planilla de Excel (.xlsx)"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span className="hidden sm:inline">Excel</span>
                <ChevronDown className="w-3 h-3 opacity-70" />
              </button>

              {showExcelMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 text-slate-800 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-1.5 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Descargar Tablas Excel (.xlsx)
                  </div>

                  <button
                    onClick={() => {
                      setShowExcelMenu(false)
                      if (onExportAllExcel) onExportAllExcel()
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs font-medium hover:bg-emerald-50 hover:text-emerald-900 flex items-center space-x-2 transition-colors cursor-pointer"
                  >
                    <span className="text-base">📊</span>
                    <div>
                      <p className="font-bold text-slate-900">Todos los Eventos</p>
                      <p className="text-[10px] text-slate-500">Histórico completo ({eventsCount} eventos)</p>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setShowExcelMenu(false)
                      if (onExportMonthExcel) onExportMonthExcel()
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs font-medium hover:bg-emerald-50 hover:text-emerald-900 flex items-center space-x-2 transition-colors cursor-pointer"
                  >
                    <span className="text-base">📅</span>
                    <div>
                      <p className="font-bold text-slate-900">Mes Visible / Actual</p>
                      <p className="text-[10px] text-slate-500">Con fila de totales y promedios</p>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Event Comparison Trigger (active count badge) */}
            {comparisonCount > 0 && (
              <button
                onClick={onOpenComparison}
                className="flex items-center space-x-1.5 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 text-white border border-purple-400/40 px-2.5 py-2 rounded-xl text-xs font-bold transition-all shadow-md animate-pulse cursor-pointer"
                title="Ver comparativa de eventos seleccionados"
              >
                <Scale className="w-3.5 h-3.5" />
                <span>Comparar</span>
                <span className="bg-white text-purple-900 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold">
                  {comparisonCount}
                </span>
              </button>
            )}

            {/* Botón Copilot IA en la barra superior */}
            {onToggleAiAssistant && (
              <button
                onClick={onToggleAiAssistant}
                className="flex items-center space-x-1.5 bg-gradient-to-r from-amber-500/20 via-barolo-gold/20 to-amber-600/20 hover:from-amber-500/30 hover:to-amber-600/30 text-amber-300 border border-amber-400/40 px-2.5 sm:px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer group"
                title="Abrir Copiloto IA del Palacio Barolo"
              >
                <Wand2 className="w-4 h-4 text-amber-400 group-hover:rotate-12 transition-transform" />
                <span className="hidden sm:inline">Copilot IA</span>
              </button>
            )}

            {/* Quick New Event (only if role allows) */}
            {userCanCreate && (
              <button
                onClick={onNewEvent}
                className="flex items-center space-x-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold shadow-lg shadow-emerald-900/30 transition-all transform hover:scale-105 cursor-pointer"
                title="Crear nueva cotización"
              >
                <PlusCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Nueva</span>
              </button>
            )}

            {/* User Profile Dropdown Menu (Only for non-admin team members; Administrator is inside the gear ⚙️) */}
            {!isUserAdmin && currentUser && (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 bg-barolo-navy-dark hover:bg-barolo-navy-light text-amber-200 border border-amber-400/40 px-2.5 sm:px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
                  title={`Usuario actual: ${currentUser?.name || 'Usuario'} (${roleBadge.title})`}
                >
                  <span className="w-6 h-6 rounded-full bg-amber-400/20 border border-amber-300/40 flex items-center justify-center text-xs font-bold text-amber-300">
                    {currentUser?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                  <span className="hidden sm:inline font-medium max-w-[120px] truncate">{currentUser?.name || 'Usuario'}</span>
                  <span className="text-xs">{roleBadge.icon}</span>
                  <ChevronDown className="w-3 h-3 opacity-70" />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 text-slate-800 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-4 py-2.5 border-b border-slate-100">
                      <p className="text-xs font-bold text-slate-900 truncate">{currentUser?.name}</p>
                      <p className="text-[11px] text-slate-400 truncate">@{currentUser?.username || currentUser?.email}</p>
                      <div className="mt-1.5">
                        <span className={`inline-flex items-center text-[10px] px-2 py-0.5 rounded-full border ${roleBadge.badgeClass}`}>
                          <span className="mr-1">{roleBadge.icon}</span>
                          <span>{roleBadge.title}</span>
                        </span>
                      </div>
                    </div>

                    <div className="pt-1">
                      <button
                        onClick={() => {
                          setShowUserMenu(false)
                          if (onLogout) onLogout()
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center space-x-2 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-4 h-4 text-rose-500" />
                        <span>Cerrar Sesión</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>

        </div>
      </div>

      {/* Mobile Bottom Bar */}
      <div className="md:hidden flex justify-around py-2 border-t border-white/10 bg-barolo-navy-dark overflow-x-auto">
        <button 
          onClick={() => setCurrentView('calendar')} 
          className={`text-xs p-2 flex flex-col items-center ${currentView === 'calendar' ? 'text-amber-400 font-bold' : 'text-slate-300'}`}
        >
          <Calendar className="w-4 h-4 mb-1" />
          Calendario
        </button>

        <button 
          onClick={() => setCurrentView('calculator')} 
          className={`text-xs p-2 flex flex-col items-center ${currentView === 'calculator' ? 'text-amber-400 font-bold' : 'text-slate-300'}`}
        >
          <Calculator className="w-4 h-4 mb-1" />
          Cotizador
        </button>

        <button 
          onClick={() => setCurrentView('list')} 
          className={`text-xs p-2 flex flex-col items-center ${currentView === 'list' ? 'text-amber-400 font-bold' : 'text-slate-300'}`}
        >
          <ListFilter className="w-4 h-4 mb-1" />
          Eventos
        </button>

        <button 
          onClick={() => setCurrentView('dashboard')} 
          className={`text-xs p-2 flex flex-col items-center ${currentView === 'dashboard' ? 'text-amber-400 font-bold' : 'text-slate-300'}`}
        >
          <LayoutDashboard className="w-4 h-4 mb-1" />
          Dashboard
        </button>

        {isUserAdmin && (
          <button 
            onClick={onToggleAdminSidebar} 
            className="text-xs p-2 flex flex-col items-center text-amber-300"
          >
            <Settings className="w-4 h-4 mb-1" />
            Ajustes
          </button>
        )}
      </div>
    </header>
  )
}
