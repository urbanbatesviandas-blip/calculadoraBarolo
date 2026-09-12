import React, { useState, useRef, useEffect } from 'react'
import { 
  Wand2, X, Send, Sparkles, RotateCcw, Key, CheckCircle2, 
  ArrowRight, Calendar, Users, DollarSign, MapPin, Building, AlertCircle, 
  ChevronRight, MessageSquare, Bot, HelpCircle, Maximize2, Minimize2, Minus
} from 'lucide-react'
import { aiAssistantService } from '../services/aiAssistantService'

export default function AiAssistantDrawer({
  isOpen,
  onClose,
  onToggle,
  events = [],
  currentView = 'calendar',
  onFillCalculator,
  calculatorState = null
}) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: '¡Hola! Soy el **Copiloto Inteligente del Palacio Barolo** 🏛️✨\n\nPodés **pegarme un mensaje de WhatsApp** de un cliente o productor y te armo la cotización en 1 clic, o hacerme preguntas sobre eventos, salones y rentabilidad de la app.'
    }
  ])
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [customKey, setCustomKey] = useState(() => aiAssistantService.getApiKey())
  const [keySavedToast, setKeySavedToast] = useState(false)
  const [isFullHeight, setIsFullHeight] = useState(false)

  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (isOpen) {
      scrollToBottom()
      setTimeout(() => textareaRef.current?.focus(), 200)
    }
  }, [isOpen, messages])

  // Ajustar altura de textarea automáticamente
  const handleInputChange = (e) => {
    setInputText(e.target.value)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }

  const handleSendMessage = async (textToSend = null) => {
    const text = (textToSend || inputText).trim()
    if (!text || isLoading) return

    const newMessages = [...messages, { role: 'user', text }]
    setMessages(newMessages)
    setInputText('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setIsLoading(true)

    try {
      const context = aiAssistantService.buildContext(events, currentView, calculatorState)
      const res = await aiAssistantService.sendMessage(newMessages, context)

      if (res.success) {
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            text: res.text,
            isQuote: res.isQuote,
            quoteData: res.quoteData
          }
        ])
      } else {
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            text: res.text || 'Hubo un inconveniente procesando tu solicitud.',
            isError: true,
            needsApiKey: res.needsApiKey
          }
        ])
        if (res.needsApiKey) {
          setShowKeyModal(true)
        }
      }
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          text: `⚠️ Error de comunicación: ${err.message}`,
          isError: true
        }
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleResetChat = () => {
    setMessages([
      {
        role: 'assistant',
        text: '¡Conversación reiniciada! ¿En qué te puedo ayudar hoy? Podés pegarme un WhatsApp o consultar datos del sistema.'
      }
    ])
  }

  const handleSaveKey = (e) => {
    e.preventDefault()
    aiAssistantService.setApiKey(customKey)
    setKeySavedToast(true)
    setTimeout(() => {
      setKeySavedToast(false)
      setShowKeyModal(false)
    }, 1200)
  }

  const handleApplyQuoteToCalculator = (quoteData) => {
    if (onFillCalculator) {
      onFillCalculator(quoteData)
    }
  }

  const SUGGESTIONS = [
    {
      label: '📋 Ejemplo: Pegar WhatsApp',
      prompt: 'Hola! El productor me pide el Salón 1923 para el 15 de noviembre, calcula 90 personas, entradas $15.000 preventa y $18.000 general. Tienen sonido propio.'
    },
    {
      label: '🏆 ¿Evento más rentable?',
      prompt: '¿Cuál es el evento que dejó mayor ganancia neta para el Palacio Barolo y con qué margen?'
    },
    {
      label: '📅 ¿Disponibilidad este mes?',
      prompt: '¿Cuántos eventos tenemos contratados y cuáles son las próximas fechas agendadas?'
    }
  ]

  // Render formateado de Markdown simple (negritas y viñetas)
  const renderFormattedText = (txt = '') => {
    const lines = txt.split('\n')
    return lines.map((line, idx) => {
      // Reemplazo básico de negrita **texto**
      const parts = line.split(/(\*\*.*?\*\*)/g)
      const renderedParts = parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={pIdx} className="font-bold text-amber-200">{part.slice(2, -2)}</strong>
        }
        return part
      })

      if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
        return (
          <li key={idx} className="ml-4 list-disc text-slate-200 my-0.5">
            {renderedParts}
          </li>
        )
      }

      return (
        <p key={idx} className={line.trim() === '' ? 'h-2' : 'my-1'}>
          {renderedParts}
        </p>
      )
    })
  }

  return (
    <>
      {/* 🪄 Botón Flotante (Varita Mágica) - En cotizador flota sobre la barra de totales */}
      {!isOpen && (
        <button
          onClick={onToggle}
          className={`fixed z-40 group flex items-center space-x-2.5 bg-gradient-to-r from-amber-500 via-barolo-gold to-amber-600 hover:from-amber-400 hover:to-amber-500 text-barolo-navy px-4 py-3 rounded-full shadow-2xl shadow-amber-500/30 hover:shadow-amber-500/50 hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer border border-amber-300/40 ${
            currentView === 'calculator'
              ? 'bottom-24 sm:bottom-28 right-4 sm:right-8'
              : 'bottom-6 right-6'
          }`}
          title="Abrir Copiloto IA del Palacio Barolo"
        >
          <div className="relative">
            <Wand2 className="w-5 h-5 text-barolo-navy animate-pulse" />
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-barolo-navy opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-barolo-navy"></span>
            </span>
          </div>
          <span className="font-serif font-bold text-xs tracking-wide uppercase">
            Copilot IA
          </span>
        </button>
      )}

      {/* 🚪 Ventana Flotante Compacta / Panel Lateral (Copilot IA) */}
      <div 
        className={`fixed z-50 bg-slate-900/95 backdrop-blur-xl border border-amber-500/30 shadow-2xl flex flex-col transition-all duration-300 ease-in-out ${
          isFullHeight 
            ? 'inset-y-0 right-0 w-full sm:w-[420px] md:w-[460px] border-l rounded-none' 
            : 'bottom-4 sm:bottom-6 right-4 sm:right-8 w-[calc(100vw-2rem)] sm:w-[400px] md:w-[430px] h-[540px] max-h-[78vh] rounded-3xl shadow-amber-500/10'
        } ${
          isOpen ? 'translate-y-0 opacity-100 pointer-events-auto' : 'translate-y-12 opacity-0 pointer-events-none'
        }`}
      >
        {/* Header */}
        <div className="p-3.5 sm:p-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-barolo-gold flex items-center justify-center text-barolo-navy shadow-md flex-shrink-0">
              <Wand2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-[9px] bg-amber-400/20 text-amber-300 border border-amber-400/40 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  Gemini 2.5 Flash
                </span>
              </div>
              <h3 className="font-serif font-bold text-xs sm:text-sm text-white mt-0.5 truncate">
                Palacio Barolo Copilot
              </h3>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => setIsFullHeight(!isFullHeight)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              title={isFullHeight ? "Cambiar a ventana flotante" : "Expandir a panel completo"}
            >
              {isFullHeight ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setShowKeyModal(!showKeyModal)}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                showKeyModal ? 'bg-amber-500/20 text-amber-300' : 'text-slate-400 hover:text-white hover:bg-white/10'
              }`}
              title="Configurar Gemini API Key"
            >
              <Key className="w-4 h-4" />
            </button>
            <button
              onClick={handleResetChat}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              title="Reiniciar conversación"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              title="Minimizar / Cerrar"
            >
              <Minus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal / Banner de Configuración de API Key (si se solicita) */}
        {showKeyModal && (
          <div className="p-4 bg-slate-950 border-b border-amber-500/30 text-xs animate-fade-in flex-shrink-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-1.5 font-bold text-amber-300">
                <Key className="w-3.5 h-3.5" />
                <span>Google Gemini API Key</span>
              </div>
              <button onClick={() => setShowKeyModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mb-2">
              Si usás Vercel, la podés guardar como variable de entorno <code className="text-amber-200">GEMINI_API_KEY</code>. O pegala aquí para guardarla en este navegador:
            </p>
            <form onSubmit={handleSaveKey} className="flex space-x-2">
              <input
                type="password"
                value={customKey}
                onChange={(e) => setCustomKey(e.target.value)}
                placeholder="AIzaSy..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-barolo-navy font-bold rounded-xl transition-all cursor-pointer"
              >
                {keySavedToast ? '¡Guardada!' : 'Guardar'}
              </button>
            </form>
          </div>
        )}

        {/* Área de Mensajes (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[88%] p-3.5 rounded-2xl shadow-md ${
                  msg.role === 'user'
                    ? 'bg-amber-500 text-barolo-navy font-medium rounded-tr-sm'
                    : msg.isError
                    ? 'bg-rose-950/80 border border-rose-500/40 text-rose-200 rounded-tl-sm'
                    : 'bg-slate-800/90 border border-slate-700/60 text-slate-200 rounded-tl-sm'
                }`}
              >
                {renderFormattedText(msg.text)}

                {/* ⚡ Tarjeta Interactiva de Cotización Detectada */}
                {msg.isQuote && msg.quoteData && (
                  <div className="mt-3.5 pt-3 border-t border-amber-400/30 bg-slate-950/60 p-3 rounded-xl border border-amber-500/40">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 flex items-center space-x-1">
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        <span>Propuesta de Cotización Lista</span>
                      </span>
                    </div>

                    <p className="font-serif font-bold text-sm text-white mb-1.5 truncate">
                      {msg.quoteData.name || 'Nuevo Evento Barolo'}
                    </p>

                    <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-300 mb-3">
                      <div className="flex items-center space-x-1 truncate">
                        <Calendar className="w-3 h-3 text-amber-400 flex-shrink-0" />
                        <span>{msg.quoteData.event_date || 'Fecha a definir'}</span>
                      </div>
                      <div className="flex items-center space-x-1 truncate">
                        <MapPin className="w-3 h-3 text-amber-400 flex-shrink-0" />
                        <span>{msg.quoteData.venue || 'Salón 1923'}</span>
                      </div>
                      <div className="flex items-center space-x-1 truncate">
                        <Users className="w-3 h-3 text-amber-400 flex-shrink-0" />
                        <span>{msg.quoteData.attendees || 0} personas</span>
                      </div>
                      <div className="flex items-center space-x-1 truncate">
                        <DollarSign className="w-3 h-3 text-amber-400 flex-shrink-0" />
                        <span>${Number(msg.quoteData.general_price || 0).toLocaleString('es-AR')} ticket</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleApplyQuoteToCalculator(msg.quoteData)}
                      className="w-full flex items-center justify-center space-x-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold py-2 px-3 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer text-xs"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>⚡ Cargar en el Cotizador</span>
                      <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Indicador de escritura / Pensando */}
          {isLoading && (
            <div className="flex items-center space-x-2 text-amber-400 text-xs py-2">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></div>
              <span className="animate-pulse">Analizando contexto y calculando...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Sugerencias Rápidas */}
        {messages.length <= 2 && (
          <div className="px-4 py-2 flex items-center space-x-1.5 overflow-x-auto no-scrollbar flex-shrink-0 border-t border-slate-800">
            {SUGGESTIONS.map((sug, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(sug.prompt)}
                className="whitespace-nowrap px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-200 border border-slate-700 text-[11px] transition-colors cursor-pointer"
              >
                {sug.label}
              </button>
            ))}
          </div>
        )}

        {/* Barra de Entrada de Mensaje */}
        <div className="p-3.5 bg-slate-950 border-t border-slate-800 flex-shrink-0">
          <div className="relative flex items-end bg-slate-900 border border-slate-700 rounded-2xl p-2 focus-within:border-amber-400 transition-colors">
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Pegá un WhatsApp o hacé una pregunta..."
              className="flex-1 bg-transparent text-white text-xs placeholder:text-slate-500 resize-none focus:outline-none max-h-28 pr-2"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim() || isLoading}
              className="p-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-barolo-navy font-bold transition-all active:scale-95 cursor-pointer flex-shrink-0"
              title="Enviar mensaje (Enter)"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[10px] text-center text-slate-500 mt-2">
            Tip: Podés pegar textos largos de WhatsApp. Presioná Enter para enviar.
          </p>
        </div>
      </div>
    </>
  )
}
