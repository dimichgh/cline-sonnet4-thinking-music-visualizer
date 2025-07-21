import { VisualizationMode, AudioFile, PlaybackState, AudioAnalysisData } from '@shared/types';
import { AudioEngine } from '@audio/AudioEngine';
import { DOMManager } from '@ui/DOMManager';
import { UIController } from '@ui/UIController';
import { EventManager } from '@ui/EventManager';
import { VisualizationController } from '@visualization/VisualizationController';

/**
 * Main Music Visualizer Application (Refactored)
 * Orchestrates all modules and handles the main application flow
 */
class MusicVisualizerRenderer {
  // Core modules
  private domManager!: DOMManager;
  private uiController!: UIController;
  private eventManager!: EventManager;
  private visualizationController!: VisualizationController;
  private audioEngine!: AudioEngine;

  // Application state
  private currentMode: VisualizationMode = VisualizationMode.DIGITAL_EARTH;
  private audioFile: AudioFile | null = null;
  private currentAnalysisData: AudioAnalysisData | null = null;
  private playbackState: PlaybackState = {
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1.0,
    loop: false
  };

  constructor() {
    this.initializeModules();
    this.setupIntegration();
    console.log('MusicVisualizerRenderer initialized with modular architecture');
  }

  private initializeModules(): void {
    // Initialize DOM and UI modules
    this.domManager = new DOMManager();
    this.uiController = new UIController();
    this.eventManager = new EventManager();
    
    // Initialize visualization with canvas from DOM manager
    this.visualizationController = new VisualizationController(this.domManager.getCanvas());
    
    // Initialize audio engine
    this.audioEngine = new AudioEngine();
    this.setupAudioEngine();
  }

  private setupIntegration(): void {
    // Setup event manager callbacks
    this.eventManager.setCallbacks({
      onModeSwitch: (mode: VisualizationMode) => this.switchVisualizationMode(mode),
      onLoadFile: () => this.loadAudioFile(),
      onTogglePlayback: () => this.togglePlayback(),
      onStopPlayback: () => this.stopPlayback(),
      onSeek: (eventOrTime: MouseEvent | number) => this.handleSeek(eventOrTime),
      onAudioFileLoaded: (audioFile: AudioFile) => this.onAudioFileLoaded(audioFile),
      onDroppedFile: (file: File) => this.handleDroppedFile(file)
    });

    // Initialize visualization
    this.initializeVisualization();
  }

  private setupAudioEngine(): void {
    // Setup audio analysis data callback
    this.audioEngine.onAnalysisData((data: AudioAnalysisData) => {
      this.currentAnalysisData = data;
      // Update visualization with audio data
      this.visualizationController.updateAudioData(data);
    });

    // Setup playback state change callback
    this.audioEngine.onPlaybackStateChange((state: PlaybackState) => {
      this.playbackState = state;
      this.uiController.setPlaybackState(state);
    });
  }

  private async initializeVisualization(): Promise<void> {
    try {
      this.domManager.showLoading('Initializing Visualization...');
      await this.visualizationController.initialize();
      this.domManager.hideLoading();
      console.log('Visualization initialized successfully');
    } catch (error) {
      console.error('Failed to initialize visualization:', error);
      this.domManager.showError('Failed to initialize 3D visualization');
    }
  }

  private async switchVisualizationMode(mode: VisualizationMode): Promise<void> {
    this.currentMode = mode;
    console.log('Switching to visualization mode:', mode);
    
    // Update event manager button states
    this.eventManager.updateModeButtons(mode);
    
    // For now, we're only implementing Digital Earth mode in the controller
    // Other modes would require additional implementation
    console.log('Switched to visualization mode:', mode);
  }

  private async loadAudioFile(): Promise<void> {
    try {
      const audioFile = await window.electronAPI?.loadAudioFile();
      if (audioFile) {
        this.onAudioFileLoaded(audioFile);
      }
    } catch (error) {
      console.error('Error loading audio file:', error);
      this.domManager.showError('Failed to load audio file');
    }
  }

  private onAudioFileLoaded(audioFile: AudioFile): void {
    this.audioFile = audioFile;
    this.uiController.setAudioFile(audioFile);
    console.log('Audio file loaded:', audioFile);
    
    this.domManager.showLoading('Processing Audio...');
    this.initializeAudioEngine();
  }

  private handleDroppedFile(file: File): void {
    console.log('File dropped:', file.name);
    // TODO: Implement file drop processing
    this.domManager.showError('File drop processing not yet implemented');
  }

  private togglePlayback(): void {
    if (!this.audioFile) {
      console.warn('No audio file loaded');
      return;
    }

    if (this.playbackState.isPlaying) {
      this.audioEngine.pause();
      this.uiController.stopUpdateTimer();
      this.visualizationController.stop();
    } else {
      this.audioEngine.play();
      this.uiController.startUpdateTimer(() => this.audioEngine.getCurrentTime());
      this.visualizationController.start();
    }
  }

  private stopPlayback(): void {
    this.audioEngine.stop();
    this.uiController.stopUpdateTimer();
    this.visualizationController.stop();
  }

  private handleSeek(eventOrTime: MouseEvent | number): void {
    if (typeof eventOrTime === 'number') {
      // Direct time value
      this.seek(eventOrTime);
    } else {
      // Mouse event from progress bar click
      const seekTime = this.uiController.handleProgressClick(eventOrTime);
      if (seekTime !== null) {
        this.seek(seekTime);
      }
    }
  }

  private seek(time: number): void {
    this.audioEngine.seek(time);
  }

  private async initializeAudioEngine(): Promise<void> {
    if (!this.audioFile) return;

    try {
      // Load audio file into engine
      await this.audioEngine.loadAudioFile(this.audioFile);
      
      // Update audio file with actual duration
      this.audioFile.duration = this.audioEngine.getDuration();
      this.playbackState.duration = this.audioFile.duration;
      this.uiController.setPlaybackState(this.playbackState);
      
      // Hide loading screen
      this.domManager.hideLoading();
      
      console.log('Audio engine initialized with file:', this.audioFile.name);
      console.log('Audio ready - duration:', this.audioFile.duration, 'seconds');
    } catch (error) {
      console.error('Failed to initialize audio engine:', error);
      this.domManager.showError('Audio processing failed. Please try a different file.');
    }
  }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new MusicVisualizerRenderer();
});
