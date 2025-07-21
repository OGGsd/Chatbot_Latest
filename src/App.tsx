import Chatbot from './components/Chatbot';

export default function App() {
  return (
    <Chatbot
      config={{
        title: 'Axie Studio Support Bot',
        subtitle: 'Axie kan hjälpa dig att navigera, förstå eller hantera dina bokningar!'
      }}
    />
  );
}