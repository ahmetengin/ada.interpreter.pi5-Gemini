import React, { useRef, useEffect, useState } from 'react';
import { useGeminiLive } from './hooks/useGeminiLive';
import { AppStatus, TranscriptMessage } from './types';
import { LanguageSelector, LANGUAGES } from './LanguageSelector';
import { SystemInfo } from './SystemInfo';
import { PresentationView } from './PresentationView';

const MicIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3ZM10.75 5a1.25 1.25 0 1 1 2.5 0v6a1.25 1.25 0 1 1-2.5 0V5ZM12 16.75A4.75 4.75 0 0 0 16.75 12h1.5a6.25 6.25 0 0 1-12.5 0h1.5A4.75 4.75 0 0 0 12 16.75Z M18 12a1 1 0 0 1 1 1v1.5a1 1 0 1 1-2 0V13a1 1 0 0 1 1-1Z M6 12a1 1 0 0 1 1 1v1.5a1 1 0 1 1-2 0V13a1 1 0 0 1 1-1Z" />
  </svg>
);

const StopIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M8.25 6.75a.75.75 0 0 0 0 1.5h7.5a.75.75 0 0 0 0-1.5h-7.5Z" />
    <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM3.75 12a8.25 8.25 0 1 1 16.5 0 8.25 8.25 0 0 1-16.5 0Z" clipRule="evenodd" />
  </svg>
);

const PresentationIcon = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.75 16.5a.75.75 0 0 0-1.5 0v2.25a.75.75 0 0 0 1.5 0v-2.25Z" />
        <path fillRule="evenodd" d="M1.5 4.5a3 3 0 0 1 3-3h15a3 3 0 0 1 3 3v8.25a3 3 0 0 1-3 3H16.5v.75a.75.75 0 0 1-1.5 0v-.75H9v.75a.75.75 0 0 1-1.5 0v-.75H4.5a3 3 0 0 1-3-3V4.5Zm3-1.5a1.5 1.5 0 0 0-1.5 1.5v8.25a1.5 1.5 0 0 0 1.5 1.5h15a1.5 1.5 0 0 0 1.5-1.5V4.5a1.5 1.5 0 0 0-1.5-1.5h-15Z" clipRule="evenodd" />
    </svg>
);


interface TranscriptProps {
  transcript: TranscriptMessage[];
}
const Transcript: React.FC<TranscriptProps> = ({ transcript }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript]);

  return (
    <div ref={scrollRef} className="flex-grow bg-gray-800/50 rounded-lg p-4 space-y-4 overflow-y-auto h-full min-h-0">
      {transcript.map((item, index) => (
        <div key={index} className={`flex flex-col ${item.speaker === 'You' ? 'items-end' : 'items-start'}`}>
          <div className={`p-3 rounded-lg max-w-lg ${item.speaker === 'You' ? 'bg-blue-600' : 'bg-gray-700'}`}>
            <p className={`text-sm font-semibold mb-1 ${item.speaker === 'You' ? 'text-blue-100' : 'text-gray-200'}`}>{item.speaker}</p>
            <p className={`whitespace-pre-wrap ${!item.isFinal ? 'opacity-70' : ''}`}>{item.text}</p>
          </div>
        </div>
      ))}
      {transcript.length === 0 && (
          <div className="flex items-center justify-center h-full text-gray-500">
              <p>Select a language and press "Start Interpretation" to begin.</p>
          </div>
      )}
    </div>
  );
};

interface StatusIndicatorProps {
  status: AppStatus;
}
const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status }) => {
  const getStatusColor = () => {
    switch (status) {
      case AppStatus.Listening: return 'bg-green-500';
      case AppStatus.Speaking: return 'bg-yellow-500';
      case AppStatus.Connecting: return 'bg-blue-500';
      case AppStatus.Error: return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="flex items-center justify-center space-x-2 p-2 rounded-full bg-gray-800">
      <div className={`w-3 h-3 rounded-full ${getStatusColor()} animate-pulse`}></div>
      <span className="text-sm text-gray-300 font-medium">{status}</span>
    </div>
  );
};

export default function App() {
  const [targetLanguage, setTargetLanguage] = useState(LANGUAGES[0].name);
  const { status, transcript, error, startSession, stopSession } = useGeminiLive(targetLanguage);
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const isSessionActive = status !== AppStatus.Idle && status !== AppStatus.Error;

  const handleToggleSession = () => {
    if (isSessionActive) {
      stopSession();
    } else {
      startSession();
    }
  };

  return (
    <main className="flex flex-col min-h-screen bg-gray-900 text-white font-sans p-4 md:p-6 lg:p-8">
      <header className="flex-shrink-0 mb-4 flex justify-between items-center">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-100">Real-Time Interpreter Console</h1>
        <div className="flex items-center space-x-4">
            <button 
                onClick={() => setIsPresentationMode(true)} 
                className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors"
                aria-label="Enter Presentation Mode"
                title="Presentation Mode"
            >
                <PresentationIcon className="w-6 h-6 text-gray-300" />
            </button>
            {isSessionActive && <StatusIndicator status={status} />}
        </div>
      </header>

      <div className="flex-grow bg-gray-900/80 backdrop-blur-sm border border-gray-700 rounded-xl shadow-2xl p-4 flex flex-col min-h-0" style={{ height: '50vh' }}>
        <Transcript transcript={transcript} />
      </div>

      <footer className="flex-shrink-0 pt-6 flex flex-col items-center justify-center">
        {error && <p className="text-red-400 mb-4 text-center">{error}</p>}
        <div className="flex items-center space-x-6">
          <LanguageSelector
              selectedLanguage={targetLanguage}
              onLanguageChange={setTargetLanguage}
              disabled={status === AppStatus.Connecting}
          />
          <button
            onClick={handleToggleSession}
            disabled={status === AppStatus.Connecting}
            className={`relative flex items-center justify-center w-20 h-20 rounded-full transition-all duration-300 ease-in-out focus:outline-none focus:ring-4 focus:ring-opacity-50
              ${isSessionActive ? 'bg-red-600 hover:bg-red-700 focus:ring-red-400' : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-400'}
              ${status === AppStatus.Connecting ? 'animate-pulse cursor-not-allowed' : ''}
              shadow-lg hover:shadow-xl`}
          >
            {isSessionActive ? <StopIcon className="w-10 h-10" /> : <MicIcon className="w-10 h-10" />}
          </button>
        </div>
        <p className="mt-3 text-sm text-gray-500">
          {isSessionActive ? 'Tap to end interpretation' : 'Tap to start interpretation'}
        </p>
      </footer>
      
      <SystemInfo />

      {isPresentationMode && (
        <PresentationView 
          transcript={transcript} 
          onClose={() => setIsPresentationMode(false)} 
        />
      )}
    </main>
  );
}