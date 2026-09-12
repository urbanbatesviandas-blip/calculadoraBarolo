import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-slate-800/90 border border-amber-500/30 rounded-3xl p-8 shadow-2xl space-y-4">
            <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto text-2xl font-serif">
              ⚠️
            </div>
            <h2 className="font-serif font-bold text-xl text-amber-200">
              Palacio Barolo • Ocurrió un error inesperado
            </h2>
            <p className="text-xs text-slate-300">
              {this.state.error?.message || "Se produjo un error al renderizar la vista."}
            </p>
            <div className="pt-2 space-y-2">
              <button
                onClick={() => {
                  try {
                    if ('caches' in window) {
                      caches.keys().then(names => names.forEach(name => caches.delete(name)))
                    }
                  } catch (e) {}
                  window.location.href = '/' + '?v=' + Date.now()
                }}
                className="w-full bg-gradient-to-r from-barolo-gold to-amber-500 hover:from-amber-400 hover:to-amber-500 text-barolo-navy font-bold py-3 px-4 rounded-xl text-sm transition-all shadow-lg cursor-pointer"
              >
                Recargar y Actualizar Versión
              </button>
              <p className="text-[11px] text-slate-400">
                Si el mensaje persiste, presioná <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-amber-300 font-mono">Ctrl + F5</kbd> (o <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-amber-300 font-mono">Cmd + Shift + R</kbd>) para limpiar la caché del navegador.
              </p>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
