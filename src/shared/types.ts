// Shared types between main and renderer processes

export interface AudioFile {
  name: string;
  path: string;
  data: ArrayBuffer;
  size: number;
  type: string;
  duration?: number;
  sampleRate?: number;
}

export interface AudioAnalysisData {
  frequencies: Float32Array;
  timeDomain: Float32Array;
  frequencyBins: number[];
  volume: number;
  rms: number;
  peak: number;
  beat: boolean;
  tempo: number;
  confidence: number;
  spectralCentroid: number;
  spectralRolloff: number;
  zeroCrossingRate: number;
  detectedInstruments: InstrumentDetection[];
  timestamp: number;
}

export interface InstrumentDetection {
  instrument: InstrumentType;
  confidence: number;
  amplitude: number;
  frequency: number;
  startTime: number;
  duration: number;
}

export interface AudioEngineConfig {
  fftSize: number;
  sampleRate: number;
  bufferSize: number;
  smoothingTimeConstant: number;
  beatDetectionSensitivity: number;
  instrumentDetectionThreshold: number;
}

export interface SpectralFeatures {
  centroid: number;
  rolloff: number;
  flux: number;
  flatness: number;
  crest: number;
  bandwidth: number;
  mfccs: number[];
}

export interface BeatDetectionResult {
  isBeat: boolean;
  confidence: number;
  tempo: number;
  beatTime: number;
  energy: number;
  onsetStrength: number;
}

export enum InstrumentType {
  DRUMS = 'drums',
  BASS = 'bass',
  GUITAR = 'guitar',
  PIANO = 'piano',
  VOCALS = 'vocals',
  SYNTH = 'synth',
  STRINGS = 'strings',
  BRASS = 'brass',
  WOODWINDS = 'woodwinds'
}

export enum VisualizationMode {
  PSYCHEDELIC = 'psychedelic',
  DIGITAL_EARTH = 'digital_earth',
  BLACK_HOLE = 'black_hole',
  TRON_CITY = 'tron_city'
}

export interface VisualizationSettings {
  mode: VisualizationMode;
  intensity: number;
  colorPalette: string;
  particleCount: number;
  enableInstrumentShadows: boolean;
  enableMoonEffects: boolean;
  raceSpeed: number;
}

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  loop: boolean;
}

// IPC Channel names for communication between main and renderer
export const IPC_CHANNELS = {
  LOAD_AUDIO_FILE: 'load-audio-file',
  AUDIO_FILE_LOADED: 'audio-file-loaded',
  AUDIO_ANALYSIS_DATA: 'audio-analysis-data',
  PLAYBACK_CONTROL: 'playback-control',
  VISUALIZATION_SETTINGS: 'visualization-settings',
  WINDOW_CONTROLS: 'window-controls'
} as const;

export type IPCChannels = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS];

// Global Window interface extension for Electron API
declare global {
  interface Window {
    electronAPI: {
      loadAudioFile: () => Promise<AudioFile>;
      windowControls: (action: string) => Promise<void>;
      onAudioFileLoaded: (callback: (audioFile: AudioFile) => void) => void;
      onVisualizationSettings: (callback: (settings: any) => void) => void;
      onPlaybackControl: (callback: (control: any) => void) => void;
      onAudioAnalysisData: (callback: (data: any) => void) => void;
      removeAllListeners: (channel: string) => void;
    };
  }
}
