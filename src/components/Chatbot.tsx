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
    <div className="flex items-start max-w-[85%] sm:max-w-[75%] lg:max-w-[70%] group">
      {message.type === 'bot' && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mr-3 mt-1 shadow-lg flex-shrink-0">
          <Bot size={16} className="text-white" />
        </div>
      )}
      <div className="flex flex-col">
        <div
          className={`rounded-2xl px-4 py-3 shadow-sm ${
            message.type === 'user'
              ? 'bg-blue-600 text-white ml-auto shadow-md'
              : 'bg-white text-gray-800 border border-gray-200 shadow-sm'
          }`}
        >
          <div 
            className="text-sm leading-relaxed break-words whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: message.content }}
          />
        </div>
        <div className={`text-xs mt-1 opacity-60 ${message.type === 'user' ? 'text-right text-gray-400' : 'text-left text-gray-500'}`}>
          {formatTime(message.timestamp, language)}
        </div>
      </div>
      {message.type === 'user' && (
        <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center ml-3 mt-1 shadow-lg flex-shrink-0">
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
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
        <Bot size={16} className="text-white" />
      </div>
      <div className="bg-white rounded-2xl px-4 py-3 border border-gray-200 shadow-sm">
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
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
    <div className="flex flex-col h-screen bg-gray-800">
      {/* Header */}
      <div className="bg-gray-900 text-white p-4 sm:p-6 shadow-xl border-b border-gray-700">
        <div className="flex items-center space-x-3 max-w-7xl mx-auto">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
            <Bot size={20} className="sm:w-6 sm:h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-lg sm:text-xl">{t.title}</h3>
            <p className="text-gray-300 text-sm sm:text-base">{t.subtitle}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-7xl mx-auto w-full bg-gray-800">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} language={currentLanguage} />
        ))}
        {isLoading && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      <div className="px-4 sm:px-6 py-3 border-t border-gray-700 bg-gray-900 max-w-7xl mx-auto w-full">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleQuickAction(t.quickActions.whatIsAxie)}
            className="text-xs sm:text-sm px-3 py-2 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors text-gray-200 border border-gray-600"
          >
            {t.quickActions.whatIsAxie}
          </button>
          <button
            onClick={() => handleQuickAction(t.quickActions.checkAvailability)}
            className="text-xs sm:text-sm px-3 py-2 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors text-gray-200 border border-gray-600"
          >
            {t.quickActions.checkAvailability}
          </button>
          <button
            onClick={() => handleQuickAction(t.quickActions.bookConsultation)}
            className="text-xs sm:text-sm px-3 py-2 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors text-gray-200 border border-gray-600"
          >
            {t.quickActions.bookConsultation}
          </button>
        </div>
      </div>

      {/* Input */}
      <div className="p-4 sm:p-6 border-t border-gray-700 bg-gray-900 max-w-7xl mx-auto w-full">
        <div className="flex items-end space-x-3">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={t.inputPlaceholder}
            className="flex-1 resize-none border border-gray-600 bg-gray-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 max-h-32 text-sm sm:text-base transition-all duration-200 placeholder-gray-400"
            rows={1}
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white p-3 sm:p-4 rounded-xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex-shrink-0 transform hover:scale-105"
            aria-label={t.sendButton}
          >
            <Send size={18} className="sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>

      {/* Booking Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl w-full max-w-6xl h-[90vh] max-h-[900px] flex flex-col shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 bg-gray-900 text-white rounded-t-2xl">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                  <Calendar className="text-white" size={20} />
                </div>
                <h2 className="text-xl sm:text-2xl font-semibold">{t.bookingTitle}</h2>
              </div>
              <button
                onClick={() => setShowBookingModal(false)}
                className="text-gray-300 hover:text-white hover:bg-gray-800 p-2 rounded-lg transition-all duration-200"
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