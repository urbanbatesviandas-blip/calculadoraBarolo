import React, { useState, useEffect, useRef, useMemo } from 'react'
import { 
  X, Printer, Download, ExternalLink, Monitor, Smartphone, 
  RotateCcw, Sparkles, Check, FileText, Eye
} from 'lucide-react'

export default function DocumentPreviewModal({
  isOpen,
  onClose,
  title = 'Vista Previa del Documento',
  subtitle = 'Explora el documento interactivo antes de descargarlo',
  htmlContent = '',
  filename = 'documento_barolo.html',
  badge = 'Presentación Interactiva'
}) {
  const [viewMode, setViewMode] = useState('desktop') // 'desktop' | 'mobile'
  const [isLoading, setIsLoading] = useState(true)
  const [hasDownloaded, setHasDownloaded] = useState(false)
  const iframeRef = useRef(null)

  // Crear Blob URL seguro en memoria
  const blobUrl = useMemo(() => {
    if (!htmlContent) return ''
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' })
    return URL.createObjectURL(blob)
  }, [htmlContent])

  // Limpiar memoria cuando se desmonta o cambia el documento
  useEffect(() => {
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl)
      }
    }
  }, [blobUrl])

  // Cerrar con Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || !htmlContent) return null

  // Imprimir directamente sin descargar
  const handlePrint = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      try {
        iframeRef.current.contentWindow.focus()
        iframeRef.current.contentWindow.print()
      } catch (err) {
        console.warn('Print iframe fallback:', err)
        const printWindow = window.open(blobUrl, '_blank')
        if (printWindow) {
          printWindow.onload = () => printWindow.print()
        }
      }
    }
  }

  // Abrir en pestaña nueva limpia
  const handleOpenNewTab = () => {
    window.open(blobUrl, '_blank')
  }

  // Descargar archivo físico solo si el usuario lo desea
  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = blobUrl
    link.download = filename || 'documento_palacio_barolo.html'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setHasDownloaded(true)
    setTimeout(() => setHasDownloaded(false), 3000)
  }

  // Recargar el visor
  const handleReload = () => {
    if (iframeRef.current) {
      setIsLoading(true)
      iframeRef.current.src = blobUrl
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      
      {/* Contenedor Principal del Modal */}
      <div className="bg-slate-900 border border-amber-500/30 w-full max-w-7xl h-[94vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden text-white">
        
        {/* Barra Superior / Header */}
        <div className="bg-slate-950 px-4 sm:px-6 py-3.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
          
          {/* Título e Identificación */}
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-barolo-gold flex items-center justify-center text-barolo-navy font-bold shadow-md flex-shrink-0">
              <Eye className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className="font-serif font-bold text-sm sm:text-base text-white truncate">
                  {title}
                </h3>
                {badge && (
                  <span className="hidden sm:inline-block text-[10px] bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                    {badge}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 truncate mt-0.5">
                {subtitle}
              </p>
            </div>
          </div>

          {/* Selector de Dispositivo (Escritorio vs Móvil) */}
          <div className="hidden md:flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
            <button
              onClick={() => setViewMode('desktop')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'desktop'
                  ? 'bg-amber-400 text-barolo-navy shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Vista de pantalla completa para computadoras"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Escritorio</span>
            </button>
            <button
              onClick={() => setViewMode('mobile')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'mobile'
                  ? 'bg-amber-400 text-barolo-navy shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Simular visualización en celular (iPhone / Android)"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Móvil</span>
            </button>
          </div>

          {/* Botones de Acción */}
          <div className="flex items-center space-x-2">
            
            {/* Recargar */}
            <button
              onClick={handleReload}
              className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-colors cursor-pointer"
              title="Reiniciar vista"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Abrir en Pestaña Nueva */}
            <button
              onClick={handleOpenNewTab}
              className="hidden sm:flex items-center space-x-1.5 px-3 py-2 text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-all cursor-pointer"
              title="Abrir el documento en una pestaña independiente"
            >
              <ExternalLink className="w-4 h-4 text-amber-400" />
              <span>Pestaña Nueva</span>
            </button>

            {/* Imprimir / Guardar en PDF */}
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
              title="Enviar directamente a imprimir o guardar como PDF sin descargar archivo HTML"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden xs:inline">Imprimir / PDF</span>
            </button>

            {/* Descargar Archivo HTML */}
            <button
              onClick={handleDownload}
              className={`flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 cursor-pointer ${
                hasDownloaded
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gradient-to-r from-amber-500 to-barolo-gold hover:from-amber-400 hover:to-amber-300 text-barolo-navy'
              }`}
              title="Guardar el archivo .html en tu computadora"
            >
              {hasDownloaded ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>¡Descargado!</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Descargar HTML</span>
                </>
              )}
            </button>

            {/* Cerrar */}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-rose-500/20 hover:text-rose-300 rounded-xl border border-slate-700 transition-colors cursor-pointer ml-1"
              title="Cerrar vista previa (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

        </div>

        {/* Cuerpo del Visor con Iframe */}
        <div className="flex-1 bg-slate-950/60 p-2 sm:p-4 overflow-hidden flex items-center justify-center relative">
          
          {/* Spinner de Carga Inicial */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 z-10 backdrop-blur-xs">
              <div className="flex flex-col items-center space-y-3">
                <div className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-bold text-amber-300 tracking-wide uppercase">
                  Renderizando vista interactiva...
                </p>
              </div>
            </div>
          )}

          {/* Contenedor del Iframe con Frame Responsivo */}
          <div 
            className={`h-full transition-all duration-300 flex flex-col items-center justify-center ${
              viewMode === 'mobile'
                ? 'w-[390px] max-w-full rounded-[40px] border-[10px] border-slate-800 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] overflow-hidden bg-white'
                : 'w-full rounded-2xl border border-slate-800 shadow-xl overflow-hidden bg-white'
            }`}
          >
            {/* Si está en modo móvil, simular el notch superior */}
            {viewMode === 'mobile' && (
              <div className="w-full bg-slate-800 py-1.5 flex justify-center items-center flex-shrink-0">
                <div className="w-24 h-3 bg-slate-900 rounded-full" />
              </div>
            )}

            <iframe
              ref={iframeRef}
              src={blobUrl}
              title={title}
              onLoad={() => setIsLoading(false)}
              className="w-full h-full border-0 bg-white"
              sandbox="allow-scripts allow-modals allow-same-origin allow-popups allow-forms"
            />
          </div>

        </div>

        {/* Footer Informativo */}
        <div className="bg-slate-950/90 px-4 sm:px-6 py-2.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-[11px] text-slate-400 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Vista previa en vivo en memoria • Ningún archivo se guarda en tu disco a menos que presiones "Descargar HTML".</span>
          </div>
          <div className="flex items-center space-x-3 text-slate-500">
            <span>Presiona <kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-[10px] text-slate-300 border border-slate-700">Esc</kbd> para salir</span>
          </div>
        </div>

      </div>

    </div>
  )
}
