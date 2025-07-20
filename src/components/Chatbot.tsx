import React, { useState, useRef, useEffect } from 'react'
import { Send, Calendar, Bot, User, X, MessageCircle, Minimize2 } from 'lucide-react'
import { ChatMessage, ChatbotConfig, translations } from '../types/chat'
import { detectLanguage, formatTime, generateMessageId, LanguageCode } from '../lib/utils'

const defaultConfig: ChatbotConfig = {
  webhookUrl: 'https://stefan0987.app.n8n.cloud/webhook/156b9b80-a524-4116-9b0a-f93aa729a5ea',
  bookingUrl: 'https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ0QR3uRxVB7rb4ZHqJ1qYmz-T0e2CFtV5MYekvGDq1qyWxsV_Av3nP3zEGk0DrH2HqpTLoXuK0h',
  title: translations.sv.title,
  subtitle: translations.sv.subtitle,
  language: 'sv'
}

interface ChatbotProps {
  config?: Partial<ChatbotConfig>
}

const MessageBubble = ({ message, language }: { message: ChatMessage; language: LanguageCode }) => (
  <div className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} mb-4 animate-in slide-in-from-bottom-2 duration-300`}>
    <div className="flex items-start max-w-[85%] group">
      {message.type === 'bot' && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mr-3 mt-1 shadow-lg">
          <Bot size={16} className="text-white" />
        </div>
      )}
      <div className="flex flex-col">
        <div className={`rounded-2xl px-4 py-3 shadow-sm ${
          message.type === 'user'
            ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white ml-auto'
            : 'bg-white text-gray-800 border border-gray-100'
        }`}>
          <div 
            className="text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: message.content }}
          />
        </div>
        <div className={`text-xs mt-1 opacity-60 ${message.type === 'user' ? 'text-right' : 'text-left'}`}>
          {formatTime(message.timestamp, language)}
        </div>
      </div>
      {message.type === 'user' && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center ml-3 mt-1 shadow-lg">
          <User size={16} className="text-white" />
        </div>
      )}
    </div>
  </div>
)

const TypingIndicator = () => (
  <div className="flex justify-start mb-4">
    <div className="flex items-start space-x-3 max-w-[80%]">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
        <Bot size={16} className="text-white" />
      </div>
      <div className="bg-white rounded-2xl px-4 py-3 border border-gray-100 shadow-sm">
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
      </div>
    </div>
  </div>
)

export default function Chatbot({ config = {} }: ChatbotProps) {
  const finalConfig = { ...defaultConfig, ...config }
  const [currentLanguage, setCurrentLanguage] = useState<LanguageCode>(finalConfig.language || 'sv')
  const [isMinimized, setIsMinimized] = useState(false)
  const t = translations[currentLanguage]
  
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      content: t.welcomeMessage,
      type: 'bot',
      timestamp: new Date()
    }
  ])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (inputRef.current && !isMinimized) {
      inputRef.current.focus()
    }
  }, [isMinimized])

  useEffect(() => {
    setMessages(prev => [
      {
        id: '1',
        content: t.welcomeMessage,
        type: 'bot',
        timestamp: new Date()
      },
      ...prev.slice(1)
    ])
  }, [currentLanguage, t.welcomeMessage])

  const handleLanguageDetection = (text: string) => {
    const detectedLanguage = detectLanguage(text)
    if (detectedLanguage !== currentLanguage) {
      setCurrentLanguage(detectedLanguage)
      return detectedLanguage
    }
    return currentLanguage
  }

  const handleSendMessage = async () => {
    const message = inputValue.trim()
    if (!message || isLoading) return

    const detectedLanguage = handleLanguageDetection(message)

    const userMessage: ChatMessage = {
      id: generateMessageId(),
      content: message,
      type: 'user',
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      const queryParams = new URLSearchParams({
        message: message,
        sessionId: sessionId,
        time: new Date().toISOString()
      })

      const response = await fetch(`${finalConfig.webhookUrl}?${queryParams.toString()}`)
      const data = await response.json()
      
      let responseText = ''
      let shouldShowBooking = false

      if (data.response) {
        responseText = data.response
      }

      if (data.showBookingPopup) {
        shouldShowBooking = true
        if (!responseText) {
          responseText = '**Booking System**\nOur Booking System will show in a moment!'
        }
      }

      if (typeof data.output === 'string') {
        try {
          const innerData = JSON.parse(data.output)
          if (typeof innerData === 'object' && innerData !== null) {
            if (innerData.showBookingPopup === true) {
              shouldShowBooking = true
              responseText = '**Booking System**\nOur Booking System will show in a moment!'
            }
            if (innerData.response) {
              responseText = innerData.response
            }
          }
        } catch {
          responseText = data.output
        }
      }

      if (typeof data === 'string') {
        try {
          const parsedData = JSON.parse(data)
          if (parsedData.showBookingPopup === true) {
            shouldShowBooking = true
            responseText = '**Booking System**\nOur Booking System will show in a moment!'
          }
          if (parsedData.response) {
            responseText = parsedData.response
          }
        } catch {
          responseText = data
        }
      }
      
      if (responseText) {
        responseText = responseText
          .replace(/\n/g, '<br/>')
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
      }

      const botMessage: ChatMessage = {
        id: generateMessageId(),
        content: responseText || t.errorMessage,
        type: 'bot',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, botMessage])

      if (shouldShowBooking) {
        setShowBookingModal(true)
      }
    } catch (error) {
      console.error('Error:', error)
      const errorMessage: ChatMessage = {
        id: generateMessageId(),
        content: t.errorMessage,
        type: 'bot',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleQuickAction = (message: string) => {
    setInputValue(message)
    setTimeout(() => {
      handleSendMessage()
    }, 100)
  }

  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsMinimized(false)}
          className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-full shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300 group"
        >
          <MessageCircle size={24} className="group-hover:rotate-12 transition-transform duration-300" />
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold animate-pulse">
            {messages.filter(m => m.type === 'bot').length}
          </div>
        </button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden z-50 animate-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
            <Bot size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-lg">{t.title}</h3>
            <p className="text-blue-100 text-sm opacity-90">{t.subtitle}</p>
          </div>
        </div>
        <button
          onClick={() => setIsMinimized(true)}
          className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-lg transition-all duration-200"
        >
          <Minimize2 size={18} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-gradient-to-b from-gray-50 to-white">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} language={currentLanguage} />
        ))}
        {isLoading && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      <div className="px-4 py-2 border-t border-gray-100 bg-white">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleQuickAction(t.quickActions.whatIsAxie)}
            className="text-xs px-3 py-2 rounded-full bg-blue-50 hover:bg-blue-100 transition-colors text-blue-700 border border-blue-200"
          >
            {t.quickActions.whatIsAxie}
          </button>
          <button
            onClick={() => handleQuickAction(t.quickActions.checkAvailability)}
            className="text-xs px-3 py-2 rounded-full bg-green-50 hover:bg-green-100 transition-colors text-green-700 border border-green-200"
          >
            {t.quickActions.checkAvailability}
          </button>
          <button
            onClick={() => handleQuickAction(t.quickActions.bookConsultation)}
            className="text-xs px-3 py-2 rounded-full bg-purple-50 hover:bg-purple-100 transition-colors text-purple-700 border border-purple-200"
          >
            {t.quickActions.bookConsultation}
          </button>
        </div>
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-100 bg-white">
        <div className="flex items-end space-x-3">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={t.inputPlaceholder}
            className="flex-1 resize-none border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent max-h-24 text-sm transition-all duration-200"
            rows={1}
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-3 rounded-xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex-shrink-0 transform hover:scale-105"
            aria-label={t.sendButton}
          >
            <Send size={18} />
          </button>
        </div>
      </div>

      {/* Booking Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl w-full max-w-4xl h-[90vh] max-h-[800px] flex flex-col shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-2xl">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <Calendar className="text-white" size={20} />
                </div>
                <h2 className="text-2xl font-semibold">{t.bookingTitle}</h2>
              </div>
              <button
                onClick={() => setShowBookingModal(false)}
                className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-lg transition-all duration-200"
                aria-label={t.closeBooking}
              >
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <iframe
                src={finalConfig.bookingUrl}
                className="w-full h-full border-none"
                title={t.bookingTitle}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}