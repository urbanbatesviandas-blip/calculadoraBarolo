import React from 'react'
import { Calendar, Calculator, LayoutDashboard, ListFilter, Cloud, CloudOff, Settings, ShieldCheck, PlusCircle, RefreshCw } from 'lucide-react'
import { isSupabaseConfigured } from '../services/supabaseClient'

export default function Navbar({ currentView, setCurrentView, onOpenSettings, onNewEvent, eventsCount, quotesCount, onForceSync, isSyncing }) {
  const isOnline = isSupabaseConfigured()

  return (
    <header className="sticky top-0 z-40 bg-barolo-navy text-white shadow-xl border-b border-barolo-gold/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo & Palacio Barolo Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setCurrentView('calendar')}>
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-barolo-gold to-barolo-gold-dark flex items-center justify-center shadow-lg border border-amber-300/40 text-barolo-navy font-bold text-xl tracking-wider">
              PB
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-serif font-bold text-base sm:text-lg tracking-wide uppercase text-amber-200">Palacio Barolo</span>
                <span className="text-[10px] sm:text-xs bg-amber-400/20 text-amber-300 border border-amber-400/40 px-1.5 sm:px-2 py-0.5 rounded-full font-medium">Cloud v2.0</span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-300 tracking-wider hidden xs:block">Sistema Integral de Eventos & Rentabilidad</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1 bg-barolo-navy-dark/60 p-1.5 rounded-2xl border border-white/10 backdrop-blur-md">
            <button
              onClick={() => setCurrentView('calendar')}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                currentView === 'calendar'
                  ? 'bg-gradient-to-r from-barolo-gold to-amber-500 text-barolo-navy font-bold shadow-md shadow-amber-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Calendario</span>
            </button>

            <button
              onClick={() => setCurrentView('calculator')}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                currentView === 'calculator'
                  ? 'bg-gradient-to-r from-barolo-gold to-amber-500 text-barolo-navy font-bold shadow-md shadow-amber-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <Calculator className="w-4 h-4" />
              <span>Calculadora Madre</span>
            </button>

            <button
              onClick={() => setCurrentView('dashboard')}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                currentView === 'dashboard'
                  ? 'bg-gradient-to-r from-barolo-gold to-amber-500 text-barolo-navy font-bold shadow-md shadow-amber-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard Ejecutivo</span>
            </button>

            <button
              onClick={() => setCurrentView('list')}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                currentView === 'list'
                  ? 'bg-gradient-to-r from-barolo-gold to-amber-500 text-barolo-navy font-bold shadow-md shadow-amber-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <ListFilter className="w-4 h-4" />
              <span>Pipeline & Registro</span>
              {quotesCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-amber-400 text-barolo-navy font-bold rounded-full">
                  {quotesCount}
                </span>
              )}
            </button>
          </nav>

          {/* Right Actions: Sync, Quick New Event & Connection Status */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Sync Button */}
            <button
              onClick={onForceSync}
              disabled={isSyncing}
              className="flex items-center space-x-1.5 bg-barolo-navy-dark hover:bg-barolo-navy-light text-amber-300 border border-amber-400/40 px-2.5 sm:px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50"
              title="Sincronizar y actualizar con la Nube Supabase"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-400' : 'text-amber-300'}`} />
              <span className="hidden sm:inline">{isSyncing ? 'Sincronizando...' : 'Sincronizar'}</span>
            </button>

            {/* Quick New Event */}
            <button
              onClick={onNewEvent}
              className="flex items-center space-x-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-2.5 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold shadow-lg shadow-emerald-900/30 transition-all transform hover:scale-105"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Nueva Cotización</span>
            </button>

            {/* Supabase Status Pill */}
            <button
              onClick={onOpenSettings}
              className={`flex items-center space-x-1.5 sm:space-x-2 px-2 sm:px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                isOnline
                  ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-300 hover:bg-emerald-900'
                  : 'bg-amber-950/70 border-amber-500/60 text-amber-300 hover:bg-amber-900'
              }`}
              title="Configuración de Base de Datos y Supabase"
            >
              {isOnline ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <Cloud className="w-3.5 h-3.5" />
                  <span className="hidden lg:inline">Supabase Conectado</span>
                  <span className="inline lg:hidden text-[10px] font-mono">Nube</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  <CloudOff className="w-3.5 h-3.5" />
                  <span className="hidden lg:inline">Modo Local (Demo)</span>
                  <span className="inline lg:hidden text-[10px] font-mono">Local</span>
                </>
              )}
              <Settings className="w-3 h-3 ml-0.5 opacity-75 hover:opacity-100" />
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Bar */}
      <div className="md:hidden flex justify-around py-2 border-t border-white/10 bg-barolo-navy-dark">
        <button onClick={() => setCurrentView('calendar')} className={`text-xs p-2 flex flex-col items-center ${currentView === 'calendar' ? 'text-amber-400 font-bold' : 'text-slate-300'}`}>
          <Calendar className="w-4 h-4 mb-1" />
          Calendario
        </button>
        <button onClick={() => setCurrentView('calculator')} className={`text-xs p-2 flex flex-col items-center ${currentView === 'calculator' ? 'text-amber-400 font-bold' : 'text-slate-300'}`}>
          <Calculator className="w-4 h-4 mb-1" />
          Calculadora
        </button>
        <button onClick={() => setCurrentView('dashboard')} className={`text-xs p-2 flex flex-col items-center ${currentView === 'dashboard' ? 'text-amber-400 font-bold' : 'text-slate-300'}`}>
          <LayoutDashboard className="w-4 h-4 mb-1" />
          Dashboard
        </button>
        <button onClick={() => setCurrentView('list')} className={`text-xs p-2 flex flex-col items-center ${currentView === 'list' ? 'text-amber-400 font-bold' : 'text-slate-300'}`}>
          <ListFilter className="w-4 h-4 mb-1" />
          Registro ({eventsCount})
        </button>
      </div>
    </header>
  )
}
