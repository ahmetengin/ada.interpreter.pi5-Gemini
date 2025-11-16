import React, { useEffect, useRef } from 'react';
import { TranscriptMessage } from './types';

interface PresentationViewProps {
  transcript: TranscriptMessage[];
  onClose: () => void;
}

const CloseIcon = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm-1.72 6.97a.75.75 0 1 0-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 1 0 1.06 1.06L12 13.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L13.06 12l1.72-1.72a.75.75 0 1 0-1.06-1.06L12 10.94l-1.72-1.72Z" clipRule="evenodd" />
    </svg>
);


export const PresentationView: React.FC<PresentationViewProps> = ({ transcript, onClose }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const filteredTranscript = transcript.filter(item => item.speaker !== 'You' && item.isFinal);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filteredTranscript]);

  return (
    <div className="fixed inset-0 bg-[#005c29] text-yellow-200 font-sans flex flex-col p-8 z-50">
       <button 
        onClick={onClose} 
        className="absolute top-4 right-4 text-yellow-200 hover:text-white transition-colors"
        aria-label="Close Presentation Mode"
       >
         <CloseIcon className="w-10 h-10" />
       </button>
       <div ref={scrollRef} className="flex-grow overflow-y-auto pt-12">
        {filteredTranscript.map((item, index) => (
          <p key={index} className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight animate-fade-in">
            {item.text}
          </p>
        ))}
       </div>
    </div>
  );
};