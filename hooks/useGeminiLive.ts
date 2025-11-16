import { useState, useRef, useCallback, useEffect } from 'react';
// Fix: The type `LiveSession` is not exported from `@google/genai`, so it has been removed from the import.
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { AppStatus, TranscriptMessage } from '../types';
import { createBlob, decode, decodeAudioData } from '../utils/audio';

const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;
const BUFFER_SIZE = 4096;

export const useGeminiLive = (targetLanguage: string) => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.Idle);
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [error, setError] = useState<string | null>(null);

  const statusRef = useRef(status);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // Fix: As `LiveSession` is not an exported type, `any` is used for the session promise ref.
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  
  const nextStartTimeRef = useRef(0);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const currentInputTranscriptionRef = useRef('');
  const currentOutputTranscriptionRef = useRef('');

  const stopSession = useCallback(async () => {
    setStatus(AppStatus.Idle);
    
    if (sessionPromiseRef.current) {
        try {
            const session = await sessionPromiseRef.current;
            session.close();
        } catch (e) {
            console.error('Error closing session:', e);
        }
        sessionPromiseRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    
    if (scriptProcessorRef.current) {
        scriptProcessorRef.current.disconnect();
        scriptProcessorRef.current = null;
    }

    if (mediaStreamSourceRef.current) {
        mediaStreamSourceRef.current.disconnect();
        mediaStreamSourceRef.current = null;
    }

    if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
      await inputAudioContextRef.current.close();
      inputAudioContextRef.current = null;
    }
    if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
      audioSourcesRef.current.forEach(source => source.stop());
      audioSourcesRef.current.clear();
      await outputAudioContextRef.current.close();
      outputAudioContextRef.current = null;
    }
    
    setTranscript([]);
    currentInputTranscriptionRef.current = '';
    currentOutputTranscriptionRef.current = '';
    nextStartTimeRef.current = 0;

  }, []);

  const startSession = useCallback(async () => {
    setError(null);
    setStatus(AppStatus.Connecting);

    try {
      if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable is not set.");
      }
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: INPUT_SAMPLE_RATE });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: OUTPUT_SAMPLE_RATE });
      
      sessionPromiseRef.current = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          systemInstruction: `You are a real-time interpreter. Translate what the user says into ${targetLanguage}. Speak ONLY the translated text, do not add any other conversational phrases.`
        },
        callbacks: {
          onopen: () => {
            setStatus(AppStatus.Listening);
            if (!inputAudioContextRef.current) return;
            mediaStreamSourceRef.current = inputAudioContextRef.current.createMediaStreamSource(stream);
            scriptProcessorRef.current = inputAudioContextRef.current.createScriptProcessor(BUFFER_SIZE, 1, 1);
            
            scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              if (sessionPromiseRef.current) {
                sessionPromiseRef.current.then((session) => {
                  session.sendRealtimeInput({ media: pcmBlob });
                });
              }
            };

            mediaStreamSourceRef.current.connect(scriptProcessorRef.current);
            scriptProcessorRef.current.connect(inputAudioContextRef.current.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.inputTranscription) {
              currentInputTranscriptionRef.current += message.serverContent.inputTranscription.text;
              setTranscript(prev => {
                const last = prev[prev.length - 1];
                if (last?.speaker === 'You' && !last.isFinal) {
                    const newTranscript = [...prev];
                    newTranscript[newTranscript.length - 1] = { ...last, text: currentInputTranscriptionRef.current };
                    return newTranscript;
                }
                return [...prev, { speaker: 'You', text: currentInputTranscriptionRef.current, isFinal: false }];
              });
            }

            if (message.serverContent?.outputTranscription) {
              setStatus(AppStatus.Speaking);
              currentOutputTranscriptionRef.current += message.serverContent.outputTranscription.text;
              setTranscript(prev => {
                const last = prev[prev.length - 1];
                const speakerName = `Gemini (${targetLanguage})`;
                if (last?.speaker === speakerName && !last.isFinal) {
                    const newTranscript = [...prev];
                    newTranscript[newTranscript.length - 1] = { ...last, text: currentOutputTranscriptionRef.current };
                    return newTranscript;
                }
                return [...prev, { speaker: speakerName, text: currentOutputTranscriptionRef.current, isFinal: false }];
              });
            }

            const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
            if (audioData && outputAudioContextRef.current) {
                const audioContext = outputAudioContextRef.current;
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, audioContext.currentTime);
                const audioBuffer = await decodeAudioData(decode(audioData), audioContext, OUTPUT_SAMPLE_RATE, 1);
                const source = audioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(audioContext.destination);
                source.addEventListener('ended', () => {
                    audioSourcesRef.current.delete(source);
                });
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
                audioSourcesRef.current.add(source);
            }
            
            if (message.serverContent?.interrupted) {
              audioSourcesRef.current.forEach(source => source.stop());
              audioSourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }

            if (message.serverContent?.turnComplete) {
              setTranscript(prev => prev.map(msg => ({ ...msg, isFinal: true })));
              currentInputTranscriptionRef.current = '';
              currentOutputTranscriptionRef.current = '';
              setStatus(AppStatus.Listening);
            }
          },
          onerror: (e: ErrorEvent) => {
            setError(`An error occurred: ${e.message}`);
            setStatus(AppStatus.Error);
            stopSession();
          },
          onclose: () => {
            if(statusRef.current !== AppStatus.Idle) {
                setStatus(AppStatus.Idle);
            }
          },
        },
      });

    } catch (err: any) {
      setError(`Failed to start session: ${err.message}`);
      setStatus(AppStatus.Error);
      await stopSession();
    }
  }, [stopSession, targetLanguage]);

  const isInitialMount = useRef(true);

  useEffect(() => {
    // Skip this effect on the initial render.
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // If the language changes while a session is active, automatically restart it.
    if (statusRef.current !== AppStatus.Idle && statusRef.current !== AppStatus.Error) {
      const restartSession = async () => {
        await stopSession();
        // A short delay helps ensure all resources are released before starting again.
        setTimeout(() => startSession(), 100);
      };
      restartSession();
    }
  }, [targetLanguage, startSession, stopSession]);

  return { status, transcript, error, startSession, stopSession };
};