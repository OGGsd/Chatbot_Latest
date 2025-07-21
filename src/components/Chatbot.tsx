import React, { useState, useRef, useEffect } from 'react';
import { Send, Calendar, Bot, User, X } from 'lucide-react';
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

// Message bubble component
const MessageBubble = ({ message, language }: { message: ChatMessage; language: LanguageCode }) => (
  <div
    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} mb-4 animate-in slide-in-from-bottom-2 duration-300`}
  >
    <div className="flex items-start max-w-[85%] sm:max-w-[75%] lg:max-w-[60%] group">
      {message.type === 'bot' && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mr-3 mt-1 shadow-lg flex-shrink-0">
          <Bot size={16} className="text-white" />
        </div>
      )}
      <div className="flex flex-col">
        <div
          className={`rounded-2xl px-4 py-3 shadow-sm ${
            message.type === 'user'
              ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white ml-auto'
              : 'bg-white text-gray-800 border border-gray-100'
          }`}
        >
          <div 
            className="text-sm leading-relaxed break-words"
            dangerouslySetInnerHTML={{ __html: message.content }}
          />
        </div>
        <div className={`text-xs mt-1 opacity-60 ${message.type === 'user' ? 'text-right' : 'text-left'}`}>
          {formatTime(message.timestamp, language)}
        </div>
      </div>
      {message.type === 'user' && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center ml-3 mt-1 shadow-lg flex-shrink-0">
          <User size={16} className="text-white" />
        </div>
      )}
    </div>
  </div>
);

// Typing indicator component
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
);

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
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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

  const handleSendMessage = async () => {
    const message = inputValue.trim();
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
          responseText = '**Booking System**\nOur Booking System will show in a moment!';
        }
      }

      // Handle nested JSON responses
      if (typeof data.output === 'string') {
        try {
          const innerData = JSON.parse(data.output);
          if (typeof innerData === 'object' && innerData !== null) {
            if (innerData.showBookingPopup === true) {
              shouldShowBooking = true;
              responseText = '**Booking System**\nOur Booking System will show in a moment!';
            }
            if (innerData.response) {
              responseText = innerData.response;
            }
            // Check if n8n provides language information
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
            responseText = '**Booking System**\nOur Booking System will show in a moment!';
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
      
      // Format the response text with basic markdown
      if (responseText) {
        responseText = responseText
          .replace(/\n/g, '<br/>')
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>');
      }

      const botMessage: ChatMessage = {
        id: generateMessageId(),
        content: responseText || t.errorMessage,
        type: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMessage]);

      if (shouldShowBooking) {
        setShowBookingModal(true);
      }
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: ChatMessage = {
        id: generateMessageId(),
        content: t.errorMessage,
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
    setInputValue(message);
    setTimeout(() => {
      handleSendMessage();
    }, 100);
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 text-white px-4 py-3 shadow-xl border-b border-slate-700/50">
        <div className="flex items-center space-x-3 max-w-4xl mx-auto">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden bg-white shadow-sm">
            <img 
              src="/favicon-32x32.png" 
              alt="Axie Studio Logo" 
              className="w-full h-full object-contain"
              onError={(e) => {
                // Fallback to Bot icon if logo fails to load
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.nextElementSibling?.classList.remove('hidden');
              }}
            />
            <Bot size={16} className="text-slate-800 hidden" />
          </div>
          <div>
            <h3 className="font-semibold text-base leading-tight">Axie</h3>
            <p className="text-slate-300 text-xs leading-tight">{t.subtitle}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 max-w-4xl mx-auto w-full">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} language={currentLanguage} />
        ))}
        {isLoading && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      <div className="px-4 py-2 border-t border-slate-200 bg-white/80 backdrop-blur-sm max-w-4xl mx-auto w-full">
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => handleQuickAction(t.quickActions.whatIsAxie)}
            className="text-xs px-2.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 transition-all duration-200 text-slate-700 border border-slate-200 hover:border-slate-300"
          >
            {t.quickActions.whatIsAxie}
          </button>
          <button
            onClick={() => handleQuickAction(t.quickActions.checkAvailability)}
            className="text-xs px-2.5 py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100 transition-all duration-200 text-emerald-700 border border-emerald-200 hover:border-emerald-300"
          >
            {t.quickActions.checkAvailability}
          </button>
          <button
            onClick={() => handleQuickAction(t.quickActions.bookConsultation)}
            className="text-xs px-2.5 py-1.5 rounded-full bg-blue-50 hover:bg-blue-100 transition-all duration-200 text-blue-700 border border-blue-200 hover:border-blue-300"
          >
            {t.quickActions.bookConsultation}
          </button>
        </div>
      </div>

      {/* Input */}
      <div className="p-3 border-t border-slate-200 bg-white max-w-4xl mx-auto w-full">
        <div className="flex items-end space-x-2">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={t.inputPlaceholder}
            className="flex-1 resize-none border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent max-h-24 text-sm transition-all duration-200 bg-slate-50 focus:bg-white"
            rows={1}
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            className="bg-slate-800 hover:bg-slate-900 text-white p-2.5 rounded-lg hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex-shrink-0"
            aria-label={t.sendButton}
          >
            <Send size={16} />
          </button>
        </div>
      </div>

      {/* Booking Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl w-full max-w-6xl h-[90vh] max-h-[900px] flex flex-col shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-gradient-to-r from-slate-800 to-slate-900 text-white rounded-t-2xl">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <Calendar className="text-white" size={20} />
                </div>
                <h2 className="text-lg font-semibold">{t.bookingTitle}</h2>
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
  );
}