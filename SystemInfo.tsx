import React, { useState } from 'react';

const CodeBlock: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <pre className="bg-gray-900 rounded-md p-4 text-sm text-gray-300 overflow-x-auto my-4 font-mono">
    <code>{children}</code>
  </pre>
);

export const SystemInfo: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);

    const piCode = `
// NOTE: This is a conceptual Node.js script for a Raspberry Pi 5 backend.
// It requires libraries like '@google/generative-ai', 'node-record-lpcm16', and a WebRTC server library.

import { GoogleGenAI, Modality } from "@google/genai";
import record from 'node-record-lpcm16';
import { Writable } from 'stream';
// import { WebRTCBroadcast } from './webrtc'; // Your WebRTC broadcasting module

const API_KEY = process.env.API_KEY;
if (!API_KEY) throw new Error('API_KEY is not set');

const ai = new GoogleGenAI({ apiKey: API_KEY });
// const webrtc = new WebRTCBroadcast('ws://your-webrtc-server-url');

async function main() {
  const targetLanguage = 'Spanish'; // Example language
  const session = await ai.live.connect({
    model: 'gemini-2.5-flash-native-audio-preview-09-2025',
    config: {
      responseModalities: [Modality.AUDIO],
      outputAudioTranscription: {},
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
      systemInstruction: \`You are a real-time interpreter. Translate what you hear into \${targetLanguage} and speak only the translation.\`
    },
    callbacks: {
      onopen: () => console.log('Session opened.'),
      onmessage: async (message) => {
        const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
        if (audioData) {
          console.log('Received translated audio from Gemini.');
          // const audioBuffer = Buffer.from(audioData, 'base64');
          // webrtc.broadcastAudio(audioBuffer, targetLanguage);
        }
      },
      onerror: (e) => console.error('Error:', e.message),
      onclose: () => console.log('Session closed.'),
    }
  });

  console.log('Listening... Press Ctrl+C to stop.');
  const recording = record.record({
    sampleRate: 16000,
    verbose: false,
    recordProgram: 'arecord', // Or 'sox', 'rec', etc.
  });

  const audioStream = new Writable({
    write(chunk, encoding, callback) {
      session.sendRealtimeInput({
        media: { data: chunk.toString('base64'), mimeType: 'audio/pcm;rate=16000' }
      });
      callback();
    }
  });

  recording.stream().pipe(audioStream);
}

main().catch(console.error);
  `;
  
  const webrtcClientCode = `
// This is example client-side JavaScript for listeners' phones.
// It would connect to your WebRTC server to receive the audio stream.

const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const language = 'Spanish'; // User selects this from a UI

// 1. Connect to your signaling server (e.g., via WebSocket)
const socket = new WebSocket('ws://your-webrtc-server-url');

socket.onopen = () => {
  // 2. Tell the server which language stream we want
  socket.send(JSON.stringify({ type: 'subscribe', language }));
};

// 3. Set up WebRTC connection
const peerConnection = new RTCPeerConnection();

// 4. When the server sends a remote audio track, play it
peerConnection.ontrack = (event) => {
  const [remoteStream] = event.streams;
  const audio = new Audio();
  audio.srcObject = remoteStream;
  audio.play();
};

// 5. Handle signaling messages from server to establish connection
socket.onmessage = async (event) => {
  const message = JSON.parse(event.data);
  if (message.type === 'offer') {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(message));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.send(JSON.stringify({ type: 'answer', sdp: answer }));
  } else if (message.type === 'candidate') {
    await peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
  }
};
  `;

  return (
    <div className="w-full max-w-4xl mx-auto mt-8 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
      <button onClick={() => setIsOpen(!isOpen)} className="text-xl font-bold w-full text-left flex justify-between items-center text-gray-200 hover:text-white">
        System Architecture & Implementation Guide
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
      <div className="mt-4 space-y-6 text-gray-300">
        <section>
          <h3 className="text-lg font-semibold text-blue-400 mb-2">1. Mimari Diyagram (Architectural Diagram)</h3>
          <p>This system facilitates real-time, multi-language interpretation for live events. The data flows as follows:</p>
          <ol className="list-decimal list-inside space-y-2 mt-2 pl-4">
            <li><strong>Audio Input:</strong> The speaker's voice is captured by a microphone connected to a Raspberry Pi 5.</li>
            <li><strong>Processing Core (Raspberry Pi 5):</strong> A Node.js application on the Pi receives the raw audio stream.</li>
            <li><strong>Transcription & Translation (Gemini Live API):</strong> The Node.js app streams the audio in real-time to the Gemini Live API. A system prompt instructs Gemini to act as an interpreter for a specific target language.</li>
            <li><strong>Translated Audio Output:</strong> Gemini streams the translated audio back to the Raspberry Pi.</li>
            <li><strong>Broadcasting (WebRTC Server):</strong> The Pi forwards the translated audio stream to a WebRTC Server (like Janus, Mediasoup, or a custom one). The server creates separate broadcast channels for each language.</li>
            <li><strong>Audience Access (Web App):</strong> Audience members access a simple web page on their phones. They select their desired language.</li>
            <li><strong>Real-time Listening:</strong> The web app connects to the WebRTC server, subscribes to the selected language channel, and plays the live translated audio through their headphones.</li>
            <li><strong>Transcript Display (HDMI):</strong> The Raspberry Pi can also output the live transcription to a screen via its HDMI port for accessibility.</li>
          </ol>
        </section>

        <section>
          <h3 className="text-lg font-semibold text-blue-400 mb-2">2. Pi5 için Gerçek Çalışan Kod (Example Pi5 Code)</h3>
          <p>This Node.js script demonstrates the core logic for the Raspberry Pi. It captures microphone audio and streams it to the Gemini Live API for translation.</p>
          <CodeBlock>{piCode}</CodeBlock>
        </section>

        <section>
          <h3 className="text-lg font-semibold text-blue-400 mb-2">3. WebRTC Yayın Modülü (WebRTC Broadcast Module)</h3>
          <p>A full WebRTC implementation requires a signaling server to coordinate connections. Below is the client-side JavaScript for the listener's web application. This code would connect to your signaling server to receive the live audio.</p>
           <CodeBlock>{webrtcClientCode}</CodeBlock>
        </section>
        
        <section>
          <h3 className="text-lg font-semibold text-blue-400 mb-2">4. Kurumsal Teklif Formatı (Corporate Proposal Format)</h3>
          <div className="border border-gray-600 rounded-md p-4 space-y-3">
            <h4 className="font-bold text-white">Project Title: Real-Time AI Interpretation Service</h4>
            <p><strong>1. Executive Summary:</strong> Briefly describe the problem (language barriers at international events) and your solution (a cost-effective, real-time AI interpretation system using Gemini API and WebRTC).</p>
            <p><strong>2. Problem Statement:</strong> Detail the challenges of traditional human interpretation: high cost, logistical complexity, and limited language availability.</p>
            <p><strong>3. Proposed Solution:</strong> Describe your system's architecture (as outlined above). Emphasize key benefits: scalability to multiple languages, low latency, accessibility via personal devices, and significant cost savings.</p>
            <p><strong>4. Key Features:</strong> List the functionalities: real-time audio translation, support for 8+ languages, browser-based access for audience, live transcript display option.</p>
            <p><strong>5. Implementation Plan & Timeline:</strong> Break down the project into phases (e.g., Phase 1: Backend Setup & API Integration - 2 weeks. Phase 2: WebRTC Server Deployment - 1 week. Phase 3: Client App Development - 2 weeks).</p>
            <p><strong>6. Budget & Pricing:</strong> Provide a cost breakdown. Include hardware (Raspberry Pi), software (server hosting, potential WebRTC service costs), and development effort. Propose a pricing model (e.g., per-event fee, subscription).</p>
            <p><strong>7. About Us/Team:</strong> Briefly introduce your team and expertise.</p>
          </div>
        </section>
      </div>
      )}
    </div>
  );
};
