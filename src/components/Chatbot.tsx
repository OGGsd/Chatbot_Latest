import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Calendar, Bot, User, X, Sparkles, Clock } from 'lucide-react';
import { ChatMessage, ChatbotConfig, translations } from '../types/chat';
import { detectLanguage, formatTime, generateMessageId, LanguageCode } from '../lib/utils';

const defaultConfig: ChatbotConfig = {
  webhookUrl: 'https://stefan0987.app.n8n.cloud/webhook/156b9b80-a524-4116-9b0a-f93aa729a5ea',
  bookingUrl: 'https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ0QR3uRxVB7rb4ZHqJ1qYmz-T0e2CFtV5MYekvGDq1qyWxsV_Av3nP3zEGk0DrH2HqpTLoXuK0h',
  title: translations.sv.title,
  subtitle: translations.sv.subtitle,
  language: 'sv'
};

interface ChatbotProps {
  config?: Partial<ChatbotConfig>;
}

// Enhanced Message bubble component with animations
const MessageBubble = ({ message, language, isLatest }: { 
  message: ChatMessage; 
  language: LanguageCode; 
  isLatest?: boolean;
}) => (
  <div
    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} mb-3 animate-in slide-in-from-bottom-2 duration-500 ${
      isLatest ? 'animate-pulse-once' : ''
    }`}
  >
    <div className="flex items-start max-w-[85%] sm:max-w-[75%] lg:max-w-[65%] group">
      {message.type === 'bot' && (
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 flex items-center justify-center mr-2.5 mt-0.5 shadow-md flex-shrink-0 ring-2 ring-blue-100">
          <Bot size={14} className="text-white" />
        </div>
      )}
      <div className="flex flex-col">
        <div
          className={`rounded-2xl px-3.5 py-2.5 shadow-sm transition-all duration-200 ${
            message.type === 'user'
              ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white ml-auto shadow-blue-200/50 hover:shadow-blue-300/60'
              : 'bg-white text-gray-800 border border-gray-100 hover:border-gray-200 hover:shadow-md'
          }`}
        >
          <div 
            className="text-sm leading-relaxed break-words"
            dangerouslySetInnerHTML={{ __html: message.content }}
          />
        </div>
        <div className={`text-xs mt-1.5 opacity-50 transition-opacity group-hover:opacity-70 ${
          message.type === 'user' ? 'text-right text-blue-100' : 'text-left text-gray-500'
        }`}>
          <Clock size={10} className="inline mr-1" />
          {formatTime(message.timestamp, language)}
        </div>
      </div>
      {message.type === 'user' && (
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center ml-2.5 mt-0.5 shadow-md flex-shrink-0 ring-2 ring-gray-200">
          <User size={14} className="text-white" />
        </div>
      )}
    </div>
  </div>
);

// Enhanced typing indicator with more sophisticated animation
const TypingIndicator = () => (
  <div className="flex justify-start mb-3 animate-in slide-in-from-bottom-2 duration-300">
    <div className="flex items-start space-x-2.5 max-w-[80%]">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 flex items-center justify-center shadow-md ring-2 ring-blue-100">
        <Bot size={14} className="text-white animate-pulse" />
      </div>
      <div className="bg-white rounded-2xl px-3.5 py-2.5 border border-gray-100 shadow-sm">
        <div className="flex space-x-1.5 items-center">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
          <span className="text-xs text-gray-400 ml-2">Axie skriver...</span>
        </div>
      </div>
    </div>
  </div>
);

// Enhanced quick action button component
const QuickActionButton = ({ 
  onClick, 
  children, 
  variant = 'default',
  disabled = false 
}: { 
  onClick: () => void; 
  children: React.ReactNode; 
  variant?: 'default' | 'primary' | 'success';
  disabled?: boolean;
}) => {
  const variants = {
    default: 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 hover:border-slate-300',
    primary: 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 hover:border-blue-300',
    success: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 hover:border-emerald-300'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`text-xs px-3 py-2 rounded-full transition-all duration-200 border font-medium hover:shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]}`}
    >
      {children}
    </button>
  );
};

export default function Chatbot({ config = {} }: ChatbotProps) {
  const finalConfig = { ...defaultConfig, ...config };
  const [currentLanguage, setCurrentLanguage] = useState<LanguageCode>(finalConfig.language || 'sv');
  const t = translations[currentLanguage];
  
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      content: t.welcomeMessage,
      type: 'bot',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = inputRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [inputValue, adjustTextareaHeight]);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Update welcome message when language changes
  useEffect(() => {
    setMessages(prev => [
      {
        id: '1',
        content: t.welcomeMessage,
        type: 'bot',
        timestamp: new Date()
      },
      ...prev.slice(1)
    ]);
  }, [currentLanguage, t.welcomeMessage]);

  const handleLanguageDetection = (text: string) => {
    const detectedLanguage = detectLanguage(text);
    if (detectedLanguage !== currentLanguage) {
      setCurrentLanguage(detectedLanguage);
      return detectedLanguage;
    }
    return currentLanguage;
  };

  const handleSendMessage = async (messageText?: string) => {
    const message = (messageText || inputValue).trim();
    if (!message || isLoading) return;

    // Detect language from user input
    const detectedLanguage = handleLanguageDetection(message);

    const userMessage: ChatMessage = {
      id: generateMessageId(),
      content: message,
      type: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    try {
      const queryParams = new URLSearchParams({
        message: message,
        sessionId: sessionId,
        time: new Date().toISOString(),
        language: detectedLanguage
      });

      const response = await fetch(`${finalConfig.webhookUrl}?${queryParams.toString()}`);
      const data = await response.json();
      
      let responseText = '';
      let shouldShowBooking = false;

      // Handle the response from n8n webhook
      if (data.response) {
        responseText = data.response;
      }

      // Check if we should show booking popup
      if (data.showBookingPopup) {
        shouldShowBooking = true;
        if (!responseText) {
          responseText = '**Booking System**\nVår bokningssystem öppnas om ett ögonblick!';
        }
      }

      // Handle nested JSON responses
      if (typeof data.output === 'string') {
        try {
          const innerData = JSON.parse(data.output);
          if (typeof innerData === 'object' && innerData !== null) {
            if (innerData.showBookingPopup === true) {
              shouldShowBooking = true;
              responseText = '**Booking System**\nVår bokningssystem öppnas om ett ögonblick!';
            }
            if (innerData.response) {
              responseText = innerData.response;
            }
            if (innerData.language) {
              setCurrentLanguage(innerData.language as LanguageCode);
            }
          }
        } catch (innerError) {
          responseText = data.output;
        }
      }

      // Try to parse the entire response as JSON if it's a string
      if (typeof data === 'string') {
        try {
          const parsedData = JSON.parse(data);
          if (parsedData.showBookingPopup === true) {
            shouldShowBooking = true;
            responseText = '**Booking System**\nVår bokningssystem öppnas om ett ögonblick!';
          }
          if (parsedData.response) {
            responseText = parsedData.response;
          }
        } catch (parseError) {
          responseText = data;
        }
      }

      // If n8n response doesn't specify language, detect it from the response text
      if (responseText && !data.language) {
        handleLanguageDetection(responseText);
      }
      
      // Format the response text with enhanced markdown
      if (responseText) {
        responseText = responseText
          .replace(/\n/g, '<br/>')
          .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-blue-700">$1</strong>')
          .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
          .replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono">$1</code>');
      }

      const botMessage: ChatMessage = {
        id: generateMessageId(),
        content: responseText || t.errorMessage,
        type: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMessage]);

      if (shouldShowBooking) {
        setTimeout(() => setShowBookingModal(true), 500);
      }
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: ChatMessage = {
        id: generateMessageId(),
        content: isOnline ? t.errorMessage : 'Du verkar vara offline. Kontrollera din internetanslutning och försök igen.',
        type: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleQuickAction = (message: string) => {
    // Add visual feedback
    const button = document.activeElement as HTMLButtonElement;
    if (button) {
      button.classList.add('animate-pulse');
      setTimeout(() => button.classList.remove('animate-pulse'), 200);
    }
    
    // Send message automatically
    handleSendMessage(message);
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 pointer-events-none" />
      
      {/* Header */}
      <div className="relative bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 text-white px-4 py-2.5 shadow-xl border-b border-slate-700/50">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center overflow-hidden bg-white shadow-sm ring-2 ring-white/20">
              <img 
                src="/favicon-32x32.png" 
                alt="Axie Studio Logo" 
                className="w-full h-full object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.nextElementSibling?.classList.remove('hidden');
                }}
              />
              <Bot size={14} className="text-slate-800 hidden" />
            </div>
            <div>
              <h3 className="font-semibold text-sm leading-tight flex items-center">
                Axie
                <Sparkles size={12} className="ml-1.5 text-blue-300 animate-pulse" />
              </h3>
              <p className="text-slate-300 text-xs leading-tight">{t.subtitle}</p>
            </div>
          </div>
          
          {/* Status indicator */}
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-400' : 'bg-red-400'} animate-pulse`} />
            <span className="text-xs text-slate-300">{isOnline ? 'Online' : 'Offline'}</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 max-w-4xl mx-auto w-full relative">
        <div className="space-y-1">
          {messages.map((message, index) => (
            <MessageBubble 
              key={message.id} 
              message={message} 
              language={currentLanguage}
              isLatest={index === messages.length - 1}
            />
          ))}
          {isLoading && <TypingIndicator />}
        </div>
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      <div className="px-4 py-2 border-t border-slate-200/60 bg-white/90 backdrop-blur-sm max-w-4xl mx-auto w-full">
        <div className="flex flex-wrap gap-2 justify-center">
          <QuickActionButton
            onClick={() => handleQuickAction(t.quickActions.whatIsAxie)}
            variant="default"
            disabled={isLoading}
          >
            {t.quickActions.whatIsAxie}
          </QuickActionButton>
          <QuickActionButton
            onClick={() => handleQuickAction(t.quickActions.checkAvailability)}
            variant="success"
            disabled={isLoading}
          >
            {t.quickActions.checkAvailability}
          </QuickActionButton>
          <QuickActionButton
            onClick={() => handleQuickAction(t.quickActions.bookConsultation)}
            variant="primary"
            disabled={isLoading}
          >
            {t.quickActions.bookConsultation}
          </QuickActionButton>
        </div>
      </div>

      {/* Input */}
      <div className="p-3 border-t border-slate-200/60 bg-white/95 backdrop-blur-sm max-w-4xl mx-auto w-full">
        <div className="flex items-end space-x-2">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={isOnline ? t.inputPlaceholder : 'Offline - kontrollera din anslutning...'}
              className="w-full resize-none border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-300 min-h-[44px] max-h-[120px] text-sm transition-all duration-200 bg-slate-50/50 focus:bg-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading || !isOnline}
              style={{ height: 'auto' }}
            />
            {inputValue && (
              <div className="absolute bottom-1 right-1 text-xs text-slate-400">
                {inputValue.length}/500
              </div>
            )}
          </div>
          <button
            onClick={() => handleSendMessage()}
            disabled={!inputValue.trim() || isLoading || !isOnline}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white p-2.5 rounded-xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex-shrink-0 active:scale-95 shadow-blue-200/50"
            aria-label={t.sendButton}
          >
            <Send size={16} className={isLoading ? 'animate-pulse' : ''} />
          </button>
        </div>
      </div>

      {/* Enhanced Booking Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[60] p-4 animate-in fade-in duration-500">
          <div className="bg-white rounded-3xl w-full max-w-6xl h-[92vh] max-h-[900px] flex flex-col shadow-2xl animate-in zoom-in-95 duration-500 ring-1 ring-slate-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 text-white rounded-t-3xl">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <Calendar className="text-white" size={18} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">{t.bookingTitle}</h2>
                  <p className="text-slate-300 text-sm">Välj en tid som passar dig</p>
                </div>
              </div>
              <button
                onClick={() => setShowBookingModal(false)}
                className="text-white/80 hover:text-white hover:bg-white/20 p-2.5 rounded-xl transition-all duration-200 active:scale-95"
                aria-label={t.closeBooking}
              >
                <X size={22} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden bg-slate-50">
              <iframe
                src={finalConfig.bookingUrl}
                className="w-full h-full border-none"
                title={t.bookingTitle}
                loading="lazy"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}