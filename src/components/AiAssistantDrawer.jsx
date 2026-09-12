import React, { useState, useRef, useEffect } from 'react'
import { 
  Wand2, X, Send, Sparkles, RotateCcw, Key, CheckCircle2, 
  ArrowRight, Calendar, Users, DollarSign, MapPin, Building, AlertCircle, 
  ChevronRight, MessageSquare, Bot, HelpCircle
} from 'lucide-react'
import { aiAssistantService } from '../services/aiAssistantService'

const CHAT_STORAGE_KEY = 'barolo_copilot_chat_history'

const INITIAL_MESSAGE = {
  role: 'assistant',
  text: '¡Hola! Soy el **Copiloto Inteligente del Palacio Barolo** 🏛️✨\n\nPodés **pegarme un mensaje de WhatsApp** de un cliente o productor y te armo la cotización en 1 clic, o hacerme preguntas sobre eventos, salones y rentabilidad de la app.'
}

export default function AiAssistantDrawer({
  isOpen,
  onClose,
  onToggle,
  events = [],
  currentView = 'calendar',
  onFillCalculator,
  calculatorState = null
}) {
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem(CHAT_STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed
        }
      }
    } catch (e) {
      console.warn('Error recuperando historial del chat', e)
    }
    return [INITIAL_MESSAGE]
  })

  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [customKey, setCustomKey] = useState(() => aiAssistantService.getApiKey())
  const [keySavedToast, setKeySavedToast] = useState(false)

  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)

  // Persistir automáticamente el historial del chat en localStorage
  useEffect(() => {
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages))
    } catch (e) {
      console.warn('Error guardando historial del chat', e)
    }
  }, [messages])

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
    const resetList = [
      {
        role: 'assistant',
        text: '¡Conversación reiniciada! ¿En qué te puedo ayudar hoy? Podés pegarme un WhatsApp o consultar datos del sistema.'
      }
    ]
    setMessages(resetList)
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(resetList))
    } catch (e) {}
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
      label: '📋 Pegar WhatsApp',
      prompt: 'Hola! El productor me pide el Salón 1923 para el 15 de noviembre, calcula 90 personas, entradas $15.000 preventa y $18.000 general. Tienen sonido propio.'
    },
    {
      label: '🏆 Más Rentable',
      prompt: '¿Cuál es el evento que dejó mayor ganancia neta para el Palacio Barolo y con qué margen?'
    },
    {
      label: '📅 Disponibilidad',
      prompt: '¿Cuántos eventos tenemos contratados y cuáles son las próximas fechas agendadas?'
    }
  ]

  // Render formateado de Markdown simple (negritas y viñetas)
  const renderFormattedText = (txt = '') => {
    if (!txt || !txt.trim()) return null
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

      if (line.trim() === '') {
        return <div key={idx} className="h-1.5" />
      }

      return (
        <p key={idx} className="my-0.5 leading-relaxed">
          {renderedParts}
        </p>
      )
    })
  }

  return (
    <>
      {/* 🚪 Panel Lateral Derecho (Sidebar Copilot IA) */}
      <div 
        className={`fixed inset-y-0 right-0 z-50 w-full sm:w-[390px] lg:w-[420px] bg-slate-900 border-l border-amber-500/30 shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
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
                  Gemini 2.0 Flash
                </span>
              </div>
              <h3 className="font-serif font-bold text-xs sm:text-sm text-white mt-0.5 truncate">
                Palacio Barolo Copilot
              </h3>
            </div>
          </div>

          <div className="flex items-center space-x-1">
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
              title="Cerrar panel lateral"
            >
              <X className="w-4 h-4" />
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
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs bg-slate-900/90">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[88%] p-3.5 rounded-2xl shadow-md ${
                  msg.role === 'user'
                    ? 'bg-amber-500 text-barolo-navy font-semibold rounded-tr-sm'
                    : msg.isError
                    ? 'bg-rose-950/90 border border-rose-500/50 text-rose-100 rounded-tl-sm'
                    : 'bg-slate-800/95 border border-slate-700/80 text-slate-100 rounded-tl-sm'
                }`}
              >
                {renderFormattedText(msg.text || (msg.isQuote ? '¡He preparado la cotización para este evento:' : ''))}

                {/* ⚡ Tarjeta Interactiva de Cotización Detectada */}
                {msg.isQuote && msg.quoteData && (
                  <div className="mt-3 pt-3 border-t border-amber-400/30 bg-slate-950/80 p-3 rounded-xl border border-amber-500/40 shadow-inner">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 flex items-center space-x-1">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
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

        {/* Sugerencias Rápidas Centradas */}
        {messages.length <= 2 && (
          <div className="px-3 py-2 border-t border-slate-800/80 bg-slate-950/70 flex-shrink-0">
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 text-center mb-1.5">
              Consultas sugeridas
            </div>
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {SUGGESTIONS.map((sug, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(sug.prompt)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-amber-200 border border-slate-700/80 text-[11px] transition-all hover:scale-105 active:scale-95 cursor-pointer text-center"
                >
                  {sug.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Barra de Entrada de Mensaje */}
        <div className="p-3 bg-slate-950 border-t border-slate-800/80 flex-shrink-0">
          <div className="flex items-center bg-slate-900 border border-slate-700 rounded-2xl px-3 py-1.5 focus-within:border-amber-400 focus-within:ring-1 focus-within:ring-amber-400/30 transition-all">
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Pegá un WhatsApp o hacé una pregunta..."
              className="flex-1 bg-transparent text-white text-xs placeholder:text-slate-400 resize-none focus:outline-none max-h-28 pr-2 self-center leading-relaxed"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim() || isLoading}
              className="p-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-30 disabled:cursor-not-allowed text-barolo-navy font-bold transition-all active:scale-95 cursor-pointer flex-shrink-0 self-center"
              title="Enviar mensaje (Enter)"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[10px] text-center text-slate-400 mt-2 leading-tight">
            Tip: Podés pegar textos largos de WhatsApp. Presioná Enter para enviar.
          </p>
        </div>
      </div>
    </>
  )
}
