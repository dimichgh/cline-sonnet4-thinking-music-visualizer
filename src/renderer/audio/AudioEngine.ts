import { AudioFile, AudioAnalysisData, AudioEngineConfig, PlaybackState, InstrumentDetection } from '@shared/types';
import { AudioLoader } from './AudioLoader';
import { FrequencyAnalyzer } from './FrequencyAnalyzer';
import { BeatDetector } from './BeatDetector';
import { InstrumentDetector } from './InstrumentDetector';

export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private audioLoader: AudioLoader;
  private frequencyAnalyzer: FrequencyAnalyzer | null = null;
  private beatDetector: BeatDetector | null = null;
  private instrumentDetector: InstrumentDetector | null = null;
  
  private sourceNode: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private analyzerNode: AnalyserNode | null = null;
  
  private audioBuffer: AudioBuffer | null = null;
  private htmlAudio: HTMLAudioElement | null = null;
  private mediaElementSource: MediaElementAudioSourceNode | null = null;
  private isInitialized = false;
  private isPlaying = false;
  private startTime = 0;
  private pauseTime = 0;
  private currentTime = 0;
  
  private analysisInterval: number | null = null;
  private onAnalysisCallback: ((data: AudioAnalysisData) => void) | null = null;
  private onPlaybackStateChanged: ((state: PlaybackState) => void) | null = null;
  
  private config: AudioEngineConfig = {
    fftSize: 2048,
    sampleRate: 44100,
    bufferSize: 1024,
    smoothingTimeConstant: 0.8,
    beatDetectionSensitivity: 0.3,
    instrumentDetectionThreshold: 0.5
  };

  constructor() {
    this.audioLoader = new AudioLoader();
  }

  async initialize(): Promise<void> {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.gainNode = this.audioContext.createGain();
      this.analyzerNode = this.audioContext.createAnalyser();
      
      this.analyzerNode.fftSize = this.config.fftSize;
      this.analyzerNode.smoothingTimeConstant = this.config.smoothingTimeConstant;
      
      this.gainNode.connect(this.analyzerNode);
      this.analyzerNode.connect(this.audioContext.destination);
      
      this.frequencyAnalyzer = new FrequencyAnalyzer(this.analyzerNode, this.config);
      this.beatDetector = new BeatDetector(this.config);
      this.instrumentDetector = new InstrumentDetector(this.config);
      
      this.isInitialized = true;
      console.log('Audio engine initialized successfully');
    } catch (error) {
      console.error('Failed to initialize audio engine:', error);
      throw error;
    }
  }

  async loadAudioFile(audioFile: AudioFile): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      console.log('Loading audio file:', audioFile.name);
      
      // Clean up existing audio if any
      if (this.mediaElementSource) {
        this.mediaElementSource.disconnect();
        this.mediaElementSource = null;
      }
      if (this.htmlAudio) {
        this.htmlAudio.pause();
        this.htmlAudio.src = '';
        this.htmlAudio = null;
      }
      
      // Use HTML5 audio for large files (more memory efficient)
      const blob = new Blob([audioFile.data], { type: 'audio/wav' });
      const audioUrl = URL.createObjectURL(blob);
      
      this.htmlAudio = new Audio();
      this.htmlAudio.crossOrigin = 'anonymous';
      this.htmlAudio.src = audioUrl;
      
      // Wait for metadata to load with timeout
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Metadata loading timeout'));
        }, 10000);
        
        const onLoad = () => {
          clearTimeout(timeout);
          console.log('Metadata loaded - Duration:', this.htmlAudio!.duration);
          resolve();
        };
        
        const onError = (e: any) => {
          clearTimeout(timeout);
          reject(e);
        };
        
        this.htmlAudio!.addEventListener('loadedmetadata', onLoad, { once: true });
        this.htmlAudio!.addEventListener('error', onError, { once: true });
        this.htmlAudio!.load();
      });
      
      // Create media element source for analysis only if we don't have one
      if (!this.mediaElementSource) {
        this.mediaElementSource = this.audioContext!.createMediaElementSource(this.htmlAudio);
        this.mediaElementSource.connect(this.gainNode!);
      }
      
      console.log('Audio file loaded successfully:', {
        duration: this.htmlAudio.duration,
        type: 'HTML5 Audio'
      });
    } catch (error) {
      console.error('Failed to load audio file:', error);
      throw error;
    }
  }

  play(): void {
    if (!this.htmlAudio || !this.audioContext) {
      console.warn('Cannot play: audio not loaded or engine not initialized');
      return;
    }

    try {
      this.htmlAudio.play();
      this.isPlaying = true;

      this.htmlAudio.onended = () => {
        this.stop();
      };

      this.startAnalysis();
      this.emitPlaybackStateChanged();
      console.log('Playback started');
    } catch (error) {
      console.error('Failed to start playback:', error);
    }
  }

  pause(): void {
    if (!this.isPlaying || !this.htmlAudio) return;

    try {
      this.htmlAudio.pause();
      this.isPlaying = false;
      this.stopAnalysis();
      this.emitPlaybackStateChanged();
      console.log('Playback paused at:', this.htmlAudio.currentTime);
    } catch (error) {
      console.error('Failed to pause playback:', error);
    }
  }

  stop(): void {
    try {
      if (this.htmlAudio) {
        this.htmlAudio.pause();
        this.htmlAudio.currentTime = 0;
      }

      this.isPlaying = false;
      this.stopAnalysis();
      this.emitPlaybackStateChanged();
      
      console.log('Playback stopped');
    } catch (error) {
      console.error('Failed to stop playback:', error);
    }
  }

  seek(time: number): void {
    if (!this.htmlAudio) return;

    try {
      this.htmlAudio.currentTime = Math.max(0, Math.min(time, this.htmlAudio.duration));
      this.emitPlaybackStateChanged();
      console.log('Seeked to:', this.htmlAudio.currentTime);
    } catch (error) {
      console.error('Failed to seek:', error);
    }
  }

  getCurrentTime(): number {
    return this.htmlAudio?.currentTime || 0;
  }

  getDuration(): number {
    return this.htmlAudio?.duration || 0;
  }

  getPlaybackState(): PlaybackState {
    return {
      isPlaying: this.isPlaying,
      currentTime: this.getCurrentTime(),
      duration: this.getDuration(),
      volume: this.gainNode?.gain.value || 1,
      loop: false
    };
  }

  private startAnalysis(): void {
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
    }

    this.analysisInterval = window.setInterval(() => {
      this.performAnalysis();
    }, 1000 / 60);
  }

  private stopAnalysis(): void {
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = null;
    }
  }

  private performAnalysis(): void {
    if (!this.frequencyAnalyzer || !this.beatDetector || !this.instrumentDetector || !this.onAnalysisCallback) {
      return;
    }

    try {
      const frequencyData = this.frequencyAnalyzer.getFrequencyData();
      const timeDomainData = this.frequencyAnalyzer.getTimeDomainData();
      const spectralFeatures = this.frequencyAnalyzer.getSpectralFeatures();
      
      const beatResult = this.beatDetector!.detectBeat(frequencyData, timeDomainData, spectralFeatures);
      const instrumentDetections = this.instrumentDetector!.detectInstruments(frequencyData, spectralFeatures);
      
      const rms = this.calculateRMS(timeDomainData);
      const peak = this.calculatePeak(timeDomainData);
      const volume = Math.sqrt(rms);
      
      const analysisData: AudioAnalysisData = {
        frequencies: frequencyData,
        timeDomain: timeDomainData,
        frequencyBins: Array.from(frequencyData),
        volume,
        rms,
        peak,
        beat: beatResult.isBeat,
        tempo: beatResult.tempo,
        confidence: beatResult.confidence,
        spectralCentroid: spectralFeatures.centroid,
        spectralRolloff: spectralFeatures.rolloff,
        zeroCrossingRate: this.calculateZeroCrossingRate(timeDomainData),
        detectedInstruments: instrumentDetections,
        timestamp: this.getCurrentTime()
      };

      this.onAnalysisCallback(analysisData);
    } catch (error) {
      console.error('Analysis failed:', error);
    }
  }

  private calculateRMS(timeDomainData: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < timeDomainData.length; i++) {
      sum += timeDomainData[i] * timeDomainData[i];
    }
    return Math.sqrt(sum / timeDomainData.length);
  }

  private calculatePeak(timeDomainData: Float32Array): number {
    let peak = 0;
    for (let i = 0; i < timeDomainData.length; i++) {
      const abs = Math.abs(timeDomainData[i]);
      if (abs > peak) peak = abs;
    }
    return peak;
  }

  private calculateZeroCrossingRate(timeDomainData: Float32Array): number {
    let crossings = 0;
    for (let i = 1; i < timeDomainData.length; i++) {
      if ((timeDomainData[i] >= 0) !== (timeDomainData[i - 1] >= 0)) {
        crossings++;
      }
    }
    return crossings / timeDomainData.length;
  }

  private emitPlaybackStateChanged(): void {
    if (this.onPlaybackStateChanged) {
      this.onPlaybackStateChanged(this.getPlaybackState());
    }
  }

  onAnalysisData(callback: (data: AudioAnalysisData) => void): void {
    this.onAnalysisCallback = callback;
  }

  onPlaybackStateChange(callback: (state: PlaybackState) => void): void {
    this.onPlaybackStateChanged = callback;
  }

  updateConfig(newConfig: Partial<AudioEngineConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (this.beatDetector) {
      this.beatDetector.updateConfig(this.config);
    }
    if (this.instrumentDetector) {
      this.instrumentDetector.updateConfig(this.config);
    }
  }

  destroy(): void {
    this.stop();
    
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
    
    this.audioContext = null;
    this.audioBuffer = null;
    this.isInitialized = false;
    
    console.log('Audio engine destroyed');
  }
}
