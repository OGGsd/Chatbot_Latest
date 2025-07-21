export interface ChatMessage {
  id: string
  content: string
  type: 'user' | 'bot'
  timestamp: Date
}

export interface ChatbotConfig {
  webhookUrl: string
  bookingUrl: string
  title: string
  subtitle: string
  language?: 'sv' | 'en'
}

export const translations = {
  sv: {
    title: 'Axie',
    subtitle: 'AI-assistent för Axie Studio',
    inputPlaceholder: 'Skriv ditt meddelande...',
    sendButton: 'Skicka meddelande',
    bookingTitle: 'Boka ett möte',
    closeBooking: 'Stäng bokning',
    errorMessage: 'Tyvärr uppstod ett fel vid behandling av ditt meddelande. Försök igen.',
    welcomeMessage: 'Hej! 👋 Jag är Axie, din AI-assistent. Jag hjälper dig gärna med frågor om våra tjänster eller att boka ett möte.',
    quickActions: {
      whatIsAxie: 'Vad är Axie Studio?',
      checkAvailability: 'Kolla tillgänglighet',
      bookConsultation: 'Boka en konsultation'
    }
  },
  en: {
    title: 'Axie',
    subtitle: 'AI Assistant for Axie Studio',
    inputPlaceholder: 'Type your message...',
    sendButton: 'Send message',
    bookingTitle: 'Schedule a Meeting',
    closeBooking: 'Close booking',
    errorMessage: 'Sorry, there was an error processing your message. Please try again.',
    welcomeMessage: 'Hello! 👋 I\'m Axie, your AI assistant. I\'m here to help you with questions about our services or to schedule a meeting.',
    quickActions: {
      whatIsAxie: 'What is Axie Studio?',
      checkAvailability: 'Check availability',
      bookConsultation: 'Book a consultation'
    }
  }
}