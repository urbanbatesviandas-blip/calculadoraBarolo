import React, { useEffect } from 'react'
import { X, Users, Sliders, ShieldCheck, ChevronRight, Settings, Sparkles, LogOut, BookOpen } from 'lucide-react'

export default function AdminSidebar({ 
  isOpen, 
  onClose, 
  currentView, 
  onNavigate, 
  currentUser,
  onLogout
}) {
  // Cerrar con Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const navItems = [
    {
      id: 'users',
      title: 'Gestión de Usuarios',
      subtitle: 'Crear cuentas, contraseñas y roles',
      icon: Users,
      badge: 'Cuentas'
    },
    {
      id: 'calculator_config',
      title: 'Plantilla Maestra',
      subtitle: 'Gastos predeterminados, salones y acuerdos',
      icon: Sliders,
      badge: 'Cotizador'
    },
    {
      id: 'manual_usuario',
      title: 'Manual de Usuario',
      subtitle: 'Guía oficial de procedimientos y uso en HTML/PDF',
      icon: BookOpen,
      badge: 'Guía',
      isAction: true,
      onClick: () => {
        window.open('/manual-usuario.html', '_blank')
      }
    }
  ]

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-fade-in">
      {/* Backdrop */}
      <div 
        onClick={onClose} 
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity" 
      />

      {/* Drawer panel */}
      <div className="absolute inset-y-0 left-0 max-w-full flex">
        <div className="w-screen max-w-sm bg-slate-900 border-r border-amber-500/30 text-white shadow-2xl flex flex-col justify-between transform transition-transform duration-300 ease-in-out">
          
          {/* Header */}
          <div className="p-6 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img 
                src="/logo-barolo.png" 
                alt="Palacio Barolo" 
                className="w-[46px] h-[46px] object-contain drop-shadow"
              />
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="text-[10px] bg-amber-400/20 text-amber-300 border border-amber-400/40 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                    Administración
                  </span>
                </div>
                <h3 className="font-serif font-bold text-base text-white mt-0.5">
                  Palacio Barolo
                </h3>
              </div>
            </div>

            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
              title="Cerrar panel lateral"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Items */}
          <div className="p-6 flex-1 space-y-3 overflow-y-auto">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Herramientas del Administrador
            </p>

            {navItems.map(item => {
              const Icon = item.icon
              const isActive = currentView === item.id

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id)
                    onClose()
                    if (item.onClick) {
                      item.onClick()
                    } else {
                      onNavigate(item.id)
                      onClose()
                    }
                  }}
                  className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between group cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-amber-500/20 to-amber-600/10 border-amber-400/50 text-white ring-1 ring-amber-400/30'
                      : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/60 text-slate-300 hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-3.5 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                      isActive ? 'bg-amber-400 text-barolo-navy font-bold' : 'bg-slate-700/80 text-amber-300 group-hover:bg-amber-500/20'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-sm text-white">{item.title}</span>
                      </div>
                      <p className="text-xs text-slate-400 truncate mt-0.5">{item.subtitle}</p>
                    </div>
                  </div>

                  <ChevronRight className={`w-4 h-4 transition-transform ${
                    isActive ? 'text-amber-400 translate-x-1' : 'text-slate-500 group-hover:text-slate-300 group-hover:translate-x-1'
                  }`} />
                </button>
              )
            })}
          </div>

          {/* Footer User Info */}
          <div className="p-5 border-t border-slate-800/80 bg-slate-950/80 flex items-center justify-between">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-barolo-navy text-amber-300 font-bold text-xs flex items-center justify-center border border-amber-300/40 select-none flex-shrink-0">
                {currentUser?.name?.charAt(0)?.toUpperCase() || 'A'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">{currentUser?.name || 'Administrador'}</p>
                <p className="text-[11px] text-amber-300 font-medium">👑 Administrador Total</p>
              </div>
            </div>

            {onLogout && (
              <button
                onClick={() => {
                  onClose()
                  onLogout()
                }}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-400 hover:text-rose-200 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/50 transition-all cursor-pointer shadow-sm active:scale-95 flex-shrink-0 ml-2"
                title="Cerrar sesión de Administrador"
              >
                <LogOut className="w-4 h-4 text-rose-400" />
                <span className="hidden xs:inline">Cerrar Sesión</span>
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
