export interface TranscriptMessage {
  speaker: string;
  text: string;
  isFinal: boolean;
}

export enum AppStatus {
  Idle = 'Idle',
  Connecting = 'Connecting...',
  Listening = 'Listening...',
  Speaking = 'Gemini is speaking...',
  Error = 'Error',
}
