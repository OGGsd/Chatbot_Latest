import React, { useState, useRef, useEffect } from 'react';
import { Send, Calendar, Bot, User, X } from 'lucide-react';
import { ChatMessage, ChatbotConfig, translations } from '../types/chat';
import { detectLanguage, formatTime, generateMessageId, LanguageCode } from '../lib/utils';

const defaultConfig: ChatbotConfig = {
  webhookUrl: 'https://stefan0987.app.n8n.cloud/webhook/156b9b80-a524-4116-9b0a-f93aa729a5ea',
  bookingUrl: 'https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ0QR3uRxVB7rb4ZHqJ1qYmz-T0e2CFtV5MYekvGDq1qyWxsV_Av3nP3zEGk0DrH2HqpTLoXuK0h',
  title: 'Axie Studio',
  subtitle: translations.sv.subtitle,
  language: 'sv'
};

interface ChatbotProps {
  config?: Partial<ChatbotConfig>;
}

// Message bubble component
const MessageBubble = ({ message, language }: { message: ChatMessage; language: LanguageCode }) => (
  <div
    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} mb-6 animate-in slide-in-from-bottom-2 duration-500`}
  >
    <div className="flex items-start max-w-[85%] sm:max-w-[75%] lg:max-w-[65%] group">
      {message.type === 'bot' && (
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-slate-700 via-slate-600 to-slate-500 flex items-center justify-center mr-4 mt-1 shadow-xl border border-slate-500/20 flex-shrink-0 backdrop-blur-sm">
          <Bot size={18} className="text-slate-50" />
        </div>
      )}
      <div className="flex flex-col">
        <div
          className={`rounded-2xl px-4 py-3 shadow-sm ${
            message.type === 'user'
              ? 'bg-gradient-to-br from-slate-800 via-slate-700 to-slate-600 text-slate-50 ml-auto shadow-2xl border border-slate-500/30'
              : 'bg-gradient-to-br from-slate-50 via-white to-slate-50/90 text-slate-800 border border-slate-200/60 shadow-xl'
          }`}
        >
          <div 
            className="text-sm leading-relaxed break-words whitespace-pre-wrap font-medium"
            dangerouslySetInnerHTML={{ __html: message.content }}
          />
        </div>
        <div className={`text-xs mt-2 opacity-70 font-medium ${message.type === 'user' ? 'text-right text-slate-400' : 'text-left text-slate-500'}`}>
          {formatTime(message.timestamp, language)}
        </div>
      </div>
      {message.type === 'user' && (
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-slate-600 via-slate-500 to-slate-400 flex items-center justify-center ml-4 mt-1 shadow-xl border border-slate-400/20 flex-shrink-0 backdrop-blur-sm">
          <User size={18} className="text-slate-50" />
        </div>
      )}
    </div>
  </div>
);

// Typing indicator component
const TypingIndicator = () => (
  <div className="flex justify-start mb-6">
    <div className="flex items-start space-x-4 max-w-[80%]">
      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-slate-700 via-slate-600 to-slate-500 flex items-center justify-center shadow-xl border border-slate-500/20 backdrop-blur-sm">
        <Bot size={18} className="text-slate-50" />
      </div>
      <div className="bg-gradient-to-br from-slate-50 via-white to-slate-50/90 rounded-3xl px-5 py-4 border border-slate-200/60 shadow-xl backdrop-blur-sm">
        <div className="flex space-x-1.5">
          <div className="w-2.5 h-2.5 bg-slate-400 rounded-full animate-bounce"></div>
          <div className="w-2.5 h-2.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
          <div className="w-2.5 h-2.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
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
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(148,163,184,0.1),transparent_50%)] pointer-events-none"></div>
      <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(148,163,184,0.02)_50%,transparent_75%)] pointer-events-none"></div>
      
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-slate-50 p-6 sm:p-8 shadow-2xl border-b border-slate-700/50 backdrop-blur-xl relative z-10">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-800/20 to-transparent"></div>
        <div className="flex items-center space-x-3 max-w-7xl mx-auto">
          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-slate-600 via-slate-500 to-slate-400 rounded-3xl flex items-center justify-center shadow-2xl border border-slate-400/30 backdrop-blur-sm">
            <Bot size={24} className="sm:w-7 sm:h-7 text-slate-50" />
          </div>
          <div className="relative z-10">
            <h3 className="font-bold text-xl sm:text-2xl bg-gradient-to-r from-slate-50 to-slate-200 bg-clip-text text-transparent">Axie Studio</h3>
            <p className="text-slate-300 text-sm sm:text-base font-medium opacity-90">{t.subtitle}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 sm:p-8 max-w-7xl mx-auto w-full relative z-10 custom-scrollbar">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} language={currentLanguage} />
        ))}
        {isLoading && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      <div className="px-6 sm:px-8 py-4 border-t border-slate-700/50 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 max-w-7xl mx-auto w-full backdrop-blur-xl relative z-10">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-800/10 to-transparent"></div>
        <div className="flex flex-wrap gap-3 relative z-10">
          <button
            onClick={() => handleQuickAction(t.quickActions.whatIsAxie)}
            className="text-xs sm:text-sm px-4 py-2.5 rounded-2xl bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600 transition-all duration-300 text-slate-200 border border-slate-600/50 shadow-lg hover:shadow-xl transform hover:scale-105 font-medium backdrop-blur-sm"
          >
            {t.quickActions.whatIsAxie}
          </button>
          <button
            onClick={() => handleQuickAction(t.quickActions.checkAvailability)}
            className="text-xs sm:text-sm px-4 py-2.5 rounded-2xl bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600 transition-all duration-300 text-slate-200 border border-slate-600/50 shadow-lg hover:shadow-xl transform hover:scale-105 font-medium backdrop-blur-sm"
          >
            {t.quickActions.checkAvailability}
          </button>
          <button
            onClick={() => handleQuickAction(t.quickActions.bookConsultation)}
            className="text-xs sm:text-sm px-4 py-2.5 rounded-2xl bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600 transition-all duration-300 text-slate-200 border border-slate-600/50 shadow-lg hover:shadow-xl transform hover:scale-105 font-medium backdrop-blur-sm"
          >
            {t.quickActions.bookConsultation}
          </button>
        </div>
      </div>

      {/* Input */}
      <div className="p-6 sm:p-8 border-t border-slate-700/50 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 max-w-7xl mx-auto w-full backdrop-blur-xl relative z-10">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-800/10 to-transparent"></div>
        <div className="flex items-end space-x-4 relative z-10">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={t.inputPlaceholder}
            className="flex-1 resize-none border border-slate-600/50 bg-gradient-to-br from-slate-800 to-slate-700 text-slate-50 rounded-3xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 max-h-32 text-sm sm:text-base transition-all duration-300 placeholder-slate-400 shadow-xl backdrop-blur-sm font-medium"
            rows={1}
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            className="bg-gradient-to-br from-slate-700 via-slate-600 to-slate-500 hover:from-slate-600 hover:via-slate-500 hover:to-slate-400 text-slate-50 p-4 sm:p-5 rounded-3xl hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex-shrink-0 transform hover:scale-110 shadow-xl border border-slate-500/30 backdrop-blur-sm"
            aria-label={t.sendButton}
          >
            <Send size={20} className="sm:w-6 sm:h-6" />
          </button>
        </div>
      </div>

      {/* Booking Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-[60] p-4 animate-in fade-in duration-500">
          <div className="bg-gradient-to-br from-slate-50 via-white to-slate-50 rounded-3xl w-full max-w-6xl h-[90vh] max-h-[900px] flex flex-col shadow-2xl animate-in zoom-in-95 duration-500 border border-slate-200/50">
            <div className="flex items-center justify-between p-6 sm:p-8 border-b border-slate-200/60 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-slate-50 rounded-t-3xl backdrop-blur-xl">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-slate-600 via-slate-500 to-slate-400 rounded-3xl flex items-center justify-center shadow-xl border border-slate-400/30">
                  <Calendar className="text-slate-50" size={24} />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-slate-50 to-slate-200 bg-clip-text text-transparent">{t.bookingTitle}</h2>
              </div>
              <button
                onClick={() => setShowBookingModal(false)}
                className="text-slate-300 hover:text-slate-50 hover:bg-slate-800/50 p-3 rounded-2xl transition-all duration-300 backdrop-blur-sm"
                aria-label={t.closeBooking}
              >
                <X size={26} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <iframe
                src={finalConfig.bookingUrl}
                className="w-full h-full border-none rounded-b-3xl"
                title={t.bookingTitle}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}